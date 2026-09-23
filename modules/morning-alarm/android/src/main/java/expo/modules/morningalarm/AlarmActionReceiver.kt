package expo.modules.morningalarm

import android.content.Context

object AlarmController {
  fun dismiss(context: Context, finishActivity: Boolean = true): Long? {
    val config = AlarmStore.get(context)?.takeIf { it.enabled }
    val next = config?.let { runCatching { AlarmScheduler.scheduleNext(context, it) }.getOrNull() }
    // Update shared state before resolving the JS call so the global route guard
    // cannot bounce a completed alarm back to the wake screen.
    AlarmStore.setRinging(context, false)
    context.startService(AlarmService.stopIntent(context, "start-my-day"))
    if (finishActivity) AlarmActivity.finishVisible() else AlarmActivity.releaseVisibleStrictMode()
    AlarmLog.event("dismiss_complete", "next=$next")
    return next
  }

}
