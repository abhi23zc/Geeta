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
import android.os.SystemClock
import android.os.UserManager
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
import org.json.JSONObject
import java.util.UUID

/** One React host; native window policy and a loading cover contain the ritual. */
object AlarmPresentation {
  private const val UNLOCK_REQUEST = 7001
  private val handler = Handler(Looper.getMainLooper())
  private var host: WeakReference<Activity>? = null
  private var cover: View? = null
  private var hold: Runnable? = null
  private var unlock: Promise? = null
  private val presentation = PresentationSession()
  private var deadline: Runnable? = null
  @Volatile private var enteredRitual = false
  private fun main() { check(Looper.myLooper() == Looper.getMainLooper()) }
  fun userUnlocked(context: Context) = context.getSystemService(UserManager::class.java).isUserUnlocked
  @Volatile private var published: Map<String, Any?> = mapOf("active" to false, "stage" to null, "loading" to false, "sessionId" to null, "terminationReason" to null,
    "status" to "inactive", "hostGeneration" to 0, "coverGeneration" to 0)
  private val routes = mapOf("wake" to "alarm/wake", "breathe" to "breathe", "gita" to "gita")
  // Alarm delivery can occur after reboot, before credential storage is unlocked.
  private fun prefs(context: Context) = context.createDeviceProtectedStorageContext()
    .getSharedPreferences("morning-alarm-presentation", Context.MODE_PRIVATE)
  private fun stage(context: Context) = prefs(context).getString("stage", null)?.takeIf { it in routes }
  private fun locked(context: Context) = (context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager).isKeyguardLocked

