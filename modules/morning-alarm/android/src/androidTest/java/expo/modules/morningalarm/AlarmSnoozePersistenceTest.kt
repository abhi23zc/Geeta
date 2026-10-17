package expo.modules.morningalarm

import android.content.Context
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test

class AlarmSnoozePersistenceTest {
  @Test fun pendingRetryAndUsedMarkerSurviveContextRecreation() {
    val context = InstrumentationRegistry.getInstrumentation().targetContext
    val p = context.createDeviceProtectedStorageContext().getSharedPreferences("alarm-snooze-v1", Context.MODE_PRIVATE)
    val original = p.all.toMap()
    val occurrence = 1234L; val at = System.currentTimeMillis() + 300_000L
    try {
      assertTrue(p.edit().clear().putLong("occurrence", occurrence).putLong("revision", 2).putLong("at", at).putString("phase", "pending").commit())
      val recreated = context.createDeviceProtectedStorageContext()
      assertEquals(at, AlarmSnooze.pendingAt(recreated))
      assertFalse(AlarmSnooze.accepts(recreated, occurrence, 2))
      AlarmSnooze.delivered(recreated)
      assertEquals(0L, AlarmSnooze.pendingAt(context))
      assertEquals(occurrence, p.getLong("occurrence", -1))
      assertFalse(AlarmSnooze.accepts(context, occurrence, 2))
    } finally {
      val editor = p.edit().clear()
      original.forEach { (key, value) -> when (value) { is String -> editor.putString(key, value); is Long -> editor.putLong(key, value) } }
      assertTrue(editor.commit())
    }
  }
}
