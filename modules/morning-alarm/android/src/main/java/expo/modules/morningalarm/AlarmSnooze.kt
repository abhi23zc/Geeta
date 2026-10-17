package expo.modules.morningalarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent

/** One durable retry per original occurrence; independent of recurring alarms. */
object AlarmSnooze {
  private const val REQUEST = 6121
  private fun prefs(c: Context) = c.createDeviceProtectedStorageContext().getSharedPreferences("alarm-snooze-v1", Context.MODE_PRIVATE)
  fun available(c: Context) = SnoozePolicy.available(AlarmStore.isRinging(c), AlarmStore.isTest(c), AlarmStore.scheduledAt(c), prefs(c).getLong("occurrence", -1))
  fun pendingAt(c: Context) = if (prefs(c).getString("phase", null) == "pending") prefs(c).getLong("at", 0) else 0L
  private fun intent(c: Context, occurrence: Long, revision: Long) = Intent(c, AlarmReceiver::class.java).setAction("morningalarm.SNOOZE")
    .putExtra("snooze", true).putExtra(AlarmScheduler.EXTRA_SCHEDULED_AT, occurrence).putExtra(AlarmScheduler.EXTRA_REVISION, revision)
  private fun schedule(c: Context, occurrence: Long, revision: Long, at: Long) {
    val operation = PendingIntent.getBroadcast(c, REQUEST, intent(c, occurrence, revision), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val show = PendingIntent.getActivity(c, 6122, c.packageManager.getLaunchIntentForPackage(c.packageName) ?: Intent(c, AlarmActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    c.getSystemService(AlarmManager::class.java).setAlarmClock(AlarmManager.AlarmClockInfo(at, show), operation)
  }
  fun request(c: Context, id: String): Long = synchronized(AlarmScheduler) {
    require(AlarmPresentation.state(c)["sessionId"] == id && AlarmPresentation.state(c)["stage"] == "wake" && available(c)) { "Snooze unavailable" }
    require(AlarmCapabilities.ready(c)) { "Required alarm access missing" }
    val config = AlarmStore.get(c) ?: error("Alarm unavailable")
    val occurrence = AlarmStore.scheduledAt(c)
    check(AlarmService.canPauseForSnooze(occurrence)) { "Alarm service unavailable" }
    val at = System.currentTimeMillis() + 5 * 60_000L
    SnoozePolicy.commit(
      schedule = { schedule(c, occurrence, config.revision, at) },
      persist = { check(prefs(c).edit().putLong("occurrence", occurrence).putLong("revision", config.revision).putLong("at", at).putString("phase", "pending").commit()) },
      release = { AlarmPresentation.end(c, "snoozed", id) },
      rollback = { cancel(c) },
      stop = { AlarmService.pauseForSnooze(c, occurrence) },
    )
    AlarmActivity.finishVisible()
    return at
  }
  fun accepts(c: Context, occurrence: Long, revision: Long): Boolean {
    val p = prefs(c)
    return SnoozePolicy.accepts(occurrence, revision, p.getLong("occurrence", -1), p.getLong("revision", -1), pendingAt(c), System.currentTimeMillis())
  }
  fun delivered(c: Context) { check(prefs(c).edit().putString("phase", "delivered").commit()) }
  fun restore(c: Context) = synchronized(AlarmScheduler) {
    val p = prefs(c); val at = pendingAt(c); if (at == 0L) return@synchronized
    val config = AlarmStore.get(c)
    if (config?.enabled != true || config.revision != p.getLong("revision", -1)) { cancel(c); return@synchronized }
    if (AlarmCapabilities.ready(c)) schedule(c, p.getLong("occurrence", 0), config.revision, maxOf(at, System.currentTimeMillis() + 1000))
  }
  fun cancel(c: Context) {
    val operation = PendingIntent.getBroadcast(c, REQUEST, Intent(c, AlarmReceiver::class.java).setAction("morningalarm.SNOOZE"), PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)
    operation?.let { c.getSystemService(AlarmManager::class.java).cancel(it); it.cancel() }
    check(prefs(c).edit().clear().commit())
  }
}
