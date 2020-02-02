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
            subtitle: "10%",
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
            title: "Fri",
            completed: 0,
            total: 5,
            percent: 0,
            subtitle: "0 tasks",
            completedLabel: "completed",
            incompletedLabel: "unfinished"
          },
          {
            title: "Sat",
            completed: 3,
            total: 6,
            percent: 50,
            subtitle: "3 tasks",
            completedLabel: "completed",
            incompletedLabel: "unfinished"
          },
        ]
      }
    ],
    gym: [
      {
        title: "recent intensity",
        data: [
          {
            title: "thurs",
            completed: 60,
            total: 100,
            subtitle: "60%",
            completedLabel: "% intensity",
            incompletedLabel: "n/a"
          },
          {
            title: "sat",
            completed: 55,
            total: 100,
            subtitle: "55%",
            completedLabel: "% intensity",
            incompletedLabel: "n/a"
          },
        ]
      },
      {
        title: "weekly set progress",
        data: [
          {
            title: "biceps",
            completed: 7,
            total: 20,
            subtitle: "14%",
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
          {
            title: "triceps",
            completed: 4,
            total: 20,
            subtitle: "20%",
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
          {
            title: "horiz. back",
            completed: 5,
            total: 15,
            subtitle: "33%",
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
          {
            title: "vert. back",
            completed: 5,
            total: 15,
            subtitle: "33%",
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
          {
            title: "shoulders",
            completed: 7,
            total: 20,
            subtitle: "14%",
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
          {
            title: "core/abs",
            completed: 7,
            total: 20,
            subtitle: "14%",
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
        ]
      },
    ],
    health: [
      {
        title: "today's calories",
        data: [
          {
            title: "1000",
            completed: 1000,
            total: 3000,
            subtitle: "kcal",
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
        ]
      },
      {
        title: "calorie intake",
        data: [
          {
            title: "fri",
            completed: 2500,
            total: 3000,
            subtitle: "2500 cal",
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
          {
            title: "sat",
            completed: 2500,
            total: 3000,
            subtitle: "2500 cal",
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
        ]
      },
    ],
    games: [
      {
        title: "weekly minutes played",
        data: [
          {
            title: "35",
            subtitle: "minutes",
            completed: 35,
            total: 100,
            completedLabel: "played",
            incompletedLabel: "n/a"
          },
        ]
      },
      {
        title: "win ratio",
        data: [
          {
            title: "thurs",
            subtitle: "2 wins",
            completed: 2,
            total: 5,
            completedLabel: "won",
            incompletedLabel: "lost"
          },
          {
            title: "sat",
            subtitle: "1 win",
            completed: 1,
            total: 5,
            completedLabel: "won",
            incompletedLabel: "lost"
          },
        ]
      },
      {
        title: "opponent record",
        data: [
          {
            title: "Arjun",
            subtitle: "0 wins",
            completed: 0,
            total: 5,
            completedLabel: "won",
            incompletedLabel: "lost"
          },
          {
            title: "Atharva",
            subtitle: "1 win",
            completed: 1,
            total: 5,
            completedLabel: "won",
            incompletedLabel: "lost"
          },
          {
            title: "Sameer",
            subtitle: "2 wins",
            completed: 2,
            total: 5,
            completedLabel: "won",
            incompletedLabel: "lost"
          },
        ]
      },
    ]
  }
  var currentUrl = document.URL,
    urlParts = currentUrl.split('#');

  let loc = (urlParts.length > 1) ? urlParts[1] : "school";
  const [contentDisplay, updateContent] = useState(loc);
  const [pageData, updatePageData] = useState(data);
  if (pageData == null) {
    return null;
  } else {
    return (
      <div>
        <style jsx global>{`
          a {
            text-decoration: none;
          }
        `}</style>
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
    transitionDuration: "0.1s",
    textDecoration: "none",

  }
  return (
    <div onClick={() => props.updateContent(props.title)} onMouseEnter={() => updateMouseHover(true)} onMouseLeave={() => updateMouseHover(false)} style={titleContainer} >
      <a href={"#" + props.title}><h5 style={labelStyle}>
        {props.title}
      </h5 ></a>
    </div>
  )
}

function ContentContainer(props) {
  const containerWrapperStyle = {
    minHeight: "90vh",
    marginLeft: "250px"
  }
  return (
    <div style={containerWrapperStyle}>
      {Category(props.pageData)}
    </div>
  )
}

function Category(props) {
  const pageContentStyle = {
    backgroundColor: "white",
    borderRadius: "40px",
    display: "block",
    margin: "0px auto",
    marginTop: "3%",
    marginBottom: "40px",
    width: "90%",
    maxWidth: "900px",
    boxShadow: "0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)",
    paddingBottom: "3%"
  }
  let dataContainers = [];
  props.forEach(dataContainer => {
    dataContainers.push(
      <div style={pageContentStyle}>
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
    textAlign: window.innerWidth > 928 ? "left" : "center",
    fontSize: window.innerWidth > 928 ? "50px" : "40px",
    marginBottom: "20px"
  }
  let graphs = [];
  props.data.forEach(graphData => {
    graphs.push(StatVisual(graphData));
  });
  console.log(window.innerWidth);
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
    marginBottom: "0px",
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
    marginBottom: "0px"
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
