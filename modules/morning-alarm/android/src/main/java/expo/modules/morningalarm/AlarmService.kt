package expo.modules.morningalarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

class AlarmService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var player: MediaPlayer? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var startedAt = 0L
  private var gradual = false

  private val volumeTick = object : Runnable {
    override fun run() {
      if (player == null) return
      val progress = volumeProgress()
      val volume = if (gradual) 0.08f + 0.92f * progress else 1f
      player?.setVolume(volume, volume)
      if (progress < 1f) handler.postDelayed(this, 1_000L)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopAlarm(intent.getStringExtra(EXTRA_REASON) ?: "stopped")
      return START_NOT_STICKY
    }

    if (player != null) return START_STICKY
    if (intent == null && !AlarmStore.isRinging(this)) {
      AlarmLog.event("service_restart_rejected", "no active alarm")
      stopSelf()
      return START_NOT_STICKY
    }
    val config = AlarmStore.get(this)?.takeIf { it.enabled } ?: run {
      stopSelf()
      return START_NOT_STICKY
    }
    val scheduledAt = intent?.getLongExtra(AlarmScheduler.EXTRA_SCHEDULED_AT, System.currentTimeMillis())
      ?: System.currentTimeMillis()
    startedAt = System.currentTimeMillis()
    gradual = config.gradualVolume
    AlarmStore.setRinging(this, true, startedAt, scheduledAt)
    AlarmLog.event("service_start", "scheduledAt=$scheduledAt")
    acquireWakeLock()
    createChannel()
    startForeground(NOTIFICATION_ID, notification())
    // Notification is intentionally posted first: if MIUI/Android rejects this
    // direct background launch, its full-screen PendingIntent remains the safe path.
    launchWakeScreenIfInteractive()
    startSound(config)
    if (config.vibration) startVibration()
    AlarmEvents.emit("alarmTriggered", stateMap(this))
    return START_STICKY
  }

  private fun acquireWakeLock() {
    val power = getSystemService(PowerManager::class.java)
    wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "geeta:morning-alarm").apply {
      setReferenceCounted(false)
      acquire()
    }
  }

  private fun startSound(config: AlarmConfig) {
    val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
    player = MediaPlayer().apply {
      setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build(),
      )
      setDataSource(this@AlarmService, uri)
      isLooping = true
      prepare()
      val initial = if (config.gradualVolume) 0.08f else 1f
      setVolume(initial, initial)
      start()
    }
    handler.post(volumeTick)
  }

  @Suppress("DEPRECATION")
  private fun startVibration() {
    val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      getSystemService(VibratorManager::class.java).defaultVibrator
    } else {
      getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }
    val pattern = longArrayOf(0, 600, 350, 600, 350, 900)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
    } else {
      vibrator.vibrate(pattern, 0)
    }
  }

  @Suppress("DEPRECATION")
  private fun cancelVibration() {
    val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      getSystemService(VibratorManager::class.java).defaultVibrator
    } else {
      getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }
    vibrator.cancel()
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(CHANNEL_ID, "Morning ritual alarms", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Shows the active Morning Ritual alarm"
      setSound(null, null)
      enableVibration(false)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    // Channels are immutable; v2 lets existing installs receive the alarm policy.
    getSystemService(NotificationManager::class.java).apply {
      deleteNotificationChannel(LEGACY_CHANNEL_V1)
      deleteNotificationChannel(LEGACY_CHANNEL_V2)
    }
  }

  private fun launchWakeScreenIfInteractive() {
    val power = getSystemService(PowerManager::class.java)
    if (!power.isInteractive) return
    runCatching { startActivity(AlarmActivity.intent(this)) }
      .onSuccess { AlarmLog.event("direct_activity_launch") }
      .onFailure { AlarmLog.event("direct_activity_launch_failed", it.javaClass.simpleName) }
  }

  private fun notification(): Notification {
    val open = PendingIntent.getActivity(
      this,
      6201,
      AlarmActivity.intent(this),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION") Notification.Builder(this)
    }
    return builder
      .setSmallIcon(applicationInfo.icon)
      .setColor(Color.rgb(229, 107, 39))
      .setContentTitle("Your Morning Ritual is ready")
      .setContentText("Alarm is ringing · tap to wake gently")
      .setCategory(Notification.CATEGORY_ALARM)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setOnlyAlertOnce(true)
      .setContentIntent(open)
      .setFullScreenIntent(open, true)
      .apply {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)
        }
      }
      .build()
  }

  private fun stopAlarm(reason: String) {
    AlarmLog.event("alarm_stop", reason)
    handler.removeCallbacksAndMessages(null)
    player?.runCatching { stop() }
    player?.release()
    player = null
    cancelVibration()
    wakeLock?.takeIf { it.isHeld }?.release()
    wakeLock = null
    AlarmStore.setRinging(this, false)
    AlarmEvents.emit("alarmStopped", mapOf("reason" to reason))
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun volumeProgress(): Float {
    if (!gradual) return 1f
    return ((System.currentTimeMillis() - startedAt).toFloat() / GRADUAL_MS).coerceIn(0f, 1f)
  }

  override fun onDestroy() {
    if (player != null) stopAlarm("service-destroyed")
    super.onDestroy()
  }

  companion object {
    const val CHANNEL_ID = "morning-ritual-native-alarm-v3"
    const val LEGACY_CHANNEL_V1 = "morning-ritual-native-alarm-v1"
    const val LEGACY_CHANNEL_V2 = "morning-ritual-native-alarm-v2"
    private const val ACTION_START = "expo.modules.morningalarm.START"
    private const val ACTION_STOP = "expo.modules.morningalarm.STOP"
    private const val EXTRA_REASON = "reason"
    private const val NOTIFICATION_ID = 6420
    private const val GRADUAL_MS = 5 * 60_000L

    fun startIntent(context: Context, scheduledAt: Long) =
      Intent(context, AlarmService::class.java)
        .setAction(ACTION_START)
        .putExtra(AlarmScheduler.EXTRA_SCHEDULED_AT, scheduledAt)

    fun stopIntent(context: Context, reason: String) =
      Intent(context, AlarmService::class.java)
        .setAction(ACTION_STOP)
        .putExtra(EXTRA_REASON, reason)

    fun stateMap(context: Context): Map<String, Any?> {
      val triggeredAt = AlarmStore.triggeredAt(context)
      val progress = if (!AlarmStore.isRinging(context)) 0.0 else
        ((System.currentTimeMillis() - triggeredAt).toDouble() / GRADUAL_MS).coerceIn(0.0, 1.0)
      return mapOf(
        "ringing" to AlarmStore.isRinging(context),
        "triggeredAt" to triggeredAt.toDouble(),
        "scheduledAt" to AlarmStore.scheduledAt(context).toDouble(),
        "volumeProgress" to progress,
      )
    }
  }
}
