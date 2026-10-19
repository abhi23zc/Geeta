package expo.modules.morningalarm

import android.content.Context
import android.content.Intent
import android.os.SystemClock
import androidx.media3.common.util.UnstableApi
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

/** Requires a separately authorized, isolated test installation. Does not start audio. */
@UnstableApi
@RunWith(AndroidJUnit4::class)
class MusicNotificationTest {
  @Test fun directServiceStartRegistersSessionWithoutMediaController() {
    val instrumentation = InstrumentationRegistry.getInstrumentation()
    val context: Context = instrumentation.targetContext
    val intent = Intent(context, MusicService::class.java)
    try {
      instrumentation.runOnMainSync { context.startService(intent) }
      val deadline = SystemClock.elapsedRealtime() + 5000
      var registered = false
      while (!registered && SystemClock.elapsedRealtime() < deadline) {
        instrumentation.runOnMainSync {
          registered = MusicService.active?.sessions?.size == 1
        }
        if (!registered) SystemClock.sleep(20)
      }
      assertTrue("Direct bridge startup must attach the session to Media3 notification management", registered)
      instrumentation.runOnMainSync {
        val service = requireNotNull(MusicService.active)
        assertTrue(service.isSessionAdded(service.sessions.single()))
      }
    } finally {
      instrumentation.runOnMainSync { context.stopService(intent) }
    }
  }
}
