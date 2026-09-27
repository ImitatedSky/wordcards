# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Android 版：不打包的大型資源

`android/` 是一層 WebView 殼，打包時把 `dist/` 整包放進 APK，所以 App 完全離線可用。
例外是那些很大、而且少了也不會壞的檔案（目前只有中文字型子集，約 6 MB）：它們不進 APK，
App 用到某個檔時才從網站抓回來存著。

### 運作方式

1. 資源放在 `public/` 底下，用固定路徑發布到網站。Vite 不會替 `public/` 的檔案加 hash，
   所以網站和 App 對同一個路徑有一致的認知。
2. [`android/app/src/main/res/raw/remote_assets.json`](android/app/src/main/res/raw/remote_assets.json)
   列出這些目錄：

   ```json
   {
     "baseUrl": "https://imitatedsky.github.io/wordcards/",
     "dirs": ["fonts/files/"]
   }
   ```

3. 打包時，Gradle 讀這份檔案，把 `dirs` 裡的目錄排除在 APK 之外。
4. 執行時，`MainActivity` 讀同一份檔案，替每個目錄註冊
   [`RemoteAssetPathHandler`](android/app/src/main/java/com/routina/words/RemoteAssetPathHandler.kt)：
   快取裡有就直接給；沒有就**立刻回 404**，同時在背景從 `baseUrl + 路徑` 下載並存進快取。
   所以第一次用到時先顯示 fallback（系統字），下次開啟 App 就是下載好的字型。

網頁照常用同源的相對路徑請求這些檔，由 App 在原生層代抓，所以**網頁程式碼一行都不用改**，
也沒有 CORS 問題。只有真的用到的檔才會被請求，不需要下載按鈕，也不需要開場等待。

為什麼不在請求當下等下載完再回：WebView 呼叫 `shouldInterceptRequest` 的是所有請求共用的一條
序列，在那裡等網路，後面每個請求（包括打包在 APK 裡的檔）都得排隊；把下載延後到 WebView 讀
資料時也不行，那會卡住 Chromium 內部共用的執行緒，連 IndexedDB 都跟著變慢。這兩種做法都在
BlueStacks 上實測過：網路卡住時畫面會停好幾秒。

### 加一個新的資源包

1. 讓建置流程把檔案產生到 `public/<某目錄>/`（可參考 `tools/build-fonts.mjs`，掛在 `prebuild`），
   並把產物加進 `.gitignore`。
2. 在 `remote_assets.json` 的 `dirs` 加一行 `"<某目錄>/"`。
3. 先把網站部署上去，再發 APK：App 抓的是網站上**現在**的檔案。

### 規矩（照抄這套機制時一定要守）

- **同一個路徑的內容永遠不變。** App 存下來就不再檢查新舊，內容改了檔名就要跟著換
  （字型用內容 hash 命名）。這樣舊版 App 只會有兩種結果：拿到正確的檔，或是 404。
- **只放少了也不會壞的東西。** 第一次用到時、以及沒有網路時，這些檔都是 404，頁面要能退回
  別的方式照常運作。
  字型沒問題：CSS 的 fallback 鏈最後是 `system-ui`，Android 內建 Noto Sans CJK。
  預設單字庫這類「沒有就不能用」的資料必須留在 APK 裡。
- **描述檔留在 APK 裡，只把大檔放到遠端。** 例如 `fonts/fonts.css` 會打包，
  只有 `fonts/files/` 在遠端。`<link>` 會擋住畫面渲染；CSS 如果也要走網路，
  網路不穩時畫面就會卡住。
- 這些檔存在 `cacheDir`，系統空間不足時可能被清掉，清掉就重新抓一次。
