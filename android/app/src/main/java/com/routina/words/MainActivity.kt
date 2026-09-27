package com.routina.words

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import org.json.JSONObject
import java.io.File
import java.util.Locale

/**
 * 單字卡 App 的外殼：整個畫面就是一個 WebView，載入打包進 assets 的網頁版。
 *
 * 網頁與 App 共用同一份原始碼（repo 根目錄的 Vite 專案），build 出來的 dist/
 * 在打包時被複製進 assets，所以兩邊內容永遠一致、而且完全離線可用。
 * 唯一的例外是中文字型：它佔了大半體積，所以不打包，用到時才在背景從網站抓；
 * 還沒抓到（或沒有網路）時用系統內建的中文字，畫面照常。
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private var tts: TextToSpeech? = null
    private var ttsReady = false

    /** TTS 還沒初始化完就被呼叫時先記下來，好了再唸 */
    private var pendingSpeech: Triple<String, String, Float>? = null

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private val fileChooser = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        filePathCallback?.onReceiveValue(
            WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
        )
        filePathCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        /*
         * 用 WebViewAssetLoader 把 assets 掛在一個 https 來源下，而不是直接 file:// 載入。
         *
         * 這不是潔癖：file:// 在 WebView 裡是不透明來源，IndexedDB 與 localStorage
         * 會拿不到儲存空間或隨時被清掉——而這個 App 的所有資料都存在 IndexedDB。
         * 掛在 appassets.androidplatform.net 底下才是真實來源，儲存才靠得住。
         *
         * 路徑用 /wordcards/ 是為了對上網頁版的 Vite base（router 的 basename 由
         * import.meta.env.BASE_URL 推導），這樣網頁那邊的建置設定一行都不用改。
         */
        val assets = WebViewAssetLoader.AssetsPathHandler(this)
        val loaderBuilder = WebViewAssetLoader.Builder()
        addRemoteAssetHandlers(loaderBuilder)
        val assetLoader = loaderBuilder
            .addPathHandler(BASE_PATH) { path ->
                // 目錄請求（"" 或結尾是 /）要自己補上 index.html，
                // AssetsPathHandler 不會做這件事
                val requested = if (path.isEmpty() || path.endsWith("/")) {
                    path + INDEX
                } else {
                    path
                }
                // 注意：找不到檔案時 AssetsPathHandler 回的不是 null，而是一個
                // data 為 null 的回應，WebView 收到會變成 ERR_INVALID_RESPONSE。
                // 所以要看 data 而不是看回應本身是不是 null。
                val response = assets.handle(requested)
                if (response?.data != null) {
                    response
                } else {
                    // SPA 的深層路徑（/vocab/xxx）在磁碟上不存在，
                    // 一律回 index.html 交給 react-router 處理
                    assets.handle(INDEX)
                }
            }
            .build()

        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true          // localStorage（next-themes 記主題）
            // 內容都經由 assetLoader 提供，沒有任何需要讀本機檔案或 content:// 的情況
            allowFileAccess = false
            allowContentAccess = false
        }

        webView.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                // App 自己的頁面留在 WebView 裡；外部連結交給瀏覽器，
                // 不然使用者會困在一個沒有網址列、也回不去的頁面裡
                val url = request.url
                if (url.host == WebViewAssetLoader.DEFAULT_DOMAIN) return false
                runCatching {
                    startActivity(Intent(Intent.ACTION_VIEW, url))
                }
                return true
            }

            override fun onPageFinished(view: WebView, url: String) {
                installSpeechShim(view)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            // 匯入單字用的 <input type="file">。不實作這個的話，點了完全沒反應
            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams
            ): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                return runCatching {
                    fileChooser.launch(params.createIntent())
                    true
                }.getOrElse {
                    filePathCallback = null
                    false
                }
            }
        }

        webView.addJavascriptInterface(SpeechBridge(), BRIDGE_NAME)
        tts = TextToSpeech(this) { status ->
            ttsReady = status == TextToSpeech.SUCCESS
            if (ttsReady) {
                pendingSpeech?.let { (text, lang, rate) -> speakNow(text, lang, rate) }
            }
            pendingSpeech = null
        }

        // 返回鍵先走網頁的上一頁，沒有上一頁才離開 App
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })

        if (savedInstanceState == null) {
            webView.loadUrl(appUrl(intent))
        }
    }

    // 小工具點某個單字時，App 可能已經開著（singleTop），要在這裡換頁
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.hasExtra(EXTRA_PATH)) webView.loadUrl(appUrl(intent))
    }

    /**
     * 小工具帶來的頁面路徑（例 vocab/default-lv1）。這個 Activity 是對外開放的，
     * 任何 App 都能塞 extra 進來，所以只接受單純的路徑字元，而且一律接在 App 自己的網址底下。
     */
    private fun appUrl(intent: Intent?): String {
        val path = intent?.getStringExtra(EXTRA_PATH)
            ?.takeIf { it.matches(Regex("[A-Za-z0-9/_-]*")) }
            .orEmpty()
        return "https://${WebViewAssetLoader.DEFAULT_DOMAIN}$BASE_PATH$path"
    }

    /**
     * 沒打包進 APK 的目錄（res/raw/remote_assets.json，Gradle 也讀同一份來排除），
     * 用到哪個檔才從網站抓哪個。必須在 BASE_PATH 之前加：WebViewAssetLoader 依加入
     * 順序比對，BASE_PATH 會先把這些路徑吃掉。
     */
    private fun addRemoteAssetHandlers(builder: WebViewAssetLoader.Builder) {
        val config = resources.openRawResource(R.raw.remote_assets)
            .bufferedReader().use { JSONObject(it.readText()) }
        val baseUrl = config.getString("baseUrl")
        val dirs = config.getJSONArray("dirs")
        for (i in 0 until dirs.length()) {
            val dir = dirs.getString(i)
            builder.addPathHandler(
                BASE_PATH + dir,
                RemoteAssetPathHandler(File(cacheDir, "remote/$dir"), baseUrl + dir)
            )
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onDestroy() {
        tts?.stop()
        tts?.shutdown()
        tts = null
        super.onDestroy()
    }

    /**
     * 補上 Web Speech API。
     *
     * Android WebView 沒有提供 `speechSynthesis`，而網頁的發音功能
     * （src/utils/speech.ts）靠它。這裡注入一層轉接到原生 TextToSpeech 的實作，
     * 網頁端的 `canSpeak()` 就會偵測到並正常運作——**網頁程式碼一行都不用改**。
     *
     * 只在原本就沒有的時候才補：日後 WebView 若支援了，就讓它用原生的。
     */
    private fun installSpeechShim(view: WebView) {
        view.evaluateJavascript(SPEECH_SHIM, null)
    }

    private fun speakNow(text: String, lang: String, rate: Float) {
        val engine = tts ?: return
        engine.language = runCatching { Locale.forLanguageTag(lang) }.getOrDefault(Locale.US)
        engine.setSpeechRate(rate.coerceIn(0.5f, 2.0f))
        engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, text.hashCode().toString())
    }

    private inner class SpeechBridge {
        @JavascriptInterface
        fun speak(text: String, lang: String, rate: Float) {
            if (text.isBlank()) return
            // 初始化是非同步的，還沒好就先記著，好了之後補唸
            if (!ttsReady) {
                pendingSpeech = Triple(text, lang, rate)
                return
            }
            runOnUiThread { speakNow(text, lang, rate) }
        }

        @JavascriptInterface
        fun cancel() {
            pendingSpeech = null
            runOnUiThread { tts?.stop() }
        }
    }

    companion object {
        const val EXTRA_PATH = "com.routina.words.PATH"

        private const val BASE_PATH = "/wordcards/"
        private const val INDEX = "index.html"
        private const val BRIDGE_NAME = "RoutinaSpeech"

        private val SPEECH_SHIM = """
            (function () {
              if ('speechSynthesis' in window) return;
              function Utterance(text) {
                this.text = text == null ? '' : String(text);
                this.lang = 'en-US';
                this.rate = 1;
              }
              window.SpeechSynthesisUtterance = Utterance;
              window.speechSynthesis = {
                speaking: false, pending: false, paused: false,
                speak: function (u) {
                  if (!u) return;
                  $BRIDGE_NAME.speak(String(u.text || ''), u.lang || 'en-US', Number(u.rate) || 1);
                },
                cancel: function () { $BRIDGE_NAME.cancel(); },
                pause: function () {},
                resume: function () {},
                getVoices: function () { return []; }
              };
            })();
        """.trimIndent()
    }
}
