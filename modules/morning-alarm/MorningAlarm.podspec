Pod::Spec.new do |s|
  s.name = 'MorningAlarm'
  s.version = '1.0.0'
  s.summary = 'Aarambh music file verification'
  s.description = 'Native streaming SHA-256 for verified music downloads on iOS.'
  s.license = { :type => 'MIT' }
  s.author = 'Aarambh'
  s.homepage = 'https://expo.dev'
  s.platforms = { :ios => '16.4' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.swift_version = '5.9'
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
end
