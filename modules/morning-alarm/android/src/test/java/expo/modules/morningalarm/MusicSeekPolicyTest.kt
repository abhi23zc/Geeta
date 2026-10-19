package expo.modules.morningalarm

import org.junit.Assert.*
import org.junit.Test

class MusicSeekPolicyTest {
  @Test fun bufferingDoesNotConfirmAnOptimisticTimeline() {
    assertFalse(MusicSeekPolicy.confirmed(30000, 30000, false, false, 60000))
    assertTrue(MusicSeekPolicy.confirmed(30000, 30100, true, false, 60000))
  }
  @Test fun stalePositionDoesNotConfirm() {
    assertFalse(MusicSeekPolicy.confirmed(30000, 0, true, false, 60000))
  }
  @Test fun seekingToTheEndCanSettle() {
    assertTrue(MusicSeekPolicy.confirmed(60000, 60000, false, true, 60000))
    assertFalse(MusicSeekPolicy.confirmed(30000, 30000, false, true, 60000))
  }
}
