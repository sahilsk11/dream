const express = require("express");
const app = express();
const { DBConnection } = require("./dbHandler");

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
    recentWorkoutDate
  })
});

const getRecentWorkoutData = async (collection) => {
  let d = await getLastDate(collection);
  d.setHours(0);
  // this date is still 7AM
  const result = await query(collection, d);
  return { ...result, recentWorkoutDate: d};
}

async function getRecentWorkouts(collection) {
  const result = await collection.find().sort({
    date: -1
  }).limit(10).toArray();
  return result;
}

const getWeekProgress = async (collection) => {
  let d = new Date();
  d.setDate(d.getDate() - 5);
  const result = await query(collection, d)
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
  // if (!!scannedMuscle) {
  //   matchSelector.muscleGroups = [scannedMuscle];
  // }

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
  if (result.length == 0) return {};
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
  const result = await collection.find().sort({"date": -1}).limit(1).toArray();
  return result[0].date;
}