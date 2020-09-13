import React from "react";
import "./dream-bubble.css";

export default function DreamBubble(props) {
  return (
    <div className="titleContainer" >
      <h5 className='labelStyle'>
        {props.title}
      </h5 >
    </div>
  )
}