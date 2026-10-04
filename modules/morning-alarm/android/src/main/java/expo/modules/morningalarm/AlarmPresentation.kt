package expo.modules.morningalarm

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.graphics.drawable.AnimatedImageDrawable
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.MotionEvent
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import expo.modules.kotlin.Promise
import java.lang.ref.WeakReference
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** One React host; native window policy and a loading cover contain the ritual. */
object AlarmPresentation {
  private const val UNLOCK_REQUEST = 7001
  private val handler = Handler(Looper.getMainLooper())
  private var host: WeakReference<Activity>? = null
  private var cover: View? = null
  private var hold: Runnable? = null
  private var unlock: Promise? = null
  private val routes = mapOf("wake" to "alarm/wake", "breathe" to "breathe", "gita" to "gita")
  // Alarm delivery can occur after reboot, before credential storage is unlocked.
  private fun prefs(context: Context) = context.createDeviceProtectedStorageContext()
    .getSharedPreferences("morning-alarm-presentation", Context.MODE_PRIVATE)
  private fun stage(context: Context) = prefs(context).getString("stage", null)?.takeIf { it in routes }
  private fun locked(context: Context) = (context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager).isKeyguardLocked

  fun state(context: Context): Map<String, Any?> = mapOf("active" to (stage(context) != null), "locked" to locked(context), "stage" to stage(context), "loading" to (cover != null))
  fun begin(context: Context) {
    prefs(context).edit().putString("stage", "wake").putBoolean("awake", true).apply()
    AlarmEvents.emit("alarmPresentationChanged", state(context))
  }
  fun intent(context: Context): Intent {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent(context, AlarmActivity::class.java)
    launch.action = Intent.ACTION_VIEW
    launch.data = Uri.parse("geeta:///${routes[stage(context)] ?: "alarm/wake"}?entry=alarm")
    launch.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
    return launch
  }
  private fun validIntent(context: Context, intent: Intent): Boolean = stage(context) != null &&
    intent.data?.scheme == "geeta" && intent.data?.path?.trim('/') in routes.values
  fun isRitualIntent(context: Context, intent: Intent) = validIntent(context, intent)

