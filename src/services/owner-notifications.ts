import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { ownerUser } from './owner-auth';
import { queueOwnerOpening } from './owner-opening';
import { Platform } from 'react-native';
import { OWNER_CHANNEL, OWNER_SILENT_CHANNEL, validFcmToken, type Registration, type OwnerPayload, type Engagement } from '../../shared/notifications';

const KEY = 'geeta:owner-notifications-v1';
type State = { enabled: boolean; code: string | null; pending: Registration | null; opens: OwnerPayload[]; handled: string[]; token: string | null; destination: OwnerPayload['destination'] | null };
const initial = (): State => ({ enabled: true, code: null, pending: null, opens: [], handled: [], token: null, destination: null });
let current: State = initial(), hydrated = false;
let storageTail: Promise<unknown> = Promise.resolve(), flight: Promise<void> | null = null;
const listeners = new Set<() => void>();
let error: string | null = null;
export function ownerStatus() { return { enabled: hydrated && current.enabled, code: current.code, pending: !!current.pending || current.opens.length > 0, error }; }
export function ownerPresentationEnabled() { return hydrated && current.enabled; }
export function onOwnerStatus(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
const notify = () => listeners.forEach(f => f());
async function mutate(update: (s: State) => State) {
  const task = storageTail.catch(() => undefined).then(async () => {
    if (!hydrated) { const raw = await AsyncStorage.getItem(KEY); current = raw ? { ...initial(), ...JSON.parse(raw) } : initial(); if (!validFcmToken(current.token)) { current.token = null; if (current.pending) current.pending = { ...current.pending, tokenProvider: 'fcm', token: null }; } hydrated = true; }
    const next = update(current); await AsyncStorage.setItem(KEY, JSON.stringify(next)); current = next; notify();
  }); storageTail = task; await task;
}
export async function hydrateOwnerNotifications() { await mutate(s => s); }
export async function setOwnerEnabled(enabled: boolean) {
  // Apply foreground opt-out before any disk/network work; the durable write completes before UI confirms it.
  const prior = current.enabled; current = { ...current, enabled }; notify();
  try { await mutate(s => ({ ...s, enabled, pending: s.pending ? { ...s.pending, enabled } : null })); }
  catch (e) { current = { ...current, enabled: prior }; notify(); throw e; }
}
async function api(path: string, body: unknown) {
  const base = process.env.EXPO_PUBLIC_NOTIFICATION_API_URL;
  if (!base?.startsWith('https://') && !(__DEV__ && base?.startsWith('http://'))) throw new Error('Owner announcements need an API URL');
  const user = await ownerUser(), controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
  try { const result = await fetch(`${base!.replace(/\/$/, '')}/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal }); const data = await result.json(); if (!result.ok) throw Object.assign(new Error(data.error ?? 'Registration failed'), { status: result.status }); return data; }
  finally { clearTimeout(timer); }
}
export async function configureOwnerChannels() {
  if (Platform.OS !== 'android') return;
  await Promise.all([
    // SDK 57 treats an explicit sound string as a bundled custom file. Omit it
    // to use Android's default notification sound; null remains silent below.
    Notifications.setNotificationChannelAsync(OWNER_CHANNEL, { name: 'Owner announcements', importance: Notifications.AndroidImportance.DEFAULT }),
    Notifications.setNotificationChannelAsync(OWNER_SILENT_CHANNEL, { name: 'Owner announcements (silent)', importance: Notifications.AndroidImportance.DEFAULT, sound: null, enableVibrate: false }),
  ]);
}
export async function syncOwnerRegistration(language: Registration['language'], engagement: Engagement | null, refreshToken = true) {
  if (Platform.OS !== 'android') return;
  await hydrateOwnerNotifications(); await configureOwnerChannels();
  const permission = (await Notifications.getPermissionsAsync()).granted;
  // Persist permission/preferences even if obtaining a token fails offline.
  await mutate(s => ({ ...s, pending: { tokenProvider: 'fcm', token: s.token, enabled: s.enabled, permission, language, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata', appVersion: Constants.expoConfig?.version ?? 'unknown', engagement } }));
  if (permission && current.enabled && refreshToken) {
    try { const native = await Notifications.getDevicePushTokenAsync();
      if (native.type !== 'android' || !validFcmToken(native.data)) throw new Error('Native FCM token unavailable');
      await cacheOwnerDeviceToken(native);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Push registration will retry';
      error = /Default FirebaseApp is not initialized|Unable to get Firebase Messaging instance/.test(message)
        ? 'This installed Android build is missing its Firebase configuration. Install an updated build with google-services.json included, then reopen the app.'
        : message;
      notify();
    }
  }
  const registrationError = error;
  await flushOwnerUpdates();
  if (registrationError && !current.token) { error = registrationError; notify(); }
}
/** A token listener must cache the supplied token without requesting another one. */
export async function cacheOwnerDeviceToken(native: Notifications.DevicePushToken): Promise<boolean> {
  if (native.type !== 'android' || !validFcmToken(native.data)) return false;
  await hydrateOwnerNotifications();
  if (current.token === native.data) return false;
  const token = native.data;
  await mutate(s => ({ ...s, token, pending: s.pending ? { ...s.pending, tokenProvider: 'fcm', token } : null }));
  return true;
}
export function flushOwnerUpdates(): Promise<void> {
  if (flight) return flight;
  flight = (async () => {
    await hydrateOwnerNotifications();
    // Snapshot identity lets a newer engagement/preference update stay queued during an in-flight request.
    for (let n = 0; n < 3; n++) { const pending = current.pending; if (!pending) break;
      const result = await api('register', pending);
      await mutate(s => ({ ...s, code: result.code, pending: s.pending === pending ? null : s.pending }));
    }
    for (const event of [...current.opens]) { try { await api('open', event); } catch (e) { if ((e as {status?:number}).status !== 400) throw e; } await mutate(s => ({ ...s, opens: s.opens.filter(x => x.campaignId !== event.campaignId || x.deliveryId !== event.deliveryId) })); }
    error = null; notify();
  })().catch(e => { error = e instanceof Error ? e.message : 'Update queued for retry'; notify(); }).finally(() => { flight = null; });
  return flight;
}
export async function handleOwnerOpening(payload: OwnerPayload) {
  await mutate(s => queueOwnerOpening(s, payload));
  void flushOwnerUpdates();
}
export async function takeOwnerDestination(expected: State['destination']) { let destination: State['destination'] = null; await mutate(s => { destination = s.destination; return s.destination === expected ? { ...s, destination: null } : s; }); return destination; }
export function peekOwnerDestination() { return current.destination; }
