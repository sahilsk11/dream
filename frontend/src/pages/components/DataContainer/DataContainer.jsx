import React, { useState } from "react";
import StatVisual from "../DonutChart/DonutChart";
import "./data-container.css";
/**
 * 
 * @param {route, title} props 
 */
export default function DataContainer({ title, subtitle, children}) {
  const [apiData, updateApiData] = useState(null);
  let graphs = [];

  // if (props.route === undefined) {
  //   props.data.forEach(graphData => {
  //     graphs.push(StatVisual(graphData));
  //   });
  // } else {
  //   const baseUrl = "http://localhost:8080";
  //   console.log(baseUrl + props.route);

  //   fetch(baseUrl + props.route)
  //     .then(response => response.json())
  //     .then(data => {
  //       console.log(data)
  //       for (const graphData of data.data) {
  //         console.log(graphData);
  //         graphs.push(StatVisual(graphData))
  //       }
  //       updateApiData(graphs);
  //     });
  // }
  //const data = props.route === undefined ? graphs : apiData;
  return (
    <div className="dataset-container">
      <h2 className="titleStyle">{title}</h2>
      <h4 className="data-container-subtitle">{subtitle}</h4>
      {children}
      {/* <div className="graphContainerStyle">
      </div> */}
    </div>
  );
}