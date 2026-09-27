package com.routina.words

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import kotlin.random.Random

/** 小工具上的一個單字。[deckId] 用來在點擊時打開它所在的牌組 */
data class DailyWord(val front: String, val back: String, val deckId: String)

/**
 * 每天的單字：從打包在 APK 裡的預設單字庫（assets/default-library/）抽出來。
 *
 * 小工具讀不到 WebView 的 IndexedDB，所以不用使用者的牌組資料。預設單字庫就是 App
 * 第一次開啟時寫進 IndexedDB 的那一份，內容一樣，而且完全離線。
 *
 * 以日期當亂數種子，同一天不管重算幾次都是同一批，過了午夜才換。算好的結果存起來，
 * 一天只需要解析一次 JSON。
 */
object DailyWords {

    /** 一天最多幾個。大小工具顯示前 N 個，所以越大的小工具看到的是小的那份再多一些 */
    const val MAX = 10

    private const val PREFS = "daily_words"
    private const val LIBRARY = "default-library"

    fun today(context: Context): List<DailyWord> {
        val date = LocalDate.now()
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (prefs.getString("date", null) == date.toString()) {
            prefs.getString("words", null)?.let { return decode(it) }
        }
        val words = pick(context, date)
        prefs.edit()
            .putString("date", date.toString())
            .putString("words", encode(words))
            .apply()
        return words
    }

    private fun pick(context: Context, date: LocalDate): List<DailyWord> {
        val decks = readAsset(context, "$LIBRARY/manifest.json").getJSONArray("decks")
        val counts = (0 until decks.length()).map { decks.getJSONObject(it).getInt("cardCount") }
        val total = counts.sum()

        // 從所有牌組的卡片裡平均抽，不是先抽牌組：每張卡被抽到的機會一樣
        val random = Random(date.toEpochDay())
        val picks = LinkedHashSet<Int>()
        while (picks.size < minOf(MAX, total)) picks.add(random.nextInt(total))

        // 一個牌組只解析一次
        val cardsByDeck = HashMap<Int, JSONArray>()
        return picks.mapNotNull { index ->
            var deck = 0
            var offset = index
            while (offset >= counts[deck]) {
                offset -= counts[deck]
                deck++
            }
            val entry = decks.getJSONObject(deck)
            val cards = cardsByDeck.getOrPut(deck) {
                readAsset(context, "$LIBRARY/${entry.getString("file")}")
                    .getJSONObject("data").getJSONArray("cards")
            }
            cards.optJSONObject(offset)?.let {
                DailyWord(it.getString("front"), it.getString("back"), entry.getString("id"))
            }
        }
    }

    private fun readAsset(context: Context, path: String): JSONObject =
        context.assets.open(path).bufferedReader().use { JSONObject(it.readText()) }

    private fun encode(words: List<DailyWord>): String = JSONArray().apply {
        for (word in words) {
            put(JSONObject().put("front", word.front).put("back", word.back).put("deckId", word.deckId))
        }
    }.toString()

    private fun decode(json: String): List<DailyWord> {
        val array = JSONArray(json)
        return (0 until array.length()).map {
            val o = array.getJSONObject(it)
            DailyWord(o.getString("front"), o.getString("back"), o.getString("deckId"))
        }
    }
}
