import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TabBar } from '@/components/ritual-ui';
import {
  configureAlarmNotifications,
  addAlarmTriggeredListener,
  getAlarmPlaybackState,
} from '@/services/alarm';
import { RitualProvider } from '@/state/ritual-store';
import { GitaProvider } from '@/state/gita-store';

const TAB_ROUTES = new Set(['/', '/gita', '/breathe', '/today', '/night']);

function AppChrome() {
  const pathname = usePathname();
  const router = useRouter();
  const showTabs = TAB_ROUTES.has(pathname);

  useEffect(() => {
    configureAlarmNotifications().catch(() => undefined);
  }, []);

  useEffect(() => {
    const enforceWakeScreen = () => {
      getAlarmPlaybackState()
        .then((state) => {
          if (state.ringing && pathname !== '/alarm/wake') router.replace('/alarm/wake');
        })
        .catch(() => undefined);
    };
    enforceWakeScreen();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') enforceWakeScreen();
    });
    const alarm = addAlarmTriggeredListener(() => {
      if (pathname !== '/alarm/wake') router.replace('/alarm/wake');
    });
    return () => {
      appState.remove();
      alarm?.remove();
    };
  }, [pathname, router]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" hidden={pathname === '/alarm/wake'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="gita" />
        <Stack.Screen name="gita/deep-read" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="breathe" />
        <Stack.Screen name="today" />
        <Stack.Screen name="night" />
        <Stack.Screen name="alarm/setup" options={{ presentation: 'card' }} />
        <Stack.Screen name="alarm/wake" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
      {showTabs && <TabBar />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RitualProvider>
        <GitaProvider>
          <AppChrome />
        </GitaProvider>
      </RitualProvider>
    </GestureHandlerRootView>
  );
}
