import { JaapProvider } from '@/features/jaap/provider';
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
import { NotificationProvider } from '@/state/notification-provider';
import { AlarmNavigationGuard } from '@/navigation/alarm-navigation-guard';
import { useAlarmPresentation } from '@/navigation/alarm-presentation';
import { LanguageProvider } from '@/i18n/provider';
import { ProgressProvider } from '@/features/progress/provider';
import { TreeSessionProvider } from '@/features/progress/tree/session';
import { GrowthCelebrationHost } from '@/features/progress/tree/celebration';
import { OnboardingProvider, useOnboarding } from '@/features/onboarding/provider';
import { OnboardingGate } from '@/features/onboarding/gate';
import { needsIntroduction } from '@/features/onboarding/model';
import { AnimatedSplashScreen } from '@/components/animated-splash';
import { SubscriptionProvider } from '@/features/subscriptions/provider';
import { MusicPlayerProvider } from '@/state/music-player-store';
import { MiniPlayer } from '@/components/music/mini-player';
import { FullScreenPlayer } from '@/components/music/full-screen-player';

const alarmScreenLayout: NonNullable<React.ComponentProps<typeof Stack>['screenLayout']> =
  ({ children }) => <AlarmNavigationGuard><OnboardingGate>{children}</OnboardingGate></AlarmNavigationGuard>;

const TAB_ROUTES = new Set(['/', '/index', '/today', '/library', '/quiz', '/quiz/index', '/progress']);

function AppChrome() {
  const presentation = useAlarmPresentation();
  const { record } = useOnboarding();
  const pathname = usePathname();
  const normalizedPath = pathname ? (pathname.startsWith('/') ? pathname : `/${pathname}`) : '/';
  const isExcluded = normalizedPath.startsWith('/jaap') || normalizedPath.startsWith('/alarm') || normalizedPath === '/breathe' || normalizedPath === '/gita' || normalizedPath === '/downloads' || normalizedPath === '/saved';
  const introduction = !record || needsIntroduction(record);
  const showTabs = !introduction && !presentation.active && !isExcluded && TAB_ROUTES.has(normalizedPath);

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
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="gita" />
        <Stack.Screen name="breathe" />
        <Stack.Screen name="jaap" />
        <Stack.Screen name="today" />
        <Stack.Screen name="library" />
        <Stack.Screen name="playlist/[id]" />
        <Stack.Screen name="quiz" />
        <Stack.Screen name="language" />
        <Stack.Screen name="progress" />
        <Stack.Screen name="pro" />
        <Stack.Screen name="alarm/setup" options={{ presentation: 'card' }} />
        <Stack.Screen name="alarm/help" />
        <Stack.Screen name="alarm/wake" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
      {!introduction && !presentation.active && !isExcluded && <><MiniPlayer /><FullScreenPlayer /></>}
      {showTabs && <TabBar />}
      {!introduction && <GrowthCelebrationHost />}
      <AnimatedSplashScreen />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <OnboardingProvider><LanguageProvider>
        <ProgressProvider><TreeSessionProvider>
          <DockLayoutProvider>
            <RitualProvider>
              <TasksProvider>
                <GitaProvider>
                  <ContentProvider><JaapProvider><NotificationProvider><MusicPlayerProvider>
                    {__DEV__ ? <SubscriptionProvider><AppChrome /></SubscriptionProvider> : <AppChrome />}
                  </MusicPlayerProvider></NotificationProvider></JaapProvider></ContentProvider>
                </GitaProvider>
              </TasksProvider>
            </RitualProvider>
          </DockLayoutProvider>
        </TreeSessionProvider></ProgressProvider>
      </LanguageProvider></OnboardingProvider>
    </GestureHandlerRootView>
  );
}
