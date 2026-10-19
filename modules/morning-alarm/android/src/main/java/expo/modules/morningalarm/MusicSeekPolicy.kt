package expo.modules.morningalarm

/** A timeline position alone is not confirmation while the decoder is buffering. */
object MusicSeekPolicy {
  fun confirmed(target: Long, actual: Long, ready: Boolean, ended: Boolean, duration: Long): Boolean =
    (ready || (ended && duration > 0 && target >= duration - 1000)) && kotlin.math.abs(actual - target) < 1000
}
