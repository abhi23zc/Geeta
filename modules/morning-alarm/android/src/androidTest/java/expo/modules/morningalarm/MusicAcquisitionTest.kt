package expo.modules.morningalarm

import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.ByteArrayDataSource
import androidx.media3.datasource.DataSource
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.io.File
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@UnstableApi
class MusicAcquisitionTest {
  @Test fun fullAcquisitionVerifiesBytesAndPromotesWithoutAnotherNetworkRead() {
    val context=InstrumentationRegistry.getInstrumentation().targetContext
    val payload=("full song "+UUID.randomUUID()).repeat(1000).toByteArray()
    val hash=MessageDigest.getInstance("SHA-256").digest(payload).joinToString("") { "%02x".format(it.toInt() and 255) }
    val track=JSONObject().put("id","test-$hash").put("title","Offline song").put("artist","Fixture")
      .put("availability","available").put("asset",JSONObject().put("sha256",hash).put("bytes",payload.size).put("url","https://fixture.invalid/audio.mp3"))
    val factory=MusicAcquisition.sourceFactory
    var requests=0
    MusicAcquisition.sourceFactory={ DataSource.Factory { requests++;ByteArrayDataSource(payload) } }
    fun acquire(keep: Boolean): String {
      val done=CountDownLatch(1);var result: Result<String>?=null
      MusicAcquisition.acquire(context,track.toString(),keep) { result=it;done.countDown() }
      assertTrue(done.await(15,TimeUnit.SECONDS))
      return requireNotNull(result).getOrThrow()
    }
    try {
      val temporary=acquire(false)
      assertTrue(temporary.contains("/cache/"))
      assertEquals(hash,ContentFiles.hash(File(android.net.Uri.parse(temporary).path!!)))
      val before=requests
      val saved=acquire(true)
      assertTrue(saved.contains("/files/music-audio-v1/"))
      assertArrayEquals(payload,File(android.net.Uri.parse(saved).path!!).readBytes())
      assertEquals(before,requests)
      assertEquals(saved,MusicAcquisition.local(context,hash))
      assertTrue(MusicAcquisition.snapshots(context).any { it["hash"]==hash && it["saved"]==true && it["status"]=="ready" })
    } finally {
      MusicAcquisition.sourceFactory=factory
      MusicAcquisition.remove(context,hash)
      File(context.cacheDir,"music-full-v1/$hash.audio").delete()
    }
  }
}
