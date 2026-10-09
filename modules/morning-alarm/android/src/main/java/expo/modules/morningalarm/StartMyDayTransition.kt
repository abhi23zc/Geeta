package expo.modules.morningalarm

/** Ordered, retryable orchestration. A failed phase commit leaves dismissal safe to repeat. */
object StartMyDayTransition {
  fun acceptsSession(active: Boolean, expected: String, actual: String?) = active && expected == actual
  fun run(stage: String?, saveIntent: () -> Unit, dismiss: () -> Long?, advance: () -> Unit, clearIntent: () -> Unit): Long? {
    require(stage in setOf("wake", "breathe", "gita")) { "Alarm session changed" }
    if (stage != "wake") { clearIntent(); return null }
    saveIntent()
    val next = dismiss()
    advance()
    clearIntent()
    return next
  }
}
