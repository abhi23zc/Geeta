package expo.modules.morningalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class RescheduleReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    AlarmLog.initialize(context)
    AlarmLog.event("reschedule_receiver", intent.action ?: "unknown")
    val config = AlarmStore.get(context) ?: return
    if (!config.enabled || !AlarmCapabilities.ready(context)) return
    runCatching { AlarmScheduler.scheduleNext(context, config) }
      .onFailure { AlarmLog.event("reschedule_failed", it.javaClass.simpleName) }
  }
}
