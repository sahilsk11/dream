import React from "react";
import "./category.css";
/**
 * Each category is a unique page with multiple data containers
 * @param {*} props 
 */
export default function Category(props) {
  let dataContainers = [];
  console.log(props.contentDisplay);
  props.pageData.forEach(dataContainer => {
    dataContainers.push(
      <div style={pageContentStyle}>
        {DataSet(dataContainer)}
      </div>
    );
  });
  if (props.contentDisplay === "gym") {
    dataContainers.push(<div style={pageContentStyle}>{DataSet({ route: "/recentIntensities", title: "recent intensity" })}</div>);
  }
  return (
    <div>
      {dataContainers}
    </div>
  );
}