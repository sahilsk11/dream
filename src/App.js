import React, { useState } from 'react';
import { Doughnut } from 'react-chartjs-2';

function App() {
  const data = {
    school: [
      {
        title: "class attendance",
        data: [
          {
            title: "ECON",
            subtitle: "70%",
            completed: 1,
            total: 6,
            percent: 17,
            completedLabel: "attended",
            incompletedLabel: "missed"
          },
          {
            title: "DATA S.",
            completed: 9,
            total: 9,
            subtitle: "100%",
            completedLabel: "attended",
            incompletedLabel: "missed"
          },
          {
            title: "COMP ARCH",
            completed: 7,
            total: 9,
            subtitle: "78%",
            completedLabel: "attended",
            incompletedLabel: "missed"
          },
          {
            title: "COM",
            completed: 9,
            total: 9,
            subtitle: "100%",
            completedLabel: "attended",
            incompletedLabel: "missed"
          },
          {
            title: "CP",
            completed: 0,
            total: 3,
            subtitle: "0%",
            completedLabel: "attended",
            incompletedLabel: "missed"
          },
          {
            title: "HONR",
            completed: 6,
            total: 6,
            subtitle: "100%",
            completedLabel: "attended",
            incompletedLabel: "missed"
          },
        ]
      },
      {
        title: "task management",
        data: [
          {
            title: "Thursday",
            completed: 20,
            total: 100,
            percent: 20,
            completedLabel: "working",
            incompletedLabel: "other"
          },
        ]
      }
    ],
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
  if (pageData == null) {
    return null;
  } else {
    return (
      <div>
        {<LeftNavBar updateContent={updateContent} />}
        {<ContentContainer pageData={pageData[contentDisplay]} />}
        <link href="https://fonts.googleapis.com/css?family=Open+Sans:700&display=swap" rel="stylesheet" />
      </div>
    );
  }
}

function LeftNavBar(props) {
  const navStyle = {
    height: "100vh",
    width: "250px",
    backgroundColor: "#362566",
    marginTop: "0px",
    top: "0",
    position: "fixed",
  };
  const navContent = {
    position: "relative",
    height: "100vh"
  };
  const title = {
    marginTop: "0px",
    marginBottom: "0px",
    paddingBottom: "0px",
    textAlign: "center",
    color: "white",
    paddingTop: "40px",
    fontFamily: "'Open Sans', sans-serif"
  }
  const navListContainer = {
    display: "block",
    margin: "0px auto",
    marginTop: "40%"
  }
  const iconStyle = {
    position: "absolute",
    width: "50px",
    bottom: "10px",
    left: "10px"
  }
  const acronymStyle = {
    fontSize: "13px",
    textAlign: "left",
    color: "whitesmoke",
    fontFamily: "'Open Sans', sans-serif",
    position: "absolute",
    bottom: "4px",
    width: "180px",
    right: "3px"
  }
  return (
    <div style={navStyle}>
      <div style={navContent}>
        {SpaceGuys()}
        <h1 style={title}>DREAM</h1>
        <div style={navListContainer}>
          {DreamBubble({ title: "school", updateContent: props.updateContent })}
          {DreamBubble({ title: "gym", updateContent: props.updateContent })}
          {DreamBubble({ title: "health", updateContent: props.updateContent })}
          {DreamBubble({ title: "games", updateContent: props.updateContent })}
          {/*DreamBubble({ title: "privacy" })*/}
        </div>
        <img style={iconStyle} src="./dream.png" />
        <p style={acronymStyle}><em>DATA RULES EVERYTHING AROUND ME</em></p>
      </div>
    </div>
  );
}

function SpaceGuys() {
  const styles = {
    containerWrapper: {
      position: "absolute",
      width: "250px",
      top: "0",
      height: "100px",
    },
    container: {
      position: "relative",
      width: "250px",
      height: "100px",
    },
    star1: {
      width: "20px",
      position: "absolute",
      left: "20px",
      top: "12px"
    },
    star2: {
      width: "20px",
      position: "absolute",
      right: "18px",
      top: "29px"
    },
    star3: {
      width: "20px",
      position: "absolute",
      right: "30px",
      bottom: "10px"
    },
    astronaut: {
      width: "40px",
      position: "absolute",
      left: "14px",
      bottom: "-10px"
    }
  }
  return (
    <div style={styles.containerWrapper}>
      <div style={styles.container}>
        <img src="./star.png" style={styles.star1} />
        <img src="./star1.png" style={styles.star2} />
        <img src="./star.png" style={styles.star3} />
        <img src="./astronaut.png" style={styles.astronaut} />
      </div>
    </div>
  );
}

function DreamBubble(props) {
  const [mouseHover, updateMouseHover] = useState(false);
  const titleContainer = {
    backgroundColor: mouseHover ? "rgba(200, 200, 200, 0.2)" : "rgba(200, 200, 200, 0)",
    width: "80%",
    height: "50px",
    display: "block",
    margin: "0px auto",
    cursor: "pointer",
    marginBottom: "40px",
    borderRadius: "10px",
    transitionDuration: "0.3s"
  }
  const labelStyle = {
    textAlign: "left",
    margin: "12px",
    color: mouseHover ? "white" : "#CDCDCD",
    fontSize: mouseHover ? "25px" : "23px",
    textAlign: "center",
    paddingTop: mouseHover ? "8px" : "10px",
    transitionDuration: "0.1s"
  }
  return (
    <div onClick={() => props.updateContent(props.title)} onMouseEnter={() => updateMouseHover(true)} onMouseLeave={() => updateMouseHover(false)} style={titleContainer} >
      <h5 style={labelStyle}>
        {props.title}
      </h5 >
    </div>
  )
}

function ContentContainer(props) {
  const containerWrapperStyle = {
    minHeight: "90vh",
    marginLeft: "250px"
  }
  const pageContentStyle = {
    backgroundColor: "white",
    borderRadius: "40px",
    display: "block",
    margin: "0px auto",
    marginTop: "3%",
    marginBottom: "5%",
    width: "90%",
    maxWidth: "900px",
    boxShadow: "0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)",
  }
  return (
    <div style={containerWrapperStyle}>
      <div style={pageContentStyle}>
        {Category(props.pageData)}
      </div>
    </div>
  )
}

function Category(props) {
  let dataContainers = [];
  props.forEach(dataContainer => {
    dataContainers.push(
      <div>
        {DataSet(dataContainer)}
      </div>
    );
  })
  return (
    <div>
      {dataContainers}
    </div>
  );
}

function DataSet(props) {
  const graphContainerStyle = {
    display: "flex",
    position: "relative",
    justifyContent: "center",
    maxWidth: "100%",
    flexWrap: "wrap",
  }
  const titleStyle = {
    paddingTop: "5%",
    paddingLeft: "7%",
    marginTop: "0px",
    textAlign: "left",
    fontSize: "50px",
    marginBottom: "20px"
  }
  let graphs = [];
  props.data.forEach(graphData => {
    graphs.push(StatVisual(graphData));
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

function StatVisual(props) {
  const statTitle = {
    textAlign: "right",
    margin: "0px",
    marginBottom: "10px",
    color: "#CDCDCD",
    fontSize: props.title.length < 6 ? "50px" : "30px",
  }
  const statSubtitle = {
    textAlign: "right",
    margin: "0px",
    marginBottom: "10px",
    color: "#6466FF",
    fontSize: "30px"
  }
  const itemContainer = {
    marginBottom: "40px",
    width: "45%",
    minWidth: "300px",
    display: "flex",
    minHeight: "160px",
    position: "relative",
  }
  const titleSection = {
    width: "50%",
    paddingRight: "5%",
    position: "relative",
  }
  const textWrapper = {
    width: "100%",
    position: "absolute",
    right: "0px",
    top: "50%",
    transform: "translate(50%, -50%)",
    right: "50%"
  }
  const dataRepresentation = {
    width: "50%",
    position: "relative"
  }
  const donutWrapper = {
    top: "50%",
    position: "absolute",
    width: "150%",
    left: "50%",
    transform: "translate(-50%, -50%)"
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

export default App;
