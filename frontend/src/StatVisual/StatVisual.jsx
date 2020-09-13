import React from "react";
import "./stat-visual.css";

function StatVisual(props) {
  const data = {
    labels: [
      props.completedLabel,
      props.incompletedLabel
    ],
    datasets: [{
      data: [props.completed, props.total - props.completed],
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
    <div style={itemContainer}>
      <div style={titleSection}>
        <div style={textWrapper}>
          <h3 style={statTitle}>{props.title}</h3>
          <h3 style={statSubtitle}>{props.subtitle}</h3>
        </div>
      </div >
      <div style={dataRepresentation}>
        <div style={donutWrapper}>
          <Doughnut data={data} options={options} />
        </div>
      </div>
    </div >
  )
}