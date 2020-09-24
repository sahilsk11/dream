const express = require("express");
const app = express();
const { DBConnection } = require("./dbHandler");
const moment = require('moment-timezone');


//configure databases
const dbHandler = new DBConnection(["gym"]);

// ensures DB clients are initialized before serving
async function main() {
  await dbHandler.initClients();
  app.listen(8081, () => {
    console.log("Server running on port 8081");
  })
}
main();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
})

app.get("/gym", async (req, res) => {
  const exerciseHistory = await dbHandler.getCollection("gym", "exerciseHistory");
  const recentWorkoutPromise = getRecentWorkoutData(exerciseHistory);
  const weekProgressPromise = getWeekProgress(exerciseHistory);
  const recentWorkoutsPromise = getRecentWorkouts(exerciseHistory);
  const promiseValues = await Promise.all([recentWorkoutPromise, weekProgressPromise, recentWorkoutsPromise]);
  const { weeklyProgress: recentProgress, avgIntensity: recentIntensity, recentWorkoutDate } = promiseValues[0];
  res.json({
    recentProgress,
    recentIntensity,
    ...promiseValues[1],
    recentWorkouts: promiseValues[2],
    recentWorkoutDate,
    weekStart: getWeekStart().format('MM/DD/YYYY'),
    recentWorkoutData: promiseValues[0]
  })
});

function getWeekStart() {
  let now = moment().tz('America/Los_Angeles').subtract(4, 'hours');
  if (now.day() == 0) {
    now = now.subtract(1, 'day').startOf('week').add(1, 'day');
  } else {
    now = now.startOf('week').add(1, 'day');
  }
  return now;
}

const getRecentWorkoutData = async (collection) => {
  let d = await getLastDate(collection);
  d = moment(d).tz('America/Los_Angeles').subtract(4, 'hours').startOf('day').utc().add(4, 'hours')._d;
  const result = await query(collection, d);
  return { ...result, recentWorkoutDate: d };
}

async function getRecentWorkouts(collection) {
  const result = await collection.find().sort({
    date: -1
  }).limit(10).toArray();
  return result;
}

const getWeekProgress = async (collection) => {
  const now = getWeekStart().utc()._d;
  const result = await query(collection, now);
  return result;
}

async function query(collection, startDay) {
  const muscleGroups = await getMuscleGroups();
  const muscleAggregators = constructMuscleAggregator(muscleGroups);
  const matchSelector = {
    date: {
      $gte: startDay
    },
  }

  const result = await collection.aggregate([
    {
      $match: matchSelector
    },
    {
      $group: {
        _id: 0,
        weeklyProgress: {
          $sum: "$weeklyProgress"
        },
        avgIntensity: {
          $avg: "$intensity"
        },
        ...muscleAggregators
      },
    },
  ]).toArray();
  if (result.length == 0) {
    const out = {
      weeklyProgress: 0,
      avgIntensity: 0,
    }
    for (muscle of muscleGroups) {
      out[muscle+"-progress"] = 0;
    }
    return postProcess(out);
  };
  return postProcess(result[0]);
}

function postProcess(result) {
  let muscleProgress = [];
  for (key of Object.keys(result)) {
    if (key.search("-progress") >= 0) {
      muscleProgress.push({
        muscle: key.substring(0, key.search("-progress")),
        progress: result[key]
      })
    }
  }
  result.muscleProgress = muscleProgress;
  return result;
}

function constructMuscleAggregator(muscleGroups) {
  const aggregators = {};
  for (let muscle of muscleGroups) {
    aggregators[muscle + "-progress"] = {
      $sum: "$muscleContributions." + muscle
    }
  }
  return aggregators;
}

async function getMuscleGroups() {
  const collection = await dbHandler.getCollection("gym", "weeklyMuscleGoals");
  const result = await collection.find().toArray();
  const muscles = [];
  for (let muscleEntry of result) {
    muscles.push(muscleEntry.muscle);
  }
  return muscles;
}

async function getLastDate(collection) {
  const result = await collection.find().sort({ "date": -1 }).limit(1).toArray();
  return result[0].date;
}