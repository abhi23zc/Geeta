package expo.modules.morningalarm

/** Pure policies shared with native unit tests; Android state stays in its owners. */
object AlarmPolicy {
  fun reuseSchedule(force: Boolean, exists: Boolean, status: String?, revision: Long, expectedRevision: Long, at: Long, expectedAt: Long) =
    !force && exists && status == "scheduled" && revision == expectedRevision && at == expectedAt
  fun acceptsStop(expectedAt: Long, activeAt: Long) = activeAt > 0 && expectedAt == activeAt
  fun stageAllowed(current: String?, next: String, ringing: Boolean, breathingElapsed: Int) =
    current != null && (current == next || (current == "wake" && next == "breathe" && !ringing) ||
      (current == "breathe" && next == "gita" && breathingElapsed == 70 && !ringing))
  fun completedGita(readingAvailable: Boolean, readingConfirmed: Boolean, completionMs: Double, throughMs: Double) =
    (readingAvailable && readingConfirmed) || (completionMs.isFinite() && completionMs > 0 && throughMs.isFinite() && throughMs >= completionMs)
  fun useDownloadedTone(kind: String) = kind == "downloaded"
  fun matchesRewardSession(session: String, scheduledAt: Long, test: Boolean) =
    session.startsWith("legacy:") || session == "$scheduledAt:$test"
}
