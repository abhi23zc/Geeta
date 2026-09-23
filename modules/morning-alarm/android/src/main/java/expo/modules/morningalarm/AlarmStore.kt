package expo.modules.morningalarm

import android.content.Context

object AlarmStore {
  private const val PREFS = "morning_ritual_alarm"
  private const val KEY_CONFIGURED = "configured"
  private const val KEY_RINGING = "ringing"
  private const val KEY_TRIGGERED_AT = "triggered_at"
  private const val KEY_SCHEDULED_AT = "scheduled_at"

  private fun prefs(context: Context) =
    context.createDeviceProtectedStorageContext()
      .getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun get(context: Context): AlarmConfig? {
    val p = prefs(context)
    if (!p.getBoolean(KEY_CONFIGURED, false)) return null
    return AlarmConfig(
      hour = p.getInt("hour", 6),
      minute = p.getInt("minute", 30),
      weekdays = p.getStringSet("weekdays", emptySet())?.toSet() ?: emptySet(),
      enabled = p.getBoolean("enabled", false),
      toneKind = p.getString("tone_kind", "system") ?: "system",
      toneKey = p.getString("tone_key", null),
      gradualVolume = p.getBoolean("gradual_volume", true),
      vibration = p.getBoolean("vibration", true),
      revision = p.getLong("revision", 0L),
    )
  }

  fun put(context: Context, config: AlarmConfig): AlarmConfig {
    val next = config.copy(revision = (get(context)?.revision ?: 0L) + 1L)
    prefs(context).edit()
      .putBoolean(KEY_CONFIGURED, true)
      .putInt("hour", next.hour)
      .putInt("minute", next.minute)
      .putStringSet("weekdays", next.weekdays)
      .putBoolean("enabled", next.enabled)
      .putString("tone_kind", next.toneKind)
      .putString("tone_key", next.toneKey)
      .putBoolean("gradual_volume", next.gradualVolume)
      .putBoolean("vibration", next.vibration)
      .remove("snooze_minutes")
      .putLong("revision", next.revision)
      .apply()
    return next
  }

  fun setEnabled(context: Context, enabled: Boolean): AlarmConfig? {
    val current = get(context) ?: return null
    return put(context, current.copy(enabled = enabled))
  }

  fun setRinging(context: Context, ringing: Boolean, triggeredAt: Long = 0L, scheduledAt: Long = 0L) {
    prefs(context).edit()
      .putBoolean(KEY_RINGING, ringing)
      .putLong(KEY_TRIGGERED_AT, if (ringing) triggeredAt else 0L)
      .putLong(KEY_SCHEDULED_AT, if (ringing) scheduledAt else 0L)
      .apply()
  }

  fun isRinging(context: Context) = prefs(context).getBoolean(KEY_RINGING, false)
  fun triggeredAt(context: Context) = prefs(context).getLong(KEY_TRIGGERED_AT, 0L)
  fun scheduledAt(context: Context) = prefs(context).getLong(KEY_SCHEDULED_AT, 0L)
}
