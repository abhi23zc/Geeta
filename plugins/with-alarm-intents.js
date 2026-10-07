const { withMainActivity } = require('expo/config-plugins');

function transformMainActivity(source, language) {
  if (source.includes('// morning-alarm: ritual presentation')) {
    // Both generated and existing hosts explicitly identify activity creation.
    source = source.replace('AlarmPresentation.prepare(this, intent)\n    super.onCreate(null)', 'AlarmPresentation.prepare(this, intent, created = true)\n    super.onCreate(null)');
    source = source.replace('    AlarmPresentation.onResume(this)\n  }\n\n  // morning-alarm: ritual presentation', '    AlarmPresentation.onWindowFocus(this, hasFocus)\n  }\n\n  // morning-alarm: ritual presentation');
    source = source.replace('    super.onNewIntent(intent)', '    if (!AlarmPresentation.isRitualIntent(this, intent)) super.onNewIntent(intent)');
    if (!source.includes('AlarmPresentation.blockVolume(this, event)')) {
      source = source.replace('import android.os.Bundle', 'import android.os.Bundle\nimport android.view.KeyEvent');
      source = source.replace('  // morning-alarm: ritual presentation', `  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    if (AlarmPresentation.blockVolume(this, event)) return true
    return super.dispatchKeyEvent(event)
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    AlarmPresentation.onWindowFocus(this, hasFocus)
  }

  // morning-alarm: ritual presentation`);
    }
    return source;
  }
  if (language !== 'kt') throw new Error('Alarm presentation requires Kotlin MainActivity.');
  source = source.replace(/  \/\/ morning-alarm: retain incoming intent\n  override fun onNewIntent\(intent: Intent\) \{\n    setIntent\(intent\)\n    super.onNewIntent\(intent\)\n  \}\n\n/, '');
  if (/override fun (onNewIntent|onResume|onDestroy|onActivityResult)\(/.test(source)) {
    throw new Error('Review existing MainActivity lifecycle overrides before adding alarm presentation.');
  }
  if (!source.includes('import android.content.Intent')) source = source.replace('import android.os.Bundle', 'import android.os.Bundle\nimport android.content.Intent');
  source = source.replace('import android.os.Bundle', 'import android.os.Bundle\nimport expo.modules.morningalarm.AlarmPresentation');
  if (!source.includes('super.onCreate(null)')) throw new Error('Could not locate MainActivity.onCreate.');
  source = source.replace('super.onCreate(null)', 'AlarmPresentation.prepare(this, intent)\n    super.onCreate(null)\n    AlarmPresentation.attach(this)');
  source = source.replace('class MainActivity : ReactActivity() {', `class MainActivity : ReactActivity() {
  // morning-alarm: ritual presentation
  override fun onNewIntent(intent: Intent) {
    setIntent(intent)
    AlarmPresentation.prepare(this, intent)
    AlarmPresentation.attach(this)
    if (!AlarmPresentation.isRitualIntent(this, intent)) super.onNewIntent(intent)
  }

  override fun onResume() {
    super.onResume()
    AlarmPresentation.onResume(this)
  }

  override fun onDestroy() {
    AlarmPresentation.detach(this)
    super.onDestroy()
  }

  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    super.onActivityResult(requestCode, resultCode, data)
    AlarmPresentation.onActivityResult(this, requestCode, resultCode)
  }
`);
  if (!source.includes('// morning-alarm: ritual presentation')) throw new Error('Could not configure MainActivity alarm presentation.');
  return transformMainActivity(source, language);
}

module.exports = config => withMainActivity(config, config => {
  config.modResults.contents = transformMainActivity(config.modResults.contents, config.modResults.language);
  return config;
});
module.exports.transformMainActivity = transformMainActivity;
