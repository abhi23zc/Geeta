package expo.modules.morningalarm

import org.junit.Assert.*
import org.junit.Test

class PresentationSessionTest {
  private fun loading() = PresentationSession().apply { prepare(true, "one", "wake", 100); attach() }
  @Test fun duplicateLoadingKeepsCoverAndDeadline() {
    val p = loading()
    assertFalse(p.prepare(false, "one", "wake", 9000))
    assertEquals(100L, p.startedAt)
    assertEquals(1, p.coverGeneration)
    assertEquals("loading", p.status)
  }
  @Test fun readyDuplicateKeepsReact() {
    val p = loading()
    assertNull(p.rejection("one", "wake", 1, 1))
    p.ready()
    assertFalse(p.prepare(false, "one", "wake", 300))
    assertEquals("ready", p.status)
    assertEquals(1, p.coverGeneration)
  }
  @Test fun staleIdentityCannotRevealScreen() {
    val p = loading()
    assertEquals("session", p.rejection("old", "wake", 1, 1))
    assertEquals("stage", p.rejection("one", "gita", 1, 1))
    assertEquals("host", p.rejection("one", "wake", 0, 1))
    assertEquals("cover", p.rejection("one", "wake", 1, 0))
    assertEquals("loading", p.status)
  }
  @Test fun recreationStageAndSessionRequireFreshReadiness() {
    val p = loading(); p.ready()
    assertTrue(p.prepare(true, "one", "wake", 200)); p.attach()
    assertEquals("host", p.rejection("one", "wake", 1, 1))
    assertEquals(2, p.hostGeneration)
    p.ready()
    assertTrue(p.prepare(false, "one", "breathe", 300)); p.attach()
    assertEquals("stage", p.rejection("one", "wake", 2, 2))
    p.ready()
    assertTrue(p.prepare(false, "two", "wake", 400)); p.attach()
    assertEquals("session", p.rejection("one", "breathe", 2, 3))
  }
  @Test fun recoveryOnlyOnceAndLateReadinessCanSucceed() {
    val p = loading()
    assertTrue(p.recover()); assertFalse(p.recover())
    assertNull(p.rejection("one", "wake", 1, 1)); p.ready()
    assertEquals("ready", p.status)
    assertFalse(p.recover())
    p.end()
    assertEquals("inactive", p.rejection("one", "wake", 1, 1))
    assertFalse(p.recover())
  }
  @Test fun notificationRefreshNeverAutomaticallyLaunches() {
    assertTrue(AlarmDeliveryPolicy.fullScreen(true, true))
    assertFalse(AlarmDeliveryPolicy.fullScreen(true, false))
    assertFalse(AlarmDeliveryPolicy.fullScreen(false, true))
    assertFalse(AlarmDeliveryPolicy.refreshLanguage(true, "hi", "hi"))
    assertTrue(AlarmDeliveryPolicy.refreshLanguage(false, "en", "en"))
    assertTrue(AlarmDeliveryPolicy.refreshLanguage(true, "en", "hinglish"))
  }
  @Test fun handoffRemovesCoverBeforePublishingReady() {
    val p = loading()
    var covered = true
    var publishedLoading = true
    assertNull(p.acknowledge("one", "wake", 1, 1, { covered = false }) {
      assertFalse(covered)
      publishedLoading = p.status != "ready"
    })
    assertFalse(publishedLoading)
    assertEquals("host", p.acknowledge("one", "wake", 0, 1, { fail("Removed for stale host") }, { fail("Published stale readiness") }))
    assertEquals("ready", p.status)
  }
  @Test fun deadlineIsBoundedAndRetryPreservesOccurrenceAndStage() {
    val p = loading()
    assertEquals(10000L, p.remaining(100))
    p.prepare(false, "one", "wake", 5000)
    assertEquals(100L, p.remaining(10000))
    assertEquals(0L, p.remaining(10100))
    p.recover()
    assertTrue(p.beginRetry()); assertFalse(p.beginRetry())
    assertEquals("one", p.sessionId); assertEquals("wake", p.stage)
    p.prepare(true, "one", "wake", 11000); p.attach()
    assertFalse(p.retryInFlight)
    assertEquals("one", p.sessionId); assertEquals("wake", p.stage)
    assertEquals(10000L, p.remaining(11000))
    p.end(); assertFalse(p.beginRetry())
  }
  @Test fun refreshCoalescesAndCancelledUpdateDoesNotPoisonNextAlarm() {
    val updates = NotificationRefresh()
    assertTrue(updates.request()); assertFalse(updates.request())
    updates.complete() // stop cancels a posted update
    assertTrue(updates.request()); assertFalse(updates.request())
    assertTrue(NotificationRefresh().request()) // a replacement service owns its own gate
  }
}
