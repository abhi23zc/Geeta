package expo.modules.morningalarm

/** Transient, main-thread-owned readiness. No persisted readiness survives recreation. */
internal class PresentationSession {
  var status = "inactive"; private set
  var hostGeneration = 0; private set
  var coverGeneration = 0; private set
  var sessionId: String? = null; private set
  var stage: String? = null; private set
  var startedAt = 0L; private set
  var retryInFlight = false; private set
  fun remaining(now: Long) = (10000L - (now - startedAt)).coerceAtLeast(0)
  fun beginRetry(): Boolean {
    if (retryInFlight || status !in setOf("loading", "recovery")) return false
    retryInFlight = true
    return true
  }
  fun cancelRetry() { retryInFlight = false }

  fun prepare(newHost: Boolean, id: String?, expected: String?, now: Long): Boolean {
    if (newHost) hostGeneration++
    if (newHost || id != sessionId || expected != stage || status == "inactive") {
      retryInFlight = false
      sessionId = id; stage = expected
      status = if (expected == null) "inactive" else "loading"
      startedAt = now
      return true
    }
    return false
  }
  fun attach() { check(status == "loading"); coverGeneration++ }
  fun rejection(id: String, expected: String, host: Int, cover: Int): String? = when {
    status == "inactive" -> "inactive"
    id != sessionId -> "session"
    expected != stage -> "stage"
    host != hostGeneration -> "host"
    cover != coverGeneration -> "cover"
    else -> null
  }
  fun ready() { status = "ready"; retryInFlight = false }
  fun acknowledge(id: String, expected: String, host: Int, cover: Int, removeCover: () -> Unit, publish: () -> Unit): String? {
    val reason = rejection(id, expected, host, cover)
    if (reason != null) return reason
    removeCover()
    ready()
    publish()
    return null
  }
  fun recover(): Boolean {
    if (status != "loading") return false
    status = "recovery"; return true
  }
  fun end() { status = "inactive"; retryInFlight = false }
}
