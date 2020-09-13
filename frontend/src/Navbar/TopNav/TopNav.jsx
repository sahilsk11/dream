import React, { useState } from "react";
import "./navbar.css";
import NavBarSpaceGuys from "./NavBarSpaceGuys/NavBarSpaceGuys";

export default function TopNav(props) {
  const [expanded, toggleNav] = useState(false);
  function renderToggle() {
    function closeNav(name) {
      toggleNav(false);
      //props.updateContent(name);
    }
    if (expanded) {
      return (
        <div>
          <p onClick={() => toggleNav(false)} className="closeNavStyle">✕</p>
          <div className="expandedContainer">
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
      return <img onClick={() => toggleNav(true)} src="./hamburger.png" className="hamburgerStyle" />
    }
  }
  return (
    <div>
      <div className="navStyle">
        <h1 className="title">DREAM</h1>
        {NavBarSpaceGuys()}
        {renderToggle()}
      </div>
    </div>
  )
}