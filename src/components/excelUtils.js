import * as XLSX from "xlsx";

// 分析 Excel 文件的函数
export const parseExcelFile = (selectedSheetIndex, callback) => {
  // 使用 fetch 方法來取得 "./xlsx/voc.xlsx" 的 Excel 檔案
  fetch("./xlsx/voc.xlsx")
    .then((response) => response.arrayBuffer())  // 將取得的檔案轉換成 ArrayBuffer 格式
    .then((data) => {

      // 使用 XLSX.read 函式將 ArrayBuffer 格式的 data 轉換成工作簿（Workbook）物件
      const workbook = XLSX.read(new Uint8Array(data), { type: "array" });

      // 根據選取的工作表索引取得相應的工作表
      const sheetName = workbook.SheetNames[selectedSheetIndex];

      // 根據工作表名稱取得對應的工作表（Worksheet）物件
      const worksheet = workbook.Sheets[sheetName];

      // 使用 XLSX.utils.sheet_to_json 函式將工作表轉換成 JSON 格式的數據
      // 選項 header: 1 指定第一行為標題行，這樣可以得到帶有標題的 JSON 數據
      const parsedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // 從第二行開始（索引為 1）讀取數據，並將每一行轉換成一個 JSON 物件
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


