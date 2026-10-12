package expo.modules.morningalarm

import android.app.Notification
import android.content.Context
import android.os.Build
import android.widget.Button
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

/** Runs only in the separately authorized emulator/device session. Does not post alarms. */
@RunWith(AndroidJUnit4::class)
class AlarmNotificationTest {
  private val context: Context get() = InstrumentationRegistry.getInstrumentation().targetContext
  @Test fun notificationResourcesLoadAndDoNotUseLauncherArt() {
    assertNotNull(context.getDrawable(R.drawable.ic_alarm_notification))
    assertNotNull(context.getDrawable(R.drawable.ic_alarm_stop))
    assertNotEquals(context.applicationInfo.icon, R.drawable.ic_alarm_notification)
  }
  /** Use an isolated test installation: these cases create a synthetic ritual session. */
  @Test fun nativeStopWorksWithoutReact() = withFallback(ringing = true) { activity ->
    assertTrue(activity.findViewById<Button>(R.id.alarm_stop).performClick())
    assertFalse(AlarmStore.isRinging(context))
    assertFalse(AlarmPresentation.state(context)["active"] == true)
  }
  @Test fun nativeStartMyDayAdvancesWithoutReact() = withFallback(ringing = false) { activity ->
    assertTrue(activity.findViewById<Button>(R.id.alarm_dismiss).performClick())
    assertEquals("breathe", AlarmPresentation.state(context)["stage"])
  }
  private fun withFallback(ringing: Boolean, verify: (AlarmActivity) -> Unit) {
    val instrumentation = InstrumentationRegistry.getInstrumentation()
    val at = System.currentTimeMillis()
    instrumentation.runOnMainSync {
      AlarmStore.setTest(context, true)
      AlarmStore.setRinging(context, ringing, at, at)
      AlarmPresentation.begin(context, at, true)
    }
    try {
      ActivityScenario.launch<AlarmActivity>(AlarmActivity.intent(context).setClass(context, AlarmActivity::class.java)).use { scenario ->
        instrumentation.waitForIdleSync()
        scenario.onActivity { verify(it) }
      }
    } finally {
      instrumentation.runOnMainSync {
        AlarmStore.setRinging(context, false)
        AlarmStore.setTest(context, false)
        AlarmPresentation.end(context)
      }
    }
  }
  @Test fun bothBuildersHaveImmutableActivityAndBroadcastControls() {
    AlarmNotification.createChannel(context)
    for (minimal in listOf(false, true)) {
      val notification = AlarmNotification.build(context, 123L, false, minimal)
      assertNotNull(notification.smallIcon)
      assertEquals(123L, notification.extras.getLong(AlarmScheduler.EXTRA_SCHEDULED_AT))
      if (Build.VERSION.SDK_INT >= 31) {
        assertTrue(notification.contentIntent.isActivity)
        assertTrue(notification.contentIntent.isImmutable)
      }
      assertEquals(context.packageName, notification.contentIntent.creatorPackage)
      assertEquals(1, notification.actions.size)
      assertNotNull(notification.actions[0].getIcon())
      if (Build.VERSION.SDK_INT >= 31) {
        assertTrue(notification.actions[0].actionIntent.isBroadcast)
        assertTrue(notification.actions[0].actionIntent.isImmutable)
      }
      assertNull(notification.fullScreenIntent)
      assertTrue(notification.flags and Notification.FLAG_ONGOING_EVENT != 0)
    }
  }
}
