package expo.modules.morningalarm

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import androidx.media3.common.*
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.*
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.Executors
import java.io.File

/** One music engine. Queue policy and timers live here, not in React. All mutations run on main. */
@UnstableApi
class MusicService : MediaSessionService() {
  private lateinit var engine: ExoPlayer
  private var session: MediaSession? = null
  private var itemListener: Player.Listener? = null
  private val handler = Handler(Looper.getMainLooper())
  private var queue = JSONArray()
  private var order = mutableListOf<String>()
  private var history = mutableListOf<String>()
  private var current: String? = null
  private var repeat = "off"
  private var shuffle = false
  private var timer: Any? = null
  private var deadline = 0L
  private var interruption: String? = null
  private var error: String? = null
  private var completed = false
  private var preserveCurrent = false
  private var playedCurrent = false
  private var restoring = false
  private var availableIds: Set<String>? = null
  private var invalidation = 0L
  @Volatile private var generation = 0L
  private var loading = false
  private var desiredPosition = 0L
  private val resolver = Executors.newSingleThreadExecutor()
  private var lastSave = 0L
  private val prefs by lazy { getSharedPreferences("music_session_v1", Context.MODE_PRIVATE) }
  private val tick = object : Runnable {
    override fun run() {
      if (deadline > 0 && SystemClock.elapsedRealtime() >= deadline) { timer = null; deadline = 0; pause("sleep") }
      if (SystemClock.elapsedRealtime() - lastSave >= 10000) save()
      emit(); handler.postDelayed(this, 500)
    }
  }
  override fun onCreate() {
    super.onCreate(); active = this
    engine = ExoPlayer.Builder(this).build().apply {
      setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(), true)
      setHandleAudioBecomingNoisy(true)
      setWakeMode(C.WAKE_MODE_LOCAL)
      addListener(object : Player.Listener {
        override fun onPlayWhenReadyChanged(ready: Boolean, reason: Int) {
          if (reason == Player.PLAY_WHEN_READY_CHANGE_REASON_AUDIO_FOCUS_LOSS || reason == Player.PLAY_WHEN_READY_CHANGE_REASON_AUDIO_BECOMING_NOISY) pause("audio-focus")
          emit(); save()
        }
        override fun onPlaybackSuppressionReasonChanged(reason: Int) { if(reason != Player.PLAYBACK_SUPPRESSION_REASON_NONE) pause("audio-focus") }
      })
    }
    val controlled = object : ForwardingPlayer(engine) {
      override fun getAvailableCommands(): Player.Commands = super.getAvailableCommands().buildUpon().addAll(Player.COMMAND_SEEK_TO_NEXT,Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM,Player.COMMAND_SEEK_TO_PREVIOUS,Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM).build()
      override fun isCommandAvailable(command: Int): Boolean = availableCommands.contains(command)
      override fun play() { playExplicit() }
      override fun setPlayWhenReady(value: Boolean) { if(value) playExplicit() else pause("external") }
      override fun pause() { this@MusicService.pause("external") }
      override fun stop() { stopMusic() }
      override fun seekToNext() { advance(false) }
      override fun seekToNextMediaItem() { advance(false) }
      override fun seekToPrevious() { previous() }
      override fun seekToPreviousMediaItem() { previous() }
      override fun seekTo(positionMs: Long) { seek(positionMs) }
    }
    session = MediaSession.Builder(this, controlled).setCallback(object : MediaSession.Callback {
      override fun onConnect(session: MediaSession, controller: MediaSession.ControllerInfo): MediaSession.ConnectionResult {
        val trusted = controller.uid == android.os.Process.myUid() || controller.isTrusted || session.isMediaNotificationController(controller)
        if (!trusted) return MediaSession.ConnectionResult.reject()
        val allowed = Player.Commands.Builder().addAll(Player.COMMAND_PLAY_PAUSE, Player.COMMAND_STOP, Player.COMMAND_SEEK_IN_CURRENT_MEDIA_ITEM, Player.COMMAND_SEEK_TO_NEXT, Player.COMMAND_SEEK_TO_PREVIOUS, Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM, Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM, Player.COMMAND_GET_CURRENT_MEDIA_ITEM, Player.COMMAND_GET_TIMELINE, Player.COMMAND_GET_METADATA).build()
        return MediaSession.ConnectionResult.AcceptedResultBuilder(session).setAvailablePlayerCommands(allowed).build()
      }
      override fun onPlayerCommandRequest(session: MediaSession, controller: MediaSession.ControllerInfo, command: Int): Int {
        if (blocked() && command in setOf(Player.COMMAND_PLAY_PAUSE,Player.COMMAND_SEEK_IN_CURRENT_MEDIA_ITEM,Player.COMMAND_SEEK_TO_NEXT,Player.COMMAND_SEEK_TO_PREVIOUS,Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM,Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM)) return SessionResult.RESULT_ERROR_INVALID_STATE
        return SessionResult.RESULT_SUCCESS
      }
    }).build()
    runCatching {
      val saved = JSONObject(prefs.getString("snapshot", "{}")!!)
      queue = saved.optJSONArray("queue") ?: JSONArray(); current = saved.optString("entryId").takeIf { it.isNotEmpty() && it!="null" }
      repeat = saved.optString("repeat", "off"); shuffle = saved.optBoolean("shuffle")
      order = saved.optJSONArray("order")?.let { a -> (0 until a.length()).map { a.getString(it) }.toMutableList() } ?: mutableListOf()
      engine.setPlaybackSpeed(saved.optDouble("speed", 1.0).toFloat())
      availableIds=saved.optJSONArray("availableIds")?.let { a -> (0 until a.length()).map { a.getString(it) }.toSet() }
      if(saved.optString("timerProcess")==PROCESS_TOKEN) { timer=saved.opt("timer").takeIf { it!=JSONObject.NULL }; deadline=saved.optLong("deadline",0) }
      restoring=current!=null
      current?.let { load(it, false, saved.optLong("positionMs", 0)) }
    }.onFailure { queue = JSONArray(); current = null }
    handler.post(tick)
  }
  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = session
  private fun blocked() = MusicPolicy.blocked(owner, AlarmStore.isRinging(this), AlarmPresentation.state(this)["active"] == true)
  private fun entry(id: String? = current): JSONObject? = (0 until queue.length()).map { queue.getJSONObject(it) }.find { it.getString("entryId") == id }
  private fun observeItem(request: Long, id: String) {
    itemListener?.let { engine.removeListener(it) }
    val listener=object:Player.Listener {
      override fun onIsPlayingChanged(playing: Boolean) { if(request==generation && current==id && playing)playedCurrent=true }
      override fun onPlayerError(failure: PlaybackException) {
        if(request!=generation || current!=id)return
        error=failure.localizedMessage ?: "Playback failed"; save(); emit()
      }
      override fun onPlaybackStateChanged(state: Int) {
        if(request!=generation || current!=id)return
        if(state==Player.STATE_ENDED)finishTrack()
        emit()
      }
    }
    itemListener=listener; engine.addListener(listener)
  }
  private fun load(id: String, play: Boolean, position: Long = 0) {
    val request = ++generation
    itemListener?.let { engine.removeListener(it) }; itemListener=null
    engine.pause(); engine.stop(); engine.clearMediaItems(); current=id; error=null; completed=false; preserveCurrent=false; playedCurrent=false; loading=true; desiredPosition=position
    val e=entry(id) ?: run { loading=false; error="Recording unavailable"; emit(); return }
    val track=JSONObject(e.getJSONObject("track").toString())
    val source=e.getString("uri")
    emit(); save()
    resolver.execute {
      if(request!=generation)return@execute
      val result=runCatching {
        var uri=Uri.parse(source)
        require(uri.scheme in setOf("https","file","asset","android.resource"))
        if(uri.scheme=="file") {
          val file=File(requireNotNull(uri.path))
          if(!file.isFile) {
            val remote=track.optJSONObject("asset")?.optString("url")
            require(remote?.startsWith("https://")==true) { "Downloaded recording is missing. Redownload it." }
            uri=Uri.parse(remote)
          } else {
            val privateFile=ContentFiles.source(this,source)
            val asset=track.optJSONObject("asset")
            if(asset!=null) require(privateFile.length()==asset.getLong("bytes") && ContentFiles.hash(privateFile)==asset.getString("sha256")) { "Downloaded audio failed verification. Stop music, delete it, and redownload." }
          }
        }
        uri
      }
      handler.post {
        if(request!=generation)return@post
        loading=false
        result.onSuccess { uri ->
          try {
            val media=MediaMetadata.Builder().setTitle(track.getString("title")).setArtist(track.optString("artist"))
            track.optString("artworkUrl").takeIf { it.startsWith("https://") }?.let { media.setArtworkUri(Uri.parse(it)) }
            observeItem(request,id)
            engine.setMediaItem(MediaItem.Builder().setMediaId(id).setUri(uri).setMediaMetadata(media.build()).build(),desiredPosition.coerceIn(0,track.optLong("durationMs",0).coerceAtLeast(0)))
            engine.prepare()
            if(deadline>0 && SystemClock.elapsedRealtime()>=deadline) { timer=null; deadline=0; pause("sleep") }
            else if(play && !blocked()) { preserveCurrent=true; engine.play() }
          } catch(failure:Exception) { error=failure.message ?: "Playback failed"; engine.pause() }
        }.onFailure { failure -> error=failure.message ?: "Audio verification failed"; engine.pause() }
        save(); emit()
      }
    }
  }
  fun beginQueue(): Long {
    restoring=false; pause("queue-replacement"); engine.stop(); engine.clearMediaItems(); queue=JSONArray(); current=null; order.clear(); history.clear(); prefs.edit().remove("snapshot").apply(); emit(); return invalidation
  }
  fun replace(raw: String, id: String, play: Boolean, expectedEpoch: Long) {
    require(expectedEpoch==invalidation) { "Playback request interrupted" }
    val parsed = JSONArray(raw); require(parsed.length() in 1..1000)
    val ids = mutableSetOf<String>()
    for(i in 0 until parsed.length()) {
      val e = parsed.getJSONObject(i); require(ids.add(e.getString("entryId")))
      require(e.getJSONObject("track").getString("availability") == "available")
      val uri=Uri.parse(e.getString("uri")); require(uri.scheme in setOf("https","file","asset","android.resource"))
      if(uri.scheme=="asset")require(uri.path=="/geeta-10-20-hi.mp3" && e.getJSONObject("track").optString("bundledId")=="gita-10-20-hi")
      if(uri.scheme=="file" && File(uri.path ?: "").isFile)ContentFiles.source(this,uri.toString())
    }
    require(id in ids)
    val selected=(0 until parsed.length()).map { parsed.getJSONObject(it) }.first { it.getString("entryId")==id }
    require(availableIds==null || selected.getJSONObject("track").getString("id") in availableIds!!) { "This recording is coming soon" }
    queue = parsed; history.clear(); order = ids.toMutableList()
    if (shuffle) { order.remove(id); order.shuffle(); order.add(0,id) }
    load(id, play)
  }
  private fun finishTrack() {
    val eligible=order.filter { id -> availableIds==null || entry(id)?.getJSONObject("track")?.optString("id") in availableIds!! }
    val effectiveRepeat=if(repeat=="one" && current !in eligible)"off" else repeat
    val next=MusicPolicy.next(eligible,current,effectiveRepeat,true,timer=="end-of-track")
    if(timer == "end-of-track") { timer=null; deadline=0; completed=true; pause("sleep"); return }
    if(next==current && effectiveRepeat=="one") { current?.let { load(it,true) }; return }
    if(next==null || !advance(true)) { completed=true; pause("completed") }
  }
  private fun advance(natural: Boolean): Boolean {
    if(blocked())return false
    val eligible=order.filter { id -> availableIds==null || entry(id)?.getJSONObject("track")?.optString("id") in availableIds!! }
    val id=MusicPolicy.next(eligible,current,repeat,false,false)
    if(id==null) { if(!natural) pause("user"); return false }
    current?.let { if(playedCurrent && (availableIds==null || entry(it)?.getJSONObject("track")?.optString("id") in availableIds!!))history.add(it) }; load(id,true); return true
  }
  private fun previous() {
    if(blocked())return
    if(position()>3000) { seek(0); return }
    val id=if(history.isNotEmpty()) history.removeAt(history.lastIndex) else if(repeat=="all") order.lastOrNull { key -> availableIds==null || entry(key)?.getJSONObject("track")?.optString("id") in availableIds!! } else null
    if(id==null) seek(0) else load(id,true)
  }
  private fun playExplicit() {
    if(blocked()) { pause(owner.takeIf { it!="none" } ?: "ritual"); return }
    if(deadline>0 && SystemClock.elapsedRealtime()>=deadline) { timer=null; deadline=0; pause("sleep"); return }
    if((completed || !preserveCurrent) && availableIds!=null && entry()?.getJSONObject("track")?.optString("id") !in availableIds!!) { error="This recording is coming soon"; emit(); return }
    interruption=null
    if(error!=null || loading || engine.playbackState==Player.STATE_IDLE) current?.let { load(it,true,position()) }
    else { current?.let { observeItem(generation,it) }; preserveCurrent=true; if(completed) { engine.seekTo(0); completed=false }; engine.play() }
    emit()
  }
  fun pause(reason: String) { generation++; invalidation++; loading=false; engine.pause(); interruption=reason; save(); emit() }
  private fun position(): Long = if(engine.currentMediaItem==null)desiredPosition else engine.currentPosition.coerceAtLeast(0)
  private fun seek(ms: Long) { desiredPosition=ms.coerceIn(0,engine.duration.takeIf { it>0 } ?: entry()?.getJSONObject("track")?.optLong("durationMs",0) ?: 0); if(engine.currentMediaItem!=null)engine.seekTo(desiredPosition); save(); emit() }
  fun command(name: String, value: String?) {
    when(name) {
      "availability" -> { val allowed=JSONArray(value ?: "[]"); val ids=(0 until allowed.length()).map { allowed.getString(it) }.toSet(); availableIds=ids; history=history.filter { id -> entry(id)?.getJSONObject("track")?.optString("id") in ids }.toMutableList(); order=order.filter { id -> entry(id)?.getJSONObject("track")?.optString("id") in ids || id==current }.toMutableList()
        if(restoring) { restoring=false; if(entry()?.getJSONObject("track")?.optString("id") !in ids) {
          val id=order.firstOrNull { key -> entry(key)?.getJSONObject("track")?.optString("id") in ids }
          if(id!=null)load(id,false) else { pause("catalog"); engine.stop(); engine.clearMediaItems(); queue=JSONArray(); current=null; order.clear() }
        } }
      }
      "catalogQueue" -> { val incoming=JSONArray(value ?: "[]"); for(i in 0 until incoming.length()) { val update=incoming.getJSONObject(i); val id=update.getString("entryId"); if(id==current)continue; require(Uri.parse(update.getString("uri")).scheme in setOf("https","file","asset","android.resource")); for(j in 0 until queue.length())if(queue.getJSONObject(j).getString("entryId")==id)queue.put(j,update) }; save() }
      "play" -> playExplicit()
      "pause" -> pause(value ?: "user")
      "stop" -> stopMusic()
      "seek" -> seek(value?.toDoubleOrNull()?.toLong() ?: 0)
      "next" -> advance(false)
      "previous" -> previous()
      "speed" -> { val speed=value?.toFloatOrNull(); require(speed in setOf(.75f,1f,1.25f,1.5f,2f)); engine.setPlaybackSpeed(speed!!); save() }
      "repeat" -> { require(value in setOf("off","all","one")); repeat=value!!; save() }
      "shuffle" -> { shuffle=value=="true"; order=(0 until queue.length()).map { queue.getJSONObject(it).getString("entryId") }.toMutableList(); if(shuffle) { order.remove(current); order.shuffle(); current?.let { order.add(0,it) } }; save() }
      "timer" -> { val minutes=value?.toIntOrNull(); require(value==null || value=="end-of-track" || minutes in setOf(5,10,15,30,45,60)); timer=minutes ?: value; deadline=if(minutes!=null) SystemClock.elapsedRealtime()+minutes*60000L else 0 }
      else -> throw IllegalArgumentException("Unknown music command")
    }
    save(); emit()
  }
  private fun stopMusic() {
    generation++; invalidation++; loading=false; error=null; interruption=null; completed=false; desiredPosition=0; preserveCurrent=false; playedCurrent=false; timer=null; deadline=0; queue=JSONArray(); current=null; order.clear(); history.clear()
    engine.stop(); engine.clearMediaItems(); prefs.edit().remove("snapshot").apply(); emit(); stopSelf()
  }
  fun isPinned(uri: String): Boolean = entry()?.optString("uri")==uri
  fun snapshot(): Map<String,Any?> = mapOf(
    "queue" to (0 until queue.length()).map { jsonMap(queue.getJSONObject(it)) }, "order" to order.toList(), "history" to history.toList(), "entryId" to current,
    "positionMs" to (if(current==null)0 else position()), "durationMs" to (engine.duration.takeIf { it>0 } ?: entry()?.getJSONObject("track")?.optLong("durationMs",0) ?: 0),
    "state" to when { error!=null -> "failed"; current==null -> "idle"; loading -> "loading"; completed -> "completed"; engine.isPlaying -> "playing"; engine.playbackState==Player.STATE_BUFFERING -> "loading"; else -> "paused" },
    "buffering" to (loading || engine.playbackState==Player.STATE_BUFFERING), "speed" to engine.playbackParameters.speed, "shuffle" to shuffle, "repeat" to repeat,
    "timer" to timer, "remainingMs" to if(deadline>0) MusicPolicy.remaining(deadline,SystemClock.elapsedRealtime()) else null, "interruption" to interruption, "error" to error, "excluded" to 0, "invalidation" to invalidation
  )
  private fun emit() { listener?.invoke(snapshot()) }
  private fun save() { lastSave=SystemClock.elapsedRealtime(); prefs.edit().putString("snapshot",JSONObject(snapshot()).put("availableIds",availableIds?.let { JSONArray(it.toList()) }).put("timerProcess",PROCESS_TOKEN).put("deadline",deadline).toString()).apply() }
  override fun onDestroy() { generation++; resolver.shutdownNow(); handler.removeCallbacks(tick); save(); engine.release(); session?.release(); session=null; if(active===this)active=null; super.onDestroy() }
  companion object {
    private val PROCESS_TOKEN=java.util.UUID.randomUUID().toString()
    var active: MusicService? = null
    var listener: ((Map<String,Any?>)->Unit)? = null
    var owner = "none"
    fun takeOwnership(value: String) { owner=value; if(value!="none") active?.pause(value) }
    fun jsonMap(x:JSONObject):Map<String,Any?> = x.keys().asSequence().associateWith { k -> when(val v=x.get(k)) { JSONObject.NULL -> null; is JSONObject -> jsonMap(v); is JSONArray -> (0 until v.length()).map { i -> val a=v.get(i); if(a is JSONObject) jsonMap(a) else a }; else -> v } }
  }
}
