package expo.modules.morningalarm

data class AlarmConfig(
  val id: String = ID,
  val hour: Int,
  val minute: Int,
  val weekdays: Set<String>,
  val enabled: Boolean,
  val toneKind: String = "system",
  val toneKey: String? = null,
  val gradualVolume: Boolean,
  val vibration: Boolean,
  val revision: Long,
) {
  companion object {
    const val ID = "morning-ritual"
    val validDays = setOf("mon", "tue", "wed", "thu", "fri", "sat", "sun")
  }
}
