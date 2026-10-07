package expo.modules.morningalarm

import org.junit.Assert.*
import org.junit.Test

class AlarmPolicyTest {
  @Test fun onlyAnUnchangedConfirmedScheduleIsReusable() {
    assertTrue(AlarmPolicy.reuseSchedule(false, true, "scheduled", 2, 2, 100, 100))
    assertFalse(AlarmPolicy.reuseSchedule(true, true, "scheduled", 2, 2, 100, 100))
    assertFalse(AlarmPolicy.reuseSchedule(false, false, "scheduled", 2, 2, 100, 100))
    assertFalse(AlarmPolicy.reuseSchedule(false, true, "failed", 2, 2, 100, 100))
    assertFalse(AlarmPolicy.reuseSchedule(false, true, "scheduled", 1, 2, 100, 100))
    assertFalse(AlarmPolicy.reuseSchedule(false, true, "scheduled", 2, 2, 99, 100))
  }
  @Test fun staleStopsCannotStopNewOrAbsentOccurrences() {
    assertTrue(AlarmPolicy.acceptsStop(100, 100))
    assertFalse(AlarmPolicy.acceptsStop(100, 200))
    assertFalse(AlarmPolicy.acceptsStop(0, 0))
    assertFalse(AlarmPolicy.acceptsStop(-1, 100))
  }
  @Test fun stagesCannotSkipOrRegress() {
    assertTrue(AlarmPolicy.stageAllowed("wake", "wake", true, 0))
    assertFalse(AlarmPolicy.stageAllowed("wake", "breathe", true, 0))
    assertTrue(AlarmPolicy.stageAllowed("wake", "breathe", false, 0))
    assertFalse(AlarmPolicy.stageAllowed("wake", "gita", false, 70))
    assertFalse(AlarmPolicy.stageAllowed("breathe", "gita", false, 69))
    assertTrue(AlarmPolicy.stageAllowed("breathe", "gita", false, 70))
    assertFalse(AlarmPolicy.stageAllowed("gita", "breathe", false, 70))
    assertFalse(AlarmPolicy.stageAllowed(null, "gita", false, 70))
  }
  @Test fun gitaRequiresListeningOrExplicitAvailableReading() {
    assertFalse(AlarmPolicy.completedGita(false, false, 1000.0, 999.0))
    assertTrue(AlarmPolicy.completedGita(false, false, 1000.0, 1000.0))
    assertFalse(AlarmPolicy.completedGita(false, true, 0.0, 0.0))
    assertTrue(AlarmPolicy.completedGita(true, true, 0.0, 0.0))
    assertFalse(AlarmPolicy.completedGita(false, false, Double.NaN, Double.POSITIVE_INFINITY))
  }
  @Test fun systemTestsCannotSelectDownloadedAudio() {
    assertFalse(AlarmPolicy.useDownloadedTone("system"))
    assertFalse(AlarmPolicy.useDownloadedTone("bundled"))
    assertTrue(AlarmPolicy.useDownloadedTone("downloaded"))
  }
  @Test fun failedReceiptInitializationCannotReuseAnotherOccurrenceProof() {
    assertTrue(AlarmPolicy.matchesRewardSession("100:false", 100, false))
    assertFalse(AlarmPolicy.matchesRewardSession("200:false", 100, false))
    assertFalse(AlarmPolicy.matchesRewardSession("100:true", 100, false))
    assertTrue(AlarmPolicy.matchesRewardSession("legacy:existing-session", 100, false))
  }
}
