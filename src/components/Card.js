import React from 'react';
import './Card.css'; 

const Card = ({ data,index }) => {
  const { vocabulary, part_of_speech, zh_cn } = data;

  return (
    <div className="card">

      <h2>{vocabulary}</h2>
      <p> {part_of_speech}.</p>
      <p>-{zh_cn}</p>
      <p className="index">#{index}</p>
    </div>
  );
};

export default Card;

