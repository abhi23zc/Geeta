import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

let released = false;
if (Platform.OS !== 'web') void SplashScreen.preventAutoHideAsync().catch(() => undefined);
/** Called after a destination, loading UI, or recovery screen has actually laid out. */
export function releaseStartupSplash() {
  if (released || Platform.OS === 'web') return;
  released = true;
  void SplashScreen.hideAsync().catch(() => { released = false; });
}