  /** Bridge reads an immutable snapshot; never block JS waiting for Android's main thread. */
  fun state(context: Context): Map<String, Any?> {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      published = mapOf("active" to (stage(context) != null), "stage" to stage(context), "loading" to (stage(context) != null && presentation.status != "ready"),
        "sessionId" to prefs(context).getString("sessionId", null), "terminationReason" to prefs(context).getString("terminationReason", null),
        "status" to (if (stage(context) != null && presentation.status == "inactive") "loading" else presentation.status), "hostGeneration" to presentation.hostGeneration, "coverGeneration" to presentation.coverGeneration)
    }
    return published + mapOf("locked" to locked(context))
  }
  fun startupState(context: Context): Map<String, Any?> = state(context) + mapOf(
    "validRitualIntent" to (enteredRitual && userUnlocked(context)), "language" to AlarmStrings.language(context), "userUnlocked" to userUnlocked(context))
  fun begin(context: Context, occurrence: Long, test: Boolean) {
    main()
    val id = "$occurrence:$test"
    val p = prefs(context)
    if (p.getString("sessionId", null) != id || stage(context) == null) {
      check(p.edit().putString("sessionId", id).putString("stage", "wake").putBoolean("awake", true)
        .remove("terminationReason").remove("checkpoint:breathe").remove("checkpoint:gita").commit()) { "Could not save ritual session" }
    }
    if (presentation.sessionId != id || presentation.status == "inactive") {
      removeCover()
      presentation.prepare(false, id, stage(context), SystemClock.elapsedRealtime())
      host?.get()?.let { if (validIntent(it, it.intent)) attach(it) }
    }
    AlarmEvents.emit("alarmPresentationChanged", state(context))
  }
  fun checkpoint(context: Context, next: String): String? {
    if (stage(context) == null || next !in routes) return null
    return prefs(context).getString("checkpoint:$next", null)
  }
  fun saveCheckpoint(context: Context, id: String, next: String, raw: String): Boolean {
    val p = prefs(context)
    if (p.getString("sessionId", null) != id || stage(context) != next || raw.length > 65536) return false
    val data = JSONObject(raw)
    require(data.getInt("version") == 1 && data.getString("sessionId") == id && data.getString("stage") == next)
    if (next == "breathe") require(data.getInt("elapsed") in 0..70 && data.getInt("preparation") in 0..3)
    if (next == "gita") require(data.getDouble("positionMs").isFinite() && data.getDouble("positionMs") >= 0 && data.getDouble("playedThroughMs").isFinite() && data.getDouble("playedThroughMs") >= 0)
    check(p.edit().putString("checkpoint:$next", raw).commit()) { "Could not save ritual checkpoint" }
    return true
  }
  fun intent(context: Context): Intent {
    val launch = if (!userUnlocked(context)) Intent(context, AlarmActivity::class.java) else context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent(context, AlarmActivity::class.java)
    launch.action = Intent.ACTION_VIEW
    launch.data = Uri.parse("geeta:///${routes[stage(context)] ?: "alarm/wake"}?entry=alarm")
    launch.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
    return launch
  }
  private fun validIntent(context: Context, intent: Intent): Boolean = stage(context) != null &&
    intent.data?.scheme == "geeta" && intent.data?.path?.trim('/') in routes.values
  fun isRitualIntent(context: Context, intent: Intent) = validIntent(context, intent)

  // Called before ReactActivity.onCreate/onNewIntent; never expose its old page.
  fun prepare(activity: Activity, incoming: Intent, created: Boolean = false) {
    main()
    AlarmLog.initialize(activity)
    if (stage(activity) != null && !prefs(activity).contains("sessionId")) {
      check(prefs(activity).edit().putString("sessionId", "legacy:${UUID.randomUUID()}").commit()) { "Could not migrate ritual session" }
    }
    val enabled = validIntent(activity, incoming)
    val changed = presentation.prepare(created || host?.get() !== activity, prefs(activity).getString("sessionId", null), stage(activity), SystemClock.elapsedRealtime())
    if (changed) removeCover()
    enteredRitual = enabled
    host = WeakReference(activity)
    AlarmLog.event(if (changed) "ritual_host_prepared" else "ritual_duplicate_intent", "host=${presentation.hostGeneration} status=${presentation.status}")
    windowPolicy(activity, enabled, wake = enabled)
    if (!enabled) removeCover()
    AlarmEvents.emit("alarmPresentationChanged", state(activity))
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
    main()
    if (!validIntent(activity, activity.intent) || activity.isFinishing || cover?.context === activity || presentation.status == "ready") return
    removeCover()
    host = WeakReference(activity)
    val view = activity.layoutInflater.inflate(R.layout.alarm_fallback, null)
    AlarmStrings.bind(activity, view)
    presentation.attach()
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
          val heldSession = prefs(activity).getString("sessionId", null)
          hold = Runnable {
            if (stage(activity) == null || prefs(activity).getString("sessionId", null) != heldSession || !activity.hasWindowFocus()) return@Runnable
            if (AlarmStore.isRinging(activity)) {
              AlarmController.dismiss(activity, finishActivity = false)
              setStage(activity, "breathe")
            }
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
    val retry = view.findViewById<Button>(R.id.alarm_retry)
    retry.setOnClickListener {
      if (presentation.retryInFlight || host?.get() !== activity || stage(activity) == null) return@setOnClickListener
      if (!userUnlocked(activity)) {
        Toast.makeText(activity, AlarmStrings.text(activity, "Unlock your phone to continue the ritual"), Toast.LENGTH_LONG).show()
        return@setOnClickListener
      }
      if (!presentation.beginRetry()) return@setOnClickListener
      retry.isEnabled = false
      cancelDeadline()
      AlarmLog.event("ritual_retry", "host=${presentation.hostGeneration}")
      if (activity is AlarmActivity) {
        runCatching { activity.startActivity(intent(activity)); activity.finish() }.onFailure { presentation.cancelRetry(); retry.isEnabled = true; startDeadline(activity) }
      } else {
        runCatching { activity.recreate() }.onFailure { presentation.cancelRetry(); retry.isEnabled = true; startDeadline(activity) }
      }
    }
    if (activity is AlarmActivity) {
      presentation.recover()
      updateRecovery(activity)
    } else startDeadline(activity)
    AlarmLog.event("ritual_cover_attached", "host=${presentation.hostGeneration} cover=${presentation.coverGeneration}")
    AlarmEvents.emit("alarmPresentationChanged", state(activity))
  }
  private fun cancelDeadline() { deadline?.let { handler.removeCallbacks(it) }; deadline = null }
  private fun startDeadline(activity: Activity) {
    cancelDeadline()
    AlarmLog.event("ritual_deadline_started", "host=${presentation.hostGeneration} cover=${presentation.coverGeneration} remaining=${presentation.remaining(SystemClock.elapsedRealtime())}")
    val generation = presentation.coverGeneration
    deadline = Runnable {
      deadline = null
      if (host?.get() === activity && presentation.coverGeneration == generation && presentation.recover()) {
        AlarmLog.event("ritual_recovery", "elapsed=${SystemClock.elapsedRealtime() - presentation.startedAt}")
        updateRecovery(activity)
        AlarmEvents.emit("alarmPresentationChanged", state(activity))
      }
    }.also { handler.postDelayed(it, presentation.remaining(SystemClock.elapsedRealtime())) }
  }
  private fun updateRecovery(context: Context) {
    cover?.findViewById<TextView>(R.id.alarm_tone)?.text = AlarmStrings.text(context, if (userUnlocked(context)) "The app screen could not finish loading. Try again." else "Unlock your phone to continue the ritual")
    cover?.findViewById<Button>(R.id.alarm_retry)?.apply {
      visibility = View.VISIBLE
      text = AlarmStrings.text(context, if (userUnlocked(context)) "Try again" else "Continue after unlock")
      isEnabled = !presentation.retryInFlight
    }
  }
  fun refreshLanguage(context: Context) {
    handler.post {
      val view = cover ?: return@post
      AlarmStrings.bind(context, view)
      view.findViewById<TextView>(R.id.alarm_time).text = SimpleDateFormat("hh:mm", AlarmStrings.locale(context)).format(Date())
      view.findViewById<TextView>(R.id.alarm_meridiem).text = SimpleDateFormat("a", Locale.US).format(Date())
      view.findViewById<TextView>(R.id.alarm_tone).text = AlarmStrings.text(context, "Preparing your morning ritual…")
      view.findViewById<Button>(R.id.alarm_dismiss).text = AlarmStrings.text(context, if (AlarmStore.isRinging(context)) "☀  Hold to start my day" else "Continue my morning")
      if (presentation.status == "recovery") updateRecovery(context)
    }
  }
  fun setStage(activity: Activity, next: String, expectedId: String? = null) {
    main()
    require(next in routes) { "Unknown ritual stage" }
    if (stage(activity) == null) return
    require(expectedId == null || prefs(activity).getString("sessionId", null) == expectedId) { "Alarm session changed" }
    val elapsed = checkpoint(activity, "breathe")?.let { runCatching { JSONObject(it).optInt("elapsed", 0) }.getOrDefault(0) } ?: 0
    require(AlarmPolicy.stageAllowed(stage(activity), next, AlarmStore.isRinging(activity), elapsed)) { "Complete the current ritual phase first" }
    val changed = stage(activity) != next
    check(prefs(activity).edit().putString("stage", next).commit()) { "Could not save ritual stage" }
    if (changed) prefs(activity).edit().putBoolean("awake", true).apply()
    activity.intent.data = Uri.parse("geeta:///${routes[next]}?entry=alarm")
    if (changed) {
      removeCover()
      presentation.prepare(false, prefs(activity).getString("sessionId", null), next, SystemClock.elapsedRealtime())
      attach(activity)
    }
    windowPolicy(activity, true)
    AlarmEvents.emit("alarmPresentationChanged", state(activity))
  }
  // Compatibility only: route-only callers cannot remove the safety cover.
  fun rendered(activity: Activity, route: String) { AlarmLog.event("ritual_legacy_ready_ignored", route) }
  fun acknowledge(activity: Activity?, id: String, next: String, hostGeneration: Int, coverGeneration: Int): Map<String, Any?> {
    main()
    val rejection = when {
      activity == null || host?.get() !== activity -> "activity"
      stage(activity) == null -> "inactive"
      prefs(activity).getString("sessionId", null) != id -> "session"
      next != stage(activity) -> "stage"
      else -> presentation.rejection(id, next, hostGeneration, coverGeneration)
    }
    if (rejection != null) {
      AlarmLog.event("ritual_ready_rejected", rejection)
      return mapOf("accepted" to false, "reason" to rejection)
    }
    presentation.acknowledge(id, next, hostGeneration, coverGeneration, ::removeCover) {
      AlarmLog.event("ritual_react_ready", "stage=$next host=$hostGeneration cover=$coverGeneration elapsed=${SystemClock.elapsedRealtime() - presentation.startedAt}")
      AlarmEvents.emit("alarmPresentationChanged", state(activity!!))
    }
    return mapOf("accepted" to true, "reason" to null)
  }
  fun end(context: Context, reason: String = "exit", expectedId: String? = null) {
    main()
    if (expectedId != null && prefs(context).getString("sessionId", null) != expectedId) return
    check(prefs(context).edit().remove("stage").remove("awake").remove("checkpoint:breathe").remove("checkpoint:gita")
      .putString("terminationReason", reason).commit()) { "Could not end ritual session" }
    val clear = Runnable {
      host?.get()?.let { windowPolicy(it, false) }
      removeCover()
      presentation.end()
      AlarmEvents.emit("alarmPresentationChanged", state(context))
    }
    clear.run()
  }
  fun setAwake(activity: Activity, awake: Boolean) {
    main()
    if (stage(activity) != "gita") return
    prefs(activity).edit().putBoolean("awake", awake).apply()
    windowPolicy(activity, true)
  }
  fun onResume(activity: Activity) { if (presentation.status == "recovery") updateRecovery(activity); AlarmEvents.emit("alarmPresentationChanged", state(activity)) }
  fun onWindowFocus(activity: Activity, focused: Boolean) {
    if (!focused) cancelHold()
    onResume(activity)
  }
  fun blockVolume(activity: Activity, event: KeyEvent): Boolean {
    if (!AlarmStore.isRinging(activity) || event.keyCode !in listOf(KeyEvent.KEYCODE_VOLUME_UP, KeyEvent.KEYCODE_VOLUME_DOWN, KeyEvent.KEYCODE_VOLUME_MUTE)) return false
    if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) Toast.makeText(activity, AlarmStrings.text(activity, "Hold Start my day to finish the alarm"), Toast.LENGTH_SHORT).show()
    return true
  }
  fun detach(activity: Activity) {
    main()
    if (host?.get() === activity) {
      removeCover()
      presentation.end()
      enteredRitual = false
      host = null
      AlarmEvents.emit("alarmPresentationChanged", state(activity))
      unlock?.resolve(false)
      unlock = null
    }
  }
  private fun cancelHold() { hold?.let { handler.removeCallbacks(it) }; hold = null }
  private fun removeCover() {
    main()
    cancelDeadline()
    cancelHold()
    cover?.let {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) (it.findViewById<ImageView>(R.id.alarm_mascot)?.drawable as? AnimatedImageDrawable)?.stop()
      (it.parent as? ViewGroup)?.removeView(it)
    }
    if (cover != null) AlarmLog.event("ritual_cover_removed", "cover=${presentation.coverGeneration}")
    cover = null
  }
  fun requestUnlock(activity: Activity, promise: Promise) {
    main()
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
