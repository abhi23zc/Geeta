package expo.modules.morningalarm

import org.junit.Assert.*
import org.junit.Test

class AlarmSettingsPolicyTest {
  @Test fun aliasesResolveToSameCandidateWithoutUniversalAutostart() {
    assertEquals(AlarmSettingsPolicy.startupTargets("Xiaomi"), AlarmSettingsPolicy.startupTargets(" Redmi "))
    assertEquals(AlarmSettingsPolicy.startupTargets("vivo"), AlarmSettingsPolicy.startupTargets("iQOO"))
    assertTrue(AlarmSettingsPolicy.startupTargets("Google").isEmpty())
    assertTrue(AlarmSettingsPolicy.startupTargets("Samsung").isEmpty())
    assertTrue(AlarmSettingsPolicy.startupTargets("unknown").isEmpty())
  }
  @Test fun newRomCandidatesRetainOlderFallbacks() {
    assertEquals(2, AlarmSettingsPolicy.startupTargets("OnePlus").size)
    val honor = AlarmSettingsPolicy.startupTargets("Honor")
    assertEquals("com.hihonor.systemmanager", honor.first().first)
    assertEquals("com.huawei.systemmanager", honor.last().first)
  }
  @Test fun missingAndBlockedShortcutsFallBackWithoutClaimingAGrant() {
    val attempted = mutableListOf<String>()
    val opened = AlarmSettingsPolicy.firstOpened(listOf("shortcut", "app-details", "settings"), { target ->
      attempted.add(target)
      if (target != "settings") throw SecurityException("blocked")
    }, { it is SecurityException })
    assertEquals(listOf("shortcut", "app-details", "settings"), attempted)
    assertEquals("settings", opened!!.first)
    assertEquals(2, opened.second)
    val first = AlarmSettingsPolicy.firstOpened(listOf("shortcut", "app-details"), { _ -> }, { false })
    assertEquals(0, first!!.second)
  }
  @Test fun allTargetsUnavailableReturnFailureAndUnexpectedExceptionsRemainVisible() {
    assertNull(AlarmSettingsPolicy.firstOpened(listOf("shortcut", "settings"), { _ -> throw SecurityException() }, { true }))
    try {
      AlarmSettingsPolicy.firstOpened(listOf("shortcut"), { _ -> throw IllegalStateException("unexpected") }, { false })
      fail("Unexpected failure must propagate")
    } catch (error: IllegalStateException) { assertEquals("unexpected", error.message) }
  }
}
