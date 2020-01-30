import React, { useState } from 'react';
import { Doughnut } from 'react-chartjs-2';

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
    paddingBottom: "0px",
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
  const acronymStyle = {
    fontSize: "10px",
    textAlign: "center"
  }
  return (
    <div style={navStyle}>
      <h1 style={title}>DREAM</h1>
      <p style={acronymStyle}><em>data rules everything around me</em></p>
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
    <div style={bubbleStyle} onClick={() => props.updateContent(props.title)} >
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
  const graphContainerStyle = {
    display: "flex",
    position: "relative",
    justifyContent: "center",
    maxWidth: "100%",
    flexWrap: "wrap"
  }
  const sectionTitleStyle = {
    textAlign: "center",
    paddingTop: "5%",
    paddingBottom: "2%"
  }
  return (
    <div>
      <h2 style={sectionTitleStyle}>Class Attendance</h2>
      <div style={graphContainerStyle}>
        {DoughnutGraph({
          title: "Econ Lecture",
          attended: 1,
          total: 6, 
          percent: Math.round(1/6 * 100).toString() + "%" 
        })}
        {DoughnutGraph({ 
          title: "Data Structures Lecture", 
          attended: 9, 
          total: 9, 
          percent: "100%" 
        })}
        {DoughnutGraph({
          title: "Compilers Lecture",
          attended: 7,
          total: 9,
          percent: "78%"
        })}
        {DoughnutGraph({
          title: "HONR 399 Lecture",
          attended: 9,
          total: 9,
          percent: "100%"
        })}
        {DoughnutGraph({
          title: "CP 399 Lecture",
          attended: 0,
          total: 3,
          percent: "0%"
        })}
        {DoughnutGraph({
          title: "COM Lecture",
          attended: 9,
          total: 9,
          percent: "100%"
        })}
      </div>
    </div>
  );
}

function DoughnutGraph(props) {
  const donutTitle = {
    textAlign: "center",
    margin: "0px",
    marginBottom: "10px"
  }
  const donutContainer = {
    marginBottom: "50px"
  }
  const data = {
    labels: [
      'Attended',
      'Missed'
    ],
    datasets: [{
      data: [props.attended, props.total - props.attended],
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
    title: {
      text: props.percent,
      display: false,
      position: "bottom"
    },
    layout: {
      padding: {
        left: 0,
        right: 0
      }
    },
    responsive: true
  }
  return (
    <div style={donutContainer}>
      <h3 style={donutTitle}>{props.title}</h3>
      <Doughnut data={data} options={options} />
    </div>
  )
}

function GymContent() {
  const graphContainerStyle = {
    display: "flex",
    position: "relative",
    justifyContent: "center",
    maxWidth: "100%",
    flexWrap: "wrap"
  }
  const sectionTitleStyle = {
    textAlign: "center",
    paddingTop: "5%",
    paddingBottom: "2%"
  }
  return (
    <div>
      <h2 style={sectionTitleStyle}>Weekly Sets</h2>
      <div style={graphContainerStyle}>
        {DoughnutGraph({
          title: "Biceps",
          attended: 3,
          total: 20,
          percent: Math.round(3 / 20 * 100).toString() + "%"
        })}
        {DoughnutGraph({
          title: "Triceps",
          attended: 2,
          total: 10,
          percent: "20%"
        })}
        {DoughnutGraph({
          title: "Back",
          attended: 4,
          total: 15,
          percent: "33%"
        })}
        {DoughnutGraph({
          title: "Legs",
          attended: 0,
          total: 9,
          percent: "0%"
        })}
      </div>
    </div>
  );
}

export default App;
