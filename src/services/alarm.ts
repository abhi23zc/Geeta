import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { NativeModule, requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

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
  tone: { kind: "system" | "bundled"; key?: string };
  gradualVolume: boolean;
  vibration: boolean;
};

export type AlarmCapabilityStatus = {
  notifications: boolean;
  exactAlarm: boolean;
  fullScreenIntent: boolean;
  channelImportance: number;
  notificationChannelReady: boolean;
  batteryRestricted: boolean;
  sdkInt: number;
  manufacturer: string;
  oemGuidance: boolean;
};

export type AlarmLaunchDiagnostics = {
  manufacturer: string;
  model: string;
  sdkInt: number;
  interactive: boolean;
  ringing: boolean;
  capabilities: AlarmCapabilityStatus;
};

export type AlarmPlaybackState = {
  ringing: boolean;
  triggeredAt: number;
  scheduledAt: number;
  volumeProgress: number;
};

type AlarmEvents = {
  alarmTriggered(state: AlarmPlaybackState): void;
  alarmStopped(event: { reason: string }): void;
};

declare class MorningAlarmNativeModule extends NativeModule<AlarmEvents> {
  schedule(config: NativeAlarmConfig): Promise<{ scheduled: boolean; scheduledAt?: number }>;
  cancel(): Promise<void>;
  dismissAndScheduleNext(): Promise<number | null>;
  getConfig(): Promise<NativeAlarmConfig | null>;
  getPlaybackState(): Promise<AlarmPlaybackState>;
  getCapabilityStatus(): Promise<AlarmCapabilityStatus>;
  getLaunchDiagnostics(): Promise<AlarmLaunchDiagnostics>;
  openExactAlarmSettings(): Promise<void>;
  openFullScreenIntentSettings(): Promise<void>;
  openNotificationChannelSettings(): Promise<void>;
  notifyWakeScreenReady(): Promise<void>;
  openAutoStartSettings(): Promise<void>;
  openOemPermissionSettings(): Promise<void>;
  openBatterySettings(): Promise<void>;
}

const NativeAlarm = Platform.OS === "android"
  ? requireOptionalNativeModule<MorningAlarmNativeModule>("MorningAlarm")
  : null;

export const isNativeAlarmAvailable = NativeAlarm != null;

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
    name: "Morning ritual alarms",
    description: "Shows an active Morning Ritual alarm",
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
    tone: { kind: "system", key: tone },
    gradualVolume: gradualVolume ?? existing?.gradualVolume ?? true,
    vibration: vibration ?? existing?.vibration ?? true,
  });
  return { ...result, capabilities: await NativeAlarm.getCapabilityStatus() };
}

export async function cancelScheduledAlarm() { await NativeAlarm?.cancel(); }
export async function dismissAlarmAndScheduleNext() {
  if (!NativeAlarm) throw new Error("Native alarm service is unavailable.");
  return NativeAlarm.dismissAndScheduleNext();
}
export async function getNativeAlarmConfig() { return NativeAlarm?.getConfig() ?? null; }
export async function getAlarmPlaybackState(): Promise<AlarmPlaybackState> {
  return (await NativeAlarm?.getPlaybackState()) ?? { ringing: false, triggeredAt: 0, scheduledAt: 0, volumeProgress: 0 };
}
export async function getAlarmCapabilityStatus() {
  return NativeAlarm?.getCapabilityStatus() ?? {
    notifications: false, exactAlarm: false, fullScreenIntent: false,
    channelImportance: 0, notificationChannelReady: false, batteryRestricted: false,
    sdkInt: 0, manufacturer: "", oemGuidance: false,
  };
}
export async function openExactAlarmSettings() { await NativeAlarm?.openExactAlarmSettings(); }
export async function openFullScreenIntentSettings() { await NativeAlarm?.openFullScreenIntentSettings(); }
export async function openNotificationChannelSettings() { await NativeAlarm?.openNotificationChannelSettings(); }
export async function getLaunchDiagnostics() { return NativeAlarm?.getLaunchDiagnostics(); }
export async function notifyWakeScreenReady() { await NativeAlarm?.notifyWakeScreenReady(); }
export async function openAutoStartSettings() { await NativeAlarm?.openAutoStartSettings(); }
export async function openOemPermissionSettings() { await NativeAlarm?.openOemPermissionSettings(); }
export async function openBatterySettings() { await NativeAlarm?.openBatterySettings(); }
export function addAlarmTriggeredListener(listener: (state: AlarmPlaybackState) => void) {
  return NativeAlarm?.addListener("alarmTriggered", listener);
}
export function addAlarmStoppedListener(listener: (event: { reason: string }) => void) {
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
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
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
