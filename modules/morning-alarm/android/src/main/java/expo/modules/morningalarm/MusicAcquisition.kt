package expo.modules.morningalarm

import android.content.Context
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.C
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.DefaultDataSource
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors
import java.util.concurrent.CancellationException

/** Complete files are distinct from Media3's evictable range cache. One job per content hash. */
@UnstableApi
object MusicAcquisition {
  private const val TEMP_BUDGET = 256L * 1024 * 1024
  private const val SAVE_BUDGET = 1024L * 1024 * 1024
  private val executor = Executors.newSingleThreadExecutor()
  private val main = Handler(Looper.getMainLooper())
  private val entries = linkedMapOf<String, Entry>()
  private var initialized = false
  private var currentHash: String? = null
  @Synchronized fun protect(hash: String?) { currentHash=hash }
  var listener: ((Map<String, Any?>) -> Unit)? = null
  internal var sourceFactory: (Context) -> androidx.media3.datasource.DataSource.Factory = { MusicStreamCache.factory(it,DefaultDataSource.Factory(it)) }
  var pinned: (String) -> Boolean = { false }
  private class Entry(var track: JSONObject, @Volatile var saved: Boolean, var status: String = "paused", var bytes: Long = 0, var error: String? = null) {
    val asset: JSONObject get() = track.getJSONObject("asset")
    val hash: String get() = asset.getString("sha256")
    val expected: Long get() = asset.getLong("bytes")
    @Volatile var cancelled = false
    var running = false
    var readyFile: File? = null
    val callbacks = mutableListOf<(Result<String>) -> Unit>()
  }
  private fun temp(context: Context, hash: String) = File(context.cacheDir, "music-full-v1/$hash.audio")
  private fun saved(context: Context, hash: String) = File(context.filesDir, "music-audio-v1/$hash.audio")
  private fun target(context: Context, e: Entry) = if(e.saved)saved(context,e.hash) else temp(context,e.hash)
  private fun journal(context: Context) = File(context.filesDir,"music-acquisition-v1.json")
  @Synchronized private fun initialize(context: Context) {
    if(initialized)return
    initialized=true
    runCatching {
      val rows=JSONArray(if(journal(context).exists())android.util.AtomicFile(journal(context)).openRead().bufferedReader().use { it.readText() } else "[]")
      for(i in 0 until rows.length()) {
        val row=rows.getJSONObject(i); val track=row.getJSONObject("track"); validate(track)
        val e=Entry(track,row.optBoolean("saved")); val file=target(context,e)
        e.status=if(file.isFile && file.length()==e.expected)"ready" else "paused"
        if(e.status=="ready")e.readyFile=file
        e.bytes=if(e.status=="ready")e.expected else File(file.path+".partial").length()
        entries[e.hash]=e
      }
    }
  }
  private fun validate(track: JSONObject) {
    require(track.optString("availability")=="available") { "Recording unavailable" }
    val a=track.getJSONObject("asset")
    require(a.getString("sha256").matches(Regex("[a-f0-9]{64}")))
    require(a.getLong("bytes") in 1..200L*1024*1024)
    require(Uri.parse(a.getString("url")).scheme=="https")
  }
  @Synchronized private fun persist(context: Context) {
    val rows=JSONArray()
    entries.values.forEach { rows.put(JSONObject().put("track",it.track).put("saved",it.saved).put("status",it.status)) }
    val atomic=android.util.AtomicFile(journal(context))
    var stream: FileOutputStream?=null
    try { stream=atomic.startWrite();stream.write(rows.toString().toByteArray());atomic.finishWrite(stream) }
    catch(error: Exception) { stream?.let { atomic.failWrite(it) }; throw error }
  }
  private fun view(context: Context,e: Entry): Map<String,Any?> = mapOf("hash" to e.hash,"track" to MusicService.jsonMap(e.track),"saved" to e.saved,"status" to e.status,"bytesWritten" to e.bytes,"totalBytes" to e.expected,"path" to Uri.fromFile(target(context,e)).toString(),"error" to e.error)
  @Synchronized private fun publish(context: Context,e: Entry,persist: Boolean=true) {
    if(persist)persist(context)
    val snapshot=view(context,e)
    main.post { listener?.invoke(snapshot) }
  }
  @Synchronized fun snapshots(context: Context): List<Map<String,Any?>> { initialize(context);return entries.values.map { view(context,it) } }
  @Synchronized fun local(context: Context,hash: String): String? {
    initialize(context)
    val e=entries[hash] ?: return null
    val file=e.readyFile ?: target(context,e)
    if((e.readyFile==null && e.status!="ready") || !file.isFile || file.length()!=e.expected)return null
    file.setLastModified(System.currentTimeMillis())
    return Uri.fromFile(file).toString()
  }
  @Synchronized fun acquire(context: Context,raw: String,keep: Boolean,callback: ((Result<String>)->Unit)?=null) {
    val app=context.applicationContext
    initialize(app)
    val track=JSONObject(raw);validate(track)
    val hash=track.getJSONObject("asset").getString("sha256")
    val e=entries.getOrPut(hash) { Entry(track,false) }
    if(!e.running)e.track=track // Refresh signed URLs and display metadata for retried immutable content.
    if(keep && !e.saved) {
      require(entries.values.filter { it.saved && it!==e }.sumOf { it.expected }+e.expected<=SAVE_BUDGET) { "Not enough download storage" }
      e.saved=true
    }
    callback?.let { e.callbacks.add(it) }
    e.cancelled=false
    if(e.running) { publish(app,e);return }
    e.cancelled=false;e.running=true;e.status="queued";e.error=null
    try { publish(app,e);executor.execute { transfer(app,e) } }
    catch(error: Exception) { e.running=false;callback?.let { e.callbacks.remove(it) };throw error }
  }
  @Synchronized fun cancel(context: Context,hash: String) {
    initialize(context)
    entries[hash]?.let { it.cancelled=true;if(!it.running){it.status="paused";publish(context,it)} }
  }
  @Synchronized fun cancelTemporaryExcept(context: Context,hash: String?) {
    initialize(context)
    entries.values.filter { !it.saved && it.hash!=hash && it.running }.forEach { it.cancelled=true }
  }
  @Synchronized fun restrict(context: Context,allowed: Set<String>) {
    initialize(context)
    entries.values.filter { it.running && it.track.optString("id") !in allowed }.forEach { it.cancelled=true }
  }
  @Synchronized fun remove(context: Context,hash: String) {
    initialize(context)
    val e=entries[hash] ?: return
    require(!e.running) { "Download is still running" }
    val file=saved(context,hash)
    require(!pinned(Uri.fromFile(file).toString())) { "Stop this song before removing its download" }
    file.delete();File(file.path+".partial").delete()
    entries.remove(hash);persist(context)
  }
  @Synchronized private fun reserveTemporary(context: Context,e: Entry) {
    val directory=temp(context,e.hash).parentFile!!;directory.mkdirs()
    val protected=entries.values.filter { it.running }.flatMap { listOf(temp(context,it.hash).path,temp(context,it.hash).path+".partial") }.toSet()
    val files=directory.listFiles()?.toList().orEmpty()
    var used=files.sumOf { it.length() }
    val additional=MusicAcquisitionFiles.additionalBytes(e.expected,File(temp(context,e.hash).path+".partial").length())
    for(file in files.sortedBy { it.lastModified() }) {
      if(used+additional<=TEMP_BUDGET)break
      if(file.path !in protected && !file.name.startsWith(currentHash ?: "__none__") && !pinned(Uri.fromFile(file).toString())) { val length=file.length();if(file.delete())used-=length }
    }
    require(used+additional<=TEMP_BUDGET) { "Not enough temporary music storage" }
    require(directory.usableSpace>e.expected+20L*1024*1024) { "Not enough free device storage" }
  }
  private fun transfer(context: Context,e: Entry) {
    var result=runCatching {
      if(e.cancelled)throw CancellationException("Download paused")
      val temporary=temp(context,e.hash)
      val permanent=saved(context,e.hash)
      val existing=listOf(permanent,temporary).firstOrNull { MusicAcquisitionFiles.verified(it,e.expected,e.hash) }
      if(existing!=null) existing else {
        reserveTemporary(context,e)
        temporary.parentFile!!.mkdirs()
        val partial=File(temporary.path+".partial")
        if(partial.length()>e.expected)partial.delete()
        synchronized(this) { e.bytes=partial.length();e.status="downloading";publish(context,e) }
        if(partial.length()<e.expected) {
          val source=sourceFactory(context).createDataSource()
          try {
            source.open(DataSpec.Builder().setUri(e.asset.getString("url")).setKey(e.hash).setPosition(partial.length()).build())
            FileOutputStream(partial,true).use { out ->
              val buffer=ByteArray(64*1024);var last=0L
              while(true) {
                if(e.cancelled)throw CancellationException("Download paused")
                val count=source.read(buffer,0,buffer.size)
                if(count==C.RESULT_END_OF_INPUT)break
                require(out.channel.size()+count<=e.expected) { "Download size verification failed" }
                out.write(buffer,0,count)
                synchronized(this) { e.bytes=out.channel.size();val now=System.currentTimeMillis();if(now-last>=500){publish(context,e,false);last=now} }
              }
              out.fd.sync()
            }
          } finally { source.close() }
        }
        synchronized(this) { e.status="verifying";publish(context,e) }
        if(!MusicAcquisitionFiles.verified(partial,e.expected,e.hash)) { partial.delete();throw IllegalStateException("Downloaded recording failed verification") }
        require(partial.renameTo(temporary)) { "Could not save recording" }
        temporary
      }
    }
    // Keep promotion outside the monitor: a large copy must never block transport commands on main.
    while(result.isSuccess) {
      val destination=synchronized(this) { target(context,e) }
      val copied=runCatching {
        val source=result.getOrThrow()
        if(source!=destination)MusicAcquisitionFiles.promote(source,destination,e.expected,e.hash)
        destination
      }
      var repeat=false
      synchronized(this) {
        if(copied.isSuccess && destination!=target(context,e)) { result=copied;repeat=true }
        else { complete(context,e,copied);return }
      }
      if(!repeat)return
    }
    synchronized(this) { complete(context,e,result) }
  }
  private fun complete(context: Context,e: Entry,result: Result<File>) {
    e.running=false
    val outcome=runCatching {
      val file=result.getOrThrow()
      e.status="ready";e.readyFile=file;e.bytes=e.expected;e.error=null;publish(context,e)
      Uri.fromFile(file).toString()
    }
    if(outcome.isFailure) { e.status=if(e.cancelled || outcome.exceptionOrNull() is androidx.media3.datasource.HttpDataSource.HttpDataSourceException)"paused" else "failed";e.error=outcome.exceptionOrNull()?.message;runCatching { publish(context,e) } }
    val callbacks=e.callbacks.toList();e.callbacks.clear()
    main.post { callbacks.forEach { it(outcome) } }
  }
}
