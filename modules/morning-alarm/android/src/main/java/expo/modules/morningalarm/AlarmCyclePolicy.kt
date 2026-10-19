package expo.modules.morningalarm

import java.time.LocalDate
import java.time.temporal.ChronoUnit

object AlarmCyclePolicy {
  fun index(startDate: String, date: LocalDate, length: Int): Int? {
    require(length in 1..14)
    val elapsed = ChronoUnit.DAYS.between(LocalDate.parse(startDate), date)
    return if (elapsed < 0) null else (elapsed % length).toInt()
  }
}
