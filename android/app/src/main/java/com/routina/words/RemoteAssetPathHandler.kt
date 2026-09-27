package com.routina.words

import android.webkit.MimeTypeMap
import android.webkit.WebResourceResponse
import androidx.webkit.WebViewAssetLoader
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileInputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

/**
 * 沒打包進 APK、改放在網站上的檔案：快取裡有就直接給，沒有就先回 404，同時在背景下載，
 * 下次開啟 App 時就會有。
 *
 * 不在請求當下等下載：WebView 呼叫 handle() 的是所有請求共用的一條序列，在這裡等網路，
 * 後面每個請求（包括打包在 APK 裡的檔）都得排隊；改成延後到讀資料時才下載也不行，
 * 那會卡住 Chromium 內部共用的執行緒，連 IndexedDB 都跟著變慢。網路卡住時兩種做法
 * 都會讓畫面停住，所以第一次一律先用 fallback 字型。
 *
 * 快取存下來就不再檢查新舊，所以 res/raw/remote_assets.json 列的目錄有一條規矩：
 * 同一個路徑的內容永遠不變，內容改了檔名就要跟著換（字型用內容 hash 命名，見
 * tools/build-fonts.mjs）。放在 cacheDir 是因為這些檔隨時可以重抓，系統空間不足
 * 時清掉也沒關係。
 */
class RemoteAssetPathHandler(
    private val cacheDir: File,
    private val remoteBaseUrl: String,
) : WebViewAssetLoader.PathHandler {

    override fun handle(path: String): WebResourceResponse {
        val file = File(cacheDir, path)
        // 路徑來自網頁，不能讓 ../ 跑出快取目錄
        if (!file.canonicalPath.startsWith(cacheDir.canonicalPath + File.separator)) {
            return notFound()
        }
        if (file.exists()) {
            return WebResourceResponse(mimeTypeOf(path), null, FileInputStream(file))
        }
        if (downloading.add(file.path)) {
            downloader.execute {
                try {
                    download(remoteBaseUrl + path, file)
                } finally {
                    downloading.remove(file.path)
                }
            }
        }
        // 回 404 而不是 null：null 會讓 WebViewAssetLoader 往下交給 /wordcards/ 的
        // handler，而它找不到檔案時會回 index.html，網頁就會把 HTML 當字型去解
        return notFound()
    }

    private fun download(url: String, target: File) {
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.connectTimeout = 10_000
        connection.readTimeout = 30_000
        try {
            if (connection.responseCode != HttpURLConnection.HTTP_OK) return
            target.parentFile?.mkdirs()
            // 先寫到暫存檔再改名：下載到一半斷線時，不會留下一個之後永遠被當成完整的壞檔
            val temp = File.createTempFile("download", ".tmp", target.parentFile)
            try {
                connection.inputStream.use { input ->
                    temp.outputStream().use { output -> input.copyTo(output) }
                }
                temp.renameTo(target)
            } finally {
                temp.delete()
            }
        } catch (e: Exception) {
            // 沒網路或網站暫時連不上：什麼都不存，下次用到時會再試一次
        } finally {
            connection.disconnect()
        }
    }

    private fun mimeTypeOf(path: String): String {
        val extension = path.substringAfterLast('.', "")
        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
            ?: "application/octet-stream"
    }

    private fun notFound() = WebResourceResponse(
        "text/plain", null, 404, "Not Found", emptyMap(), ByteArrayInputStream(ByteArray(0))
    )

    private companion object {
        // 整個 App 共用一條下載執行緒：一個一個抓就夠快，也不會同時對網站開一堆連線
        val downloader = Executors.newSingleThreadExecutor()
        val downloading: MutableSet<String> = ConcurrentHashMap.newKeySet()
    }
}
