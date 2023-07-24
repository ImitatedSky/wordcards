import React, { useState, useEffect } from "react";
import Card from "./Card";
import { parseExcelFile } from "./excelUtils"; //  excelUtils.js

const Display = () => {
  const [cardDataArray, setCardDataArray] = useState([]);

  useEffect(() => {
    // 讀取 voc.xlsx 文件並更新 cardDataArray
    // parseExcelFile((data)
    parseExcelFile((data) => {
      setCardDataArray(data);
    });
  }, []); // 僅執行一次

  return (
    <div className="card-container">
      {cardDataArray.map((data, index) => (
        <Card key={index} data={data} />
      ))}
    </div>
  );
};

export default Display;
