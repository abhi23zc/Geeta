package expo.modules.morningalarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.time.DayOfWeek
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

object AlarmScheduler {
  const val EXTRA_REVISION = "revision"
  const val EXTRA_SCHEDULED_AT = "scheduled_at"
  private const val REQUEST_ALARM = 6101
  private const val REQUEST_SHOW = 6102

  fun nextOccurrence(config: AlarmConfig, now: Instant, zone: ZoneId = ZoneId.systemDefault()): Instant? {
    if (!config.enabled || config.weekdays.isEmpty()) return null
    val localNow = now.atZone(zone)
    for (offset in 0..7) {
      val date = localNow.toLocalDate().plusDays(offset.toLong())
      if (dayId(date.dayOfWeek) !in config.weekdays) continue
      val candidate = ZonedDateTime.of(date, java.time.LocalTime.of(config.hour, config.minute), zone)
      if (candidate.toInstant().isAfter(now)) return candidate.toInstant()
    }
    return null
  }

  private fun prefs(context: Context) = context.createDeviceProtectedStorageContext()
    .getSharedPreferences("morning-alarm-schedule-v1", Context.MODE_PRIVATE)

  @Synchronized fun status(context: Context): Map<String, Any?> {
    val p = prefs(context)
    return mapOf("scheduleStatus" to p.getString("status", "unknown"),
      "scheduledAt" to p.getLong("at", 0L).toDouble(), "revision" to p.getLong("revision", -1L),
      "scheduleError" to p.getString("error", null))
  }

  @Synchronized fun scheduleNext(context: Context, config: AlarmConfig, force: Boolean = false): Long? {
    val at = nextOccurrence(config, Instant.now())?.toEpochMilli()
    if (!config.enabled || at == null) { cancel(context); return null }
    if (!AlarmCapabilities.ready(context)) { cancel(context, "needs-access"); return null }
    val p = prefs(context)
    val operation = PendingIntent.getBroadcast(context, REQUEST_ALARM, Intent(context, AlarmReceiver::class.java), PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)
    if (AlarmPolicy.reuseSchedule(force, operation != null, p.getString("status", null), p.getLong("revision", -1L), config.revision, p.getLong("at", 0L), at)) return at
    cancel(context, "unknown")
    try {
      scheduleAt(context, config, at)
      check(p.edit().putString("status", "scheduled").putLong("at", at)
        .putLong("revision", config.revision).putLong("updatedAt", System.currentTimeMillis()).remove("error").commit())
      return at
    } catch (error: Exception) {
      cancel(context, "failed")
      p.edit().putString("error", error.javaClass.simpleName).commit()
      AlarmLog.event("schedule_failed", error.javaClass.simpleName)
      return null
    }
  }

  private fun scheduleAt(context: Context, config: AlarmConfig, at: Long, test: Boolean = false) {
    val manager = context.getSystemService(AlarmManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !manager.canScheduleExactAlarms()) {
      throw SecurityException("Exact alarm access is required")
    }
    val operation = PendingIntent.getBroadcast(
      context,
      if (test) 6111 else REQUEST_ALARM,
      Intent(context, AlarmReceiver::class.java)
        .putExtra("test", test)
        .putExtra(EXTRA_REVISION, config.revision)
        .putExtra(EXTRA_SCHEDULED_AT, at),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val show = PendingIntent.getActivity(
      context,
      if (test) 6112 else REQUEST_SHOW,
      (context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent(context, AlarmActivity::class.java))
        .setAction(Intent.ACTION_VIEW).setData(android.net.Uri.parse("geeta:///alarm/setup")),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    AlarmLog.initialize(context)
    manager.setAlarmClock(AlarmManager.AlarmClockInfo(at, show), operation)
    AlarmLog.event("scheduled", "at=$at test=$test")
  }

  @Synchronized fun scheduleTest(context: Context): Long {
    val at = System.currentTimeMillis() + 30_000L
    scheduleAt(context, AlarmConfig(hour = 0, minute = 0, weekdays = emptySet(), enabled = true, gradualVolume = false, vibration = true, revision = 0), at, test = true)
    return at
  }

  @Synchronized fun cancel(context: Context, status: String = "disabled") {
    val operation = PendingIntent.getBroadcast(
      context,
      REQUEST_ALARM,
      Intent(context, AlarmReceiver::class.java),
      PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE,
    )
    if (operation != null) {
      context.getSystemService(AlarmManager::class.java).cancel(operation)
      operation.cancel()
    }
    check(prefs(context).edit().putString("status", status).remove("at").remove("revision")
      .remove("error").putLong("updatedAt", System.currentTimeMillis()).commit())
  }

  fun canScheduleExact(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    return context.getSystemService(AlarmManager::class.java).canScheduleExactAlarms()
  }

  private fun dayId(day: DayOfWeek) = when (day) {
    DayOfWeek.MONDAY -> "mon"
    DayOfWeek.TUESDAY -> "tue"
    DayOfWeek.WEDNESDAY -> "wed"
    DayOfWeek.THURSDAY -> "thu"
    DayOfWeek.FRIDAY -> "fri"
    DayOfWeek.SATURDAY -> "sat"
    DayOfWeek.SUNDAY -> "sun"
  }
}
