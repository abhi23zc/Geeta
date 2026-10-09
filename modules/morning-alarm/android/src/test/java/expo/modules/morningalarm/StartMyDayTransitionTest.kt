package expo.modules.morningalarm

import org.junit.Assert.*
import org.junit.Test

class StartMyDayTransitionTest {
  @Test fun sessionValidationRejectsStaleAndTerminatedRequests() {
    assertTrue(StartMyDayTransition.acceptsSession(true, "one", "one"))
    assertFalse(StartMyDayTransition.acceptsSession(true, "one", "two"))
    assertFalse(StartMyDayTransition.acceptsSession(false, "one", "one"))
    assertFalse(StartMyDayTransition.acceptsSession(true, "one", null))
  }
  @Test fun failedDismissalDoesNotAdvanceAndCanRetry() {
    var advanced = false
    try {
      StartMyDayTransition.run("wake", {}, { throw IllegalStateException("receipt") }, { advanced = true }, {})
      fail("Expected failure")
    } catch (_: IllegalStateException) {}
    assertFalse(advanced)
    StartMyDayTransition.run("wake", {}, { null }, { advanced = true }, {})
    assertTrue(advanced)
  }

  @Test fun phaseSaveFailureCanRetryAfterDismissal() {
    var ringing = true
    var stage = "wake"
    var intent = false
    var receipts = 0
    var failSave = true
    fun run() = StartMyDayTransition.run(stage,
      { intent = true },
      { if (ringing) { receipts++; ringing = false }; 42L },
      { if (failSave) throw IllegalStateException("disk"); stage = "breathe" },
      { intent = false })
    try { run(); fail("Expected phase failure") } catch (_: IllegalStateException) {}
    assertFalse(ringing); assertTrue(intent); assertEquals("wake", stage)
    failSave = false
    assertEquals(42L, run()); assertEquals("breathe", stage); assertFalse(intent); assertEquals(1, receipts)
    run(); assertEquals(1, receipts)
  }
  @Test fun intentSaveFailureDoesNotDismiss() {
    var dismissed = false
    try {
      StartMyDayTransition.run("wake", { throw IllegalStateException("disk") }, { dismissed = true; null }, {}, {})
      fail("Expected save failure")
    } catch (_: IllegalStateException) {}
    assertFalse(dismissed)
  }
  @Test fun completedStagesCannotRegressAndEndedSessionCannotStart() {
    for (stage in listOf("breathe", "gita")) {
      var advanced = false
      StartMyDayTransition.run(stage, { fail("Unexpected intent") }, { fail("Unexpected dismissal"); null }, { advanced = true }, {})
      assertFalse(advanced)
    }
    try { StartMyDayTransition.run(null, {}, { null }, {}, {}); fail("Expected rejection") }
    catch (_: IllegalArgumentException) {}
  }
}
