import ExpoModulesCore
import CryptoKit
import Foundation

/** Streaming verification for fallback-platform downloads; playback still uses Expo Audio. */
public class MusicFilesModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MusicFiles")
    AsyncFunction("hashFile") { (uri: String) -> String in
      guard let url = URL(string: uri), url.isFileURL else { throw MusicFileError.invalidPath }
      let file = url.resolvingSymlinksInPath().standardizedFileURL
      let root = URL(fileURLWithPath: NSHomeDirectory()).resolvingSymlinksInPath().path + "/"
      guard file.path.hasPrefix(root), FileManager.default.fileExists(atPath: file.path) else { throw MusicFileError.invalidPath }
      let handle = try FileHandle(forReadingFrom: file)
      defer { try? handle.close() }
      var hash = SHA256()
      while let data = try handle.read(upToCount: 64 * 1024), !data.isEmpty { hash.update(data: data) }
      return hash.finalize().map { String(format: "%02x", $0) }.joined()
    }
  }
}
private enum MusicFileError: Error { case invalidPath }
