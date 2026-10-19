package expo.modules.morningalarm

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/** Complete verified cycles, retained independently of the disposable JS content cache. */
object AlarmCycles {
  private fun prefs(c: Context) = c.createDeviceProtectedStorageContext().getSharedPreferences("alarm-cycles-v1", Context.MODE_PRIVATE)
  private fun root(c: Context) = File(c.createDeviceProtectedStorageContext().filesDir, "alarm-cycles").apply { mkdirs() }
  private fun read(c: Context, slot: String): JSONObject? = prefs(c).getString(slot, null)?.let { JSONObject(it) }
  private fun localDate(at: Long) = Instant.ofEpochMilli(at).atZone(ZoneId.systemDefault()).toLocalDate()
  private fun eligible(cycle: JSONObject?, date: LocalDate) = cycle != null && !LocalDate.parse(cycle.getString("startDate")).isAfter(date)
  private fun selected(c: Context, key: String, date: LocalDate): JSONObject? {
    val pending = read(c, "$key.pending")
    if (eligible(pending, date)) return pending
    return read(c, "$key.active")?.takeIf { eligible(it, date) }
  }
  private fun verified(c: Context, track: JSONObject): File? {
    val file = File(root(c), track.getString("file")).canonicalFile
    return file.takeIf { it.parentFile == root(c).canonicalFile && it.isFile && it.length() == track.getLong("bytes") && ContentFiles.hash(it) == track.getString("sha256") }
  }

  @Synchronized fun install(c: Context, json: String): String {
    val cycle = JSONObject(json)
    val key = cycle.getString("key")
    require(key in setOf("gita", "shankh", "pranayama"))
    val revision = cycle.getString("revision")
    require(revision.matches(Regex("[a-zA-Z0-9_-]{1,128}")))
    LocalDate.parse(cycle.getString("startDate"))
    val tracks = cycle.getJSONArray("tracks")
    require(tracks.length() in 1..14)
    require(!AlarmStore.isRinging(c) && AlarmSnooze.pendingAt(c) == 0L) { "Wait until the alarm and snooze finish before replacing music" }
    cleanup(c)
    try {
      val sources = (0 until tracks.length()).map { i ->
        val t = tracks.getJSONObject(i)
        require(t.getString("title").isNotBlank() && t.getString("title").length <= 200)
        require(t.getString("sha256").matches(Regex("[a-f0-9]{64}")))
        val source = ContentFiles.source(c, t.getString("uri"))
        require(t.getLong("bytes") in 1..10L * 1024 * 1024 && source.length() == t.getLong("bytes") && ContentFiles.hash(source) == t.getString("sha256")) { "Cycle audio verification failed" }
        source
      }
      val unique = (0 until tracks.length()).associateBy { tracks.getJSONObject(it).getString("sha256") }.values
      val required = unique.sumOf { i ->
        val t = tracks.getJSONObject(i)
        if (verified(c, JSONObject(t.toString()).put("file", "${t.getString("sha256")}.audio")) == null) t.getLong("bytes") else 0L
      }
      require(root(c).usableSpace >= required + 50L * 1024 * 1024 && (root(c).listFiles()?.sumOf { it.length() } ?: 0L) + ContentFiles.bytes(c) + required <= 600L * 1024 * 1024) { "Not enough free storage for alarm music" }
      val installed = JSONArray()
      for (i in 0 until tracks.length()) {
        val t = tracks.getJSONObject(i)
        val target = File(root(c), "${t.getString("sha256")}.audio")
        val local = JSONObject(t.toString()).put("file", target.name).apply { remove("uri") }
        if (verified(c, local) == null) {
          val temp = File(root(c), "${target.name}.partial")
          sources[i].inputStream().use { input -> temp.outputStream().use { output -> input.copyTo(output); output.fd.sync() } }
          require(temp.length() == t.getLong("bytes") && ContentFiles.hash(temp) == t.getString("sha256"))
          require(temp.renameTo(target)) { "Could not finalize cycle track" }
        }
        installed.put(local)
      }
      val complete = JSONObject().put("key", key).put("revision", revision).put("startDate", cycle.getString("startDate")).put("tracks", installed)
      val oldActive = prefs(c).getString("$key.active", null)
      val oldPending = prefs(c).getString("$key.pending", null)
      val edit = prefs(c).edit()
      if (eligible(complete, LocalDate.now())) {
        edit.putString("$key.active", complete.toString()).remove("$key.pending")
      } else {
        // A previously staged cycle may already be effective when another update arrives.
        selected(c, key, LocalDate.now())?.let { edit.putString("$key.active", it.toString()) }
        edit.putString("$key.pending", complete.toString())
      }
      if (!edit.commit()) {
        // commit() can update memory even if persistence fails. Restore references before cleanup.
        prefs(c).edit().putString("$key.active", oldActive).putString("$key.pending", oldPending).commit()
        error("Could not save installed alarm cycle")
      }
      return revision
    } finally { cleanup(c) }
  }

