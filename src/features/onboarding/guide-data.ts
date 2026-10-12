export const DEVICE_GUIDES = [
  { id: 'android', name: 'Android / Pixel', aliases: ['google', 'pixel', 'android'], official: 'https://support.google.com/pixelphone/answer/2840923', examples: [] },
  { id: 'samsung', name: 'Samsung', aliases: ['samsung'], official: 'https://developer.samsung.com/mobile/app-management.html', examples: ['samsung-battery'] },
  { id: 'xiaomi', name: 'Xiaomi / Redmi / POCO', aliases: ['xiaomi', 'redmi', 'poco'], official: 'https://trust.mi.com/docs/miui-privacy-white-paper-global/3/1', examples: ['xiaomi-autostart', 'xiaomi-battery'] },
  { id: 'oppo', name: 'OPPO', aliases: ['oppo'], official: 'https://support.oppo.com/en/answer/?aid=2171043', examples: ['oppo-autostart', 'oppo-battery'] },
  { id: 'realme', name: 'realme', aliases: ['realme'], official: 'https://www.realme.com/in/support/kw/doc/2083586', examples: ['realme-battery'] },
  { id: 'oneplus', name: 'OnePlus', aliases: ['oneplus'], official: 'https://service.oneplus.com/content/dam/support/user-manuals/common/OnePlus_9_User_Manual_EN.pdf', examples: ['oneplus-battery'] },
  { id: 'vivo', name: 'Vivo / iQOO', aliases: ['vivo', 'iqoo'], official: 'https://www.vivo.com/en/support/questionList?categoryId=54716', examples: ['vivo-background'] },
  { id: 'huawei', name: 'Huawei', aliases: ['huawei'], official: 'https://consumer.huawei.com/en/support/content/en-us10254632/', examples: ['huawei-autostart'] },
  { id: 'honor', name: 'Honor', aliases: ['honor'], official: 'https://consumer.huawei.com/ca/support/content/en-us15848660/', examples: [] },
] as const;
export type GuideId = typeof DEVICE_GUIDES[number]['id'];
export function screenshotDimensions(availableWidth: number, maximumHeight: number, source: { width: number; height: number }) {
  const width = Math.min(Math.max(1, availableWidth), Math.max(1, maximumHeight) * source.width / source.height);
  return { width, height: width * source.height / source.width };
}
export function deviceGuideId(manufacturer: string): GuideId {
  const value = manufacturer.trim().toLowerCase();
  return DEVICE_GUIDES.find(guide => guide.aliases.some(alias => alias === value))?.id ?? 'android';
}
export const GUIDE_EXAMPLES = {
  'xiaomi-miui14-notifications': { source: 'https://trust.mi.com/docs/miui-privacy-white-paper-global/3/1', author: 'Geeta project device capture', software: 'MIUI 14 · Android 13', instruction: "In Settings, turn on notifications for Aarambh." },
  'xiaomi-miui14-exact': { source: 'https://trust.mi.com/docs/miui-privacy-white-paper-global/3/1', author: 'Geeta project device capture', software: 'MIUI 14 · Android 13', instruction: "Allow precise alarm timing in Alarms & reminders." },
  'xiaomi-miui14-channel': { source: 'https://trust.mi.com/docs/miui-privacy-white-paper-global/3/1', author: 'Geeta project device capture', software: 'MIUI 14 · Android 13', instruction: "In Morning ritual alarms, enable Show notifications and Allow floating notifications." },
  'xiaomi-miui14-lockscreen': { source: 'https://trust.mi.com/docs/miui-privacy-white-paper-global/3/1', author: 'Geeta project device capture', software: 'MIUI 14 · Android 13', instruction: "In Other permissions, allow Show on Lock screen for Aarambh." },
  'xiaomi-miui14-background-popup': { source: 'https://trust.mi.com/docs/miui-privacy-white-paper-global/3/1', author: 'Geeta project device capture', software: 'MIUI 14 · Android 13', instruction: "In Other permissions, allow Open new windows while running in the background." },
  'xiaomi-miui14-startup': { source: 'https://trust.mi.com/docs/miui-privacy-white-paper-global/3/1', author: 'Geeta project device capture', software: 'MIUI 14 · Android 13', instruction: "Open Background autostart and enable Aarambh." },
  'android-channel': { source: 'https://developer.android.com/develop/ui/compose/notifications/channels', author: 'Android Developers · CC-BY-4.0', software: 'Android 8', instruction: 'Turn on Morning ritual alarms and choose High importance, or Alerting if that is the option shown. The app plays the alarm sound separately.' },
  'android-fullscreen': { source: 'https://source.android.com/docs/core/permissions/fsi-limits', author: 'Android Open Source Project · CC-BY-4.0', software: 'Android 14', instruction: 'Full-screen access can show the alarm over the lock screen. You can still use the alarm notification without it.' },
  'android-notifications': { source: 'https://developer.android.com/develop/ui/compose/notifications/notification-permission', author: 'Android 13+ Notification Dialog', software: 'Android 13+', instruction: 'Allow alarm notifications so you can open or stop your alarm from its notification.' },
  'samsung-exact': { source: 'https://dontkillmyapp.com/samsung', author: 'Urbandroid Team / dontkillmyapp.com · CC-BY', software: 'Samsung · Android 13', instruction: 'Allow precise alarm timing in Alarms & reminders.' },
  'samsung-battery': { source: 'https://dontkillmyapp.com/samsung', author: 'Urbandroid Team / dontkillmyapp.com · CC-BY', software: 'Samsung · Android 13', instruction: 'In app settings → Battery, choose Unrestricted.' },
  'xiaomi-autostart': { source: 'https://dontkillmyapp.com/xiaomi', author: 'Urbandroid Team / dontkillmyapp.com · CC-BY', software: 'MIUI 14', instruction: 'Open Background autostart and enable Aarambh.' },
  'xiaomi-battery': { source: 'https://dontkillmyapp.com/xiaomi', author: 'Urbandroid Team / dontkillmyapp.com · CC-BY', software: 'MIUI 12', instruction: 'In app battery saver, choose No restrictions.' },
  'oppo-autostart': { source: 'https://dontkillmyapp.com/oppo', author: 'Urbandroid Team / dontkillmyapp.com · CC-BY', software: 'OPPO', instruction: 'In Auto-launch apps, enable Aarambh.' },
  'oppo-battery': { source: 'https://dontkillmyapp.com/oppo', author: 'Urbandroid Team / dontkillmyapp.com · CC-BY', software: 'OPPO', instruction: 'Choose Run in Background for Aarambh.' },
  'realme-battery': { source: 'https://dontkillmyapp.com/realme', author: 'Urbandroid Team / dontkillmyapp.com · CC-BY', software: 'realme', instruction: 'Enable Allow background activity and Allow auto-launch for Aarambh.' },
  'oneplus-battery': { source: 'https://dontkillmyapp.com/oneplus', author: 'Urbandroid Team / dontkillmyapp.com · CC-BY', software: 'OnePlus · OxygenOS (version not supplied)', instruction: 'In App auto-launch, enable Aarambh.' },
  'vivo-battery': { source: 'https://dontkillmyapp.com/vivo', author: 'Urbandroid Team / dontkillmyapp.com · CC-BY', software: 'Vivo · Android 13', instruction: 'Choose Run in Background for Aarambh.' },
  'vivo-background': { source: 'https://dontkillmyapp.com/vivo', author: 'Urbandroid Team / dontkillmyapp.com · CC-BY', software: 'Vivo · Android 13', instruction: 'In Background power consumption management, choose Don’t restrict background power usage for Aarambh.' },
  'huawei-autostart': { source: 'https://dontkillmyapp.com/huawei', author: 'Urbandroid Team / dontkillmyapp.com · CC-BY', software: 'Huawei · EMUI (version not supplied)', instruction: 'In App launch, manage this app manually and allow auto-launch, secondary launch, and background activity.' },
} as const;

