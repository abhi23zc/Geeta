package expo.modules.morningalarm

import android.content.Intent
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Queues
import androidx.media3.common.util.UnstableApi

@UnstableApi
class MusicPlaybackModule : Module() {
  private val context get() = requireNotNull(appContext.reactContext)
  /** Starting a Service is asynchronous; never turn first playback into a spurious Retry. */
  private fun withService(promise: Promise, action: (MusicService) -> Any?) {
    try {
      if (MusicService.active == null) context.startService(Intent(context, MusicService::class.java))
      val handler = Handler(Looper.getMainLooper())
      var attempts = 0
      val ready = object : Runnable {
        override fun run() {
          val service = MusicService.active
          if (service == null && attempts++ < 80) { handler.postDelayed(this, 25); return }
          if (service == null) { promise.reject("MUSIC_START", "Music service could not start", null); return }
          try { promise.resolve(action(service)) } catch(error: Exception) { promise.reject("MUSIC_COMMAND", error.message, error) }
        }
      }
      ready.run()
    } catch(error: Exception) { promise.reject("MUSIC_START", error.message, error) }
  }
  override fun definition() = ModuleDefinition {
    Name("MusicPlayback")
    Events("snapshot", "acquisition")
    OnCreate { MusicService.listener = { sendEvent("snapshot", it) }; MusicAcquisition.listener = { sendEvent("acquisition", it) } }
    OnDestroy { MusicService.listener = null; MusicAcquisition.listener = null }
    AsyncFunction("initialize") { promise: Promise -> withService(promise) { true } }.runOnQueue(Queues.MAIN)
    AsyncFunction("snapshot") { MusicService.active?.snapshot() }.runOnQueue(Queues.MAIN)
    AsyncFunction("beginQueue") { promise: Promise -> withService(promise) { it.beginQueue() } }.runOnQueue(Queues.MAIN)
    AsyncFunction("replaceQueue") { raw: String, id: String, play: Boolean, epoch: Double, promise: Promise -> withService(promise) { it.replace(raw,id,play,epoch.toLong()); true } }.runOnQueue(Queues.MAIN)
    AsyncFunction("command") { name: String, value: String?, promise: Promise -> withService(promise) { it.command(name,value); true } }.runOnQueue(Queues.MAIN)
    AsyncFunction("setOwner") { owner: String -> require(owner in setOf("none","ritual","alarm")); MusicService.takeOwnership(owner) }.runOnQueue(Queues.MAIN)
    AsyncFunction("acquisitions") { MusicAcquisition.snapshots(context) }.runOnQueue(Queues.MAIN)
    AsyncFunction("acquire") { raw: String, keep: Boolean, promise: Promise ->
      try { MusicAcquisition.acquire(context, raw, keep) { result -> result.fold({ promise.resolve(it) }, { promise.reject("MUSIC_DOWNLOAD", it.message, it) }) } }
      catch(error: Exception) { promise.reject("MUSIC_DOWNLOAD", error.message, error) }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("cancelAcquisition") { hash: String -> MusicAcquisition.cancel(context,hash) }.runOnQueue(Queues.MAIN)
    AsyncFunction("removeAcquisition") { hash: String -> MusicAcquisition.remove(context,hash) }.runOnQueue(Queues.MAIN)
    AsyncFunction("localAcquisition") { hash: String -> MusicAcquisition.local(context,hash) }.runOnQueue(Queues.MAIN)
    AsyncFunction("isPinned") { uri: String -> MusicService.active?.isPinned(uri) ?: false }.runOnQueue(Queues.MAIN)
  }
}