  /** Frozen on first delivery; snooze and sticky service recovery use the same track. */
  @Synchronized fun session(c: Context, key: String, occurrence: Long): JSONObject? {
    val id = "$occurrence:$key"
    val old = read(c, "session")
    if (old?.optString("id") == id) return old.optJSONObject("track")
    val cycle = selected(c, key, localDate(occurrence))
    val track = cycle?.let {
      val index = AlarmCyclePolicy.index(it.getString("startDate"), localDate(occurrence), it.getJSONArray("tracks").length())!!
      JSONObject(it.getJSONArray("tracks").getJSONObject(index).toString()).put("revision", it.getString("revision")).put("day", index + 1).put("length", it.getJSONArray("tracks").length())
    }
    check(prefs(c).edit().putString("session", JSONObject().put("id", id).put("track", track ?: JSONObject.NULL).toString()).commit())
    return track
  }
  fun resolveSession(c: Context, track: JSONObject?): File? = track?.let { verified(c, it) }

  @Synchronized fun status(c: Context, key: String, requestedAt: Long = 0L): String {
    val config = AlarmStore.get(c)
    val at = requestedAt.takeIf { it > 0L } ?: config?.let { AlarmScheduler.nextOccurrence(it, Instant.now()) }?.toEpochMilli() ?: System.currentTimeMillis()
    val cycle = selected(c, key, localDate(at))
    val index = cycle?.let { AlarmCyclePolicy.index(it.getString("startDate"), localDate(at), it.getJSONArray("tracks").length()) }
    val track = if (index != null) cycle!!.getJSONArray("tracks").getJSONObject(index) else null
    return JSONObject().put("key", key).put("revision", cycle?.getString("revision") ?: JSONObject.NULL)
      .put("pendingRevision", read(c, "$key.pending")?.getString("revision") ?: JSONObject.NULL)
      .put("title", track?.getString("title") ?: ContentFiles.metadata(c, key)["title"] ?: JSONObject.NULL)
      .put("fallbackRevision", ContentFiles.metadata(c, key)["revision"] ?: JSONObject.NULL).put("day", index?.plus(1) ?: 0)
      .put("length", cycle?.getJSONArray("tracks")?.length() ?: 0).put("scheduledAt", at)
      .put("bytes", (root(c).listFiles()?.sumOf { it.length() } ?: 0L) + ContentFiles.bytes(c)).toString()
  }
  @Synchronized fun verify(c: Context, key: String, revision: String): Boolean {
    val cycle = listOfNotNull(read(c, "$key.active"), read(c, "$key.pending")).find { it.getString("revision") == revision } ?: return false
    val tracks = cycle.getJSONArray("tracks")
    return runCatching { (0 until tracks.length()).all { verified(c, tracks.getJSONObject(it)) != null } }.getOrDefault(false)
  }
  @Synchronized fun releaseSession(c: Context, occurrence: Long) {
    val session = read(c, "session")
    if (session?.optString("id")?.startsWith("$occurrence:") == true) {
      check(prefs(c).edit().remove("session").commit())
      cleanup(c)
    }
  }
  @Synchronized fun cleanup(c: Context) {
    val keep = mutableSetOf<String>()
    for (key in listOf("gita", "shankh", "pranayama")) for (slot in listOf("active", "pending")) {
      read(c, "$key.$slot")?.getJSONArray("tracks")?.let { tracks -> for (i in 0 until tracks.length()) keep.add(tracks.getJSONObject(i).getString("file")) }
    }
    read(c, "session")?.optJSONObject("track")?.optString("file")?.let { keep.add(it) }
    root(c).listFiles()?.filter { it.name !in keep }?.forEach { it.delete() }
  }
}
