package expo.modules.morningalarm

import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime
import org.junit.Assert.*
import org.junit.Test

class AlarmCyclePolicyTest {
  @Test fun cyclesRepeatWithoutExpiry() {
    for (length in listOf(1, 7, 14)) {
      val start = LocalDate.parse("2026-10-19")
      for (offset in listOf(0L, 1L, 6L, 7L, 13L, 14L, 3650L)) {
        assertEquals((offset % length).toInt(), AlarmCyclePolicy.index(start.toString(), start.plusDays(offset), length))
      }
    }
  }
  @Test fun futureStartAndCalendarBoundaries() {
    assertNull(AlarmCyclePolicy.index("2026-10-19", LocalDate.parse("2026-10-18"), 7))
    assertEquals(2, AlarmCyclePolicy.index("2024-02-28", LocalDate.parse("2024-03-01"), 7))
    assertEquals(3, AlarmCyclePolicy.index("2026-12-30", LocalDate.parse("2027-01-02"), 14))
  }
  @Test fun skippedWeekdaysAndDstUseCalendarDays() {
    assertEquals(3, AlarmCyclePolicy.index("2026-10-16", LocalDate.parse("2026-10-19"), 7))
    val zone = ZoneId.of("America/New_York")
    val before = ZonedDateTime.of(2026, 3, 7, 6, 30, 0, 0, zone)
    val after = before.plusDays(2)
    assertEquals(2, AlarmCyclePolicy.index(before.toLocalDate().toString(), after.toLocalDate(), 14))
  }
  @Test(expected = IllegalArgumentException::class) fun rejectsInvalidLength() {
    AlarmCyclePolicy.index("2026-10-19", LocalDate.parse("2026-10-19"), 15)
  }
}
