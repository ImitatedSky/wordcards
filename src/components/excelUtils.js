import * as XLSX from "xlsx";

// 分析 Excel 文件的函数
export const parseExcelFile = (selectedSheetIndex, callback) => {
  fetch("./xlsx/voc.xlsx")
    .then((response) => response.arrayBuffer())
    .then((data) => {
      const workbook = XLSX.read(new Uint8Array(data), { type: "array" });

      // 根據選取的工作表索引取得相應的工作表
      const sheetName = workbook.SheetNames[selectedSheetIndex];
      const worksheet = workbook.Sheets[sheetName];
      const parsedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // 从第二行開始（索引為 1）數據
      const wordsData = parsedData.slice(1).map((row) => ({
        vocabulary: row[0],
        part_of_speech: row[1],
        zh_cn: row[2],
      }));

      // 回條函數，傳遞分析得到的單字數據
      callback(wordsData);
    })
    .catch((error) => {
      console.error("Error reading voc.xlsx:", error);
    });
};




// import * as XLSX from "xlsx";

// // 分析 Excel 文件的函数
// export const parseExcelFile = (callback) => {
//   fetch("./xlsx/voc.xlsx") // 使用 fetch 方法来取得 public voc.xlsx 文件
//     .then((response) => response.arrayBuffer())
//     .then((data) => {
//       const workbook = XLSX.read(new Uint8Array(data), { type: "array" });

//       // 假設單字在第一個（及索引為 0 的工作表）中
//       const sheetName = workbook.SheetNames[0];
//       const worksheet = workbook.Sheets[sheetName];
//       const parsedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

//       // 從第二行開始（索引為 1）數據
//       const wordsData = parsedData.slice(1).map((row) => ({
//         vocabulary: row[0],
//         part_of_speech: row[1],
//         zh_cn: row[2],
//       }));

//       // 回條函數，傳遞分析得到的單字數據
//       callback(wordsData);
//     })
//     .catch((error) => {
//       console.error("Error reading voc.xlsx:", error);
//     });
// };
