import React, { useState, useEffect } from "react";
import Card from "./Card";

import "../styles.css";
import { parseExcelFile } from "./excelUtils"; // excelUtils.js

const Display = () => {

  // 單字數據
  const [cardDataArray, setCardDataArray] = useState([]);
  // xls 切換工作表
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);

  // 當按鈕被點擊時，會觸發 handleSheetChange 函數，並傳入按鈕的索引值
  const handleSheetChange = (index) => {
    // 更新 index 後，會觸發執行 useEffect
    setSelectedSheetIndex(index);
  };

  useEffect(() => {
    // 讀取 voc.xlsx 並更新 cardDataArray
    parseExcelFile(selectedSheetIndex, (data) => {
      // 每次讀取工作表時，都會更新 cardDataArray，刷新 data
      setCardDataArray(data);
    });
  }, [selectedSheetIndex]); // 當 selectedSheetIndex 變化時重新執行



  return (
    <div className="card-container">
      {/* 新增按鈕來切換工作表 */}
      <div className="sheet-buttons">
        <button onClick={() => handleSheetChange(0)}>1級</button>
        <button onClick={() => handleSheetChange(1)}>2級</button>
        <button onClick={() => handleSheetChange(2)}>3級</button>
        <button onClick={() => handleSheetChange(3)}>4級</button>
        <button onClick={() => handleSheetChange(4)}>5級</button>
        <button onClick={() => handleSheetChange(5)}>6級</button>
      </div>

      {cardDataArray.map((data, index) => (
        <Card key={index} data={data} index={index} />
      ))}


    </div>
  );
};

export default Display;


