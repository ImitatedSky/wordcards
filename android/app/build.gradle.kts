import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
}

// ---- Release 簽章的來源 ----
// 與 Routina 家族其他成員同一套作法、同一把 keystore：優先讀 android/keystore.properties
// （已被 .gitignore 排除），其次讀環境變數（CI）。四者不齊全就不建立正式簽章，
// release 沿用 debug 簽章，讓本機照樣 build 得起來。
val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) {
        keystorePropertiesFile.inputStream().use { load(it) }
    }
}

fun releaseSigningValue(propKey: String, envKey: String): String? =
    keystoreProperties.getProperty(propKey) ?: System.getenv(envKey)

val releaseStoreFile = releaseSigningValue("storeFile", "KEYSTORE_FILE")
val releaseStorePassword = releaseSigningValue("storePassword", "KEYSTORE_PASSWORD")
val releaseKeyAlias = releaseSigningValue("keyAlias", "KEY_ALIAS")
val releaseKeyPassword = releaseSigningValue("keyPassword", "KEY_PASSWORD")
val hasReleaseSigning = !releaseStoreFile.isNullOrBlank() &&
    !releaseStorePassword.isNullOrBlank() &&
    !releaseKeyAlias.isNullOrBlank() &&
    !releaseKeyPassword.isNullOrBlank()

// ---- 網頁內容 ----
// Vite 的產出在 repo 根目錄的 dist/，複製進「產生目錄」而不是 src/main/assets：
// 建置產物不該混進原始碼樹，也就不會有人不小心把它 commit 進來。
val webDist = rootProject.layout.projectDirectory.dir("../dist")
val webAssetsDir = File(layout.buildDirectory.get().asFile, "generated/webAssets")

// 不打包、改由 App 在用到時從網站抓的目錄。執行期的 MainActivity 讀同一份檔案，
// 加一個資源包只要改這裡，說明見 README 的「不打包的大型資源」
val remoteAssetConfig = groovy.json.JsonSlurper()
    .parse(file("src/main/res/raw/remote_assets.json")) as Map<*, *>
val remoteAssetDirs = (remoteAssetConfig["dirs"] as List<*>).map { it as String }
for (dir in remoteAssetDirs) {
    // WebViewAssetLoader 的路徑前綴必須是「xxx/」的形式，寫錯要在 build 時就知道，
    // 不然只會在執行期變成那些檔案全部 404
    require(dir.endsWith("/") && !dir.startsWith("/")) {
        "remote_assets.json: \"$dir\" must be a relative directory ending with /"
    }
}

val copyWebAssets by tasks.registering(Sync::class) {
    // 用 Sync 而不是 Copy：上一次 build 留下的舊檔（改名的 hash 檔、後來才排除的路徑）
    // 要清掉，不然會一直被打包進 APK
    description = "把 Vite build 的產出複製進 APK 的 assets"
    from(webDist) {
        remoteAssetDirs.forEach { exclude("$it**") }
    }
    into(webAssetsDir)
    doFirst {
        // 沒先建網頁就打包，APK 裝起來會是一片空白且完全看不出原因，
        // 與其讓人事後除錯，不如現在就停下來講清楚
        if (!webDist.asFile.exists() || webDist.asFile.listFiles().isNullOrEmpty()) {
            error("找不到網頁產出 ${webDist.asFile.absolutePath}，請先在 repo 根目錄執行：npm ci && npm run build")
        }
    }
}

android {
    namespace = "com.routina.words"
    compileSdk = libs.versions.compileSdk.get().toInt()

    defaultConfig {
        applicationId = "com.routina.words"
        minSdk = libs.versions.minSdk.get().toInt()
        targetSdk = libs.versions.targetSdk.get().toInt()
        versionCode = 2
        versionName = "0.2.0"
    }

    sourceSets["main"].assets.srcDir(webAssetsDir)

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = file(releaseStoreFile!!)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = if (hasReleaseSigning) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlin {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }

    packaging {
        resources {
            excludes += setOf(
                "/META-INF/{AL2.0,LGPL2.1}",
                "/META-INF/*.version",
                "/META-INF/*.kotlin_module"
            )
        }
    }
}

// 每次打包前都重新複製，網頁改了卻忘記重建 APK 的情況就不會發生
tasks.named("preBuild") { dependsOn(copyWebAssets) }

dependencies {
    // 刻意不用 Compose：這個殼只有一個 WebView，
    // 拉進整套 Compose 執行期只會讓 APK 白白變大
    implementation(libs.androidx.activity)
    implementation(libs.androidx.webkit)
}
