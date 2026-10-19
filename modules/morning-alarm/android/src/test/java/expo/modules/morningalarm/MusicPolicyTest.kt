package expo.modules.morningalarm
import org.junit.Assert.*
import org.junit.Test
class MusicPolicyTest {
  @Test fun previousAvailabilityMatchesRestartAndHistory() {
    assertFalse(MusicPolicy.canPrevious(3000,false,"off",true))
    assertTrue(MusicPolicy.canPrevious(3001,false,"off",true))
    assertTrue(MusicPolicy.canPrevious(0,true,"off",true))
    assertTrue(MusicPolicy.canPrevious(0,false,"all",true))
    assertFalse(MusicPolicy.canPrevious(0,false,"all",false))
  }
  @Test fun endTimerWinsBeforeRepeatAndAdvance(){assertNull(MusicPolicy.next(listOf("a","b"),"a","one",true,true))}
  @Test fun repeatOneOnlyRepeatsNaturalCompletion(){assertEquals("a",MusicPolicy.next(listOf("a","b"),"a","one",true,false));assertEquals("b",MusicPolicy.next(listOf("a","b"),"a","one",false,false))}
  @Test fun repeatOffStopsAndAllWraps(){assertNull(MusicPolicy.next(listOf("a","b"),"b","off",true,false));assertEquals("a",MusicPolicy.next(listOf("a","b"),"b","all",true,false))}
  @Test fun entryIdentitySupportsDuplicateRecordings(){assertEquals("track-a-second",MusicPolicy.next(listOf("track-a-first","track-a-second"),"track-a-first","off",true,false))}
  @Test fun monotonicCountdownDoesNotDependOnPlayingOrWallClock(){assertEquals(500L,MusicPolicy.remaining(1000,500));assertEquals(0L,MusicPolicy.remaining(1000,1200));assertNull(MusicPolicy.remaining(0,1200))}
  @Test fun everyPriorityOwnerBlocksExternalPlay(){assertTrue(MusicPolicy.blocked("alarm",false,false));assertTrue(MusicPolicy.blocked("ritual",false,false));assertTrue(MusicPolicy.blocked("none",true,false));assertTrue(MusicPolicy.blocked("none",false,true));assertFalse(MusicPolicy.blocked("none",false,false))}
}