  // Called before ReactActivity.onCreate/onNewIntent; never expose its old page.
  fun prepare(activity: Activity, incoming: Intent) {
    val enabled = validIntent(activity, incoming)
    host = WeakReference(activity)
    windowPolicy(activity, enabled, wake = enabled)
    if (!enabled) removeCover()
  }
  private fun windowPolicy(activity: Activity, enabled: Boolean, wake: Boolean = false) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      activity.setShowWhenLocked(enabled)
      activity.setTurnScreenOn(enabled && wake)
    } else {
      @Suppress("DEPRECATION")
      val flags = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      if (enabled) activity.window.addFlags(flags) else activity.window.clearFlags(flags)
    }
    if (enabled && prefs(activity).getBoolean("awake", true)) activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    else activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }
  fun attach(activity: Activity) {
    if (!validIntent(activity, activity.intent) || activity.isFinishing || cover?.context === activity) return
    removeCover()
    host = WeakReference(activity)
    val view = activity.layoutInflater.inflate(R.layout.alarm_fallback, null)
    AlarmStrings.bind(activity, view)
    cover = view
    view.isClickable = true
    view.findViewById<TextView>(R.id.alarm_time).text = SimpleDateFormat("hh:mm", AlarmStrings.locale(activity)).format(Date())
    view.findViewById<TextView>(R.id.alarm_meridiem).text = SimpleDateFormat("a", Locale.US).format(Date())
    view.findViewById<TextView>(R.id.alarm_tone).text = AlarmStrings.text(activity, "Preparing your morning ritual…")
    val image = view.findViewById<ImageView>(R.id.alarm_mascot)
    runCatching {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        val drawable = ImageDecoder.decodeDrawable(ImageDecoder.createSource(activity.assets, "aru_start_my_day_wake.webp"))
        image.setImageDrawable(drawable)
        (drawable as? AnimatedImageDrawable)?.start()
      } else activity.assets.open("aru_start_my_day_wake.webp").use { image.setImageBitmap(BitmapFactory.decodeStream(it)) }
    }.onFailure { image.setImageResource(activity.applicationInfo.icon) }
    val button = view.findViewById<Button>(R.id.alarm_dismiss)
    button.text = AlarmStrings.text(activity, if (AlarmStore.isRinging(activity)) "☀  Hold to start my day" else "Continue my morning")
    button.setOnTouchListener { _, event ->
      when (event.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          cancelHold()
          hold = Runnable {
            if (AlarmStore.isRinging(activity)) AlarmController.dismiss(activity, finishActivity = false)
            setStage(activity, "breathe")
            button.text = AlarmStrings.text(activity, "Continue my morning")
            runCatching { activity.startActivity(intent(activity)) }.onFailure { AlarmLog.event("ritual_launch_failed", it.javaClass.simpleName) }
          }.also { handler.postDelayed(it, 1500L) }
        }
        MotionEvent.ACTION_MOVE -> if (event.x < 0 || event.y < 0 || event.x > button.width || event.y > button.height) cancelHold()
        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> cancelHold()
      }
      true
    }
    (activity.window.decorView as ViewGroup).addView(view, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    AlarmLog.event("ritual_loading_cover")
    AlarmEvents.emit("alarmPresentationChanged", state(activity))
  }
  fun refreshLanguage(context: Context) {
    handler.post {
      val view = cover ?: return@post
      AlarmStrings.bind(context, view)
      view.findViewById<TextView>(R.id.alarm_time).text = SimpleDateFormat("hh:mm", AlarmStrings.locale(context)).format(Date())
      view.findViewById<TextView>(R.id.alarm_meridiem).text = SimpleDateFormat("a", Locale.US).format(Date())
      view.findViewById<TextView>(R.id.alarm_tone).text = AlarmStrings.text(context, "Preparing your morning ritual…")
      view.findViewById<Button>(R.id.alarm_dismiss).text = AlarmStrings.text(context, if (AlarmStore.isRinging(context)) "☀  Hold to start my day" else "Continue my morning")
    }
  }
  fun setStage(activity: Activity, next: String) {
    require(next in routes) { "Unknown ritual stage" }
    if (stage(activity) == null) return
    val changed = stage(activity) != next
    prefs(activity).edit().putString("stage", next).apply()
    if (changed) prefs(activity).edit().putBoolean("awake", true).apply()
    activity.intent.data = Uri.parse("geeta:///${routes[next]}?entry=alarm")
    windowPolicy(activity, true)
    AlarmEvents.emit("alarmPresentationChanged", state(activity))
  }
  fun rendered(activity: Activity, route: String) {
    val next = routes.entries.firstOrNull { it.value == route }?.key ?: return
    if (stage(activity) == null) return
    if (AlarmStore.isRinging(activity) && next != "wake") return
    if (cover != null && next != stage(activity)) return
    setStage(activity, next)
    removeCover()
    AlarmLog.event("ritual_react_ready", route)
  }
  fun end(context: Context) {
    prefs(context).edit().remove("stage").remove("awake").apply()
    val clear = Runnable {
      host?.get()?.let { windowPolicy(it, false) }
      removeCover()
      AlarmEvents.emit("alarmPresentationChanged", state(context))
    }
    if (Looper.myLooper() == Looper.getMainLooper()) clear.run() else handler.post(clear)
  }
  fun setAwake(activity: Activity, awake: Boolean) {
    if (stage(activity) != "gita") return
    prefs(activity).edit().putBoolean("awake", awake).apply()
    windowPolicy(activity, true)
  }
  fun onResume(activity: Activity) { AlarmEvents.emit("alarmPresentationChanged", state(activity)) }
  fun blockVolume(activity: Activity, event: KeyEvent): Boolean {
    if (!AlarmStore.isRinging(activity) || event.keyCode !in listOf(KeyEvent.KEYCODE_VOLUME_UP, KeyEvent.KEYCODE_VOLUME_DOWN, KeyEvent.KEYCODE_VOLUME_MUTE)) return false
    if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) Toast.makeText(activity, AlarmStrings.text(activity, "Hold Start my day to finish the alarm"), Toast.LENGTH_SHORT).show()
    return true
  }
  fun detach(activity: Activity) {
    if (host?.get() === activity) {
      removeCover()
      host = null
      unlock?.resolve(false)
      unlock = null
    }
  }
  private fun cancelHold() { hold?.let { handler.removeCallbacks(it) }; hold = null }
  private fun removeCover() {
    cancelHold()
    cover?.let {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) (it.findViewById<ImageView>(R.id.alarm_mascot)?.drawable as? AnimatedImageDrawable)?.stop()
      (it.parent as? ViewGroup)?.removeView(it)
    }
    cover = null
  }
  fun requestUnlock(activity: Activity, promise: Promise) {
    if (!locked(activity)) { promise.resolve(true); return }
    if (unlock != null) { promise.resolve(false); return }
    unlock = promise
    val keyguard = activity.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      runCatching {
        keyguard.requestDismissKeyguard(activity, object : KeyguardManager.KeyguardDismissCallback() {
          override fun onDismissSucceeded() = resolveUnlock(activity, !locked(activity))
          override fun onDismissCancelled() = resolveUnlock(activity, false)
          override fun onDismissError() = resolveUnlock(activity, false)
        })
      }.onFailure { resolveUnlock(activity, false) }
    } else {
      @Suppress("DEPRECATION")
      val confirm = keyguard.createConfirmDeviceCredentialIntent(AlarmStrings.text(activity, "Open the app"), AlarmStrings.text(activity, "Unlock to leave your alarm ritual"))
      if (confirm != null) {
        @Suppress("DEPRECATION")
        runCatching { activity.startActivityForResult(confirm, UNLOCK_REQUEST) }.onFailure { resolveUnlock(activity, false) }
      } else {
        @Suppress("DEPRECATION")
        activity.window.addFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD)
        resolveUnlock(activity, !locked(activity))
      }
    }
  }
  fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int) {
    if (requestCode == UNLOCK_REQUEST) resolveUnlock(activity, resultCode == Activity.RESULT_OK && !locked(activity))
  }
  private fun resolveUnlock(activity: Activity, succeeded: Boolean) {
    unlock?.resolve(succeeded)
    unlock = null
    AlarmEvents.emit("alarmPresentationChanged", state(activity))
  }
}
