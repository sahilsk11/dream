import React from "react";
import "./space-guys.css";

export default function NavBarSpaceGuys() {
  return (
    <div className="containerWrapper">
      <div className="container">
        <img src="./star.png" className="star1" />
        <img src="./star1.png" className="star2" />
        <img src="./star1.png" className="star3" />
        <img src="./astronaut.png" className="astronaut" />
      </div>
    </div>
  );
}