import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { RitualProvider } from '@/state/ritual-store';
export default function RootLayout() { return <RitualProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, animation: 'fade' }}><Stack.Screen name="index" /><Stack.Screen name="gita" /><Stack.Screen name="breathe" /><Stack.Screen name="today" /><Stack.Screen name="night" /><Stack.Screen name="alarm/setup" options={{ presentation: 'card' }} /><Stack.Screen name="alarm/wake" options={{ presentation: 'fullScreenModal' }} /></Stack></RitualProvider>; }
