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

  fun scheduleNext(context: Context, config: AlarmConfig): Long? {
    cancel(context)
    val at = nextOccurrence(config, Instant.now())?.toEpochMilli() ?: return null
    scheduleAt(context, config, at)
    return at
  }

  private fun scheduleAt(context: Context, config: AlarmConfig, at: Long) {
    val manager = context.getSystemService(AlarmManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !manager.canScheduleExactAlarms()) {
      throw SecurityException("Exact alarm access is required")
    }
    val operation = PendingIntent.getBroadcast(
      context,
      REQUEST_ALARM,
      Intent(context, AlarmReceiver::class.java)
        .putExtra(EXTRA_REVISION, config.revision)
        .putExtra(EXTRA_SCHEDULED_AT, at),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val show = PendingIntent.getActivity(
      context,
      REQUEST_SHOW,
      AlarmActivity.intent(context),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    manager.setAlarmClock(AlarmManager.AlarmClockInfo(at, show), operation)
  }

  fun cancel(context: Context) {
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
