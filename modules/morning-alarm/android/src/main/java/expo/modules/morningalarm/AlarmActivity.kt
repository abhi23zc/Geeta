package expo.modules.morningalarm

import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.graphics.drawable.AnimatedImageDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.widget.Button
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import java.lang.ref.WeakReference
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** A dedicated React host which deliberately stays visible over the keyguard. */
class AlarmActivity : ReactActivity() {
  private var fallback: View? = null
  private var dismissButton: Button? = null
  private var dismissProgress: ProgressBar? = null
  private var holdStartedAt = 0L
  private val uiHandler = Handler(Looper.getMainLooper())
  private val heldDismiss = Runnable {
    dismissProgress?.progress = 100
    AlarmLog.event("hold_complete")
    AlarmController.dismiss(this)
  }
  private val holdProgress = object : Runnable {
    override fun run() {
      if (holdStartedAt == 0L) return
      val progress = (((System.currentTimeMillis() - holdStartedAt) * 100L) / HOLD_MS).toInt().coerceIn(0, 100)
      dismissProgress?.progress = progress
      if (progress < 100) uiHandler.postDelayed(this, 32L)
    }
  }
  private val volumeUpdate = object : Runnable {
    override fun run() {
      val state = AlarmService.stateMap(this@AlarmActivity)
      val progress = (((state["volumeProgress"] as? Double) ?: 0.0) * 100).toInt().coerceIn(0, 100)
      fallback?.findViewById<TextView>(R.id.alarm_volume)?.text =
        "Harmonic crescendo ($progress%)"
      fallback?.findViewById<ProgressBar>(R.id.alarm_volume_progress)?.progress = progress
      if (state["ringing"] == true) uiHandler.postDelayed(this, 1_000L)
    }
  }

  override fun getMainComponentName(): String = "main"
  override fun createReactActivityDelegate(): ReactActivityDelegate =
    object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {}

  override fun onCreate(savedInstanceState: Bundle?) {
    // These are set before React creates its view hierarchy. Do not dismiss the keyguard.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    current = WeakReference(this)
    if (intent.data == null) intent.data = Uri.parse("geeta:///alarm/wake")
    AlarmLog.initialize(this)
    AlarmLog.event("activity_create")
    super.onCreate(savedInstanceState)
    fallback = layoutInflater.inflate(R.layout.alarm_fallback, null).also { view ->
      bindFallback(view)
      addContentView(view, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    }
    scheduleImmersiveMode()
    uiHandler.post(volumeUpdate)
  }

  private fun bindFallback(view: View) {
    val config = AlarmStore.get(this)
    val time = config?.let {
      val hour12 = when (it.hour % 12) { 0 -> 12; else -> it.hour % 12 }
      String.format(Locale.getDefault(), "%02d:%02d", hour12, it.minute)
    }
      ?: SimpleDateFormat("hh:mm", Locale.getDefault()).format(Date())
    val meridiem = config?.let { if (it.hour >= 12) "PM" else "AM" }
      ?: SimpleDateFormat("a", Locale.getDefault()).format(Date())
    view.findViewById<TextView>(R.id.alarm_time).text = time
    view.findViewById<TextView>(R.id.alarm_meridiem).text = meridiem
    view.findViewById<TextView>(R.id.alarm_tone).text = displayTone(config?.toneKey)
    loadMascot(view.findViewById(R.id.alarm_mascot))
    dismissButton = view.findViewById(R.id.alarm_dismiss)
    dismissProgress = view.findViewById(R.id.alarm_dismiss_progress)
    dismissButton?.setOnTouchListener { button, event ->
      when (event.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          cancelHold("restart")
          button.alpha = .82f
          holdStartedAt = System.currentTimeMillis()
          uiHandler.post(holdProgress)
          uiHandler.postDelayed(heldDismiss, HOLD_MS)
          AlarmLog.event("hold_start")
        }
        MotionEvent.ACTION_MOVE -> {
          if (event.x < 0 || event.y < 0 || event.x > button.width || event.y > button.height) cancelHold("pointer_left")
        }
        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> cancelHold("released")
      }
      true
    }
  }

  private fun displayTone(tone: String?): String = when (tone) {
    "Raag Bhairav & Sacred Flute" -> "Shiva / Gita Morning Raga"
    null, "" -> "Morning ritual alarm"
    else -> tone
  }

