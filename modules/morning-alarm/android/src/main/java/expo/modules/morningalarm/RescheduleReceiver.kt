package expo.modules.morningalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class RescheduleReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    AlarmLog.initialize(context)
    AlarmLog.event("reschedule_receiver", intent.action ?: "unknown")
    synchronized(AlarmScheduler) {
    runCatching { AlarmSnooze.restore(context) }.onFailure { AlarmLog.event("snooze_restore_failed", it.javaClass.simpleName) }
    val config = AlarmStore.get(context) ?: return
    runCatching { AlarmScheduler.scheduleNext(context, config, force = true) }
      .onFailure { AlarmLog.event("reschedule_failed", it.javaClass.simpleName) }
    }
  }
}
