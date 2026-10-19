package expo.modules.morningalarm

import android.net.Uri
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.ByteArrayDataSource
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.TransferListener
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test

@UnstableApi
class MusicStreamCacheTest {
  @Test fun repeatedRangeUsesCachedBytesEvenWhenUpstreamIsOffline() {
    val context = InstrumentationRegistry.getInstrumentation().targetContext
    val payload = ByteArray(4096) { (it % 127).toByte() }
    var offline = false
    var requests = 0
    val upstream = DataSource.Factory {
      val delegate = ByteArrayDataSource(payload)
      object : DataSource {
        override fun open(spec: DataSpec): Long {
          check(!offline) { "Offline upstream should not be opened for a cached range" }
          requests++
          return delegate.open(spec)
        }
        override fun read(buffer: ByteArray, offset: Int, length: Int) = delegate.read(buffer, offset, length)
        override fun getUri() = delegate.uri
        override fun addTransferListener(listener: TransferListener) = delegate.addTransferListener(listener)
        override fun close() = delegate.close()
      }
    }
    val factory = MusicStreamCache.factory(context, upstream)
    val spec = DataSpec.Builder().setUri(Uri.parse("https://fixture.invalid/audio.mp3"))
      .setKey("cache-test-${System.nanoTime()}").setPosition(1024).setLength(256).build()
    fun read(): ByteArray {
      val source = factory.createDataSource()
      try {
        source.open(spec)
        val bytes = ByteArray(256)
        var offset = 0
        while (offset < bytes.size) {
          val count = source.read(bytes, offset, bytes.size - offset)
          if (count == -1) break
          offset += count
        }
        assertEquals(256, offset)
        return bytes
      } finally { source.close() }
    }
    assertArrayEquals(payload.copyOfRange(1024,1280), read())
    val before = requests
    offline = true
    assertArrayEquals(payload.copyOfRange(1024,1280), read())
    assertEquals(before, requests)
  }
}
