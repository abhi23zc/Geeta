package expo.modules.morningalarm

import java.io.File

/** File verification and promotion run on acquisition workers, never the UI thread. */
object MusicAcquisitionFiles {
  fun additionalBytes(expected: Long, partial: Long) = (expected-partial).coerceAtLeast(0)
  fun verified(file: File, bytes: Long, hash: String) = file.isFile && file.length()==bytes && ContentFiles.hash(file)==hash
  fun promote(source: File,destination: File,bytes: Long,hash: String) {
    destination.parentFile!!.mkdirs()
    val staging=File(destination.path+".partial")
    try {
      source.inputStream().use { input -> staging.outputStream().use { output -> input.copyTo(output);output.fd.sync() } }
      require(verified(staging,bytes,hash)) { "Downloaded recording failed verification" }
      require(staging.renameTo(destination)) { "Could not save recording" }
    } catch(error: Exception) { staging.delete();throw error }
  }
}
