import { alarmChannelEnabled, alarmSchedulingReady } from "./alarm-readiness";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { NativeModule, requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";
import { toneKey } from "../../shared/content";
import { translateText } from '@/i18n/translations';
import { parseRitualCheckpoint, type RitualCheckpoint } from './ritual-checkpoint';

export const ALARM_CHANNEL_ID = "morning-ritual-native-alarm-v3";
const MIGRATION_KEY = "morning-ritual:native-alarm-migrated-v3";
const LEGACY_SCHEDULED_IDS_KEY = "morning-ritual:scheduled-alarm-ids";

export type AlarmDayId = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const ALARM_DAYS: readonly { id: AlarmDayId; label: string; weekday: number }[] = [
  { id: "mon", label: "M", weekday: 2 },
  { id: "tue", label: "T", weekday: 3 },
  { id: "wed", label: "W", weekday: 4 },
  { id: "thu", label: "T", weekday: 5 },
  { id: "fri", label: "F", weekday: 6 },
  { id: "sat", label: "S", weekday: 7 },
  { id: "sun", label: "S", weekday: 1 },
];

export type NativeAlarmConfig = {
  id: "morning-ritual";
  hour: number;
  minute: number;
  weekdays: AlarmDayId[];
  enabled: boolean;
  tone: { kind: "system" | "bundled" | "downloaded"; key?: string };
  gradualVolume: boolean;
  vibration: boolean;
};

export type AlarmCapabilityStatus = {
  notifications: boolean;
  exactAlarm: boolean;
  fullScreenIntent: boolean;
  channelImportance: number;
  notificationChannelReady: boolean;
  notificationChannelEnabled: boolean;
  batteryRestricted: boolean;
  batteryOptimizationExempt: boolean;
  sdkInt: number;
  manufacturer: string;
  brand?: string;
  model?: string;
  softwareVersion?: string;
  oemGuidance: boolean;
};

export type AlarmLaunchDiagnostics = {
  build?: { package: string; version: string; versionCode: number; updatedAt: number; debug: boolean };
  manufacturer: string;
  model: string;
  sdkInt: number;
  interactive: boolean;
  ringing: boolean;
  capabilities: AlarmCapabilityStatus;
  events: string[];
};

export type AlarmMusicStatus = { key: string; revision: string | null; pendingRevision: string | null; fallbackRevision?: string | null; title: string | null; day: number; length: number; scheduledAt: number; bytes: number };
export type AlarmCycleInstall = { key: string; revision: string; startDate: string; tracks: { title: string; uri: string; bytes: number; sha256: string }[] };
export type AlarmPlaybackState = {
  trackTitle?: string;
  snoozeAvailable?: boolean;
  actualTone?: string;
  fallbackReason?: string;
  toneRevision?: string;
  ringing: boolean;
  triggeredAt: number;
  scheduledAt: number;
  volumeProgress: number;
};

/**
 * The compact alarm state consumed by dashboard surfaces. `scheduled` means
 * Android currently allows an exact occurrence and alarm notifications.
 * Full-screen access and manufacturer confirmations are advisory.
 */
export type AlarmHomeSnapshot = {
  snoozedUntil?: number;
  available: boolean;
  config: NativeAlarmConfig | null;
  capabilities: AlarmCapabilityStatus;
  scheduled: boolean;
  scheduleStatus?: 'scheduled' | 'disabled' | 'needs-access' | 'failed' | 'unknown';
  scheduledAt?: number;
  scheduleError?: string | null;
  deliveryFailureAt?: number;
};

export type SettingsDestination = { destination: string; fallback: boolean; requestedStep?: string };
export type AlarmReliabilitySetting = "notifications" | "exact" | "channel" | "fullscreen" | "startup" | "battery" | "popup";

type AlarmEvents = {
  alarmSnoozeRequested(event: { sessionId: string }): void;
  alarmPresentationChanged(state: AlarmPresentationState): void;
  alarmTriggered(state: AlarmPlaybackState): void;
  alarmStopped(event: { reason: string; sessionId?: string }): void;
};

declare class MorningAlarmNativeModule extends NativeModule<AlarmEvents> {
  setAppLanguage(language: string): Promise<void>;
  recordNavigationState?(route: string, top: string, focused: boolean, owned: boolean, foreground: boolean): Promise<void>;
  getPresentationState(): AlarmPresentationState;
  getAlarmStartupState?(): AlarmStartupState;
  acknowledgeRitualScreen?(identity: RitualPresentationIdentity): Promise<{ accepted: boolean; reason: string | null }>;
  setRitualStage(stage: AlarmRitualStage): Promise<void>;
  advanceRitualStage?(id: string, stage: AlarmRitualStage): Promise<void>;
  getRitualCheckpoint?(stage: string): string | null;
  saveRitualCheckpoint?(id: string, stage: string, raw: string): Promise<boolean>;
  dismissRitualOccurrence?(id: string): Promise<number | null>;
  getHomeSnapshot?(): Promise<Omit<AlarmHomeSnapshot, 'available' | 'scheduled'>>;
  notifyRitualScreenReady(route: string): Promise<void>;
  endRitualPresentation(): Promise<void>;
  endRitualOccurrence?(id: string): Promise<void>;
  setRitualScreenAwake(awake: boolean): Promise<void>;
  requestRitualUnlock(): Promise<boolean>;
  hashContentFile(uri: string): Promise<string>;
  installAlarmTone(input: { key: string; uri: string; revision: string; bytes: number; sha256: string; title?: string }): Promise<string>;
  verifyAlarmCycle?(key: string, revision: string): Promise<boolean>;
  installAlarmCycle?(json: string): Promise<string>;
  getAlarmMusicStatus?(key: string, at: number): Promise<string>;
  getInstalledAlarmTone(): Promise<{ key: string | null; revision: string | null }>;
  schedule(config: NativeAlarmConfig): Promise<{ scheduled: boolean; scheduledAt?: number }>;
  cancel(): Promise<void>;
  startMyDay?(id: string): Promise<{ stage: 'breathe' | 'gita'; scheduledAt: number | null }>;
  snoozeAlarm?(id: string): Promise<number>;
  dismissAndScheduleNext(): Promise<number | null>;
  reconcile(): Promise<boolean>;
  scheduleTest(): Promise<number>;
  getConfig(): Promise<NativeAlarmConfig | null>;
  getPlaybackState(): Promise<AlarmPlaybackState>;
  getRewardOccurrence?(): { id: string | null; test: boolean; startedAt: string | null; breathingAt: string | null };
  completeRewardStage?(id: string, stage: 'breathe' | 'gita'): Promise<boolean>;
  getPendingRewardReceipts?(): Promise<string>;
  acknowledgeRewardReceipts?(ids: string[]): Promise<void>;
  getCapabilityStatus(): Promise<AlarmCapabilityStatus>;
  getLaunchDiagnostics(): Promise<AlarmLaunchDiagnostics>;
  openExactAlarmSettings(): Promise<SettingsDestination>;
  openFullScreenIntentSettings(): Promise<SettingsDestination>;
  openNotificationSettings(): Promise<SettingsDestination>;
  openNotificationChannelSettings(): Promise<SettingsDestination>;
  notifyWakeScreenReady(): Promise<void>;
  openAlarmReliabilitySettings(stepId: AlarmReliabilitySetting): Promise<SettingsDestination>;
  openAutoStartSettings(): Promise<SettingsDestination>;
  openOemPermissionSettings(): Promise<SettingsDestination>;
  openBatterySettings(): Promise<SettingsDestination>;
}

const NativeAlarm = Platform.OS === "android"
  ? requireOptionalNativeModule<MorningAlarmNativeModule>("MorningAlarm")
  : null;

export const isNativeAlarmAvailable = NativeAlarm != null;
export function addAlarmSnoozeRequestedListener(listener: (event: { sessionId: string }) => void) {
  return NativeAlarm?.addListener('alarmSnoozeRequested', listener);
}

export async function snoozeAlarm(id: string) {
  if (!NativeAlarm?.snoozeAlarm) throw new Error('Snooze unavailable');
  return NativeAlarm.snoozeAlarm(id);
}
export const isRewardAlarmAvailable = !!NativeAlarm?.completeRewardStage;
export function getRewardOccurrence() { return NativeAlarm?.getRewardOccurrence?.() ?? null; }
export async function completeRewardStage(id: string, stage: 'breathe' | 'gita') { return await NativeAlarm?.completeRewardStage?.(id, stage) ?? false; }
export async function getPendingRewardReceipts() { return await NativeAlarm?.getPendingRewardReceipts?.() ?? '[]'; }
export async function acknowledgeRewardReceipts(ids: string[]) { await NativeAlarm?.acknowledgeRewardReceipts?.(ids); }

export async function setNativeAppLanguage(language: 'en' | 'hi' | 'hinglish') {
  await NativeAlarm?.setAppLanguage?.(language);
  await configureAlarmNotifications();
}

export type AlarmRitualStage = 'wake' | 'breathe' | 'gita';
export type RitualPresentationIdentity = { sessionId: string; stage: AlarmRitualStage; hostGeneration: number; coverGeneration: number };
export type AlarmStartupState = AlarmPresentationState & { validRitualIntent: boolean; language: 'en' | 'hi' | 'hinglish'; userUnlocked: boolean };
export type AlarmPresentationState = { status: 'loading' | 'ready' | 'recovery' | 'inactive'; hostGeneration: number; coverGeneration: number; active: boolean; locked: boolean; stage: AlarmRitualStage | null; loading: boolean; sessionId?: string | null; terminationReason?: string | null };
export function getAlarmPresentationState(): AlarmPresentationState {
  return NativeAlarm?.getPresentationState?.() ?? { active: false, locked: false, stage: null, loading: false, status: 'inactive', hostGeneration: 0, coverGeneration: 0 };
}
export function getAlarmStartupState(): AlarmStartupState {
  return NativeAlarm?.getAlarmStartupState?.() ?? { ...getAlarmPresentationState(), validRitualIntent: false, language: 'en', userUnlocked: true };
}
export async function acknowledgeRitualScreen(identity: RitualPresentationIdentity) {
  return await NativeAlarm?.acknowledgeRitualScreen?.(identity) ?? { accepted: false, reason: 'unsupported' };
}
export async function recordAlarmNavigationState(route: string, top: string, focused: boolean, owned: boolean, foreground: boolean) {
  await NativeAlarm?.recordNavigationState?.(route, top, focused, owned, foreground);
}
export function addAlarmPresentationListener(listener: (state: AlarmPresentationState) => void) {
  return NativeAlarm?.addListener('alarmPresentationChanged', listener);
}
export async function setAlarmRitualStage(stage: AlarmRitualStage, id?: string) {
  if (id) {
    if (!NativeAlarm?.advanceRitualStage) throw new Error('Update the Android app to restore ritual progress.');
    await NativeAlarm.advanceRitualStage(id, stage);
  } else await NativeAlarm?.setRitualStage?.(stage);
}
export function getRitualCheckpoint(stage: RitualCheckpoint['stage']) {
  const state = getAlarmPresentationState();
  return parseRitualCheckpoint(NativeAlarm?.getRitualCheckpoint?.(stage) ?? null, state.sessionId, stage);
}
export function hasInvalidRitualCheckpoint(stage: RitualCheckpoint['stage']) {
  return !!NativeAlarm?.getRitualCheckpoint?.(stage) && !getRitualCheckpoint(stage);
}
let checkpointTail: Promise<unknown> = Promise.resolve();
export function saveRitualCheckpoint(checkpoint: RitualCheckpoint): Promise<void> {
  const raw = JSON.stringify(checkpoint);
  const save = checkpointTail.then(async () => {
    if (!NativeAlarm?.saveRitualCheckpoint || !(await NativeAlarm.saveRitualCheckpoint(checkpoint.sessionId, checkpoint.stage, raw))) throw new Error('Could not save ritual progress. Please retry.');
  });
  checkpointTail = save.catch(() => undefined);
  return save;
}
export async function notifyRitualScreenReady(route: string) { await NativeAlarm?.notifyRitualScreenReady?.(route); }
export async function endAlarmRitual(id?: string) {
  if (id && NativeAlarm?.endRitualOccurrence) await NativeAlarm.endRitualOccurrence(id);
  else if (!id || getAlarmPresentationState().sessionId === id) await NativeAlarm?.endRitualPresentation?.();
}
export async function setAlarmRitualScreenAwake(awake: boolean) { await NativeAlarm?.setRitualScreenAwake?.(awake); }
export async function requestRitualUnlock() { return NativeAlarm?.requestRitualUnlock ? NativeAlarm.requestRitualUnlock() : true; }

export async function hashContentFile(uri: string) {
  if (!NativeAlarm) throw new Error("Verified downloads require the updated Android native build.");
  return NativeAlarm.hashContentFile(uri);
}
export async function installAlarmTone(input: { key: string; uri: string; revision: string; bytes: number; sha256: string; title?: string }) {
  if (!NativeAlarm) throw new Error("Downloaded alarms require an Android native build.");
  return NativeAlarm.installAlarmTone(input);
}
export async function verifyAlarmCycle(key: string, revision: string): Promise<boolean> {
  return await NativeAlarm?.verifyAlarmCycle?.(key, revision) ?? false;
}
export async function installAlarmCycle(input: AlarmCycleInstall) {
  if (!NativeAlarm?.installAlarmCycle) throw new Error('Update the app to download alarm music cycles');
  return NativeAlarm.installAlarmCycle(JSON.stringify(input));
}
export async function getAlarmMusicStatus(key: string, at = 0): Promise<AlarmMusicStatus | null> {
  return NativeAlarm?.getAlarmMusicStatus ? JSON.parse(await NativeAlarm.getAlarmMusicStatus(toneKey(key), at)) : null;
}
export async function getInstalledAlarmTone() { return NativeAlarm?.getInstalledAlarmTone() ?? null; }

function parseTime(time: string) {
  const [hour = "6", minute = "30"] = time.split(":");
  return { hour: Number(hour), minute: Number(minute) };
}

export function configTime(config: NativeAlarmConfig) {
  return `${String(config.hour).padStart(2, "0")}:${String(config.minute).padStart(2, "0")}`;
}

export async function configureAlarmNotifications() {
  if (Platform.OS !== "android") return;
  await Promise.all([
    Notifications.deleteNotificationChannelAsync("morning-ritual-native-alarm-v1").catch(() => undefined),
    Notifications.deleteNotificationChannelAsync("morning-ritual-native-alarm-v2").catch(() => undefined),
  ]);
  await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
    name: translateText('Morning ritual alarms'),
    description: translateText('Shows an active Morning Ritual alarm'),
    // The native foreground service owns sound/vibration; this channel only
    // presents the lock-screen/full-screen alarm affordance.
    importance: Notifications.AndroidImportance.HIGH,
    enableVibrate: false,
    sound: null,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function requestAlarmPermission() {
  if (Platform.OS !== "android") return false;
  await configureAlarmNotifications();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function canAskAlarmNotificationPermission() {
  if (Platform.OS !== 'android') return false;
  return (await Notifications.getPermissionsAsync()).canAskAgain;
}

export async function scheduleRecurringAlarm({
  time,
  tone,
  days,
  gradualVolume,
  vibration,
}: {
  time: string;
  tone: string;
  days: AlarmDayId[];
  gradualVolume?: boolean;
  vibration?: boolean;
}) {
  if (!NativeAlarm) {
    throw new Error("Native alarms require an Android development or release build; they are not available in Expo Go.");
  }
  if (!days.length) throw new Error("Choose at least one day for the alarm.");
  await requestAlarmPermission();
  const { hour, minute } = parseTime(time);
  const existing = await NativeAlarm.getConfig();
  const result = await NativeAlarm.schedule({
    id: "morning-ritual",
    hour,
    minute,
    weekdays: days,
    enabled: true,
    tone: { kind: "downloaded", key: toneKey(tone) },
    gradualVolume: gradualVolume ?? existing?.gradualVolume ?? true,
    vibration: vibration ?? existing?.vibration ?? true,
  });
  const snapshot = await getAlarmHomeSnapshot();
  return { ...result, scheduled: snapshot.scheduled, scheduledAt: snapshot.scheduledAt, scheduleStatus: snapshot.scheduleStatus, scheduleError: snapshot.scheduleError, capabilities: snapshot.capabilities };
}

export async function cancelScheduledAlarm() { await NativeAlarm?.cancel(); }
export async function startMyDay(sessionId: string) {
  if (!NativeAlarm?.startMyDay) throw new Error('Update the Android app to restore ritual progress.');
  return NativeAlarm.startMyDay(sessionId);
}
export async function dismissAlarmAndScheduleNext(sessionId?: string) {
  if (!NativeAlarm) throw new Error("Native alarm service is unavailable.");
  if (sessionId) {
    if (!NativeAlarm.dismissRitualOccurrence) throw new Error('Update the Android app to restore ritual progress.');
    return NativeAlarm.dismissRitualOccurrence(sessionId);
  }
  return NativeAlarm.dismissAndScheduleNext();
}
export async function getNativeAlarmConfig() { return NativeAlarm?.getConfig() ?? null; }
export async function getAlarmPlaybackState(): Promise<AlarmPlaybackState> {
  return (await NativeAlarm?.getPlaybackState()) ?? { ringing: false, triggeredAt: 0, scheduledAt: 0, volumeProgress: 0 };
}
export async function reconcileAlarm() { return NativeAlarm?.reconcile() ?? false; }
export async function scheduleTestAlarm() {
  if (!NativeAlarm) throw new Error("Test alarms require an Android native build.");
  await requestAlarmPermission();
  if (!alarmSchedulingReady(await getAlarmCapabilityStatus())) throw new Error(translateText("Enable notifications, the alarm channel and precise alarms before testing."));
  return NativeAlarm.scheduleTest();
}

export async function getAlarmCapabilityStatus() {
  await configureAlarmNotifications();
  const status = await NativeAlarm?.getCapabilityStatus() ?? {
    notifications: false, exactAlarm: false, fullScreenIntent: false,
    channelImportance: 0, notificationChannelEnabled: false, notificationChannelReady: false, batteryRestricted: false, batteryOptimizationExempt: false,
    sdkInt: 0, manufacturer: "", oemGuidance: false,
  };
  return { ...status, notificationChannelEnabled: alarmChannelEnabled(status) };
}

export async function getAlarmHomeSnapshot(): Promise<AlarmHomeSnapshot> {
  if (!NativeAlarm) {
    return {
      available: false,
      config: null,
      capabilities: await getAlarmCapabilityStatus(),
      scheduled: false,
    };
  }

  if (NativeAlarm.getHomeSnapshot) {
    const snapshot = await NativeAlarm.getHomeSnapshot();
    const capabilities = { ...snapshot.capabilities, notificationChannelEnabled: alarmChannelEnabled(snapshot.capabilities) };
    return { ...snapshot, capabilities, available: true, scheduled: snapshot.scheduleStatus === 'scheduled' && !!snapshot.config?.enabled && alarmSchedulingReady(capabilities) };
  }

  const [config, capabilities] = await Promise.all([
    NativeAlarm.getConfig(),
    NativeAlarm.getCapabilityStatus(),
  ]);
  return {
    available: true,
    config,
    capabilities: { ...capabilities, notificationChannelEnabled: alarmChannelEnabled(capabilities) },
    scheduleStatus: 'unknown',
    scheduled: false,
  };
}
export async function openExactAlarmSettings() { return NativeAlarm?.openExactAlarmSettings(); }
export async function openFullScreenIntentSettings() { return NativeAlarm?.openFullScreenIntentSettings(); }
export async function openNotificationSettings() { return NativeAlarm?.openNotificationSettings(); }
export async function openNotificationChannelSettings() { return NativeAlarm?.openNotificationChannelSettings(); }
export async function getLaunchDiagnostics() { return NativeAlarm?.getLaunchDiagnostics(); }
export async function notifyWakeScreenReady() { await NativeAlarm?.notifyWakeScreenReady(); }
export async function openAutoStartSettings() { return NativeAlarm?.openAutoStartSettings(); }
export async function openOemPermissionSettings() { return NativeAlarm?.openOemPermissionSettings(); }
export async function openBatterySettings() { return NativeAlarm?.openBatterySettings(); }
export function addAlarmTriggeredListener(listener: (state: AlarmPlaybackState) => void) {
  return NativeAlarm?.addListener("alarmTriggered", listener);
}
export function addAlarmStoppedListener(listener: (event: { reason: string; sessionId?: string }) => void) {
  return NativeAlarm?.addListener("alarmStopped", listener);
}

type LegacyAlarm = {
  alarmTime?: string;
  alarmTone?: string;
  alarmDays?: AlarmDayId[];
  alarmEnabled?: boolean;
};

export async function migrateLegacyAlarm(legacy: LegacyAlarm) {
  if (!NativeAlarm) return null;
  const existing = await NativeAlarm.getConfig();
  const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
  if (!migrated) {
    const rawIds = await AsyncStorage.getItem(LEGACY_SCHEDULED_IDS_KEY);
    const legacyIds: unknown = rawIds ? JSON.parse(rawIds) : [];
    if (!Array.isArray(legacyIds) || !legacyIds.every(id => typeof id === 'string')) throw new Error('Invalid legacy alarm notification IDs');
    await Promise.all(legacyIds.map(id => Notifications.cancelScheduledNotificationAsync(id)));
    await AsyncStorage.removeItem(LEGACY_SCHEDULED_IDS_KEY);
    if (!existing) {
      const { hour, minute } = parseTime(legacy.alarmTime ?? "06:30");
      await NativeAlarm.schedule({
        id: "morning-ritual",
        hour,
        minute,
        weekdays: legacy.alarmDays?.length
          ? legacy.alarmDays
          : ["mon", "tue", "wed", "thu", "fri", "sat"],
        enabled: legacy.alarmEnabled ?? false,
        tone: { kind: "system", key: legacy.alarmTone },
        gradualVolume: true,
        vibration: true,
      });
    }
    await AsyncStorage.setItem(MIGRATION_KEY, "1");
  }
  return NativeAlarm.getConfig();
}

/** Older installed binaries remain usable while the updated bridge is rolled out. */
export async function openAlarmReliabilitySettings(step: AlarmReliabilitySetting) {
  if (!NativeAlarm) return undefined;
  if (NativeAlarm.openAlarmReliabilitySettings) return NativeAlarm.openAlarmReliabilitySettings(step);
  const action = { notifications: openNotificationSettings, exact: openExactAlarmSettings,
    channel: openNotificationChannelSettings, fullscreen: openFullScreenIntentSettings,
    startup: openAutoStartSettings, battery: openBatterySettings, popup: openOemPermissionSettings }[step];
  return action();
}
