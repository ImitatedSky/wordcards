import React from 'react';
import './Card.css'; 

const Card = ({ data,index }) => {
  const { vocabulary, part_of_speech, zh_cn } = data;

  // 翻轉卡片
  const [isFlipped, setIsFlipped] = useState(false);

  const handleClick = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className={`card ${isFlipped ? "flipped" : ""}`} onClick={handleClick}>
      <div className="front">
        <h2>{vocabulary}</h2>
        <p> {part_of_speech}.</p>
        <p>-{zh_cn}</p>
        <p className="index">#{index}</p>
      </div>
      <div className="back">
        <h2>{vocabulary}</h2>
        <p> {part_of_speech}.</p>
        <p>-{zh_cn}</p>
        <p className="index">#{index}</p>
      </div>
    </div>

    // <div className="card">

    //   <h2>{vocabulary}</h2>
    //   <p> {part_of_speech}.</p>
    //   <p>-{zh_cn}</p>
    //   <p className="index">#{index}</p>
    // </div>
  );
};

export default Card;

