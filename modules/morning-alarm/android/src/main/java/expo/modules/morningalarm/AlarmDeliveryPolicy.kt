package expo.modules.morningalarm

internal object AlarmDeliveryPolicy {
  fun refreshLanguage(exists: Boolean, previous: String, next: String) = !exists || previous != next
  fun fullScreen(initialDelivery: Boolean, allowed: Boolean) = initialDelivery && allowed
}

/** Owned by one service; cancellation must not poison a later alarm's updates. */
internal class NotificationRefresh {
  private var pending = false
  fun request(): Boolean {
    if (pending) return false
    pending = true
    return true
  }
  fun complete() { pending = false }
}
