package expo.modules.morningalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    synchronized(AlarmScheduler) {
    AlarmLog.initialize(context)
    AlarmLog.event("receiver_fired")
    val test = intent.getBooleanExtra("test", false)
    if (!AlarmCapabilities.ready(context)) {
      AlarmLog.event("delivery_paused", "required access missing")
      return
    }
    if (test && AlarmStore.isRinging(context)) return
    val config = if (test) AlarmConfig(hour = 0, minute = 0, weekdays = emptySet(), enabled = true, gradualVolume = false, vibration = true, revision = 0) else AlarmStore.get(context) ?: return
    val revision = intent.getLongExtra(AlarmScheduler.EXTRA_REVISION, -1L)
    if (!config.enabled || revision != config.revision) {
      AlarmLog.event("receiver_rejected", "enabled=${config.enabled}, revision=$revision")
      return
    }

    val scheduledAt = intent.getLongExtra(AlarmScheduler.EXTRA_SCHEDULED_AT, System.currentTimeMillis())
    val service = AlarmService.startIntent(context, scheduledAt).putExtra("test", test).putExtra(AlarmScheduler.EXTRA_REVISION, config.revision)
    runCatching {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(service)
      else context.startService(service)
    }.onSuccess { AlarmLog.event("foreground_service_requested") }
      .onFailure { AlarmLog.event("foreground_service_failed", it.javaClass.simpleName) }

    // Tests have independent scheduling identifiers and never create a recurrence.
    if (!test) runCatching { AlarmScheduler.scheduleNext(context, config) }
      .onFailure { AlarmLog.event("reschedule_failed", it.javaClass.simpleName) }
    }
  }
}
