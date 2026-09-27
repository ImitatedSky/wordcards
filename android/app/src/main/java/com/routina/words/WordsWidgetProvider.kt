package com.routina.words

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.SizeF
import android.view.View
import android.widget.RemoteViews
import androidx.core.os.BundleCompat
import java.time.LocalDate
import java.time.ZoneId

/**
 * 桌面小工具「每日單字」：每天 5 到 10 個單字，放得下幾列就顯示幾個。
 *
 * - 放得下全部就全部列出；放不下時右上角有頁碼，點它換下一頁
 * - 小到只放得下一個（1×1 之類）就只顯示一個單字，點它換下一個
 * - 點某個單字打開 App 裡它所在的牌組
 */
class WordsWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        for (id in ids) render(context, manager, id)
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        manager: AppWidgetManager,
        id: Int,
        newOptions: Bundle
    ) {
        render(context, manager, id)
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == ACTION_NEXT_PAGE) {
            val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
            if (id != AppWidgetManager.INVALID_APPWIDGET_ID) {
                advancePage(context, id)
                render(context, AppWidgetManager.getInstance(context), id)
            }
            return
        }
        // App 更新時系統會清掉它排的鬧鐘，也不保證會通知小工具，自己重畫一次並重排午夜鬧鐘
        if (intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            val manager = AppWidgetManager.getInstance(context)
            onUpdate(context, manager, manager.getAppWidgetIds(ComponentName(context, WordsWidgetProvider::class.java)))
            return
        }
        super.onReceive(context, intent)
    }

    override fun onDeleted(context: Context, ids: IntArray) {
        val prefs = context.getSharedPreferences(PAGE_PREFS, Context.MODE_PRIVATE).edit()
        for (id in ids) prefs.remove(pageKey(id))
        prefs.apply()
    }

    override fun onDisabled(context: Context) {
        context.getSystemService(AlarmManager::class.java).cancel(refreshIntent(context))
    }

    private fun render(context: Context, manager: AppWidgetManager, id: Int) {
        val words = DailyWords.today(context)
        val page = currentPage(context, id)
        val options = manager.getAppWidgetOptions(id)

        // Android 12 以上，桌面會告訴我們這個小工具在直向、橫向各會是什麼大小，
        // 每種大小各排一份，由桌面挑對的那份顯示
        val sizes = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            BundleCompat.getParcelableArrayList(options, AppWidgetManager.OPTION_APPWIDGET_SIZES, SizeF::class.java)
        } else {
            null
        }
        val views = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !sizes.isNullOrEmpty()) {
            RemoteViews(sizes.associateWith { build(context, id, words, page, it.width, it.height) })
        } else {
            // 舊版只有範圍：直向時寬度是最小值、高度是最大值（官方文件的建議取法）
            val width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH).toFloat()
            val height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT).toFloat()
            build(context, id, words, page, width, height)
        }
        manager.updateAppWidget(id, views)
        // 每次畫都重排一次：多數重畫來自大小改變而不是 onUpdate，而同一個 PendingIntent
        // 重排只會覆蓋，不會越排越多
        scheduleMidnightRefresh(context)
    }

    private fun build(
        context: Context,
        id: Int,
        words: List<DailyWord>,
        page: Int,
        widthDp: Float,
        heightDp: Float
    ): RemoteViews {
        val listHeight = heightDp - PADDING_DP * 2 - HEADER_DP
        // 窄的放不下同一行；夠高、兩行一個也能全部放下時也用兩行，字才不會擠在上半部
        val inline = widthDp >= INLINE_MIN_WIDTH_DP &&
            listHeight / ROW_STACKED_DP < DailyWords.MAX
        val rows = (listHeight / if (inline) ROW_INLINE_DP else ROW_STACKED_DP).toInt()

        if (rows < 2 || words.isEmpty()) {
            return buildSingle(context, id, words.take(MIN_DAILY), page)
        }

        val todays = words.take(rows.coerceIn(MIN_DAILY, DailyWords.MAX))
        val perPage = minOf(rows, todays.size)
        val pageCount = (todays.size + perPage - 1) / perPage
        val shown = todays.drop((page % pageCount) * perPage).take(perPage)

        val views = RemoteViews(context.packageName, R.layout.widget_words)
        views.setOnClickPendingIntent(R.id.widget_title, openApp(context, ""))
        if (pageCount > 1) {
            views.setViewVisibility(R.id.widget_page, View.VISIBLE)
            views.setTextViewText(R.id.widget_page, "${page % pageCount + 1}/$pageCount ›")
            views.setOnClickPendingIntent(R.id.widget_page, nextPage(context, id))
        } else {
            views.setViewVisibility(R.id.widget_page, View.GONE)
        }

        views.removeAllViews(R.id.widget_rows)
        for (word in shown) {
            val row = RemoteViews(
                context.packageName,
                if (inline) R.layout.widget_row_inline else R.layout.widget_row_stacked
            )
            row.setTextViewText(R.id.widget_word, word.front)
            row.setTextViewText(R.id.widget_meaning, word.back)
            row.setOnClickPendingIntent(R.id.widget_row, openApp(context, "vocab/${word.deckId}"))
            views.addView(R.id.widget_rows, row)
        }
        return views
    }

    private fun buildSingle(context: Context, id: Int, words: List<DailyWord>, page: Int): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_word_single)
        val word = words.getOrNull(page % words.size.coerceAtLeast(1))
        // 格子太小，拿掉「 (n.)」這類詞性，只留單字本身
        views.setTextViewText(R.id.widget_word, word?.front?.substringBefore(" (").orEmpty())
        views.setTextViewText(R.id.widget_meaning, word?.back.orEmpty())
        // 這麼小的格子放不下頁碼和按鈕，整格點下去就換下一個
        views.setOnClickPendingIntent(R.id.widget_single, nextPage(context, id))
        return views
    }

    private fun openApp(context: Context, path: String): PendingIntent {
        val intent = Intent(context, MainActivity::class.java)
            .putExtra(MainActivity.EXTRA_PATH, path)
            // 只差在 extra 的 PendingIntent 會被系統當成同一個，所以用 data 把每個牌組分開
            .setData(Uri.parse("routina-words://open/$path"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        return PendingIntent.getActivity(
            context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun nextPage(context: Context, id: Int): PendingIntent {
        val intent = Intent(context, WordsWidgetProvider::class.java)
            .setAction(ACTION_NEXT_PAGE)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
        return PendingIntent.getBroadcast(
            context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /** 頁碼跟著日期存：換了一天就從第一頁開始 */
    private fun currentPage(context: Context, id: Int): Int {
        val saved = context.getSharedPreferences(PAGE_PREFS, Context.MODE_PRIVATE)
            .getString(pageKey(id), null) ?: return 0
        val (date, page) = saved.split(':').let { it[0] to it.getOrNull(1)?.toIntOrNull() }
        return if (date == LocalDate.now().toString()) page ?: 0 else 0
    }

    private fun advancePage(context: Context, id: Int) {
        context.getSharedPreferences(PAGE_PREFS, Context.MODE_PRIVATE).edit()
            .putString(pageKey(id), "${LocalDate.now()}:${currentPage(context, id) + 1}")
            .apply()
    }

    /**
     * 午夜換一批單字。不需要準時，但 set() 會被系統延後好幾個小時（實測到早上六點多），
     * 所以用 setWindow 限定在午夜後一小時內；兩者都不需要額外權限。
     * 重新開機會清掉鬧鐘，但系統開機後會對每個小工具送一次更新，到時會再排回來。
     */
    private fun scheduleMidnightRefresh(context: Context) {
        val midnight = LocalDate.now().plusDays(1)
            .atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
        context.getSystemService(AlarmManager::class.java)
            .setWindow(AlarmManager.RTC, midnight, REFRESH_WINDOW_MS, refreshIntent(context))
    }

    private fun refreshIntent(context: Context): PendingIntent {
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, WordsWidgetProvider::class.java))
        val intent = Intent(context, WordsWidgetProvider::class.java)
            .setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        return PendingIntent.getBroadcast(
            context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun pageKey(id: Int) = "page_$id"

    private companion object {
        const val ACTION_NEXT_PAGE = "com.routina.words.widget.NEXT_PAGE"
        const val PAGE_PREFS = "widget_pages"
        const val MIN_DAILY = 5
        const val REFRESH_WINDOW_MS = 60 * 60 * 1000L

        // 以下尺寸要跟 res/layout/widget_*.xml 裡的數字一致，才算得準放得下幾列
        const val PADDING_DP = 12f
        const val HEADER_DP = 24f
        const val ROW_INLINE_DP = 28f
        const val ROW_STACKED_DP = 42f
        /** 比這窄就把中文放到單字下一行，不然兩個都會被截斷 */
        const val INLINE_MIN_WIDTH_DP = 180f
    }
}
