package expo.modules.morningalarm

import android.Manifest
import android.app.ActivityManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.core.arguments.ReadableArguments
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MorningAlarmModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("MorningAlarm")
    Events("alarmTriggered", "alarmStopped")

    OnCreate {
      AlarmEvents.listener = { name, body -> sendEvent(name, body) }
    }
    OnDestroy {
      AlarmEvents.listener = null
    }

    AsyncFunction("schedule") { input: ReadableArguments ->
      val tone = input.getArguments("tone")
      val config = AlarmConfig(
        hour = input.getInt("hour").coerceIn(0, 23),
        minute = input.getInt("minute").coerceIn(0, 59),
        weekdays = input.getList("weekdays", emptyList<String>())
          .mapNotNull { it as? String }
          .filter { it in AlarmConfig.validDays }
          .toSet(),
        enabled = input.getBoolean("enabled", true),
        toneKind = tone?.getString("kind", "system") ?: "system",
        toneKey = tone?.getString("key", null),
        gradualVolume = input.getBoolean("gradualVolume", true),
        vibration = input.getBoolean("vibration", true),
        revision = 0L,
      )
      require(config.weekdays.isNotEmpty()) { "Choose at least one alarm day" }
      val stored = AlarmStore.put(context, config)
      val scheduledAt = if (stored.enabled && AlarmScheduler.canScheduleExact(context)) {
        AlarmScheduler.scheduleNext(context, stored)
      } else null
      mapOf("scheduled" to (scheduledAt != null), "scheduledAt" to scheduledAt?.toDouble())
    }

    AsyncFunction("cancel") {
      require(!AlarmStore.isRinging(context)) { "Complete Start my day before changing an active alarm" }
      AlarmScheduler.cancel(context)
      AlarmStore.setEnabled(context, false)
    }

    AsyncFunction("dismissAndScheduleNext") {
      AlarmController.dismiss(context, finishActivity = false)?.toDouble()
    }

    AsyncFunction("getConfig") {
      AlarmStore.get(context)?.let(::configMap)
    }

    AsyncFunction("getPlaybackState") {
      AlarmService.stateMap(context)
    }

    AsyncFunction("getCapabilityStatus") {
      capabilityMap(context)
    }

    AsyncFunction("getLaunchDiagnostics") {
      mapOf(
        "manufacturer" to Build.MANUFACTURER,
        "model" to Build.MODEL,
        "sdkInt" to Build.VERSION.SDK_INT,
        "interactive" to context.getSystemService(android.os.PowerManager::class.java).isInteractive,
        "ringing" to AlarmStore.isRinging(context),
        "capabilities" to capabilityMap(context),
      )
    }

    AsyncFunction("openExactAlarmSettings") {
      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}"))
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
      }
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    AsyncFunction("openFullScreenIntentSettings") {
      val action = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT
      } else Settings.ACTION_APPLICATION_DETAILS_SETTINGS
      context.startActivity(
        Intent(action, Uri.parse("package:${context.packageName}"))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      )
    }

    AsyncFunction("openNotificationChannelSettings") {
      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
          .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
          .putExtra(Settings.EXTRA_CHANNEL_ID, AlarmService.CHANNEL_ID)
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
      }
      openResolved(intent)
    }

    AsyncFunction("openAutoStartSettings") {
      // Xiaomi does not document this API, so always verify the component and
      // fall back to this app's detail screen when a ROM removes it.
      val miui = Intent().setClassName(
        "com.miui.securitycenter",
        "com.miui.permcenter.autostart.AutoStartManagementActivity",
      )
      openResolved(miui)
    }

    AsyncFunction("openOemPermissionSettings") {
      val miui = Intent().setClassName(
        "com.miui.securitycenter",
        "com.miui.permcenter.permissions.PermissionsEditorActivity",
      ).putExtra("extra_pkgname", context.packageName)
      openResolved(miui)
    }

    AsyncFunction("openBatterySettings") {
      val miui = Intent().setClassName(
        "com.miui.powerkeeper",
        "com.miui.powerkeeper.ui.HiddenAppsConfigActivity",
      ).putExtra("package_name", context.packageName)
        .putExtra("package_label", context.applicationInfo.loadLabel(context.packageManager).toString())
      openResolved(miui)
    }

    AsyncFunction("notifyWakeScreenReady") {
      AlarmLog.event("react_wake_ready")
      AlarmActivity.hideVisibleFallback()
    }
  }

  private fun configMap(config: AlarmConfig) = mapOf(
    "id" to config.id,
    "hour" to config.hour,
    "minute" to config.minute,
    "weekdays" to config.weekdays.toList(),
    "enabled" to config.enabled,
    "tone" to mapOf("kind" to config.toneKind, "key" to config.toneKey),
    "gradualVolume" to config.gradualVolume,
    "vibration" to config.vibration,
  )

  private fun capabilityMap(context: Context): Map<String, Any> {
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
    val batteryRestricted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      context.getSystemService(ActivityManager::class.java).isBackgroundRestricted
    } else false
    return mapOf(
      "notifications" to notifications,
      "exactAlarm" to AlarmScheduler.canScheduleExact(context),
      "fullScreenIntent" to fullScreen,
      "channelImportance" to channelImportance,
      "notificationChannelReady" to (channelImportance >= NotificationManager.IMPORTANCE_HIGH),
      "batteryRestricted" to batteryRestricted,
      "sdkInt" to Build.VERSION.SDK_INT,
      "manufacturer" to Build.MANUFACTURER,
      "oemGuidance" to (
        Build.MANUFACTURER.equals("Xiaomi", ignoreCase = true) ||
          Build.MANUFACTURER.equals("Redmi", ignoreCase = true) ||
          Build.MANUFACTURER.equals("POCO", ignoreCase = true)
        ),
    )
  }

  private fun openResolved(intent: Intent) {
    val target = if (intent.resolveActivity(context.packageManager) != null) intent else
      Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
    context.startActivity(target.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
  }
}
