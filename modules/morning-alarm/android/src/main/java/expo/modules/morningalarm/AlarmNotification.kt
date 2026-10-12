package expo.modules.morningalarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.os.Bundle

/** One builder for delivery, recovery and language refresh; independent of launcher art. */
internal object AlarmNotification {
  fun createChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(AlarmService.CHANNEL_ID, AlarmStrings.text(context, "Morning ritual alarms"), NotificationManager.IMPORTANCE_HIGH).apply {
      description = AlarmStrings.text(context, "Shows the active Morning Ritual alarm")
      setSound(null, null)
      enableVibration(false)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    // Android preserves the user's importance and blocked state on recreation.
    context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
  }

  fun build(context: Context, occurrenceAt: Long, initialDelivery: Boolean, minimal: Boolean = false): Notification {
    val open = PendingIntent.getActivity(context, 6201, AlarmActivity.intent(context)
      .putExtra(AlarmScheduler.EXTRA_SCHEDULED_AT, occurrenceAt)
      .putExtra(AlarmPresentation.EXTRA_SESSION_ID, AlarmPresentation.state(context)["sessionId"] as? String),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val stop = PendingIntent.getBroadcast(context, 6202, Intent(context, AlarmStopReceiver::class.java)
      .setData(Uri.parse("geeta://alarm-stop/$occurrenceAt"))
      .putExtra(AlarmScheduler.EXTRA_SCHEDULED_AT, occurrenceAt),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(context, AlarmService.CHANNEL_ID)
      else @Suppress("DEPRECATION") Notification.Builder(context)
    builder.setExtras(Bundle().apply { putLong(AlarmScheduler.EXTRA_SCHEDULED_AT, occurrenceAt) })
      .setSmallIcon(R.drawable.ic_alarm_notification)
      .setContentTitle(AlarmStrings.text(context, "Your Morning Ritual is ready"))
      .setContentIntent(open)
      .setOngoing(true).setAutoCancel(false).setOnlyAlertOnce(true)
      .addAction(Notification.Action.Builder(Icon.createWithResource(context, R.drawable.ic_alarm_stop), AlarmStrings.text(context, "Stop"), stop).build())
    val allowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE || context.getSystemService(NotificationManager::class.java).canUseFullScreenIntent()
    if (!minimal) {
      builder.setColor(Color.rgb(229, 107, 39))
        .setContentText(AlarmStrings.text(context, "Alarm is ringing · tap to wake gently"))
        .setPriority(Notification.PRIORITY_HIGH).setCategory(Notification.CATEGORY_ALARM)
        .setVisibility(Notification.VISIBILITY_PUBLIC)
      if (AlarmDeliveryPolicy.fullScreen(initialDelivery, allowed)) builder.setFullScreenIntent(open, true)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)
    AlarmLog.event("notification_attempt", "occurrence=$occurrenceAt minimal=$minimal initial=$initialDelivery fullScreen=${!minimal && initialDelivery && allowed}")
    return builder.build()
  }
}
