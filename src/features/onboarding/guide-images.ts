import type { GUIDE_EXAMPLES } from './guide-data';
export function guideImage(name: keyof typeof GUIDE_EXAMPLES) {
  switch (name) {
    case 'android-fullscreen': return { source: require('@/assets/onboarding/guides/android-fullscreen.webp'), width: 204, height: 400 };
    case 'xiaomi-miui14-startup': return { source: require('@/assets/onboarding/guides/xiaomi-miui14-startup.png'), width: 1080, height: 2400 };
    case 'xiaomi-miui14-background-popup': return { source: require('@/assets/onboarding/guides/xiaomi-miui14-background-popup.png'), width: 1080, height: 2400 };
    case 'xiaomi-miui14-lockscreen': return { source: require('@/assets/onboarding/guides/xiaomi-miui14-lockscreen.png'), width: 1080, height: 2400 };
    case 'xiaomi-miui14-channel': return { source: require('@/assets/onboarding/guides/xiaomi-miui14-channel.png'), width: 1080, height: 2400 };
    case 'xiaomi-miui14-exact': return { source: require('@/assets/onboarding/guides/xiaomi-miui14-exact.png'), width: 1080, height: 2400 };
    case 'xiaomi-miui14-notifications': return { source: require('@/assets/onboarding/guides/xiaomi-miui14-notifications.png'), width: 1080, height: 2400 };
    case 'xiaomi-autostart': return { source: require('@/assets/onboarding/guides/xiaomi-autostart.webp'), width: 532, height: 1005 };
    case 'xiaomi-battery': return { source: require('@/assets/onboarding/guides/xiaomi-battery.webp'), width: 600, height: 1333 };
    case 'oppo-autostart': return { source: require('@/assets/onboarding/guides/oppo-autostart.webp'), width: 600, height: 1285 };
    case 'oppo-battery': return { source: require('@/assets/onboarding/guides/oppo-battery.webp'), width: 600, height: 1333 };
    case 'realme-battery': return { source: require('@/assets/onboarding/guides/realme-battery.webp'), width: 600, height: 1333 };
    case 'oneplus-battery': return { source: require('@/assets/onboarding/guides/oneplus-battery.webp'), width: 600, height: 1067 };
    case 'vivo-battery': return { source: require('@/assets/onboarding/guides/vivo-battery.webp'), width: 600, height: 1333 };
    case 'vivo-background': return { source: require('@/assets/onboarding/guides/vivo-background.webp'), width: 600, height: 1333 };
    case 'samsung-battery': return { source: require('@/assets/onboarding/guides/samsung-battery.webp'), width: 600, height: 1333 };
    case 'samsung-exact': return { source: require('@/assets/onboarding/guides/samsung-exact.webp'), width: 600, height: 1333 };
    case 'huawei-autostart': return { source: require('@/assets/onboarding/guides/huawei-autostart.webp'), width: 600, height: 451 };
    default: throw new Error('Screenshot is not approved for manufacturer guides');
  }
}
