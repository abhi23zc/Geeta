package expo.modules.morningalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    AlarmLog.event("receiver_fired")
    val config = AlarmStore.get(context) ?: return
    val revision = intent.getLongExtra(AlarmScheduler.EXTRA_REVISION, -1L)
    if (!config.enabled || revision != config.revision) {
      AlarmLog.event("receiver_rejected", "enabled=${config.enabled}, revision=$revision")
      return
    }

    val scheduledAt = intent.getLongExtra(AlarmScheduler.EXTRA_SCHEDULED_AT, System.currentTimeMillis())
    val service = AlarmService.startIntent(context, scheduledAt)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(service)
    } else {
      context.startService(service)
    }
    AlarmLog.event("foreground_service_requested")

    // There is always one future recurrence after an alarm has fired. Snoozing
    // temporarily replaces it and dismissal restores it.
    runCatching { AlarmScheduler.scheduleNext(context, config) }
  }
}
