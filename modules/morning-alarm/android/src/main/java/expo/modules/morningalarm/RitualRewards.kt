package expo.modules.morningalarm

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.util.UUID

/** Durable proof and outbox, separate from alarm configuration and presentation cleanup. */
object RitualRewards {
  private fun prefs(context: Context) = context.createDeviceProtectedStorageContext()
    .getSharedPreferences("morning-alarm-rewards-v1", Context.MODE_PRIVATE)
  private fun matchesSession(context: Context): Boolean {
    val p = prefs(context)
    val session = AlarmPresentation.state(context)["sessionId"] as? String ?: return false
    // Existing upgraded sessions retain their original proof; new deliveries must match exactly.
    return AlarmPolicy.matchesRewardSession(session, p.getLong("scheduledAt", -1L), p.getBoolean("test", true))
  }
  @Synchronized fun begin(context: Context, scheduledAt: Long, test: Boolean) {
    val p = prefs(context)
    if (p.getLong("scheduledAt", -1L) == scheduledAt && p.getBoolean("test", false) == test) return
    check(p.edit().putString("id", UUID.randomUUID().toString()).putLong("scheduledAt", scheduledAt)
      .putBoolean("test", test).putString("startedAt", Instant.now().toString())
      .remove("wakeAt").remove("breathingAt").remove("completedAt").commit()) { "Could not save ritual receipt" }
  }
  @Synchronized fun awaken(context: Context) {
    val p = prefs(context)
    if (p.getBoolean("test", true) || !matchesSession(context) || !AlarmStore.isRinging(context) || AlarmPresentation.state(context)["stage"] != "wake") return
    check(p.edit().putString("wakeAt", Instant.now().toString()).commit()) { "Could not save wake receipt" }
  }
  @Synchronized fun occurrence(context: Context): Map<String, Any?> {
    val p = prefs(context)
    return mapOf("id" to p.getString("id", null), "test" to p.getBoolean("test", true),
      "startedAt" to p.getString("startedAt", null), "breathingAt" to p.getString("breathingAt", null))
  }
  @Synchronized fun complete(context: Context, id: String, stage: String): Boolean {
    val p = prefs(context)
    if (p.getString("id", null) != id || p.getBoolean("test", true) || !matchesSession(context) || !p.contains("wakeAt") || AlarmPresentation.state(context)["active"] != true || AlarmPresentation.state(context)["stage"] != stage) return false
    val checkpoint = AlarmPresentation.checkpoint(context, stage)?.let { runCatching { JSONObject(it) }.getOrNull() } ?: return false
    if (checkpoint.optString("sessionId") != AlarmPresentation.state(context)["sessionId"]) return false
    if (stage == "breathe") {
      if (checkpoint.optInt("elapsed", 0) < 70) return false
      if (p.contains("breathingAt")) return true
      check(p.edit().putString("breathingAt", Instant.now().toString()).commit()) { "Could not save breathing receipt" }
      return true
    }
    if (stage != "gita" || !p.contains("breathingAt")) return false
    if (!AlarmPolicy.completedGita(checkpoint.optBoolean("readingAvailable", false), checkpoint.optBoolean("readingConfirmed", false), checkpoint.optDouble("completionMs", 0.0), checkpoint.optDouble("playedThroughMs", 0.0))) return false
    if (p.contains("completedAt")) return true
    val completed = Instant.now().toString()
    val pending = JSONArray(p.getString("pending", "[]"))
    pending.put(JSONObject().put("id", "ritual:$id").put("kind", "ritual")
      .put("startedAt", p.getString("startedAt", null)).put("breathingAt", p.getString("breathingAt", null)).put("completedAt", completed))
    check(p.edit().putString("completedAt", completed).putString("pending", pending.toString()).commit()) { "Could not save ritual receipt" }
    return true
  }
  @Synchronized fun pending(context: Context): String = prefs(context).getString("pending", "[]") ?: "[]"
  @Synchronized fun acknowledge(context: Context, ids: List<String>) {
    val p = prefs(context); val old = JSONArray(p.getString("pending", "[]")); val next = JSONArray()
    for (i in 0 until old.length()) if (old.getJSONObject(i).getString("id") !in ids) next.put(old.getJSONObject(i))
    check(p.edit().putString("pending", next.toString()).commit()) { "Could not acknowledge ritual receipt" }
  }
}
