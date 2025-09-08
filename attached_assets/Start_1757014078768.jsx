import React from "react";
import "./Start.css";

export default function Start({ toggleClick }) {
  return (
    <div className="start">
      <h2 className="header">Quizzical</h2>
      <p className="desc">Some description if needed</p>
      <button className="start-btn" onClick={toggleClick}>
        Start Quiz
      </button>
    </div>
  );
}
