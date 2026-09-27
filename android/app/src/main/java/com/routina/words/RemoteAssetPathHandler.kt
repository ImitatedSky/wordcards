package com.routina.words

import android.webkit.MimeTypeMap
import android.webkit.WebResourceResponse
import androidx.webkit.WebViewAssetLoader
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileInputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * 沒打包進 APK、改放在網站上的檔案：先找本機快取，沒有才從網站抓回來存著。
 *
 * 這裡的檔名都帶內容 hash（見 tools/build-fonts.mjs），同一個路徑的內容永遠不變，
 * 所以快取存下來就不用再檢查新舊。
 *
 * WebView 在背景執行緒呼叫 handle()，這裡直接做阻塞的網路請求是安全的。
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
        if (!file.exists() && !download(path, file)) {
            // 回 404 而不是 null：null 會讓 WebViewAssetLoader 往下交給 /wordcards/ 的
            // handler，而它找不到檔案時會回 index.html，網頁就會把 HTML 當字型去解
            return notFound()
        }
        return WebResourceResponse(mimeTypeOf(path), null, FileInputStream(file))
    }

    private fun download(path: String, target: File): Boolean {
        val connection = URL(remoteBaseUrl + path).openConnection() as HttpURLConnection
        // 字型都是 font-display: swap，等不到就先用系統字，不值得讓請求一直掛著
        connection.connectTimeout = 10_000
        connection.readTimeout = 30_000
        return try {
            if (connection.responseCode != HttpURLConnection.HTTP_OK) return false
            target.parentFile?.mkdirs()
            // 先寫到暫存檔再改名：下載到一半斷線時，不會留下一個之後永遠被當成完整的壞檔
            val temp = File.createTempFile("download", ".tmp", target.parentFile)
            try {
                connection.inputStream.use { input ->
                    temp.outputStream().use { output -> input.copyTo(output) }
                }
                temp.renameTo(target) || target.exists()
            } finally {
                temp.delete()
            }
        } catch (e: Exception) {
            false
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
}
