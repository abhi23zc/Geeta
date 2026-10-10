package expo.modules.morningalarm

/** Proprietary components are candidates, never evidence of granted access. */
internal object AlarmSettingsPolicy {
  fun <T> firstOpened(targets: List<T>, launch: (T) -> Unit, recoverable: (Exception) -> Boolean): Pair<T, Int>? {
    for ((index, target) in targets.withIndex()) {
      try { launch(target); return target to index }
      catch (error: Exception) { if (!recoverable(error)) throw error }
    }
    return null
  }

  fun startupTargets(manufacturer: String): List<Pair<String, String>> = when (manufacturer.trim().lowercase()) {
    "xiaomi", "redmi", "poco" -> listOf("com.miui.securitycenter" to "com.miui.permcenter.autostart.AutoStartManagementActivity")
    "oppo", "realme", "oneplus" -> listOf(
      "com.coloros.safecenter" to "com.coloros.safecenter.permission.startup.StartupAppListActivity",
      "com.oplus.safecenter" to "com.oplus.safecenter.startupapp.StartupAppListActivity")
    "vivo", "iqoo" -> listOf(
      "com.vivo.permissionmanager" to "com.vivo.permissionmanager.activity.BgStartUpManagerActivity",
      "com.iqoo.secure" to "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager")
    "huawei" -> listOf("com.huawei.systemmanager" to "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity")
    "honor" -> listOf(
      "com.hihonor.systemmanager" to "com.hihonor.systemmanager.startupmgr.ui.StartupNormalAppListActivity",
      "com.huawei.systemmanager" to "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity")
    else -> emptyList()
  }
}
