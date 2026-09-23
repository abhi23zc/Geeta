package expo.modules.morningalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class RescheduleReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    AlarmLog.event("reschedule_receiver", intent.action ?: "unknown")
    val config = AlarmStore.get(context) ?: return
    if (!config.enabled || !AlarmScheduler.canScheduleExact(context)) return
    runCatching { AlarmScheduler.scheduleNext(context, config) }
  }
}
