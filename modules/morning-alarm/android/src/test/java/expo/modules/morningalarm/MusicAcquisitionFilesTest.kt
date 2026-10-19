package expo.modules.morningalarm

import org.junit.Assert.*
import org.junit.Test
import java.io.File
import java.nio.file.Files

class MusicAcquisitionFilesTest {
  @Test fun verifiedCopyPreservesSourceAndPromotesCompleteBytes() {
    val root=Files.createTempDirectory("music-promotion").toFile()
    try {
      val source=File(root,"temporary.audio").apply { writeText("full recording") }
      val saved=File(root,"saved/song.audio")
      MusicAcquisitionFiles.promote(source,saved,source.length(),ContentFiles.hash(source))
      assertArrayEquals(source.readBytes(),saved.readBytes())
      assertTrue(source.exists())
      assertFalse(File(saved.path+".partial").exists())
    } finally { root.deleteRecursively() }
  }
  @Test fun invalidRecordingNeverBecomesReady() {
    val root=Files.createTempDirectory("music-invalid").toFile()
    try {
      val source=File(root,"temporary.audio").apply { writeText("damaged") }
      val saved=File(root,"song.audio")
      assertFalse(MusicAcquisitionFiles.verified(source,source.length(),"0".repeat(64)))
      try { MusicAcquisitionFiles.promote(source,saved,source.length(),"0".repeat(64));fail("Expected verification failure") } catch(expected: IllegalArgumentException) {}
      assertFalse(saved.exists());assertFalse(File(saved.path+".partial").exists())
    } finally { root.deleteRecursively() }
  }
  @Test fun resumedFilesReserveOnlyMissingBytes() {
    assertEquals(40L,MusicAcquisitionFiles.additionalBytes(200,160))
    assertEquals(0L,MusicAcquisitionFiles.additionalBytes(200,200))
  }
}
