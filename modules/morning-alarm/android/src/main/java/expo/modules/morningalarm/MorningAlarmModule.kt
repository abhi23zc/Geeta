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
    AsyncFunction("setAppLanguage") { language: String -> AlarmStrings.setLanguage(context, language) }.runOnQueue(Queues.MAIN)
    Function("getAlarmStartupState") { AlarmPresentation.startupState(context) }
    AsyncFunction("acknowledgeRitualScreen") { input: ReadableArguments ->
      AlarmPresentation.acknowledge(appContext.currentActivity, input.getString("sessionId"), input.getString("stage"), input.getInt("hostGeneration"), input.getInt("coverGeneration"))
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("recordNavigationState") { route: String, top: String, focused: Boolean, owned: Boolean, foreground: Boolean ->
      val names = setOf("index", "alarm/wake", "breathe", "gita")
      val snapshot = AlarmPresentation.state(context)
      AlarmLog.event("ritual_navigation", "route=${if (route in names) route else "other"} top=${if (top in names) top else "other"} focus=$focused owned=$owned foreground=$foreground stage=${snapshot["stage"]} status=${snapshot["status"]} loading=${snapshot["loading"]}")
    }.runOnQueue(Queues.MAIN)
    Function("getPresentationState") { AlarmPresentation.state(context) }
    Function("getRewardOccurrence") { RitualRewards.occurrence(context) }
    AsyncFunction("completeRewardStage") { id: String, stage: String -> RitualRewards.complete(context, id, stage) }
    Function("getRitualCheckpoint") { stage: String -> AlarmPresentation.checkpoint(context, stage) }
    AsyncFunction("saveRitualCheckpoint") { id: String, stage: String, raw: String ->
      AlarmPresentation.saveCheckpoint(context, id, stage, raw)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("getPendingRewardReceipts") { RitualRewards.pending(context) }
    AsyncFunction("acknowledgeRewardReceipts") { ids: List<String> -> RitualRewards.acknowledge(context, ids) }
    AsyncFunction("setRitualStage") { stage: String ->
      appContext.currentActivity?.let { AlarmPresentation.setStage(it, stage) }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("advanceRitualStage") { id: String, stage: String ->
      val activity = appContext.currentActivity ?: throw IllegalStateException("Ritual screen unavailable")
      require(AlarmPresentation.state(context)["active"] == true) { "Alarm session ended" }
      AlarmPresentation.setStage(activity, stage, id)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("notifyRitualScreenReady") { route: String ->
      appContext.currentActivity?.let { AlarmPresentation.rendered(it, route) }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("endRitualPresentation") { AlarmPresentation.end(context) }.runOnQueue(Queues.MAIN)
    AsyncFunction("endRitualOccurrence") { id: String -> AlarmPresentation.end(context, "exit", id) }.runOnQueue(Queues.MAIN)
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

    AsyncFunction("schedule") { input: ReadableArguments -> synchronized(AlarmScheduler) {
      require(!AlarmStore.isRinging(context)) { "Complete Start my day before changing an active alarm" }
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
      val scheduledAt = if (stored.enabled) {
        AlarmScheduler.scheduleNext(context, stored)
      } else { AlarmScheduler.cancel(context); null }
      mapOf("scheduled" to (scheduledAt != null), "scheduledAt" to scheduledAt?.toDouble()) + AlarmScheduler.status(context)
    } }

    AsyncFunction("cancel") { synchronized(AlarmScheduler) {
      require(!AlarmStore.isRinging(context)) { "Complete Start my day before changing an active alarm" }
      AlarmScheduler.cancel(context)
      AlarmStore.setEnabled(context, false)
      mapOf("cancelled" to true)
    } }

    AsyncFunction("startMyDay") { id: String ->
      val activity = appContext.currentActivity ?: throw IllegalStateException("Ritual screen unavailable")
      AlarmController.startMyDay(activity, id)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("dismissAndScheduleNext") { AlarmController.dismiss(context, finishActivity = false)?.toDouble() }.runOnQueue(Queues.MAIN)
    AsyncFunction("dismissRitualOccurrence") { id: String ->
      require(AlarmPresentation.state(context)["sessionId"] == id && AlarmStore.isRinging(context)) { "Alarm session changed" }
      AlarmController.dismiss(context, finishActivity = false)?.toDouble()
    }.runOnQueue(Queues.MAIN)

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
    AsyncFunction("getHomeSnapshot") { synchronized(AlarmScheduler) {
      reconcile()
      mapOf("config" to AlarmStore.get(context)?.let(::configMap), "capabilities" to capabilityMap(context),
        "deliveryFailureAt" to context.createDeviceProtectedStorageContext().getSharedPreferences("alarm_delivery", Context.MODE_PRIVATE).getLong("failedAt", 0L).toDouble()) + AlarmScheduler.status(context)
    } }

    AsyncFunction("reconcile") { reconcile() }

    AsyncFunction("scheduleTest") {
      require(!AlarmStore.isRinging(context)) { "Stop the active alarm before testing" }
      require(AlarmCapabilities.ready(context)) { "Enable notifications, the alarm channel and precise alarms first" }
      AlarmScheduler.scheduleTest(context).toDouble()
    }

    AsyncFunction("getLaunchDiagnostics") {
      mapOf(
        "build" to AlarmLog.buildIdentity(context),
        "manufacturer" to Build.MANUFACTURER,
        "model" to Build.MODEL,
        "sdkInt" to Build.VERSION.SDK_INT,
        "interactive" to context.getSystemService(android.os.PowerManager::class.java).isInteractive,
        "ringing" to AlarmStore.isRinging(context),
        "capabilities" to capabilityMap(context),
        "events" to AlarmLog.entries(context),
      )
    }

    AsyncFunction("openAlarmReliabilitySettings") { stepId: String -> openReliabilitySettings(stepId) }
    AsyncFunction("openExactAlarmSettings") { openReliabilitySettings("exact") }
    AsyncFunction("openFullScreenIntentSettings") { openReliabilitySettings("fullscreen") }
    AsyncFunction("openNotificationSettings") { openReliabilitySettings("notifications") }
    AsyncFunction("openNotificationChannelSettings") { openReliabilitySettings("channel") }
    AsyncFunction("openAutoStartSettings") { openReliabilitySettings("startup") }
    AsyncFunction("openOemPermissionSettings") { openReliabilitySettings("popup") }
    AsyncFunction("openBatterySettings") { openReliabilitySettings("battery") }

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

  private fun reconcile(): Boolean = synchronized(AlarmScheduler) {
    val config = AlarmStore.get(context) ?: return false
    if (!config.enabled) { AlarmScheduler.cancel(context); return false }
    val status = capabilityMap(context)
    if (status["exactAlarm"] != true || status["notifications"] != true || status["notificationChannelEnabled"] != true) {
      AlarmScheduler.cancel(context, "needs-access")
      AlarmLog.event("schedule_paused", "required access missing; config retained")
      return false
    }
    return runCatching { AlarmScheduler.scheduleNext(context, config) != null }
      .onFailure { AlarmLog.event("reschedule_failed", it.javaClass.simpleName) }.getOrDefault(false)
  }

  private fun openReliabilitySettings(stepId: String): Map<String, Any> {
    require(stepId in setOf("notifications", "exact", "channel", "fullscreen", "startup", "battery", "popup")) { "Unknown alarm setting" }
    val brand = Build.MANUFACTURER.trim().lowercase()
    val packageUri = Uri.parse("package:${context.packageName}")
    val target = when (stepId) {
      "exact" -> if (Build.VERSION.SDK_INT >= 31) Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, packageUri) else appDetails()
      "fullscreen" -> if (Build.VERSION.SDK_INT >= 34) Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, packageUri) else appDetails()
      "notifications" -> if (Build.VERSION.SDK_INT >= 26) Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName) else appDetails()
      "channel" -> if (Build.VERSION.SDK_INT >= 26) Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName).putExtra(Settings.EXTRA_CHANNEL_ID, AlarmService.CHANNEL_ID) else appDetails()
      "popup" -> if (brand in listOf("xiaomi", "redmi", "poco")) Intent("miui.intent.action.APP_PERM_EDITOR").addCategory(Intent.CATEGORY_DEFAULT).setPackage("com.miui.securitycenter").putExtra("extra_pkgname", context.packageName) else appDetails()
      "startup" -> AlarmSettingsPolicy.startupTargets(brand).firstOrNull()?.let { Intent().setClassName(it.first, it.second) } ?: appDetails()
      // App details exposes this app's battery controls, unlike the global exemption list.
      else -> appDetails()
    }
    val label = when (stepId) {
      "exact" -> if (Build.VERSION.SDK_INT >= 31) "Alarms & reminders" else "App details"
      "fullscreen" -> if (Build.VERSION.SDK_INT >= 34) "Full-screen alarms" else "App details"
      "notifications" -> if (Build.VERSION.SDK_INT >= 26) "App notifications" else "App details"
      "channel" -> if (Build.VERSION.SDK_INT >= 26) "Alarm notification channel" else "App details"
      "popup" -> if (target.action == "miui.intent.action.APP_PERM_EDITOR") "Phone app permissions" else "App details"
      "startup" -> if (target.component != null) "Phone auto-start settings" else "App details"
      else -> "App details"
    }
    val alternatives = if (stepId == "startup") AlarmSettingsPolicy.startupTargets(brand).drop(1).map { Intent().setClassName(it.first, it.second) to "Phone auto-start settings" } else emptyList()
    return openResolved(target, label, alternatives) + mapOf("requestedStep" to stepId)
  }

  private fun appDetails() = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))

  private fun openResolved(intent: Intent, label: String, alternatives: List<Pair<Intent, String>> = emptyList()): Map<String, Any> {
    val choices = listOf(intent to label) + alternatives + listOf(appDetails() to "App details", Intent(Settings.ACTION_SETTINGS) to "Android settings")
    val opened = AlarmSettingsPolicy.firstOpened(choices, { (target, _) ->
      context.startActivity(target.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }, { error ->
      when (error) {
        is android.content.ActivityNotFoundException -> { AlarmLog.event("settings_unavailable", label); true }
        is SecurityException -> { AlarmLog.event("settings_blocked", label); true }
        else -> false
      }
    })
    if (opened != null) {
      val destination = opened.first.second
      val fallback = opened.second > 0
      AlarmLog.event("settings_opened", "$destination fallback=$fallback")
      return mapOf("destination" to destination, "fallback" to fallback)
    }
    throw IllegalStateException("Settings could not be opened. Open Settings manually and select this app.")
  }
}
