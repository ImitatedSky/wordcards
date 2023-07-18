import React from "react";

const Card = ({ word, definition }) => {
  return (
    <div className="card">
      <h3>{word}</h3>
      <p>{definition}</p>
    </div>
  );
};

export default Card;
