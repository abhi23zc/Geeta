package expo.modules.morningalarm

import android.content.Context
import android.util.Log
import org.json.JSONArray

object AlarmLog {
  private var context: Context? = null
  fun initialize(value: Context) {
    if (context != null) return
    context = value.applicationContext
    val info = value.packageManager.getPackageInfo(value.packageName, 0)
    event("build", "handoff=v2 version=${info.versionName} code=${if (android.os.Build.VERSION.SDK_INT >= 28) info.longVersionCode else info.versionCode.toLong()} debug=${value.applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE != 0}")
  }
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
