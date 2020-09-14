import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

import { Doughnut } from 'react-chartjs-2';
import Navbar from "./Navbar/Navbar";
//import ContentContainer from "./Content/ContentContainer";
import "./App.css";

//import pages
import Gym from "./pages/Gym";

function App() {
  var currentUrl = document.URL, urlParts = currentUrl.split('#');
  let loc = (urlParts.length > 1) ? urlParts[1] : "gym";
  const [activePage, changePage] = useState(loc);
  const [useSideNav, updateWidth] = useState(window.innerWidth > 867);
  useEffect(() => {
    function handleResize() {
      updateWidth(window.innerWidth > 867)
    }
    window.addEventListener('resize', handleResize);
  }, []);
  console.log(useSideNav);

  const containerWrapperStyle = {
    minHeight: "90vh",
    marginLeft: useSideNav ? "200px" : "auto"
  }
  return (
    <div>
      <Navbar activePage useSideNav={useSideNav}/>
      <div style={containerWrapperStyle}>
        <Gym/>
      </div>
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById('root'));
