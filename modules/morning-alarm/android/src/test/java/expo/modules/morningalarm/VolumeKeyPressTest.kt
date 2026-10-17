package expo.modules.morningalarm

import org.junit.Assert.*
import org.junit.Test
import expo.modules.morningalarm.VolumeKeyPress.Result.*

class VolumeKeyPressTest {
  private val up = 24
  private val down = 25

  @Test fun bothButtonsConsumeRepeatsAndReleaseAfterPlaybackStops() {
    for (key in listOf(up, down)) {
      val press = VolumeKeyPress()
      assertEquals(PRESS, press.handle(key, true, false, 0, true))
      for (repeat in 1..20) assertEquals(CONSUME, press.handle(key, true, false, repeat, false))
      assertEquals(CONSUME, press.handle(key, false, true, 0, false))
      assertEquals(PASS, press.handle(key, true, false, 0, false))
    }
  }

  @Test fun overlappingButtonsKeepIndependentOwnershipAndNoDuplicateDown() {
    val press = VolumeKeyPress()
    assertEquals(PRESS, press.handle(up, true, false, 0, true))
    assertEquals(PRESS, press.handle(down, true, false, 0, true))
    assertEquals(CONSUME, press.handle(up, true, false, 0, true))
    assertEquals(CONSUME, press.handle(up, false, true, 0, false))
    assertEquals(CONSUME, press.handle(down, true, false, 1, false))
    assertEquals(CONSUME, press.handle(down, false, true, 0, false))
  }

  @Test fun failedRequestCanRetryOnlyOnANewPress() {
    val press = VolumeKeyPress()
    assertEquals(PRESS, press.handle(down, true, false, 0, true))
    assertEquals(CONSUME, press.handle(down, true, false, 1, true))
    assertEquals(CONSUME, press.handle(down, false, true, 0, true))
    assertEquals(PRESS, press.handle(down, true, false, 0, true))
  }

  @Test fun missedInitialDownNeverTriggersSnoozeFromARepeatOrKeyUp() {
    val press = VolumeKeyPress()
    assertEquals(CONSUME, press.handle(up, true, false, 2, true))
    assertEquals(CONSUME, press.handle(up, false, true, 0, false))
    assertEquals(CONSUME, press.handle(down, false, true, 0, true))
    assertEquals(PASS, press.handle(down, false, true, 0, false))
  }

  @Test fun hostHandoffKeepsThePressAndANewDownRecoversFromAMissingUp() {
    val press = VolumeKeyPress()
    assertEquals(PRESS, press.handle(up, true, false, 0, true, 10))
    // Same physical downTime arrives at Home after the fallback finishes.
    assertEquals(CONSUME, press.handle(up, true, false, 1, false, 10))
    assertEquals(CONSUME, press.handle(up, false, true, 0, false, 10))
    assertEquals(PRESS, press.handle(down, true, false, 0, true, 20))
    // Another app received the release. The next physical press is independent.
    assertEquals(PRESS, press.handle(down, true, false, 0, true, 30))
    assertEquals(CONSUME, press.handle(down, true, false, 0, true, 30))
    assertEquals(CONSUME, press.handle(down, false, true, 0, true, 30))
  }

  @Test fun rapidAlternatingPressesShareTheSameUsedOccurrenceAsTheButton() {
    val press = VolumeKeyPress()
    var used = -1L
    var requests = 0
    var alreadyUsed = 0
    var ringing = true
    fun request() {
      if (!SnoozePolicy.available(ringing, false, 100L, used)) { alreadyUsed++; return }
      SnoozePolicy.commit({}, { used = 100L }, {}, {}, { ringing = false; requests++ })
    }
    // The hardware request wins; an already queued on-screen request sees the same state.
    assertEquals(PRESS, press.handle(up, true, false, 0, ringing))
    request()
    request()
    assertEquals(CONSUME, press.handle(up, false, true, 0, ringing))
    ringing = true // Five-minute retry rings with the original occurrence.
    for (key in listOf(down, up, down, up)) {
      assertEquals(PRESS, press.handle(key, true, false, 0, ringing))
      request()
      assertEquals(CONSUME, press.handle(key, true, false, 1, ringing))
      assertEquals(CONSUME, press.handle(key, false, true, 0, ringing))
    }
    assertEquals(1, requests)
    assertEquals(5, alreadyUsed)
    assertTrue(ringing)
  }
}
