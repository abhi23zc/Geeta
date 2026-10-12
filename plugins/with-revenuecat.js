const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

// Payment verification can return from another app; singleTask can cancel it.
module.exports = config => withAndroidManifest(config, config => {
  const activity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
  activity.$['android:launchMode'] = 'singleTop';
  return config;
});
