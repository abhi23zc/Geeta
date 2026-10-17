package expo.modules.morningalarm

object SnoozePolicy {
  fun available(ringing: Boolean, test: Boolean, occurrence: Long, usedOccurrence: Long) =
    ringing && !test && occurrence > 0 && occurrence != usedOccurrence
  fun accepts(occurrence: Long, revision: Long, savedOccurrence: Long, savedRevision: Long, pendingAt: Long, now: Long) =
    occurrence > 0 && occurrence == savedOccurrence && revision == savedRevision && pendingAt > 0 && now >= pendingAt

  /** Playback stops only after scheduling and all durable state writes succeed. */
  fun commit(schedule: () -> Unit, persist: () -> Unit, release: () -> Unit, rollback: () -> Unit, stop: () -> Unit) {
    try { schedule(); persist(); release() } catch (e: Exception) { rollback(); throw e }
    stop()
  }
}
