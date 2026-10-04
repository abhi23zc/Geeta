package expo.modules.morningalarm

import android.content.Context
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import java.lang.ref.WeakReference

/** Emergency native fallback only. MainActivity owns the single React root. */
class AlarmActivity : AppCompatActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    current = WeakReference(this)
    AlarmPresentation.prepare(this, intent)
    AlarmPresentation.attach(this)
  }
  override fun onDestroy() {
    AlarmPresentation.detach(this)
    if (current?.get() === this) current = null
    super.onDestroy()
  }
  companion object {
    private var current: WeakReference<AlarmActivity>? = null
    fun intent(context: Context) = AlarmPresentation.intent(context)
    fun finishVisible() = current?.get()?.runOnUiThread { current?.get()?.finish() }
  }
}
