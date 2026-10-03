package expo.modules.morningalarm

import android.content.Context
import android.util.Log
import org.json.JSONArray

object AlarmLog {
  private var context: Context? = null
  fun initialize(value: Context) { context = value.applicationContext }
  @Synchronized fun event(name: String, detail: String = "") {
    val message = "${System.currentTimeMillis()} $name ${detail.take(240)}"
    Log.i("MorningAlarm", message)
    val ctx = context ?: return
    val rows = entries(ctx).takeLast(99) + message
    ctx.createDeviceProtectedStorageContext().getSharedPreferences("alarm_diagnostics", Context.MODE_PRIVATE)
      .edit().putString("events", JSONArray(rows).toString()).apply()
  }
  @Synchronized fun entries(ctx: Context): List<String> {
    val raw = ctx.createDeviceProtectedStorageContext().getSharedPreferences("alarm_diagnostics", Context.MODE_PRIVATE).getString("events", "[]")
    return runCatching { val array = JSONArray(raw); (0 until array.length()).map { array.getString(it) } }.getOrDefault(emptyList())
  }
}
