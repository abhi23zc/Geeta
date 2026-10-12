import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, signInAnonymously, type Auth } from 'firebase/auth';
let auth: Auth | null = null;
export async function ownerUser() {
  if (!auth) {
    const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY, projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
    if (!apiKey || !projectId || !appId) throw new Error('Owner announcements need Firebase configuration');
    const existing = getApps().find(a => a.name === 'owner-notifications');
    const app = existing ?? initializeApp({ apiKey, projectId, appId }, 'owner-notifications');
    auth = existing ? getAuth(app) : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  }
  await auth.authStateReady(); if (!auth.currentUser) await signInAnonymously(auth); return auth.currentUser!;
}
