const express = require("express");
const app = express();

app.listen(8080, () => {
  console.log("Server running on port 8080");
});

app.use(function (req, res, next) {
  const env = process.env.NODE_ENV;
  console.log(Date.now().toString() + ": NODE_ENV=" + env);
  if (env == "production")
    res.setHeader('Access-Control-Allow-Origin', "http://portal.dmkalpha.org");
  else
    res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.get("/", (req, res) => {
  res.json({
    school: [{
      title: "Class Attendance",
      data: [
        {
          title: "Econ Lecture",
          completed: 1,
          total: 6,
          percent: 17,
          completedLabel: "attended",
          incompletedLabel: "missed"
        },
        {
          title: "Data Structures Lecture",
          completed: 9,
          total: 9,
          percent: 100,
          completedLabel: "attended",
          incompletedLabel: "missed"
        },
        {
          title: "Comp Arch Lecture",
          completed: 7,
          total: 9,
          percent: 78,
          completedLabel: "attended",
          incompletedLabel: "missed"
        },
        {
          title: "COM Lecture",
          completed: 9,
          total: 9,
          percent: 100,
          completedLabel: "attended",
          incompletedLabel: "missed"
        },
        {
          title: "CP Lecture",
          completed: 0,
          total: 3,
          percent: 0,
          completedLabel: "attended",
          incompletedLabel: "missed"
        },
        {
          title: "HONR 399 Lecture",
          completed: 6,
          total: 6,
          percent: 100,
          completedLabel: "attended",
          incompletedLabel: "missed"
        },
      ]
    }],
    gym: [{
      title: "Weekly Sets",
      data: [
        {
          title: "Biceps",
          completed: 6,
          total: 20,
          percent: 30,
          completedLabel: "completed",
          incompletedLabel: "remaining"
        },
      ]
    }],
    gym: [
      {
        title: "Weekly Sets",
        data: [
          {
            title: "Biceps",
            completed: 6,
            total: 20,
            percent: 30,
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
        ]
      },
      {
        title: "Weekly Workout",
        data: [
          {
            title: "Biceps",
            completed: 6,
            total: 20,
            percent: 30,
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
        ]
      },
    ],
    health: [
      {
        title: "Daily Calories",
        data: [
          {
            title: "Thursday",
            completed: 400,
            total: 3000,
            percent: 1,
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
        ]
      },
    ],
    games: [
      {
        title: "Hours Played",
        data: [
          {
            title: "Wednesday",
            completed: 6,
            total: 20,
            percent: 30,
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
        ]
      },
      {
        title: "Games Won",
        data: [
          {
            title: "Wednesday",
            completed: 2,
            total: 20,
            percent: 10,
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
        ]
      },
    ]
  })
});