import React from "react";
import "./stat-visual.css";
import { Doughnut } from 'react-chartjs-2';


export default function StatVisual({ title, subtitle, completedLabel, incompletedLabel, completedAmount, totalAmount }) {
  const data = {
    labels: [
      completedLabel,
      incompletedLabel
    ],
    datasets: [{
      data: [completedAmount, totalAmount - completedAmount],
      backgroundColor: [
        '#7880FF',
        '#d6d6d6',
      ],
      hoverBackgroundColor: [
        'green',
        '#b5b5b5',
      ]
    }]
  };
  const options = {
    legend: {
      display: false
    },
  }
  return (
    <div className="itemContainer">
      <div className="titleSection">
        <div className="textWrapper">
          <h3 className="statTitle">{title}</h3>
          <h3 className="statSubtitle">{subtitle}</h3>
        </div>
      </div >
      <div className="dataRepresentation">
        <div className="donutWrapper">
          <Doughnut data={data} options={options} />
        </div>
      </div>
    </div >
  )
}