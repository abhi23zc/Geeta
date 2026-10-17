package expo.modules.morningalarm

import org.junit.Assert.*
import org.junit.Test

class SnoozePolicyTest {
  @Test fun oneUsePerOccurrenceAndNoTests() {
    assertTrue(SnoozePolicy.available(true, false, 100, -1))
    assertFalse(SnoozePolicy.available(true, false, 100, 100))
    assertTrue(SnoozePolicy.available(true, false, 200, 100))
    assertFalse(SnoozePolicy.available(true, true, 100, -1))
    assertFalse(SnoozePolicy.available(false, false, 100, -1))
  }
  @Test fun retryRequiresMatchingOccurrenceRevisionAndDueTime() {
    assertTrue(SnoozePolicy.accepts(100, 2, 100, 2, 500, 500))
    assertFalse(SnoozePolicy.accepts(101, 2, 100, 2, 500, 500))
    assertFalse(SnoozePolicy.accepts(100, 3, 100, 2, 500, 500))
    assertFalse(SnoozePolicy.accepts(100, 2, 100, 2, 500, 499))
    assertFalse(SnoozePolicy.accepts(100, 2, 100, 2, 0, 500))
  }
  @Test fun failuresNeverStopPlayback() {
    for (failed in listOf("schedule", "persist", "release")) {
      val calls = mutableListOf<String>()
      fun step(name: String) { calls.add(name); if (name == failed) error("failed") }
      try { SnoozePolicy.commit({ step("schedule") }, { step("persist") }, { step("release") }, { step("rollback") }, { step("stop") }); fail() } catch (_: IllegalStateException) {}
      assertEquals("rollback", calls.last()); assertFalse(calls.contains("stop"))
    }
  }
  @Test fun successfulCommitStopsLast() {
    val calls = mutableListOf<String>()
    SnoozePolicy.commit({ calls.add("schedule") }, { calls.add("persist") }, { calls.add("release") }, { calls.add("rollback") }, { calls.add("stop") })
    assertEquals(listOf("schedule", "persist", "release", "stop"), calls)
  }
}
