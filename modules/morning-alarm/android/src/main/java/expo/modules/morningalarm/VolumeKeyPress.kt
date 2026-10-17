package expo.modules.morningalarm

/** Retain ownership until key-up, even when the first down stops playback. */
class VolumeKeyPress {
  enum class Result { PASS, CONSUME, PRESS }
  private val pressed = mutableMapOf<Int, Long>()

  fun handle(key: Int, down: Boolean, up: Boolean, repeat: Int, ringing: Boolean, downTime: Long = 0): Result {
    if (up) return if (pressed.remove(key) != null || ringing) Result.CONSUME else Result.PASS
    // A fresh physical press also recovers if another app received the previous up.
    if (key in pressed && !(down && repeat == 0 && pressed[key] != downTime)) return Result.CONSUME
    pressed.remove(key)
    if (!ringing) return Result.PASS
    if (!down) return Result.CONSUME
    pressed[key] = downTime
    return if (repeat == 0) Result.PRESS else Result.CONSUME
  }
}
