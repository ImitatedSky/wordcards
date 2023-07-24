import React, { useState, useEffect } from "react";
import Card from "./Card";
import { parseExcelFile } from "./excelUtils"; // excelUtils.js

const Display = () => {
  const [cardDataArray, setCardDataArray] = useState([]);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);

  useEffect(() => {
    // 讀取 voc.xlsx 並更新 cardDataArray
    parseExcelFile(selectedSheetIndex, (data) => {
      setCardDataArray(data);
    });
  }, [selectedSheetIndex]); // 當 selectedSheetIndex 變化時重新執行

  const handleSheetChange = (index) => {
    setSelectedSheetIndex(index);
  };

  return (
    <div className="card-container">
      {cardDataArray.map((data, index) => (
        <Card key={index} data={data} />
      ))}

      {/* 新增按鈕來切換工作表 */}
      <div className="sheet-buttons">
        <button onClick={() => handleSheetChange(0)}>1級</button>
        <button onClick={() => handleSheetChange(1)}>2級</button>
        <button onClick={() => handleSheetChange(2)}>3級</button>
        <button onClick={() => handleSheetChange(3)}>4級</button>
        <button onClick={() => handleSheetChange(4)}>5級</button>
        <button onClick={() => handleSheetChange(5)}>6級</button>
      </div>
    </div>
  );
};

export default Display;



// import React, { useState, useEffect } from "react";
// import Card from "./Card";
// import { parseExcelFile } from "./excelUtils"; //  excelUtils.js

// const Display = () => {
//   const [cardDataArray, setCardDataArray] = useState([]);

//   useEffect(() => {
//     // 讀取 voc.xlsx 並更新 cardDataArray
//     // parseExcelFile((data)
//     parseExcelFile((data) => {
//       setCardDataArray(data);
//     });
//   }, []); // 僅執行一次

//   return (
//     <div className="card-container">
//       {cardDataArray.map((data, index) => (
//         <Card key={index} data={data} />
//       ))}
//     </div>
//   );
// };

// export default Display;




