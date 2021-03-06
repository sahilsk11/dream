import React, { useState, useEffect } from "react";
import { StatVisual, MultiDataDonut } from "./components/DonutChart/DonutChart";
import DataContainer from "./components/DataContainer/DataContainer";
import DataTable from "./components/DataTable/DataTable";
import "./pages.css";

export default function Gym({ screenWidth }) {
  const [pageData, updatePageData] = useState(null);
  const [reloadFlag, updateReloadFlag] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      updateReloadFlag(reloadFlag => !reloadFlag);
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const host = process.env.NODE_ENV === "production" ? "https://dream.sahilkapur.com/server" : "http://localhost:8081";
    const endpoint = "/gym";
    fetch(host + endpoint).then(response => response.json()).then(data => {
      console.log("fetched");
      updatePageData(data);
    });
  }, [reloadFlag]);
  let rows = []
  let weeklyProgress = 0, avgWeeklyIntensity = 0;
  let muscleProgress = [], weekStartDate = "";
  let recentWorkout = [], recentWorkoutDate = "";
  if (pageData) {
    //construct table
    pageData.recentWorkouts.forEach(row => {
      const excerise = row.exercise ? row.exercise : row.muscleGroups[0];
      let dateStr = row.localDate;
      let intensity;
      if (row.intensity) {
        intensity = (Math.round(Number(row.intensity) * 100)) + "%";
      }
      console.log(screenWidth);
      if (screenWidth > 482) {
        rows.push([excerise, row.weight, row.reps, intensity, dateStr]);
      } else {
        rows.push([excerise, intensity, dateStr]);
      }
    });

    //construct weekly progress
    weeklyProgress = Math.round(Number(pageData.weeklyProgress) * 100);
    avgWeeklyIntensity = Math.round(Number(pageData.avgIntensity) * 100);

    //construct muscle progress
    pageData.muscleProgress.forEach(muscleEntry => {
      let title = muscleEntry.muscle;
      if (title.search("horizontal") >= 0) {
        title = "horiz. back";
      }
      if (title.search("vertical") >= 0) {
        title = "vert. back";
      }
      muscleProgress.push(
        StatVisual({
          title,
          subtitle: Math.round(Number(muscleEntry.progress) * 100).toString() + "%",
          completedAmount: Math.round(Number(muscleEntry.progress) * 100),
          totalAmount: 100,
          completedLabel: "completed",
          incompletedLabel: "remaining"
        })
      )
    });
    weekStartDate = pageData.weekStart;

    //construct recent workout
    recentWorkout = [
      // MultiDataDonut({
      //   title: "progress",
      //   subtitle: Math.round(Number(pageData.recentProgress) * 100).toString() + "%",
      //   items: pageData.recentWorkoutData.muscleProgress.map(item => ({ label: item.muscle, amount: Math.round(item.progress * 100) }))
      // }),
      StatVisual({
        title: "progress",
        subtitle: Math.round(Number(pageData.recentProgress) * 100).toString() + "%",
        completedAmount: Math.round(Number(pageData.recentProgress) * 100),
        totalAmount: 100,
        completedLabel: "completed",
        incompletedLabel: "remaining"
      }),
      StatVisual({
        title: "intensity",
        subtitle: Math.round(Number(pageData.recentIntensity) * 100).toString() + "%",
        completedAmount: Math.round(Number(pageData.recentIntensity) * 100),
        totalAmount: 100,
        completedLabel: "intensity",
        incompletedLabel: "remaining intensity"
      }),
      
    ];
    recentWorkoutDate = new Date(pageData.recentWorkoutDate).toLocaleDateString();
  }
  let tableHeader;
  if (screenWidth > 482) {
    tableHeader = ["exercise", "weight (lbs)", "reps", "intensity", "date"];
  } else {
    tableHeader = ["exercise", "intensity", "date"];
  }
  return (
    <div>
      <DataContainer title="recent workout" subtitle={recentWorkoutDate}>
        <div className="graphContainerStyle">
          {recentWorkout}
        </div>
      </DataContainer>

      <DataContainer title="weekly progress" subtitle={"week starting " + weekStartDate}>
        <div className="graphContainerStyle">
          {muscleProgress}
        </div>
      </DataContainer>

      <DataContainer title="recent sets" subtitle="last 15 sets">
        <DataTable header={tableHeader} rows={rows} />
      </DataContainer>
    </div>
  );
}