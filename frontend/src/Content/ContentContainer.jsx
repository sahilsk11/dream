import React from "react";

export default function ContentContainer(props) {
  const containerWrapperStyle = {
    minHeight: "90vh",
    // marginLeft: props.retainSideBar ? "200px" : "auto"
  }
  return (
    <div style={containerWrapperStyle}>
      {Category({ pageData: props.pageData, contentDisplay: props.contentDisplay })}
    </div>
  )
}
