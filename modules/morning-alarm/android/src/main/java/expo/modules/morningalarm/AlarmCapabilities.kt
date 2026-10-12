package expo.modules.morningalarm

import android.Manifest
import android.app.ActivityManager
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.PowerManager

object AlarmCapabilities {
  fun status(context: Context): Map<String, Any> {
    AlarmNotification.createChannel(context)
    val notifications = context.getSystemService(NotificationManager::class.java).areNotificationsEnabled() &&
      (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
        context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)
    val fullScreen = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      context.getSystemService(NotificationManager::class.java).canUseFullScreenIntent()
    } else true
    val manager = context.getSystemService(NotificationManager::class.java)
    val channelImportance = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.getNotificationChannel(AlarmService.CHANNEL_ID)?.importance ?: NotificationManager.IMPORTANCE_NONE
    } else NotificationManager.IMPORTANCE_HIGH
    val groupBlocked = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      manager.getNotificationChannel(AlarmService.CHANNEL_ID)?.group?.let { manager.getNotificationChannelGroup(it)?.isBlocked } == true
    } else false
    val batteryRestricted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      context.getSystemService(ActivityManager::class.java).isBackgroundRestricted
    } else false
    return mapOf(
      "notifications" to notifications,
      "exactAlarm" to AlarmScheduler.canScheduleExact(context),
      "fullScreenIntent" to fullScreen,
      "channelImportance" to channelImportance,
      "notificationChannelEnabled" to (AlarmDeliveryPolicy.channelEnabled(channelImportance) && !groupBlocked),
      "notificationChannelReady" to (channelImportance >= NotificationManager.IMPORTANCE_HIGH),
      "batteryRestricted" to batteryRestricted,
      "batteryOptimizationExempt" to context.getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(context.packageName),
      "sdkInt" to Build.VERSION.SDK_INT,
      "manufacturer" to Build.MANUFACTURER,
      "brand" to Build.BRAND,
      "model" to Build.MODEL,
      "softwareVersion" to Build.VERSION.RELEASE,
      "oemGuidance" to true,
    )
  }

  fun ready(context: Context): Boolean {
    val state = status(context)
    return state["exactAlarm"] == true && state["notifications"] == true && state["notificationChannelEnabled"] == true
  }
}
