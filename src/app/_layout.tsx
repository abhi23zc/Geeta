import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { TabBar } from '@/components/ritual-ui';
import { RitualProvider } from '@/state/ritual-store';

const TAB_ROUTES = new Set(['/', '/gita', '/breathe', '/today', '/night']);

function AppChrome() {
  const pathname = usePathname();
  const showTabs = TAB_ROUTES.has(pathname);

  return (
    <View style={{ flex: 1 }}>
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
    <RitualProvider>
      <StatusBar style="dark" />
      <AppChrome />
    </RitualProvider>
  );
}
