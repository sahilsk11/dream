import React from "react";
import "./space-guys.css";

export default function NavBarSpaceGuys() {
  return (
    <div className="space-guys-wrapper">
      <div className="container">
        <img src="./star.png" className="space-guys-star1" />
        <img src="./star1.png" className="space-guys-star2" />
        <img src="./star1.png" className="space-guys-star3" />
        <img src="./astronaut.png" className="space-guys-astronaut" />
      </div>
    </div>
  );
}