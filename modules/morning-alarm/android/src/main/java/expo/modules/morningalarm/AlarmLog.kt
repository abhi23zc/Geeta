package expo.modules.morningalarm

import android.util.Log

object AlarmLog {
  private const val TAG = "MorningAlarm"
  fun event(name: String, detail: String = "") {
    Log.i(TAG, if (detail.isBlank()) name else "$name: $detail")
  }
}
