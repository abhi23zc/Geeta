package expo.modules.morningalarm

import android.content.Context
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import java.util.WeakHashMap
import java.util.Locale

/** Independent of alarm configuration and credential-protected React storage. */
object AlarmStrings {
  private fun prefs(context: Context) = context.createDeviceProtectedStorageContext()
    .getSharedPreferences("morning-alarm-language", Context.MODE_PRIVATE)
  fun language(context: Context) = prefs(context).getString("language", "en") ?: "en"
  fun locale(context: Context): Locale = if (language(context) == "hi") Locale.forLanguageTag("hi-IN-u-nu-latn") else Locale.forLanguageTag("en-IN")
  fun setLanguage(context: Context, language: String) {
    require(language in setOf("en", "hi", "hinglish")) { "Invalid app language" }
    if (!AlarmDeliveryPolicy.refreshLanguage(prefs(context).contains("language"), language(context), language)) {
      AlarmLog.event("language_unchanged")
      return
    }
    check(prefs(context).edit().putString("language", language).commit()) { "Could not persist alarm language" }
    AlarmPresentation.refreshLanguage(context)
    AlarmService.refreshLanguage()
  }
  private val strings = mapOf(
    "Could not continue the ritual. Please retry." to Pair("साधना जारी नहीं हो सकी। फिर प्रयास करें।", "Sadhana jaari nahi ho saki. Phir try karein."),
    "The app screen could not finish loading. Try again." to Pair("ऐप की स्क्रीन लोड नहीं हो सकी। फिर प्रयास करें।", "App ki screen load nahi ho saki. Phir try karein."),
    "Try again" to Pair("फिर प्रयास करें", "Phir try karein"),
    "Continue after unlock" to Pair("अनलॉक के बाद जारी रखें", "Unlock ke baad jaari rakhein"),
    "Unlock your phone to continue the ritual" to Pair("साधना जारी रखने के लिए फ़ोन अनलॉक करें", "Sadhana jaari rakhne ke liye phone unlock karein"),
    "Morning ritual alarms" to Pair("प्रातः साधना अलार्म", "Morning sadhana alarms"),
    "Shows the active Morning Ritual alarm" to Pair("सक्रिय प्रातः साधना अलार्म दिखाता है", "Active morning sadhana alarm dikhata hai"),
    "Your Morning Ritual is ready" to Pair("आपकी प्रातः साधना तैयार है", "Aapki morning sadhana taiyar hai"),
    "Alarm is ringing · tap to wake gently" to Pair("अलार्म बज रहा है · जागने के लिए छुएं", "Alarm baj raha hai · jaagne ke liye tap karein"),
    "Stop" to Pair("रोकें", "Rokein"),
    "Preparing your morning ritual…" to Pair("आपकी सुबह की साधना तैयार हो रही है…", "Aapki subah ki sadhana taiyar ho rahi hai…"),
    "☀  Hold to start my day" to Pair("☀  दिन शुरू करने के लिए दबाए रखें", "☀  Din shuru karne ke liye hold karein"),
    "Continue my morning" to Pair("सुबह की साधना जारी रखें", "Subah ki sadhana jaari rakhein"),
    "Hold Start my day to finish the alarm" to Pair("अलार्म रोकने के लिए दिन शुरू करें बटन दबाए रखें", "Alarm rokne ke liye Din shuru karein button hold karein"),
    "Open the app" to Pair("ऐप खोलें", "App kholein"),
    "Unlock to leave your alarm ritual" to Pair("अलार्म साधना से बाहर जाने के लिए अनलॉक करें", "Alarm sadhana se bahar jaane ke liye unlock karein"),
    "☀  BRAHMA MUHURTA · SUNRISE" to Pair("☀  ब्रह्म मुहूर्त · सूर्योदय", "☀  BRAHMA MUHURTA · SURYODAY"),
    "Softly illuminated · Tuesday, Kartik Shukla" to Pair("मृदु प्रकाश · मंगलवार, कार्तिक शुक्ल", "Halka prakash · Mangalvaar, Kartik Shukla"),
    "Aru welcomes you to your morning ritual" to Pair("अरु आपकी सुबह की साधना में स्वागत करता है", "Aru aapki subah ki sadhana mein swagat karta hai"),
    "“Awaken with gratitude. A brand new dawn to act with dharma.”" to Pair("“कृतज्ञता के साथ जागें। धर्म के साथ कर्म करने की नई भोर।”", "“Gratitude ke saath jagein. Dharma ke saath karm karne ki nayi bhor.”"),
    "GITA CH. 2 · SACRED CONTEMPLATION" to Pair("गीता अध्याय 2 · पवित्र मनन", "GITA ADHYAYA 2 · PAVITRA MANAN"),
    "Morning ritual alarm" to Pair("प्रातः साधना अलार्म", "Morning sadhana alarm"),
    "Gentle Tanpura & Bansuri Flute" to Pair("मधुर तानपुरा और बांसुरी", "Madhur tanpura aur bansuri"),
    "Harmonic crescendo (0%)" to Pair("धीरे बढ़ती ध्वनि (0%)", "Dheere badhti dhun (0%)"),
    "Volume rises gently over five minutes while the alarm continues" to Pair("अलार्म बजते समय ध्वनि पांच मिनट में धीरे बढ़ती है", "Alarm bajte samay volume paanch minute mein dheere badhta hai"),
    "Keep holding for 1.5 seconds. Releasing early resets the action." to Pair("1.5 सेकंड दबाए रखें। पहले छोड़ने पर फिर शुरू करना होगा।", "1.5 seconds hold karein. Pehle chhodne par phir shuru karna hoga."),
    "Your Surya Namaskar routine is prepared for 06:45 AM" to Pair("आपका सूर्य नमस्कार अभ्यास 06:45 AM के लिए तैयार है", "Aapka Surya Namaskar abhyas 06:45 AM ke liye taiyar hai")
  )
  fun text(context: Context, english: String): String {
    val copy = strings[english] ?: return english
    return when (language(context)) { "hi" -> copy.first; "hinglish" -> copy.second; else -> english }
  }
  private val original = WeakHashMap<View, Pair<String?, String?>>()
  /** Main thread only. Keep source labels so an existing cover can switch again. */
  fun bind(context: Context, view: View) {
    val source = original.getOrPut(view) { Pair((view as? TextView)?.text?.toString(), view.contentDescription?.toString()) }
    if (view is TextView && source.first != null) view.text = text(context, source.first!!)
    source.second?.let { view.contentDescription = text(context, it) }
    if (view is ViewGroup) for (index in 0 until view.childCount) bind(context, view.getChildAt(index))
  }
}
