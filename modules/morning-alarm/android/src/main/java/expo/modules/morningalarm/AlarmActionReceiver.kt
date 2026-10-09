package expo.modules.morningalarm

import android.app.Activity
import android.content.Context

object AlarmController {
  /** Same occurrence retries repair a committed dismissal without creating new evidence. */
  fun startMyDay(activity: Activity, id: String): Map<String, Any?> = synchronized(AlarmScheduler) {
    val state = AlarmPresentation.state(activity)
    require(StartMyDayTransition.acceptsSession(state["active"] == true, id, state["sessionId"] as? String)) { "Alarm session changed" }
    val stage = state["stage"] as? String
    val next = StartMyDayTransition.run(
      stage = stage,
      saveIntent = { AlarmPresentation.saveWakeTransition(activity, id) },
      dismiss = {
        if (AlarmStore.isRinging(activity)) {
          // Persist reward proof before irreversible playback dismissal; tests create none.
          RitualRewards.awaken(activity)
          dismiss(activity, finishActivity = false)
        } else null
      },
      advance = { AlarmPresentation.setStage(activity, "breathe", id) },
      clearIntent = { AlarmPresentation.clearWakeTransition(activity, id) },
    )
    mapOf("stage" to AlarmPresentation.state(activity)["stage"], "scheduledAt" to next?.toDouble())
  }

  fun dismiss(context: Context, finishActivity: Boolean = true, expectedAt: Long? = null): Long? = synchronized(AlarmScheduler) {
    val occurrence = AlarmStore.scheduledAt(context)
    if (!AlarmStore.isRinging(context) || (expectedAt != null && expectedAt != occurrence)) return null
    val sessionId = AlarmPresentation.state(context)["sessionId"] as? String
    if (!finishActivity) runCatching { RitualRewards.awaken(context) }
      .onFailure { AlarmLog.event("reward_wake_failed", it.javaClass.simpleName) }
    val config = if (AlarmStore.isTest(context)) null else AlarmStore.get(context)?.takeIf { it.enabled && AlarmCapabilities.ready(context) }
    val next = config?.let { runCatching { AlarmScheduler.scheduleNext(context, it) }.getOrNull() }
    // Update shared state before resolving the JS call so the global route guard
    // cannot bounce a completed alarm back to the wake screen.
    AlarmStore.setRinging(context, false)
    val reason = if (finishActivity) "notification-stop" else "start-my-day"
    runCatching { context.startService(AlarmService.stopIntent(context, reason, occurrence)) }
      .onFailure {
        AlarmLog.event("stop_service_request_failed", it.javaClass.simpleName)
        // A stale notification must not start a forbidden background service.
        context.stopService(AlarmService.stopIntent(context, "start-my-day"))
      }
    if (finishActivity) {
      AlarmPresentation.end(context, reason, sessionId)
      AlarmActivity.finishVisible()
    }
    AlarmLog.event("dismiss_complete", "next=$next")
    return next
  }

}
