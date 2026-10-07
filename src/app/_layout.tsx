import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DockLayoutProvider, TabBar } from '@/components/ritual-ui';
import {
  configureAlarmNotifications,
  reconcileAlarm,
} from '@/services/alarm';
import { RitualProvider } from '@/state/ritual-store';
import { GitaProvider } from '@/state/gita-store';
import { TasksProvider } from '@/state/tasks-store';
import { ContentProvider } from '@/state/content-store';
import { AlarmNavigationGuard } from '@/navigation/alarm-navigation-guard';
import { useAlarmPresentation } from '@/navigation/alarm-presentation';
import { LanguageProvider } from '@/i18n/provider';
import { ProgressProvider } from '@/features/progress/provider';

const alarmScreenLayout: NonNullable<React.ComponentProps<typeof Stack>['screenLayout']> =
  ({ children }) => <AlarmNavigationGuard>{children}</AlarmNavigationGuard>;

const TAB_ROUTES = new Set(['/', '/index', '/today', '/quiz', '/quiz/index', '/night']);

function AppChrome() {
  const presentation = useAlarmPresentation();
  const pathname = usePathname();
  const normalizedPath = pathname ? (pathname.startsWith('/') ? pathname : `/${pathname}`) : '/';
  const isExcluded = normalizedPath.startsWith('/alarm') || normalizedPath === '/breathe' || normalizedPath === '/gita' || normalizedPath === '/downloads' || normalizedPath === '/saved';
  const showTabs = !presentation.active && !isExcluded && TAB_ROUTES.has(normalizedPath);

  useEffect(() => {
    const refresh = () => configureAlarmNotifications().then(reconcileAlarm).catch(() => undefined);
    refresh();
    const subscription = AppState.addEventListener("change", state => { if (state === "active") refresh(); });
    return () => subscription.remove();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" hidden={pathname === '/alarm/wake'} />
      <Stack screenLayout={alarmScreenLayout} screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="gita" />
        <Stack.Screen name="breathe" />
        <Stack.Screen name="today" />
        <Stack.Screen name="night" />
        <Stack.Screen name="quiz" />
        <Stack.Screen name="language" />
        <Stack.Screen name="progress" />
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
      <LanguageProvider>
        <ProgressProvider>
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
        </ProgressProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
