package expo.modules.morningalarm

import java.time.Instant
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AlarmSchedulerTest {
  private val zone = ZoneId.of("Asia/Kolkata")

  @Test fun selectsLaterToday() {
    val config = config(setOf("mon"), 6, 30)
    val now = Instant.parse("2026-09-21T00:00:00Z") // Monday 05:30 IST
    assertEquals(Instant.parse("2026-09-21T01:00:00Z"), AlarmScheduler.nextOccurrence(config, now, zone))
  }

  @Test fun rollsToNextSelectedWeekday() {
    val config = config(setOf("mon", "wed"), 6, 30)
    val now = Instant.parse("2026-09-21T02:00:00Z") // Monday after the alarm
    assertEquals(Instant.parse("2026-09-23T01:00:00Z"), AlarmScheduler.nextOccurrence(config, now, zone))
  }

  @Test fun skipsDisabledConfig() {
    assertNull(AlarmScheduler.nextOccurrence(config(setOf("mon"), 6, 30).copy(enabled = false), Instant.now(), zone))
  }

  @Test fun picksTheNextWeekAfterAllSelectedDaysHavePassed() {
    val config = config(setOf("mon"), 6, 30)
    val now = Instant.parse("2026-09-21T02:00:00Z") // Monday after 06:30 IST
    assertEquals(Instant.parse("2026-09-28T01:00:00Z"), AlarmScheduler.nextOccurrence(config, now, zone))
  }

  @Test fun resolvesSpringForwardToTheFirstValidLocalInstant() {
    val newYork = ZoneId.of("America/New_York")
    val config = config(setOf("sun"), 2, 30)
    // 02:30 does not exist on the DST transition; ZonedDateTime advances it.
    assertEquals(
      Instant.parse("2026-03-08T07:30:00Z"),
      AlarmScheduler.nextOccurrence(config, Instant.parse("2026-03-08T05:00:00Z"), newYork),
    )
  }

  private fun config(days: Set<String>, hour: Int, minute: Int) = AlarmConfig(
    hour = hour,
    minute = minute,
    weekdays = days,
    enabled = true,
    gradualVolume = true,
    vibration = true,
    revision = 1,
  )
}
