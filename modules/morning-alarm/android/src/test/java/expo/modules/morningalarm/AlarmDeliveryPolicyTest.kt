package expo.modules.morningalarm

import org.junit.Assert.*
import org.junit.Test

class AlarmDeliveryPolicyTest {
  @Test fun enabledChannelDoesNotRequireHighImportance() {
    assertFalse(AlarmDeliveryPolicy.channelEnabled(0))
    assertFalse(AlarmDeliveryPolicy.channelEnabled(-1000))
    for (importance in 1..5) assertTrue(AlarmDeliveryPolicy.channelEnabled(importance))
  }
  @Test fun missingNotificationRetriesOnceThenFails() {
    assertEquals("retry", AlarmDeliveryPolicy.presenceAction(false, false))
    assertEquals("monitor", AlarmDeliveryPolicy.presenceAction(true, true))
    assertEquals("fail", AlarmDeliveryPolicy.presenceAction(false, true))
    assertEquals("monitor", AlarmDeliveryPolicy.presenceAction(null, true))
    assertFalse(AlarmDeliveryPolicy.fullScreen(false, true))
  }
  @Test fun stoppedReplacedAndOldServiceCallbacksAreIgnored() {
    assertTrue(AlarmDeliveryPolicy.callbackActive(100, 100, 1, 1, true))
    assertFalse(AlarmDeliveryPolicy.callbackActive(100, 100, 1, 1, false))
    assertFalse(AlarmDeliveryPolicy.callbackActive(100, 200, 1, 1, true))
    assertFalse(AlarmDeliveryPolicy.callbackActive(100, 100, 1, 2, true))
  }
}
