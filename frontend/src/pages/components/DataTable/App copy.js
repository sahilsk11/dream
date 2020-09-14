import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import "./App.css";

function App() {
  var currentUrl = document.URL, urlParts = currentUrl.split('#');
  let loc = (urlParts.length > 1) ? urlParts[1] : "gym";
  const [contentDisplay, updateContent] = useState(loc);
  const [pageData, updatePageData] = useState(null);
  const [displaySideBar, updateSidebarDisplay] = useState(window.innerWidth > 867);

  useEffect(() => {
    function handleResize() {
      updateSidebarDisplay(window.innerWidth > 867)
    }
    window.addEventListener('resize', handleResize);
  });

  useEffect(() => {
    const host = "http://localhost:8081/";
    fetch(host + contentDisplay).then(res => res.json()).then(data => {
      console.log(data);
      updateContent(data);
    });
  }, [contentDisplay]);

  const nav = displaySideBar ? <LeftNavBar updateContent={updateContent} /> : <NavBar updateContent={updateContent} />;

  const loading = <p>loading</p>;
  if (!pageData) return loading;
  return (
    <div>
      { nav}
      < ContentContainer pageData={pageData[contentDisplay]} retainSideBar={displaySideBar} contentDisplay={contentDisplay} />
      <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,700&display=swap" rel="stylesheet" />
    </div>
  )
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
      {Category({ pageData: props.pageData, contentDisplay: props.contentDisplay })}
    </div>
  )
}

/**
 * Each category is a unique page with multiple data containers
 * @param {*} props 
 */
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

/**
 * 
 * @param {route, title} props 
 */
function DataSet(props) {
  const graphContainerStyle = {
    display: "flex",
    position: "relative",
    justifyContent: "center",
    width: "100%",
    margin: "0px auto",
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
    minWidth: "300px",
    display: "flex",
    minHeight: "160px",
    position: "relative",
    marginBottom: "0px"
  }
  const titleSection = {
    width: "30%",
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
    width: "70%",
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
