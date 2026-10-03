import { Stack, usePathname, useRootNavigationState, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DockLayoutProvider, TabBar } from '@/components/ritual-ui';
import {
  configureAlarmNotifications,
  reconcileAlarm,
  addAlarmTriggeredListener,
  getAlarmPlaybackState,
} from '@/services/alarm';
import { RitualProvider } from '@/state/ritual-store';
import { GitaProvider } from '@/state/gita-store';
import { TasksProvider } from '@/state/tasks-store';
import { ContentProvider } from '@/state/content-store';

const TAB_ROUTES = new Set(['/', '/today', '/night']);

function AppChrome() {
  const pathname = usePathname();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const showTabs = TAB_ROUTES.has(pathname);

  useEffect(() => {
    const refresh = () => configureAlarmNotifications().then(reconcileAlarm).catch(() => undefined);
    refresh();
    const subscription = AppState.addEventListener("change", state => { if (state === "active") refresh(); });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Native alarm events can arrive before Expo Router has registered the
    // root stack. Dispatching before this key exists produces an unhandled
    // REPLACE action even though the file route is present.
    if (!rootNavigationState?.key) return;

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
  }, [pathname, rootNavigationState?.key, router]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" hidden={pathname === '/alarm/wake'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="gita" />
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
      <DockLayoutProvider>
      <RitualProvider>
        <TasksProvider>
        <GitaProvider>
        <ContentProvider>
          <AppChrome />
        </ContentProvider>
        </GitaProvider>
        </TasksProvider>
      </RitualProvider>
      </DockLayoutProvider>
    </GestureHandlerRootView>
  );
}
