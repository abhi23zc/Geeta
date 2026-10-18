package expo.modules.morningalarm

/** Platform-free decisions shared by the service and JVM assertions. */
object MusicPolicy {
  fun next(order: List<String>, current: String?, repeat: String, natural: Boolean, endOfTrack: Boolean): String? {
    if(natural && endOfTrack)return null
    if(natural && repeat=="one")return current
    return order.getOrNull(order.indexOf(current)+1) ?: if(repeat=="all")order.firstOrNull() else null
  }
  fun remaining(deadline: Long, elapsed: Long): Long? = if(deadline>0)(deadline-elapsed).coerceAtLeast(0) else null
  fun blocked(owner:String,alarmRinging:Boolean,ritualActive:Boolean)=owner!="none" || alarmRinging || ritualActive
}
