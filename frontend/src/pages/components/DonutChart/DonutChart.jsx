import React from "react";
import "./stat-visual.css";
import { Doughnut } from 'react-chartjs-2';


export function StatVisual({ title, subtitle, completedLabel, incompletedLabel, completedAmount, totalAmount }) {
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
  return DonutChart({ title, subtitle, data, options });
}

/**
 * 
 * items: [{label, amount}]
 */
export function MultiDataDonut({ title, subtitle, items }) {
  const data = {
    labels: items.map(item => item.label),
    datasets: [{
      data: items.map(item => item.amount),
      backgroundColor: [
        "#362566",
        "#41317a",
        "#4b3d8e",
        "#5549a4",
        "#5f56ba",
        "#6864d0",
        "#7072e7",
        "#7880ff"
      ],
      //https://learnui.design/tools/data-color-picker.html
      // hoverBackgroundColor: [
      //   'green',
      //   '#b5b5b5',
      // ]
    }]
  };
  const options = {
    legend: {
      display: false
    },
  }
  return DonutChart({ title, subtitle, data, options });
}

function DonutChart({ title, subtitle, data, options }) {
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