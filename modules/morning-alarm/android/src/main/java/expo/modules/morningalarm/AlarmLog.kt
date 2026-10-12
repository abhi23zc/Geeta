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
    event("build", "package=${value.packageName} updatedAt=${info.lastUpdateTime} handoff=v2 version=${info.versionName} code=${if (android.os.Build.VERSION.SDK_INT >= 28) info.longVersionCode else info.versionCode.toLong()} debug=${value.applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE != 0}")
  }
  @Synchronized fun event(name: String, detail: String = "") {
    val occurrence = context?.let { AlarmStore.scheduledAt(it) } ?: 0L
    val message = "${System.currentTimeMillis()} $name occurrence=$occurrence ${detail.take(240)}"
    Log.i("MorningAlarm", message)
    val ctx = context ?: return
    val rows = entries(ctx).takeLast(99) + message
    ctx.createDeviceProtectedStorageContext().getSharedPreferences("alarm_diagnostics", Context.MODE_PRIVATE)
      .edit().putString("events", JSONArray(rows).toString()).apply()
  }
  fun buildIdentity(ctx: Context): Map<String, Any> {
    val info = ctx.packageManager.getPackageInfo(ctx.packageName, 0)
    return mapOf("package" to ctx.packageName, "version" to (info.versionName ?: "unknown"),
      "versionCode" to if (android.os.Build.VERSION.SDK_INT >= 28) info.longVersionCode else @Suppress("DEPRECATION") info.versionCode.toLong(),
      "updatedAt" to info.lastUpdateTime, "debug" to (ctx.applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE != 0))
  }
  @Synchronized fun entries(ctx: Context): List<String> {
    val raw = ctx.createDeviceProtectedStorageContext().getSharedPreferences("alarm_diagnostics", Context.MODE_PRIVATE).getString("events", "[]")
    return runCatching { val array = JSONArray(raw); (0 until array.length()).map { array.getString(it) } }.getOrDefault(emptyList())
  }
}
