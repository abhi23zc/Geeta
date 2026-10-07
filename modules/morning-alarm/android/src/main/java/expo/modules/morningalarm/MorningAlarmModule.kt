package expo.modules.morningalarm

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.core.arguments.ReadableArguments
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues

class MorningAlarmModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("MorningAlarm")
    Events("alarmTriggered", "alarmStopped", "alarmPresentationChanged")
    AsyncFunction("setAppLanguage") { language: String -> AlarmStrings.setLanguage(context, language) }
    Function("getPresentationState") { AlarmPresentation.state(context) }
    Function("getRewardOccurrence") { RitualRewards.occurrence(context) }
    AsyncFunction("completeRewardStage") { id: String, stage: String -> RitualRewards.complete(context, id, stage) }
    AsyncFunction("getPendingRewardReceipts") { RitualRewards.pending(context) }
    AsyncFunction("acknowledgeRewardReceipts") { ids: List<String> -> RitualRewards.acknowledge(context, ids) }
    AsyncFunction("setRitualStage") { stage: String ->
      appContext.currentActivity?.let { AlarmPresentation.setStage(it, stage) }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("notifyRitualScreenReady") { route: String ->
      appContext.currentActivity?.let { AlarmPresentation.rendered(it, route) }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("endRitualPresentation") { AlarmPresentation.end(context) }.runOnQueue(Queues.MAIN)
    AsyncFunction("setRitualScreenAwake") { awake: Boolean ->
      appContext.currentActivity?.let { AlarmPresentation.setAwake(it, awake) }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("requestRitualUnlock") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) promise.resolve(false) else AlarmPresentation.requestUnlock(activity, promise)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("hashContentFile") { uri: String -> ContentFiles.hash(ContentFiles.source(context, uri)) }
    AsyncFunction("getInstalledAlarmTone") { ContentFiles.installed(context) }
    AsyncFunction("installAlarmTone") { input: ReadableArguments ->
      ContentFiles.install(context, input.getString("key"), input.getString("uri"), input.getString("revision"), input.getDouble("bytes").toLong(), input.getString("sha256"))
    }

    OnCreate {
      AlarmLog.initialize(context)
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
      val scheduledAt = if (stored.enabled && AlarmCapabilities.ready(context)) {
        AlarmScheduler.scheduleNext(context, stored)
      } else { AlarmScheduler.cancel(context); null }
      mapOf("scheduled" to (scheduledAt != null), "scheduledAt" to scheduledAt?.toDouble())
    }

    AsyncFunction("cancel") {
      require(!AlarmStore.isRinging(context)) { "Complete Start my day before changing an active alarm" }
      AlarmScheduler.cancel(context)
      AlarmStore.setEnabled(context, false)
      mapOf("cancelled" to true)
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
      reconcile()
      capabilityMap(context)
    }

    AsyncFunction("reconcile") { reconcile() }

    AsyncFunction("scheduleTest") {
      require(!AlarmStore.isRinging(context)) { "Stop the active alarm before testing" }
      require(capabilityMap(context)["notifications"] == true && capabilityMap(context)["notificationChannelReady"] == true) { "Enable alarm notifications first" }
      AlarmScheduler.scheduleTest(context).toDouble()
    }

    AsyncFunction("getLaunchDiagnostics") {
      mapOf(
        "manufacturer" to Build.MANUFACTURER,
        "model" to Build.MODEL,
        "sdkInt" to Build.VERSION.SDK_INT,
        "interactive" to context.getSystemService(android.os.PowerManager::class.java).isInteractive,
        "ringing" to AlarmStore.isRinging(context),
        "capabilities" to capabilityMap(context),
        "events" to AlarmLog.entries(context),
      )
    }

    AsyncFunction("openExactAlarmSettings") {
      openResolved(if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
        Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}"))
      else appDetails(), if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) "Alarms & reminders" else "App details")
    }
    AsyncFunction("openFullScreenIntentSettings") {
      openResolved(if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
        Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:${context.packageName}"))
      else appDetails(), if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) "Full-screen alarms" else "App details")
    }
    AsyncFunction("openNotificationSettings") {
      openResolved(if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
      else appDetails(), if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) "App notifications" else "App details")
    }
    AsyncFunction("openNotificationChannelSettings") {
      openResolved(if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
        Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
          .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
          .putExtra(Settings.EXTRA_CHANNEL_ID, AlarmService.CHANNEL_ID)
      else appDetails(), if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) "Alarm notification channel" else "App details")
    }
    AsyncFunction("openAutoStartSettings") {
      val target = when (Build.MANUFACTURER.lowercase()) {
        "xiaomi", "redmi", "poco" -> Intent().setClassName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")
        "oppo", "realme", "oneplus" -> Intent().setClassName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")
        "vivo", "iqoo" -> Intent().setClassName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")
        "huawei", "honor" -> Intent().setClassName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity")
        else -> appDetails()
      }
      openResolved(target, if (target.component == null) "App details" else "Phone auto-start settings")
    }
    AsyncFunction("openOemPermissionSettings") {
      openResolved(appDetails(), "App details")
    }
    AsyncFunction("openBatterySettings") {
      openResolved(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS), "Battery optimization")
    }

    AsyncFunction("notifyWakeScreenReady") {
      AlarmLog.event("react_wake_ready")
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

  private fun capabilityMap(context: Context) = AlarmCapabilities.status(context)

  private fun reconcile(): Boolean {
    val config = AlarmStore.get(context) ?: return false
    if (!config.enabled) return false
    val status = capabilityMap(context)
    if (status["exactAlarm"] != true || status["notifications"] != true || status["notificationChannelReady"] != true) {
      AlarmScheduler.cancel(context)
      AlarmLog.event("schedule_paused", "required access missing; config retained")
      return false
    }
    return runCatching { AlarmScheduler.scheduleNext(context, config) != null }
      .onFailure { AlarmLog.event("reschedule_failed", it.javaClass.simpleName) }.getOrDefault(false)
  }

  private fun appDetails() = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))

  private fun openResolved(intent: Intent, label: String): Map<String, Any> {
    val choices = listOf(intent to label, appDetails() to "App details", Intent(Settings.ACTION_SETTINGS) to "Android settings")
    for ((target, destination) in choices) {
      try {
        context.startActivity(target.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        return mapOf("destination" to destination, "fallback" to (target !== intent))
      } catch (error: android.content.ActivityNotFoundException) {
        AlarmLog.event("settings_unavailable", destination)
      } catch (error: SecurityException) {
        AlarmLog.event("settings_blocked", destination)
      }
    }
    throw IllegalStateException("Settings could not be opened. Open Settings manually and select this app.")
  }
}