/** Find direct manufacturer-matched example if captured. */
export function directGuideExample(manufacturer: string, setting: string): keyof typeof GUIDE_EXAMPLES | null {
  const id = deviceGuideId(manufacturer);
  if (id === 'xiaomi') {
    const captures = { permanent: 'xiaomi-miui14-notifications', notifications: 'xiaomi-miui14-notifications', exact: 'xiaomi-miui14-exact', channel: 'xiaomi-miui14-channel', lockscreen: 'xiaomi-miui14-lockscreen', 'background-popup': 'xiaomi-miui14-background-popup', startup: 'xiaomi-miui14-startup' } as const;
    if (setting in captures) return captures[setting as keyof typeof captures];
  }
  if (setting === 'exact') return id === 'samsung' ? 'samsung-exact' : null;
  if (['notifications', 'channel', 'fullscreen'].includes(setting)) return null;
  if (setting === 'startup') {
    if (id === 'xiaomi') return 'xiaomi-autostart';
    if (id === 'oppo') return 'oppo-autostart';
    if (id === 'realme') return 'realme-battery';
    if (id === 'oneplus') return 'oneplus-battery';
    if (id === 'huawei') return 'huawei-autostart';
  }
  if (setting === 'battery') {
    if (id === 'xiaomi') return 'xiaomi-battery';
    if (id === 'samsung') return 'samsung-battery';
    if (id === 'oppo') return 'oppo-battery';
    if (id === 'realme') return 'realme-battery';
    if (id === 'vivo') return 'vivo-background';
  }
  return null;
}

export const FALLBACK_EXAMPLES: Record<string, keyof typeof GUIDE_EXAMPLES> = {
  notifications: 'xiaomi-miui14-notifications',
  exact: 'xiaomi-miui14-exact',
  channel: 'xiaomi-miui14-channel',
  fullscreen: 'android-fullscreen',
  startup: 'xiaomi-miui14-startup',
  battery: 'xiaomi-battery',
};

/** Select one relevant example; when unavailable for this manufacturer, use fallback screenshots. */
export function guideExampleForSetting(manufacturer: string, setting: string, allowFallback = true): keyof typeof GUIDE_EXAMPLES | null {
  const direct = directGuideExample(manufacturer, setting);
  if (direct) return direct;
  if (!allowFallback) return null;
  return FALLBACK_EXAMPLES[setting] ?? null;
}
