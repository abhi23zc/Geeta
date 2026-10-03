const { withAppBuildGradle } = require('expo/config-plugins');

// The local alarm module uses java.time on the SDK's minimum Android API 24.
module.exports = function withAlarmDesugaring(config) {
  return withAppBuildGradle(config, config => {
    let source = config.modResults.contents;
    if (!source.includes('coreLibraryDesugaringEnabled true')) {
      source = source.replace(/android\s*\{/, 'android {\n    compileOptions {\n        coreLibraryDesugaringEnabled true\n    }');
    }
    if (!source.includes('com.android.tools:desugar_jdk_libs')) {
      source = source.replace(/dependencies\s*\{/, "dependencies {\n    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.5'");
    }
    config.modResults.contents = source;
    return config;
  });
};
