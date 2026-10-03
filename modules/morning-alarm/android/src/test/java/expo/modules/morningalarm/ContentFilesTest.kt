package expo.modules.morningalarm

import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File

class ContentFilesTest {
  @Test fun streamingHashMatchesKnownVector() {
    val file = File.createTempFile("geeta-hash", ".audio")
    try {
      file.writeText("abc")
      assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", ContentFiles.hash(file))
    } finally { file.delete() }
  }
  @Test fun legacyToneLabelsMapToStableKeys() {
    assertEquals("gita", ContentFiles.key("Raag Bhairav & Sacred Flute"))
    assertEquals("shankh", ContentFiles.key("Gentle Shankh & Chants"))
    assertEquals("pranayama", ContentFiles.key("Pranayama First"))
  }
}
