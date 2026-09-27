import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// fontsource 每個 @font-face 都附一份 woff 備援，但所有現代瀏覽器與 Android WebView
// （minSdk 26 = Chrome 58+）都吃 woff2，woff 永遠不會被下載，只是白白佔 dist 與 APK。
// Tailwind 會把 @import 直接內聯，個別字型 CSS 不會經過 transform，所以在產出階段處理。
function dropWoffFallback(): Plugin {
  return {
    name: 'drop-woff-fallback',
    apply: 'build',
    generateBundle(_, bundle) {
      for (const [fileName, output] of Object.entries(bundle)) {
        if (fileName.endsWith('.woff')) {
          delete bundle[fileName]
        } else if (output.type === 'asset' && fileName.endsWith('.css')) {
          // 小於 assetsInlineLimit 的字型會被內聯成 data URI，所以比對 format 而不是副檔名
          const css = String(output.source).replace(/,\s*url\([^)]*\)\s*format\(["']?woff["']?\)/g, '')
          // 格式若跟預期不同，寧可 build 失敗，也不要留下指向已刪檔案的 url
          if (/format\(["']?woff["']?\)/.test(css)) {
            throw new Error(`${fileName} still has a woff source after stripping`)
          }
          output.source = css
        }
      }
    },
  }
}

export default defineConfig({
  // GitHub Pages 部署在 https://imitatedsky.github.io/wordcards/ 子路徑下
  base: '/wordcards/',
  plugins: [react(), tailwindcss(), dropWoffFallback()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
