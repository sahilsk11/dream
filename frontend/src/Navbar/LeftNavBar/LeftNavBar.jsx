import React from "react";
import LeftNavSpaceGuys from "./LeftNavSpaceGuys/LeftNavSpaceGuys";
import "./left-navbar.css";
import DreamBubble from "../DreamBubble/DreamBubble";

export default function LeftNavBar(props) {
  return (
    <div className="navStyle">
      <div className="navContent">
        {LeftNavSpaceGuys()}
        <h1 className="left-nav-title">DREAM</h1>
        <div className="navListContainer">
          {DreamBubble({ title: "school" })}
          {DreamBubble({ title: "gym" })}
          {DreamBubble({ title: "health" })}
          {DreamBubble({ title: "games" })}
          {/*DreamBubble({ title: "privacy" })*/}
        </div>
        <img className="iconStyle" src="./dream.png" />
        <p className="acronymStyle"><em>DATA RULES EVERYTHING AROUND ME</em></p>
      </div>
    </div>
  );
}
