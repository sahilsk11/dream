import React, { useState, useEffect } from 'react';
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
            title: "DATA STRUCT",
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
            title: "Thurs",
            completed: 0,
            total: 5,
            percent: 0,
            subtitle: "0 tasks",
            completedLabel: "completed",
            incompletedLabel: "unfinished"
          },
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
          {
            title: "Sun",
            completed: 0,
            total: 7,
            percent: 0,
            subtitle: "0 tasks",
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
            title: "683",
            completed: 683,
            total: 2680,
            subtitle: "Cal",
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
            subtitle: "2500 Cal",
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
          {
            title: "sat",
            completed: 2500,
            total: 3000,
            subtitle: "2500 Cal",
            completedLabel: "completed",
            incompletedLabel: "remaining"
          },
        ]
      },
      //add line chart for weight
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
  var currentUrl = document.URL, urlParts = currentUrl.split('#');

  let loc = (urlParts.length > 1) ? urlParts[1] : "school";
  const [contentDisplay, updateContent] = useState(loc);
  const [pageData, updatePageData] = useState(data);
  const [displaySideBar, updateSidebarDisplay] = useState(window.innerWidth > 867);
  useEffect(() => {
    function handleResize() {
      updateSidebarDisplay(window.innerWidth > 867)
    }
    window.addEventListener('resize', handleResize);
  });
  function renderNavigation() {
    if (displaySideBar) {
      return <LeftNavBar updateContent={updateContent} />
    } else {
      return <NavBar updateContent={updateContent} />
    }
  }
  if (pageData == null) {
    return null;
  } else {
    return (
      <div>
        <style jsx global>{`
          a {
            text-decoration: none;
          }
          .nav {
  height: 67px;
  width: 100%;
  top: 0px;
  position: relative;
}
            .nav-icon {
  height: 40px;
  margin-left: 40px;
  margin-top: 15px;
}

.hamburger {
  padding-top: 10px;
  width: 25px;
}

#nav-menu {
  height: 0px;
  background-image: linear-gradient(white, #ededed80);
  width: 100%;
  transition-duration: 0.5s;
  overflow: hidden;
  text-decoration: none;
}

.nav-ul {
  text-align: center;
  list-style-type: none;
  padding: 0px;
  margin: 0px auto;
  display: block;
}

.nav-link {
  color: whitesmoke;
  text-decoration: none;
  font-size: 18px;
  width: 100%;
  height: 40px;
  font-weight: 400;
  padding-top: 17px;
  transition-duration: 0.3s;
  text-align: center;
  margin: 0px auto;
  font-family: 'Open Sans', sans-serif;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.062)
}

        `}</style>
        {renderNavigation({updateContent})}
        {<ContentContainer pageData={pageData[contentDisplay]} retainSideBar={displaySideBar} />}
        <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,700&display=swap" rel="stylesheet" />
      </div>
    );
  }
}

function NavBar(props) {
  const [expanded, toggleNav] = useState(false);
  const title = {
    marginTop: "0px",
    marginBottom: "0px",
    paddingBottom: "0px",
    paddingTop: "15px",
    color: "white",
    fontSize: "25px",
    fontFamily: "'Open Sans', sans-serif",
    textAlign: "center",
  }
  const navStyle = {
    minHeight: "67px",
    width: "100%",
    backgroundColor: "#362566"
  }
  function renderToggle() {
    const closeNavStyle = {
      position: "absolute",
      fontSize: "20px",
      color: "white",
      right: "28px",
      top: "3px",
      fontWeight: "800",
      cursor: "pointer"
    }
    const hamburgerStyle = {
      width: "30px",
      position: "absolute",
      right: "20px",
      top: "23px",
      cursor: "pointer"
    }
    const expandedContainer = {
      display: "block",
      backgroundColor: "#362566",
      marginTop: "30px",
      paddingBottom: "20px",
    }
    function closeNav(name) {
      toggleNav(false);
      props.updateContent(name);
    }
    if (expanded) {
      return (
        <div>
          <p onClick={() => toggleNav(false)} style={closeNavStyle}>✕</p>
          <div style={expandedContainer}>
            <ul className="nav-ul">
              <a href="#school" onClick={() => closeNav("school")}><li className="nav-link">school</li></a>
              <a href="#gym" onClick={() => closeNav("gym")}><li className="nav-link theme-font">gym</li></a>
              <a href="#health" onClick={() => closeNav("health")}><li className="nav-link">health</li></a>
              <a href="#games" onClick={() => closeNav("games")}><li className="nav-link">games</li></a>
            </ul>
          </div>
        </div>
      );
    } else {
      return <img onClick={() => toggleNav(true)} src="./hamburger.png" style={hamburgerStyle} />
    }
  }
  return (
    <div>
      <div style={navStyle}>
        <h1 style={title}>DREAM</h1>
        {NavBarSpaceGuys()}
        {renderToggle()}
      </div>
    </div>
  )
}

function NavBarSpaceGuys() {
  const styles = {
    containerWrapper: {
      position: "absolute",
      left: "50%",
      transform: "translateX(-50%)",
      top: "0",
      height: "67px",
      width: "240px",
      padding: "0px",
    },
    container: {
      position: "relative",
      height: "67px",
      width: "240px",
    },
    star1: {
      width: "20px",
      position: "absolute",
      right: "40px",
      top: "8px"
    },
    star2: {
      width: "15px",
      position: "absolute",
      left: "40px",
      top: "8px"
    },
    star3: {
      width: "15px",
      position: "absolute",
      right: "30px",
      bottom: "15px"
    },
    astronaut: {
      width: "30px",
      position: "absolute",
      left: "30px",
      bottom: "5px"
    }
  }
  return (
    <div style={styles.containerWrapper}>
      <div style={styles.container}>
        <img src="./star.png" style={styles.star1} />
        <img src="./star1.png" style={styles.star2} />
        <img src="./star1.png" style={styles.star3} />
        <img src="./astronaut.png" style={styles.astronaut} />
      </div>
    </div>
  );
}

function LeftNavBar(props) {
  const navStyle = {
    height: "100vh",
    width: "200px",
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
    paddingTop: "30px",
    fontFamily: "'Open Sans', sans-serif"
  }
  const navListContainer = {
    display: "block",
    margin: "0px auto",
    marginTop: "40%"
  }
  const iconStyle = {
    position: "absolute",
    width: "40px",
    bottom: "10px",
    left: "10px"
  }
  const acronymStyle = {
    fontSize: "10px",
    textAlign: "left",
    color: "whitesmoke",
    fontFamily: "'Open Sans', sans-serif",
    position: "absolute",
    bottom: "7px",
    width: "130px",
    left: "58px"
  }
  return (
    <div style={navStyle}>
      <div style={navContent}>
        {LeftNavSpaceGuys()}
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

function LeftNavSpaceGuys() {
  const styles = {
    containerWrapper: {
      position: "absolute",
      width: "250px",
      top: "0",
      height: "100px",
    },
    container: {
      position: "relative",
      width: "200px",
      height: "100px",
    },
    star1: {
      width: "20px",
      position: "absolute",
      left: "10px",
      top: "8px"
    },
    star2: {
      width: "20px",
      position: "absolute",
      right: "28px",
      top: "14px"
    },
    star3: {
      width: "20px",
      position: "absolute",
      right: "20px",
      bottom: "10px"
    },
    astronaut: {
      width: "30px",
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
    marginLeft: props.retainSideBar ? "200px" : "auto"
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
    color: "rgb(160, 160, 160)",
    fontSize: props.title.length < 6 ? "30px" : "30px",
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
