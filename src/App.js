import React, { useState } from 'react';
import { Doughnut } from 'react-chartjs-2';

function App() {
  const data = {
    school: [{
      title: "Class Attendance",
      data: [
        {
          title: "Econ Lecture",
          completed: 1,
          total: 6,
          percent: 17,
          completedLabel: "attended",
          incompletedLabel: "missed"
        },
        {
          title: "Data Structures Lecture",
          completed: 9,
          total: 9,
          percent: 100,
          completedLabel: "attended",
          incompletedLabel: "missed"
        },
        {
          title: "Comp Arch Lecture",
          completed: 7,
          total: 9,
          percent: 78,
          completedLabel: "attended",
          incompletedLabel: "missed"
        },
        {
          title: "COM Lecture",
          completed: 9,
          total: 9,
          percent: 100,
          completedLabel: "attended",
          incompletedLabel: "missed"
        },
        {
          title: "CP Lecture",
          completed: 0,
          total: 3,
          percent: 0,
          completedLabel: "attended",
          incompletedLabel: "missed"
        },
        {
          title: "HONR 399 Lecture",
          completed: 6,
          total: 6,
          percent: 100,
          completedLabel: "attended",
          incompletedLabel: "missed"
        },
      ]
    }],
    gym: [{
      title: "Weekly Sets",
      data: [
        {
          title: "Biceps",
          completed: 6,
          total: 20,
          percent: 30,
          completedLabel: "completed",
          incompletedLabel: "remaining"
        },
      ]
    }],
    gym: [
      {
        title: "Weekly Sets",
        data: [
          {
            title: "Biceps",
            completed: 6,
            total: 20,
            percent: 30,
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
        ]
      },
      {
        title: "Weekly Workout",
        data: [
          {
            title: "Biceps",
            completed: 6,
            total: 20,
            percent: 30,
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
        ]
      },
    ],
    health: [
      {
        title: "Daily Calories",
        data: [
          {
            title: "Thursday",
            completed: 400,
            total: 3000,
            percent: 1,
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
        ]
      },
    ],
    games: [
      {
        title: "Hours Played",
        data: [
          {
            title: "Wednesday",
            completed: 6,
            total: 20,
            percent: 30,
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
        ]
      },
      {
        title: "Games Won",
        data: [
          {
            title: "Wednesday",
            completed: 2,
            total: 20,
            percent: 10,
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
        ]
      },
    ]
  }
  const [contentDisplay, updateContent] = useState("school");
  const [pageData, updatePageData] = useState(data);
  const [requestSent, updateRequestSent] = useState(false);
  const containerStyle = {
    display: "flex",
    width: "100%",
    position: "relative",
    justifyContent: "center",
    paddingTop: "3%"
  }
  /*if (!requestSent) {
    fetch("http://localhost:8080").then(response => response.json()).then(data => {
      updatePageData(data);
      updateRequestSent(true);
    });
  } */
  if (pageData == null) {
    return null;
  } else {
    return (
      <div style={containerStyle}>
        {<LeftNavBar updateContent={updateContent} />}
        {<ContentContainer d  pageData={pageData[contentDisplay]} />}
      </div>
    );
  }
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
  const [mouseHover, updateMouseHover] = useState(false);
  let bubbleStyle = {
    border: "3px solid black",
    width: "100px",
    height: "40px",
    display: "block",
    margin: "0px auto",
    marginBottom: "60px",
    cursor: "pointer",
    backgroundColor: mouseHover ? "#7880FF" : "white",
  }
  const labelStyle = {
    textAlign: "center",
    margin: "12px",
  }
  return (
    <div style={bubbleStyle} onClick={() => props.updateContent(props.title)} onMouseEnter={() => updateMouseHover(true)} onMouseLeave={() => updateMouseHover(false)}>
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
  return (
    <div style={containerWrapperStyle}>
      <div style={pageContentStyle}>
        {PageContent(props.pageData)}
      </div>
    </div>
  )
}

function PageContent(props) {
  let dataContainers = [];
  props.forEach(dataContainer => {
    dataContainers.push(
      <div>
        {DataContainer(dataContainer)}
      </div>
    );
  })
  return (
    <div>
      {dataContainers}
    </div>
  );
}

function DataContainer(props) {
  const graphContainerStyle = {
    display: "flex",
    position: "relative",
    justifyContent: "center",
    maxWidth: "100%",
    flexWrap: "wrap"
  }
  const titleStyle = {
    paddingTop: "2%",
    marginTop: "0px",
    textAlign: "center"
  }
  let graphs = [];
  props.data.forEach(graphData => {
    graphs.push(
      <div>
        {DoughnutGraph(graphData)}
      </div>
    )
  });
  return (
    <div>
      <h2 style={titleStyle}>{props.title}</h2>
      <div style={graphContainerStyle}>
        {graphs}
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

export default App;
