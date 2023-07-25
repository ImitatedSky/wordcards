import * as XLSX from "xlsx";

// 分析 Excel 文件的函数， 設置回條函數，傳遞數據
export const parseExcelFile = (selectedSheetIndex, callback) => {
  // 使用 fetch 方法來取得 "./xlsx/voc.xlsx" 的 Excel 檔案
  fetch("./xlsx/voc.xlsx")
    .then((response) => response.arrayBuffer())  // 轉換成 ArrayBuffer 格式
    .then((data) => {

      // 使用 XLSX.read 函式將 ArrayBuffer 格式的 data 轉換成工作簿（Workbook）物件
      const workbook = XLSX.read(new Uint8Array(data), { type: "array" });

      // 根據index取得相應的工作表，這邊是在Display.js中 按鈕控制
      // 1級 2級...
      const sheetName = workbook.SheetNames[selectedSheetIndex];
     
      // 1級 2級...工作表 物件
      // { A1: { t: 's', v: 'vocabulary' },
      //   B1: { t: 's', v: 'part_of_speech' },
      //   C1: { t: 's', v: 'zh_cn' },
      //   A2: { t: 's', v: 'abandon' },
      //   B2: { t: 's', v: 'v.' },
      //   C2: { t: 's', v: '放棄' },
      //   ...
      // }
      const worksheet = workbook.Sheets[sheetName];

      // 將worksheet 轉換成 JSON 格式的數據
      // header: 1 指定第一行為標題行，這樣可以得到帶有標題的 JSON 
      // [
      //   ["vocabulary", "part_of_speech", "zh_cn"],
      //   ["abandon", "v.", "放棄"],
      //   ["abase", "v.", "降低（地位、職位、威望或尊嚴）"],
      //   ...
      // ]
      const parsedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });


      // 從第二行開始（索引為 1）讀取數據，並將每一行轉換成一個 JSON 物件     
      // 最終得到
      // [
      //   { vocabulary: "abandon", part_of_speech: "v.", zh_cn: "放棄" },
      //   { vocabulary: "abase", part_of_speech: "v.", zh_cn: "降低（地位、職位、威望或尊嚴）" },
      //   ...
      // ]
      const wordsData = parsedData.slice(1).map((row) => ({
        vocabulary: row[0],
        part_of_speech: row[1],
        zh_cn: row[2],
      }));



      // 回條函數，傳遞分析得到的單字數據
      // 回傳到 Display.js 的 useEffect
      callback(wordsData);
    })
    .catch((error) => {
      console.error("Error reading voc.xlsx:", error);
    });
};


