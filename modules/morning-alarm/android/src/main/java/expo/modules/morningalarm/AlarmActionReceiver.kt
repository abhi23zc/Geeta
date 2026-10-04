package expo.modules.morningalarm

import android.content.Context

object AlarmController {
  fun dismiss(context: Context, finishActivity: Boolean = true): Long? {
    val config = if (AlarmStore.isTest(context)) null else AlarmStore.get(context)?.takeIf { it.enabled && AlarmCapabilities.ready(context) }
    val next = config?.let { runCatching { AlarmScheduler.scheduleNext(context, it) }.getOrNull() }
    // Update shared state before resolving the JS call so the global route guard
    // cannot bounce a completed alarm back to the wake screen.
    AlarmStore.setRinging(context, false)
    runCatching { context.startService(AlarmService.stopIntent(context, "start-my-day")) }
      .onFailure {
        AlarmLog.event("stop_service_request_failed", it.javaClass.simpleName)
        // A stale notification must not start a forbidden background service.
        context.stopService(AlarmService.stopIntent(context, "start-my-day"))
      }
    if (finishActivity) {
      AlarmPresentation.end(context)
      AlarmActivity.finishVisible()
    }
    AlarmLog.event("dismiss_complete", "next=$next")
    return next
  }

}
