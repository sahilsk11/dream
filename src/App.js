import React, { useState } from 'react';

function App() {
  const [contentDisplay, updateContent] = useState("school");
  const containerStyle = {
    display: "flex",
    width: "100%",
    position: "relative",
    justifyContent: "center",
    paddingTop: "3%"
  }
  return (
    <div style={containerStyle}>
      {LeftNavBar({ updateContent })}
      {ContentContainer({ display: contentDisplay })}
    </div>
  );
}

function LeftNavBar(props) {
  const navStyle = {
    height: "90vh",
    width: "20%",
    backgroundColor: "white",
    margin: "5%",
    marginTop: "0px"
  };
  const title = {
    marginTop: "20px",
    marginBottom: "0px",
    textAlign: "center",
    backgroundColor: "white",
  }
  const iconStyle = {
    margin: "0px auto",
    display: "block",
    width: "50%",
    marginTop: "20px",
    marginBottom: "40px",
    maxWidth: "90px"
  }
  return (
    <div style={navStyle}>
      <h1 style={title}>DREAM</h1>
      <img style={iconStyle} src="./dream.png" />
      {DreamBubble({ title: "school", updateContent: props.updateContent })}
      {DreamBubble({ title: "gym", updateContent: props.updateContent })}
      {DreamBubble({ title: "health", updateContent: props.updateContent })}
      {DreamBubble({ title: "games", updateContent: props.updateContent })}
      {/*DreamBubble({ title: "privacy" })*/}
    </div>
  );
}

function DreamBubble(props) {
  let bubbleStyle = {
    border: "3px solid black",
    width: "100px",
    height: "40px",
    display: "block",
    margin: "0px auto",
    marginBottom: "60px",
    cursor: "pointer",
  }
  const labelStyle = {
    textAlign: "center",
    margin: "12px",
  }

  return (
    <div class="hoverDream" style={bubbleStyle} onClick={() => props.updateContent(props.title)} >
      <h5 style={labelStyle}>{props.title}</h5>
    </div>
  )
}

function ContentContainer(props) {
  const containerWrapperStyle = {
    width: "80%",
    minHeight: "90vh"
  }
  const pageContentStyle = {
    backgroundColor: "white",
    height: "90%",
    margin: "5%",
    marginTop: "0px"
  }
  function renderContentDisplay() {
    if (props.display == "school") {
      return SchoolContent();
    } else if (props.display == "gym") {
      return GymContent();
    } else if (props.display == "health") {
      return GymContent();
    } else if (props.display == "games") {
      return GymContent();
    }
  }
  return (
    <div style={containerWrapperStyle}>
      <div style={pageContentStyle}>
        {renderContentDisplay()}
      </div>
    </div>
  )
}

function SchoolContent() {
  return (
    <div>
      school
    </div>
  );
}

function GymContent() {
  return (
    <div>
      gym
    </div>
  );
}

export default App;
