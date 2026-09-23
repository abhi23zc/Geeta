package expo.modules.morningalarm

object AlarmEvents {
  @Volatile var listener: ((String, Map<String, Any?>) -> Unit)? = null

  fun emit(name: String, body: Map<String, Any?>) {
    listener?.invoke(name, body)
  }
}