  private fun loadMascot(image: ImageView) {
    runCatching {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        val drawable = ImageDecoder.decodeDrawable(
          ImageDecoder.createSource(assets, MASCOT_ASSET),
        )
        image.setImageDrawable(drawable)
        (drawable as? AnimatedImageDrawable)?.start()
      } else {
        assets.open(MASCOT_ASSET).use { image.setImageBitmap(BitmapFactory.decodeStream(it)) }
      }
    }.onFailure {
      AlarmLog.event("mascot_load_failed", it.javaClass.simpleName)
      image.setImageResource(applicationInfo.icon)
    }
  }

  private fun cancelHold(reason: String) {
    if (holdStartedAt != 0L) AlarmLog.event("hold_cancel", reason)
    holdStartedAt = 0L
    uiHandler.removeCallbacks(heldDismiss)
    uiHandler.removeCallbacks(holdProgress)
    dismissButton?.alpha = 1f
    dismissProgress?.progress = 0
  }

  private fun scheduleImmersiveMode() {
    // The WindowInsetsController is backed by DecorView. Some OEM builds throw
    // when it is requested before the decor is attached, so always defer it.
    window.decorView.post {
      if (!isFinishing && !isDestroyed && AlarmStore.isRinging(this)) {
        applyImmersiveMode(window.decorView)
      }
    }
  }

  private fun applyImmersiveMode(decorView: View) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      window.setDecorFitsSystemWindows(false)
      decorView.windowInsetsController?.apply {
        hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
        systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      }
    } else {
      @Suppress("DEPRECATION")
      decorView.systemUiVisibility =
        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or View.SYSTEM_UI_FLAG_FULLSCREEN or
          View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
          View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
    }
  }

  private fun releaseStrictMode() = runOnUiThread {
    cancelHold("completed")
    window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      window.decorView.windowInsetsController?.show(
        WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars(),
      )
      window.setDecorFitsSystemWindows(true)
    } else {
      @Suppress("DEPRECATION")
      window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
    }
  }

  fun hideFallback() = runOnUiThread {
    fallback?.animate()?.alpha(0f)?.setDuration(180)?.withEndAction {
      (fallback?.parent as? ViewGroup)?.removeView(fallback)
      fallback = null
    }?.start()
  }

  override fun onResume() {
    super.onResume()
    if (AlarmStore.isRinging(this)) scheduleImmersiveMode()
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus && AlarmStore.isRinging(this)) scheduleImmersiveMode() else cancelHold("focus_lost")
  }

  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    if (AlarmStore.isRinging(this) && (event.keyCode == KeyEvent.KEYCODE_VOLUME_UP ||
      event.keyCode == KeyEvent.KEYCODE_VOLUME_DOWN ||
      event.keyCode == KeyEvent.KEYCODE_VOLUME_MUTE)
    ) {
      if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) {
        AlarmLog.event("volume_key_blocked", event.keyCode.toString())
        Toast.makeText(this, "Hold Start my day to finish the alarm", Toast.LENGTH_SHORT).show()
      }
      return true
    }
    return super.dispatchKeyEvent(event)
  }

  override fun invokeDefaultOnBackPressed() {
    if (AlarmStore.isRinging(this)) AlarmLog.event("back_blocked") else super.invokeDefaultOnBackPressed()
  }
  override fun onUserLeaveHint() {
    cancelHold("home_or_system")
    AlarmLog.event("activity_backgrounded")
    super.onUserLeaveHint()
  }
  override fun onDestroy() {
    uiHandler.removeCallbacksAndMessages(null)
    if (current?.get() === this) current = null
    AlarmLog.event("activity_destroy")
    super.onDestroy()
  }

  companion object {
    private const val HOLD_MS = 1_500L
    private const val MASCOT_ASSET = "aru_start_my_day_wake.webp"
    private var current: WeakReference<AlarmActivity>? = null
    fun intent(context: Context) = Intent(context, AlarmActivity::class.java).apply {
      action = Intent.ACTION_VIEW
      data = Uri.parse("geeta:///alarm/wake")
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    fun hideVisibleFallback() = current?.get()?.hideFallback()
    fun releaseVisibleStrictMode() = current?.get()?.releaseStrictMode()
    fun finishVisible() = current?.get()?.runOnUiThread { current?.get()?.finishAndRemoveTask() }
  }
}
