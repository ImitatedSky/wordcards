import React from 'react';
import './Card.css'; 

const Card = ({ data }) => {
  const { vocabulary, part_of_speech, zh_cn } = data;

  return (
    <div className="card">
      <h2>{vocabulary}</h2>
      <p>Part of Speech: {part_of_speech}</p>
      <p>中文: {zh_cn}</p>
    </div>
  );
};

export default Card;

