import React from "react";
import "./dataset.css";
/**
 * 
 * @param {route, title} props 
 */
export default function DataSet(props) {
  const [apiData, updateApiData] = useState(null);
  let graphs = [];

  if (props.route === undefined) {
    props.data.forEach(graphData => {
      graphs.push(StatVisual(graphData));
    });
  } else {
    const baseUrl = "http://localhost:8080";
    console.log(baseUrl + props.route);

    fetch(baseUrl + props.route)
      .then(response => response.json())
      .then(data => {
        console.log(data)
        for (const graphData of data.data) {
          console.log(graphData);
          graphs.push(StatVisual(graphData))
        }
        updateApiData(graphs);
      });
  }
  const data = props.route === undefined ? graphs : apiData;
  return (
    <div>
      <h2 style={titleStyle}>{props.title}</h2>
      <div style={graphContainerStyle}>
        {data}
      </div>
    </div>
  );
}