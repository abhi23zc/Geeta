package expo.modules.morningalarm

import android.content.Context
import android.net.Uri
import java.io.File
import java.security.MessageDigest

/** Native streaming verification and device-protected, independently owned alarm copies. */
object ContentFiles {
  fun source(context: Context, uri: String): File {
    require(Uri.parse(uri).scheme == "file") { "Only private local files are accepted" }
    val file = File(requireNotNull(Uri.parse(uri).path)).canonicalFile
    val root = context.applicationInfo.dataDir.let(::File).canonicalFile
    require(file.path.startsWith(root.path + File.separator) && file.isFile) { "File outside app storage" }
    return file
  }

  fun hash(file: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    file.inputStream().use { input ->
      val buffer = ByteArray(64 * 1024)
      while (true) { if(Thread.currentThread().isInterrupted)throw java.io.InterruptedIOException("Verification cancelled"); val size = input.read(buffer); if (size < 0) break; digest.update(buffer, 0, size) }
    }
    return digest.digest().joinToString("") { "%02x".format(it.toInt() and 255) }
  }

  private fun storage(context: Context) = context.createDeviceProtectedStorageContext()
  private fun prefs(context: Context) = storage(context).getSharedPreferences("installed_alarm_audio", Context.MODE_PRIVATE)
  private fun root(context: Context) = File(storage(context).filesDir, "alarm-audio").apply { mkdirs() }
  fun key(value: String?): String = when(value) {
    "shankh", "Gentle Shankh & Chants" -> "shankh"
    "pranayama", "Pranayama First" -> "pranayama"
    else -> "gita"
  }

  @Synchronized fun install(context: Context, key: String, uri: String, revision: String, bytes: Long, sha: String, title: String = key): String {
    require(key in setOf("gita", "shankh", "pranayama"))
    require(sha.matches(Regex("[a-f0-9]{64}")) && revision.matches(Regex("[a-zA-Z0-9_-]{1,128}")))
    require(!AlarmStore.isRinging(context) && AlarmSnooze.pendingAt(context) == 0L) { "Wait until the alarm stops before installing audio" }
    val source = source(context, uri)
    require(bytes in 1..10L * 1024 * 1024 && source.length() == bytes && hash(source) == sha) { "Audio verification failed" }
    val target = File(root(context), "$key-$sha.audio")
    if (target.exists() && (target.length() != bytes || hash(target) != sha)) require(target.delete()) { "Could not replace damaged alarm audio" }
    if (!target.exists()) {
      val temp = File(root(context), "$key.partial")
      source.inputStream().use { input -> temp.outputStream().use { output -> input.copyTo(output); output.fd.sync() } }
      require(temp.length() == bytes && hash(temp) == sha)
      require(temp.renameTo(target)) { "Could not finalize alarm audio" }
    }
    val previous = prefs(context)
    val edit = previous.edit()
    previous.getString("key", null)?.let { oldKey ->
      if (!previous.contains("$oldKey.file")) {
        edit.putString("$oldKey.file", previous.getString("file", null))
          .putString("$oldKey.sha", previous.getString("sha", null))
          .putString("$oldKey.revision", previous.getString("revision", null))
      }
    }
    require(edit.putString("key", key).putString("file", target.name).putString("sha", sha).putString("revision", revision).putString("$key.file", target.name).putString("$key.sha", sha).putString("$key.revision", revision).putString("$key.title", title).commit())
    val keep = setOf("gita", "shankh", "pranayama").mapNotNull { prefs(context).getString("$it.file", null) }.toSet() + target.name
    root(context).listFiles()?.filter { it.name !in keep }?.forEach { it.delete() }
    return revision
  }

  fun bytes(context: Context): Long = root(context).listFiles()?.sumOf { it.length() } ?: 0L

  fun metadata(context: Context, key: String): Map<String, String?> {
    val p = prefs(context)
    val legacy = p.getString("key", null) == key
    return mapOf("revision" to (p.getString("$key.revision", null) ?: if (legacy) p.getString("revision", null) else null), "title" to p.getString("$key.title", null))
  }
  fun installed(context: Context): Map<String, String?> = mapOf("key" to prefs(context).getString("key", null), "revision" to prefs(context).getString("revision", null))
  fun resolve(context: Context, key: String): File? {
    val p = prefs(context)
    val legacy = p.getString("key", null) == key
    val name = p.getString("$key.file", null) ?: (if (legacy) p.getString("file", null) else null) ?: return null
    val sha = p.getString("$key.sha", null) ?: (if (legacy) p.getString("sha", null) else null)
    val file = File(root(context), name).canonicalFile
    if (file.parentFile != root(context).canonicalFile || !file.isFile || hash(file) != sha) return null
    return file
  }
  fun report(context: Context, actual: String, reason: String?) { prefs(context).edit().putString("actual", actual).putString("fallback", reason).apply() }
  fun playback(context: Context): Map<String, String?> = mapOf("actualTone" to prefs(context).getString("actual", "system"), "fallbackReason" to prefs(context).getString("fallback", null), "toneRevision" to prefs(context).getString("revision", null))
}
