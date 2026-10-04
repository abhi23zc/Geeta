import { useLanguage } from '@/i18n/provider';
import { translate } from '@/i18n/translations';
import type { AppLanguage } from '@/i18n/model';
import { useNavigation } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AlarmClockPlus,
  ArrowLeft,
  BellRing,
  Check,
  ChevronDown,
  ChevronUp,
  Flame,
  Leaf,
  ShieldCheck,
  Sun,
  Wind,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { MORNING_RITUAL_LOGO, Screen, TextR } from "@/components/ritual-ui";
import { C } from "@/constants/ritual-theme";
import { replaceAppRoute } from "@/navigation/route-actions";
import {
  ALARM_DAYS,
  AlarmDayId,
  AlarmCapabilityStatus,
  getNativeAlarmConfig,
  getAlarmCapabilityStatus,
  openAutoStartSettings,
  openBatterySettings,
  openExactAlarmSettings,
  openFullScreenIntentSettings,
  openNotificationChannelSettings,
  openNotificationSettings,
  openOemPermissionSettings,
  scheduleRecurringAlarm,
  scheduleTestAlarm,
  SettingsDestination,
} from "@/services/alarm";
import { alarmDeviceProfile } from "@/services/alarm-device";
import { useRitual } from "@/state/ritual-store";
import { useContent } from "@/state/content-store";

type ModeKey = "gita" | "shankh" | "pranayama";

const modes: {
  key: ModeKey;
  title: string;
  description: string;
  Icon: typeof Flame;
  iconColor: string;
  tone: string;
}[] = [
  {
    key: "gita",
    title: "Gita Awakening",
    description: "Morning shloka chant seamlessly blended with bamboo bansuri",
    Icon: Flame,
    iconColor: C.saffron,
    tone: "Raag Bhairav & Sacred Flute",
  },
  {
    key: "shankh",
    title: "Gentle Shankh & Chants",
    description:
      "Vedic resonance, deep conch overtone, and subtle tanpura drone",
    Icon: BellRing,
    iconColor: C.goldDark,
    tone: "Gentle Shankh & Chants",
  },
  {
    key: "pranayama",
    title: "Pranayama First",
    description:
      "Three gentle brass chimes transitioning into guided rhythmic breath",
    Icon: Wind,
    iconColor: C.greenDark,
    tone: "Pranayama First",
  },
];

const OEM_CONFIRMED_KEY = "morning-ritual:phone-confirmations-v2";

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function parseAlarm(value: string) {
  const [h = "06", m = "30"] = value.split(":");
  const hour24 = Number(h);
  return {
    hour: hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24,
    minute: Number(m),
    meridiem: hour24 >= 12 ? "PM" : "AM",
  };
}

function toStoreTime(hour: number, minute: number, meridiem: "AM" | "PM") {
  let h = hour % 12;
  if (meridiem === "PM") {
    h += 12;
  }
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function getAlarmCountdownText(
  hour: number,
  minute: number,
  meridiem: "AM" | "PM",
  days: { id: AlarmDayId; selected: boolean }[],
  language: AppLanguage,
): string {
  const now = new Date();
  let targetHour = hour % 12;
  if (meridiem === "PM") targetHour += 12;
  const targetMinute = minute;

  const selectedDayIds = days.filter((d) => d.selected).map((d) => d.id);

  const dayIdToJsDay: Record<AlarmDayId, number> = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  };

  if (selectedDayIds.length === 0) {
    const nextDate = new Date(now);
    nextDate.setHours(targetHour, targetMinute, 0, 0);
    if (nextDate.getTime() <= now.getTime()) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    const diffMs = nextDate.getTime() - now.getTime();
    return formatDiff(diffMs, language);
  }

  const selectedJsDays = selectedDayIds.map((id) => dayIdToJsDay[id]);
  let minDiffMs = Infinity;

  // Check today and upcoming days (up to 7 days)
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(targetHour, targetMinute, 0, 0);

    const candidateJsDay = candidate.getDay();
    if (selectedJsDays.includes(candidateJsDay)) {
      const diffMs = candidate.getTime() - now.getTime();
      if (diffMs > 0 && diffMs < minDiffMs) {
        minDiffMs = diffMs;
        break;
      }
    }
  }

  if (minDiffMs === Infinity) {
    for (let offset = 8; offset <= 14; offset++) {
      const candidate = new Date(now);
      candidate.setDate(now.getDate() + offset);
      candidate.setHours(targetHour, targetMinute, 0, 0);
      const candidateJsDay = candidate.getDay();
      if (selectedJsDays.includes(candidateJsDay)) {
        minDiffMs = candidate.getTime() - now.getTime();
        break;
      }
    }
  }

  if (minDiffMs === Infinity || isNaN(minDiffMs)) return translate("Alarm not scheduled", undefined, language);
  return formatDiff(minDiffMs, language);
}

function formatDiff(diffMs: number, language: AppLanguage): string {
  const totalMinutes = Math.ceil(diffMs / 60000);
  if (totalMinutes <= 0) return translate("Alarm rings in less than a minute", undefined, language);

  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(translate('daysCount', { count: days }, language));
  if (hours > 0) parts.push(translate('hoursCount', { count: hours }, language));
  if (minutes > 0 || parts.length === 0) parts.push(translate('minutesCount', { count: minutes }, language));

  return translate('alarmIn', { duration: parts.join(' ') }, language);
}

function ReadinessRow({
  label,
  ready,
  onPress,
  status,
}: {
  label: string;
  ready: boolean;
  onPress: () => void | Promise<void>;
  status?: string;
}) {
  const { t: translate, text: translateText } = useLanguage();
  return (
    <View style={s.readinessRow}>
      <View style={s.readinessRowLeft}>
        <View style={[s.readinessStatus, ready && s.readinessStatusReady]}>
          {ready ? <Check size={13} color={C.white} strokeWidth={3} /> : null}
        </View>
        <View style={s.readinessTextGroup}>
          <TextR style={s.readinessLabel} numberOfLines={2}>
            {label}
          </TextR>
          <TextR style={[s.readinessSubStatus, ready && s.readinessSubStatusReady]}>
            {status ?? (ready ? translate("Verified") : translate("Needs action"))}
          </TextR>
        </View>
      </View>
      <Pressable
        accessibilityHint={translate('androidSettingsFor', { label })}
        accessibilityLabel={translateText(`${ready ? translate("Review") : translate("Set up")} ${label}`)}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [s.settingsButton, pressed && s.pressed]}
      >
        <TextR style={s.settingsButtonText}>{ready ? translate("Review") : translate("Open settings")}</TextR>
      </Pressable>
    </View>
  );
}

export default function Setup() {
  const { t: translate } = useLanguage();
  const { alarmReady } = useRitual();
  if (!alarmReady) {
    return (
      <Screen>
        <View style={s.loadingState}>
          <TextR style={s.caption}>{translate("Loading your alarm…")}</TextR>
        </View>
      </Screen>
    );
  }
  return <SetupContent />;
}

function SetupContent() {
  const { language, t: translate, text: translateText } = useLanguage();
  const navigation = useNavigation("/");
  const { width } = useWindowDimensions();
  const isSmall = width < 360;

  const {
    alarmTime,
    setAlarmTime,
    alarmTone,
    setAlarmTone,
    alarmDays,
    setAlarmDays,
    setAlarmEnabled,
  } = useRitual();
  const parsed = useMemo(() => parseAlarm(alarmTime), [alarmTime]);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [meridiem, setMeridiem] = useState<"AM" | "PM">(
    parsed.meridiem as "AM" | "PM",
  );
  const [days, setDays] = useState(
    ALARM_DAYS.map((day) => ({
      ...day,
      selected: alarmDays.includes(day.id),
    })),
  );
  const [mode, setMode] = useState<ModeKey>(
    modes.find((item) => item.tone === alarmTone)?.key ?? "gita",
  );
  const [gradual] = useState(true);
  const [haptics] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [capabilities, setCapabilities] = useState<AlarmCapabilityStatus | null>(null);
  const [confirmations, setConfirmations] = useState<Record<string, boolean>>({});
  const [extraExpanded, setExtraExpanded] = useState(false);
  const [testing, setTesting] = useState(false);
  const [readinessExpanded, setReadinessExpanded] = useState(false);
  const [readinessMessage, setReadinessMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const [ticker, setTicker] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTicker((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const countdownText = useMemo(
    () => getAlarmCountdownText(hour, minute, meridiem, days, language),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hour, minute, meridiem, days, ticker, language]
  );

  const refreshCapabilities = useCallback(async () => {
    try {
      const next = await getAlarmCapabilityStatus();
      setCapabilities(next);
      if (!next.notifications || !next.exactAlarm || !next.notificationChannelReady) setReadinessExpanded(true);
      return next;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      getNativeAlarmConfig().catch(() => null),
      getAlarmCapabilityStatus().catch(() => null),
      AsyncStorage.getItem(OEM_CONFIRMED_KEY).catch(() => null),
    ]).then(([config, status, oemValue]) => {
      if (!active) return;
      setCapabilities(status);
      try { setConfirmations(JSON.parse(oemValue ?? "{}")); } catch { setConfirmations({}); }
      if (status) {
        const ready = status.notifications && status.exactAlarm &&
          status.notificationChannelReady;
        setReadinessExpanded(!ready);
      }
      setInitializing(false);
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshCapabilities();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [refreshCapabilities]);

  const selectedMode = modes.find((item) => item.key === mode) ?? modes[0];
  const { refresh: refreshContent } = useContent();

  const coreReadiness = capabilities
    ? [
        capabilities.notifications,
        capabilities.exactAlarm,
        capabilities.notificationChannelReady,
      ]
    : [];
  const coreReadyCount = coreReadiness.filter(Boolean).length;
  const coreReady = coreReadiness.length === 3 && coreReadyCount === 3;

  const updateMeridiem = (next: "AM" | "PM") => {
    setMeridiem(next);
  };

  const save = async () => {
    if (saving || initializing) return;
    const selectedDayIds = days
      .filter((day) => day.selected)
      .map((day) => day.id as AlarmDayId);
    if (!selectedDayIds.length) {
      Alert.alert(translate("Choose alarm days"), translate("Select at least one day of the week."));
      return;
    }

    const time = toStoreTime(hour, minute, meridiem);
    setSaving(true);
    setSaveError("");
    setReadinessMessage("");
    try {
      const result = await scheduleRecurringAlarm({
        time,
        tone: selectedMode.tone,
        days: selectedDayIds,
        gradualVolume: gradual,
        vibration: haptics,
      });
      setAlarmTone(selectedMode.tone);
      setAlarmTime(time);
      setAlarmDays(selectedDayIds);
      setAlarmEnabled(true);
      void refreshContent().catch(() => undefined);
      setCapabilities(result.capabilities);
      const resultCoreReady = result.scheduled && result.capabilities.notifications &&
        result.capabilities.exactAlarm &&
        result.capabilities.notificationChannelReady;
      if (!resultCoreReady) {
        setReadinessExpanded(true);
        setReadinessMessage("Alarm saved. Complete the highlighted Android setting so it can ring reliably.");
        return;
      }
      setReadinessMessage("");
      Alert.alert(translate("Alarm scheduled"), `${!result.capabilities.fullScreenIntent ? translate('Full-screen access is off. Use the alarm notification to open or stop it.') + '\n' : ''}${translate('alarmSavedTime', { days: recurrenceLabel, time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${meridiem}` })}`);
      replaceAppRoute(navigation, "/");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : translate("The alarm could not be saved. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const profile = alarmDeviceProfile(capabilities?.manufacturer ?? "");
  const openSettings = async (open: () => Promise<SettingsDestination | undefined>) => {
    try {
      const result = await open();
      setReadinessMessage(result ? translate('openedSettings', { destination: translateText(result.destination) }) + (result.fallback ? ' ' + translate('manualInstructions') : '') : 'Android native settings are unavailable in this build.');
    } catch (error) { setReadinessMessage(error instanceof Error ? error.message : translate("Open Settings manually and select this app.")); }
  };
  const testAlarm = async () => {
    if (testing) return;
    setTesting(true);
    try {
      await scheduleTestAlarm();
      setReadinessMessage("Test alarm scheduled in 30 seconds. Lock your screen to check presentation. It stops after 30 seconds and keeps your saved alarm.");
    } catch (error) { setReadinessMessage(error instanceof Error ? error.message : translate("Test could not be scheduled.")); }
    finally { setTesting(false); }
  };

  const selectedDays = days.filter((day) => day.selected);
  const recurrenceLabel =
    selectedDays.length === 6 && !days[6].selected
      ? translate("Mon - Sat")
      : selectedDays.length === 7
        ? translate("Every day")
        : translate('daysCount', { count: selectedDays.length });

  return (
    <Screen>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Pressable
            accessibilityLabel={translate("Go back")}
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [s.backButton, pressed && s.pressed]}
          >
            <ArrowLeft size={27} color={C.ink} strokeWidth={2.2} />
          </Pressable>
          <View style={s.logoContainer}>
            <Image source={MORNING_RITUAL_LOGO} style={s.logo} />
          </View>
          <TextR style={[s.headerTitle, isSmall && s.headerTitleSmall]}>{translate("Set Alarm")}</TextR>
        </View>
      </View>

      <View style={s.sectionTop}>
        <View style={s.sectionTitleRow}>
          <View style={[s.sectionIcon, isSmall && s.sectionIconSmall]}>
            <AlarmClockPlus size={isSmall ? 19 : 22} color={C.saffron} strokeWidth={2.2} />
          </View>
          <TextR style={[s.mainTitle, isSmall && s.mainTitleSmall]}>{translate("Sacred Timing")}</TextR>
        </View>
        <Pressable
          accessibilityLabel={translate("Save alarm")}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving || initializing, busy: saving }}
          disabled={saving || initializing}
          onPress={save}
          style={({ pressed }) => [
            s.saveChip,
            (saving || initializing) && s.buttonDisabled,
            pressed && s.pressed,
          ]}
        >
          <TextR style={[s.saveText, isSmall && s.saveTextSmall]}>
            {saving ? translate("Saving…") : initializing ? translate("Loading…") : translate("Save")}
          </TextR>
        </Pressable>
      </View>

      <View style={[s.timeCard, isSmall && s.timeCardSmall]}>
        <View style={s.windowTitle}>
          <Sun size={18} color={C.goldDark} />
          <TextR style={s.windowText}>{translate("Wake-up time")}</TextR>
        </View>

        {/* Smooth Scrollable Wheel Picker */}
        <View style={s.timePicker}>
          <SmoothWheelColumn
            data={HOURS}
            value={hour}
            onChange={setHour}
            padZero
            isSmall={isSmall}
          />
          <TextR serif style={[s.colon, isSmall && s.colonSmall]}>
            :
          </TextR>
          <SmoothWheelColumn
            data={MINUTES}
            value={minute}
            onChange={setMinute}
            padZero
            isSmall={isSmall}
          />
          <View style={[s.meridiemTrack, isSmall && s.meridiemTrackSmall]}>
            {(["AM", "PM"] as const).map((value) => {
              const active = meridiem === value;
              return (
                <Pressable
                  accessibilityLabel={translate('alarmTimePeriod', { value })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  key={value}
                  onPress={() => updateMeridiem(value)}
                  style={({ pressed }) => [
                    s.meridiemButton,
                    isSmall && s.meridiemButtonSmall,
                    active && s.meridiemActive,
                    pressed && s.pressed,
                  ]}
                >
                  <TextR
                    style={[s.meridiemText, isSmall && s.meridiemTextSmall, active && s.meridiemActiveText]}
                  >
                    {value}
                  </TextR>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Dynamic Alarm Countdown Pill */}
        <View style={s.countdownBadge}>
          <BellRing size={14} color={C.saffron} strokeWidth={2.4} />
          <TextR style={[s.countdownText, isSmall && s.countdownTextSmall]}>
            {countdownText}
          </TextR>
        </View>
      </View>

      <View style={s.recurrenceHeader}>
        <TextR style={[s.label, isSmall && s.labelSmall]}>{translate("Weekly Recurrence")}</TextR>
        <TextR style={[s.recurrenceValue, isSmall && s.recurrenceValueSmall]}>{recurrenceLabel}</TextR>
      </View>
      <View style={s.weekRow}>
        {days.map((day) => (
          <Pressable
            accessibilityLabel={`${translate(({ mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" } as const)[day.id])}, ${day.selected ? translate("selected") : translate("not selected")}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: day.selected }}
            key={day.id}
            onPress={() =>
              setDays((items) =>
                items.map((item) =>
                  item.id === day.id
                    ? { ...item, selected: !item.selected }
                    : item,
                ),
              )
            }
            style={({ pressed }) => [
              s.dayChip,
              day.selected && s.daySelected,
              pressed && s.dayPressed,
            ]}
          >
            <TextR style={[s.dayText, isSmall && s.dayTextSmall, day.selected && s.dayTextSelected]}>
              {translate(({ mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" } as const)[day.id])}
            </TextR>
          </Pressable>
        ))}
      </View>

      <View style={s.readinessCard}>
        <Pressable
          accessibilityLabel={`${translate('Alarm readiness')}, ${initializing ? translate('checking') : coreReady ? translate('ready') : translate('requirementsReady', { count: coreReadyCount })}`}
          accessibilityRole="button"
          accessibilityState={{ expanded: readinessExpanded }}
          onPress={() => setReadinessExpanded((value) => !value)}
          style={({ pressed }) => [s.readinessSummary, pressed && s.pressed]}
        >
          <View style={[s.readinessSummaryIcon, coreReady && s.readinessSummaryIconReady]}>
            {coreReady ? (
              <ShieldCheck size={20} color={C.white} strokeWidth={2.5} />
            ) : (
              <AlarmClockPlus size={20} color={C.saffron} strokeWidth={2.3} />
            )}
          </View>
          <View style={s.readinessSummaryCopy}>
            <TextR style={[s.readinessTitle, isSmall && s.readinessTitleSmall]}>{translate("Alarm readiness")}</TextR>
            <TextR style={s.readinessSummaryText}>
              {initializing
                ? translate("Checking Android settings…")
                : coreReady
                  ? translate("Required Android access verified")
                  : translate('requirementsReady', { count: coreReadyCount })}
            </TextR>
          </View>
          {readinessExpanded ? (
            <ChevronUp size={20} color={C.muted} />
          ) : (
            <ChevronDown size={20} color={C.muted} />
          )}
        </Pressable>
        {readinessMessage ? <TextR style={s.readinessWarning}>{translateText(readinessMessage)}</TextR> : null}
        {saveError ? <TextR accessibilityRole="alert" style={s.saveError}>{translateText(saveError)}</TextR> : null}
        {readinessExpanded ? (
          <View style={s.readinessDetails}>
            <TextR style={s.readinessIntro}>
               {translate("Notifications and exact-alarm access are required. Full-screen access is optional; Android controls when an alarm screen appears.")} </TextR>
            <ReadinessRow label={translate("Alarm notifications")} ready={capabilities?.notifications ?? false} onPress={() => openSettings(openNotificationSettings)} />
            <ReadinessRow status={capabilities && capabilities.sdkInt < 31 ? translate("Not applicable") : undefined} label={translate("Alarms & reminders")} ready={capabilities?.exactAlarm ?? false} onPress={() => openSettings(openExactAlarmSettings)} />
            <ReadinessRow label={translate("High-priority alarm channel")} ready={capabilities?.notificationChannelReady ?? false} onPress={() => openSettings(openNotificationChannelSettings)} />
            <ReadinessRow status={capabilities && capabilities.sdkInt < 34 ? translate("Not applicable") : undefined} label={translate("Full-screen alarms (optional)")} ready={capabilities?.fullScreenIntent ?? false} onPress={() => openSettings(openFullScreenIntentSettings)} />
            {!capabilities?.fullScreenIntent ? <TextR style={s.readinessIntro}>{translate("Without full-screen access, use the alarm notification to open or stop the alarm.")}</TextR> : null}
            <TextR style={s.readinessFootnote}>
               {translate("A force-stopped app or powered-off phone cannot ring. Without full-screen access, Android shows a persistent alarm notification.")} </TextR>
          </View>
        ) : null}
        <View style={s.reliabilitySection}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: extraExpanded }}
            onPress={() => setExtraExpanded(value => !value)}
            style={({ pressed }) => [s.reliabilitySummary, pressed && s.pressed]}
          >
            <TextR style={[s.readinessTitle, isSmall && s.readinessTitleSmall]}>{translate("Extra reliability on your phone")}</TextR>
            {extraExpanded ? <ChevronUp size={20} color={C.muted} /> : <ChevronDown size={20} color={C.muted} />}
          </Pressable>
          {extraExpanded ? <View style={s.readinessDetails}>
            <TextR style={s.oemTitle}>{profile.name}</TextR>
            <ReadinessRow label={translate("Background activity allowed")} ready={capabilities != null && !capabilities.batteryRestricted} status={capabilities && capabilities.sdkInt < 28 ? translate("Not applicable") : undefined} onPress={() => openSettings(openBatterySettings)} />
            <ReadinessRow label={translate("Battery optimization exemption")} ready={capabilities?.batteryOptimizationExempt ?? false} onPress={() => openSettings(openBatterySettings)} />
            <TextR style={s.readinessIntro}>{translate("These checks are separate. Battery exemption is advisory and does not verify your phone’s custom settings. Menu names vary by software version.")}</TextR>
            {profile.steps.map(step => {
              const key = `${profile.id}:${step.id}`;
              const confirmed = confirmations[key] === true;
              return <View key={key}>
                <ReadinessRow label={translateText(step.label)} ready={confirmed} status={confirmed ? translate("User confirmed") : translate("Needs action")} onPress={() => openSettings(step.settings === "battery" ? openBatterySettings : step.settings === "autostart" ? openAutoStartSettings : openOemPermissionSettings)} />
                <TextR style={s.readinessIntro}>{translateText(step.guidance)}</TextR>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} onPress={async () => {
                  const next = { ...confirmations, [key]: !confirmed };
                  setConfirmations(next);
                  try { await AsyncStorage.setItem(OEM_CONFIRMED_KEY, JSON.stringify(next)); } catch { setReadinessMessage("Confirmation could not be saved. Try again."); }
                }} style={s.confirmOem}><TextR style={s.confirmOemText}>{confirmed ? translate("✓ User confirmed") : translate("I checked this setting")}</TextR></Pressable>
              </View>;
            })}
          </View> : null}
          <Pressable
            accessibilityRole="button"
            disabled={testing || initializing}
            onPress={testAlarm}
            style={({ pressed }) => [s.testAlarmRow, pressed && s.pressed, (testing || initializing) && s.buttonDisabled]}
          >
            <TextR style={s.settingsButtonText}>{testing ? translate("Scheduling…") : translate("Test alarm in 30 seconds")}</TextR>
          </Pressable>
        </View>
      </View>

      <View style={s.modeHeader}>
        <View style={s.modeHeaderLeft}>
          <TextR style={[s.label, isSmall && s.labelSmall]}>{translate("Morning Awakening Mode")}</TextR>
          <TextR style={[s.caption, isSmall && s.captionSmall]}>{translate("Selected devotional flow upon waking")}</TextR>
        </View>
        <Leaf size={isSmall ? 20 : 23} color={C.goldDark} />
      </View>

      <View style={s.modeList}>
        {modes.map((item) => (
          <ModeCard
            key={item.key}
            active={mode === item.key}
            item={item}
            isSmall={isSmall}
            onPress={() => {
              setMode(item.key);
            }}
          />
        ))}
      </View>

      <Pressable
        accessibilityLabel={translate("Save alarm and morning ritual")}
        accessibilityRole="button"
        accessibilityState={{ disabled: saving || initializing, busy: saving }}
        disabled={saving || initializing}
        onPress={save}
        style={({ pressed }) => [
          s.primaryButton,
          isSmall && s.primaryButtonSmall,
          (saving || initializing) && s.buttonDisabled,
          pressed && s.primaryPressed,
        ]}
      >
        <Sun size={isSmall ? 20 : 23} color={C.white} />
        <TextR style={[s.primaryText, isSmall && s.primaryTextSmall]}>
          {saving ? translate("Scheduling Alarm…") : initializing ? translate("Checking Alarm…") : translate("Save Alarm & Morning Ritual")}
        </TextR>
      </Pressable>
    </Screen>
  );
}

function SmoothWheelColumn({
  data,
  value,
  onChange,
  padZero = true,
  isSmall,
}: {
  data: number[];
  value: number;
  onChange: (val: number) => void;
  padZero?: boolean;
  isSmall?: boolean;
}) {

  const itemHeight = isSmall ? 48 : 54;
  const scrollViewRef = useRef<ScrollView>(null);
  const isUserInteractingRef = useRef(false);
  const lastReportedValueRef = useRef(value);
  const hasMountedRef = useRef(false);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external changes ONLY (e.g., initial load or external preset reset)
  useEffect(() => {
    if (value !== lastReportedValueRef.current) {
      lastReportedValueRef.current = value;
      if (!isUserInteractingRef.current) {
        const idx = data.indexOf(value);
        if (idx >= 0) {
          scrollViewRef.current?.scrollTo({
            y: idx * itemHeight,
            animated: true,
          });
        }
      }
    }
  }, [value, data, itemHeight]);

  const settleToIndex = useCallback(
    (offsetY: number, animateSnap = true) => {
      const idx = Math.round(offsetY / itemHeight);
      const clamped = Math.max(0, Math.min(data.length - 1, idx));
      const targetY = clamped * itemHeight;

      if (animateSnap && Math.abs(offsetY - targetY) > 0.5) {
        scrollViewRef.current?.scrollTo({
          y: targetY,
          animated: true,
        });
      }

      const selectedItem = data[clamped];
      if (selectedItem !== lastReportedValueRef.current) {
        lastReportedValueRef.current = selectedItem;
        onChange(selectedItem);
      }

      if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 120);
    },
    [data, itemHeight, onChange]
  );

  const handleScrollBeginDrag = useCallback(() => {
    isUserInteractingRef.current = true;
    if (settleTimeoutRef.current) {
      clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = null;
    }
  }, []);

  const handleScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const velocityY = Math.abs(e.nativeEvent.velocity?.y ?? 0);
      // Settle immediately only if drag ended with practically zero momentum velocity
      if (velocityY < 0.1) {
        settleToIndex(e.nativeEvent.contentOffset.y, true);
      }
    },
    [settleToIndex]
  );

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      settleToIndex(e.nativeEvent.contentOffset.y, false);
    },
    [settleToIndex]
  );

  const handleLayout = useCallback(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      const idx = data.indexOf(value);
      if (idx >= 0) {
        scrollViewRef.current?.scrollTo({
          y: idx * itemHeight,
          animated: false,
        });
      }
    }
  }, [data, itemHeight, value]);

  const handleItemPress = useCallback(
    (idx: number, item: number) => {
      isUserInteractingRef.current = true;
      scrollViewRef.current?.scrollTo({
        y: idx * itemHeight,
        animated: true,
      });
      if (item !== lastReportedValueRef.current) {
        lastReportedValueRef.current = item;
        onChange(item);
      }
      if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 150);
    },
    [itemHeight, onChange]
  );

  return (
    <View
      style={[
        s.wheelColumnWrapper,
        { height: itemHeight * 3 },
        isSmall && s.wheelColumnWrapperSmall,
      ]}
    >
      {/* Center Selection Lens Bracket */}
      <View
        style={[s.wheelLens, { top: itemHeight, height: itemHeight }]}
        pointerEvents="none"
      />

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        snapToAlignment="center"
        decelerationRate="fast"
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
        bounces={false}
        overScrollMode="never"
        onLayout={handleLayout}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        contentOffset={{ x: 0, y: Math.max(0, data.indexOf(value)) * itemHeight }}
      >
        <View style={{ height: itemHeight }} />
        {data.map((item, idx) => {
          const isSelected = item === value;
          return (
            <Pressable
              key={item}
              onPress={() => handleItemPress(idx, item)}
              style={[s.wheelItem, { height: itemHeight }]}
            >
              <TextR
                serif
                style={[
                  s.wheelItemText,
                  isSmall && s.wheelItemTextSmall,
                  isSelected && s.wheelItemTextSelected,
                ]}
              >
                {padZero ? String(item).padStart(2, "0") : String(item)}
              </TextR>
            </Pressable>
          );
        })}
        <View style={{ height: itemHeight }} />
      </ScrollView>
    </View>
  );
}

function ModeCard({
  active,
  item,
  onPress,
  isSmall,
}: {
  active: boolean;
  item: (typeof modes)[number];
  onPress: () => void;
  isSmall?: boolean;
}) {
  const { t: translate, text: translateText } = useLanguage();
  const Icon = item.Icon;

  return (
    <Pressable
      accessibilityLabel={`${translateText(item.title)}. ${translateText(item.description)}`}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        s.modeCard,
        isSmall && s.modeCardSmall,
        active ? s.modeCardActive : s.modeCardRest,
        pressed && s.pressed,
      ]}
    >
      <View style={[s.modeIcon, isSmall && s.modeIconSmall, active ? s.modeIconActive : s.modeIconRest]}>
        <Icon
          size={isSmall ? 22 : 25}
          color={active ? C.white : item.iconColor}
          fill={active && item.key === "gita" ? C.white : "transparent"}
        />
      </View>
      <View style={s.modeBody}>
        <View style={s.modeTitleLine}>
          <TextR style={[s.modeTitle, isSmall && s.modeTitleSmall]}>{translateText(item.title)}</TextR>
          {active && (
            <View style={s.activePill}>
              <TextR style={s.activePillText}>{translate("Active")}</TextR>
            </View>
          )}
        </View>
        <TextR style={[s.modeDescription, isSmall && s.modeDescriptionSmall]}>{translateText(item.description)}</TextR>
      </View>
      <View style={[s.radio, active && s.radioActive]}>
        {active ? (
          <Check size={16} color={C.white} strokeWidth={3} />
        ) : (
          <View style={s.radioDot} />
        )}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  readinessCard: {
    marginBottom: 24,
    borderRadius: 22,
    backgroundColor: "rgba(255,249,242,0.96)",
    borderWidth: 1,
    borderColor: "#F0DCCB",
    overflow: "hidden",
  },
  readinessTitle: { color: C.ink, fontSize: 17, fontWeight: "800" },
  readinessTitleSmall: { fontSize: 15 },
  readinessSummary: {
    minHeight: 74,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  readinessSummaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBE6D8",
  },
  readinessSummaryIconReady: { backgroundColor: C.greenDark },
  readinessSummaryCopy: { flex: 1, marginHorizontal: 12, minWidth: 0 },
  readinessSummaryText: { color: "#6B574B", fontSize: 12, lineHeight: 17, marginTop: 2 },
  readinessDetails: { paddingHorizontal: 16, paddingBottom: 14 },
  reliabilitySection: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E8D6C8" },
  reliabilitySummary: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  testAlarmRow: {
    minHeight: 50,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E8D6C8",
  },
  readinessIntro: { color: "#6B574B", fontSize: 12, lineHeight: 18, marginBottom: 10 },
  readinessWarning: {
    color: "#8B451D",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#FCE8D8",
  },
  saveError: {
    color: "#9C2F20",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#FBE3DF",
  },
  readinessRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E8D6C8",
    paddingVertical: 8,
  },
  readinessRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  readinessStatus: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#B99E8D",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  readinessStatusReady: { backgroundColor: C.greenDark, borderColor: C.greenDark },
  readinessTextGroup: {
    marginLeft: 10,
    flex: 1,
    minWidth: 0,
  },
  readinessLabel: {
    color: C.ink,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  readinessSubStatus: {
    color: "#9C5430",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  readinessSubStatusReady: {
    color: C.greenDark,
  },
  settingsButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(235, 120, 60, 0.08)",
    flexShrink: 0,
  },
  settingsButtonText: { color: C.saffron, fontSize: 12, fontWeight: "800" },
  confirmOem: { alignSelf: "flex-start", marginTop: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: "#FDE8D8" },
  confirmOemText: { color: "#7C4B2C", fontSize: 12, fontWeight: "800" },
  oemTitle: { color: C.ink, fontSize: 13, fontWeight: "900", marginTop: 14, marginBottom: 2 },
  readinessFootnote: { color: "#7C675B", fontSize: 10.5, lineHeight: 15, marginTop: 10 },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    height: 64,
    marginHorizontal: -4,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  backButton: {
    height: 44,
    width: 44,
    marginLeft: -8,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    shadowColor: C.saffron,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    resizeMode: "cover",
  },
  headerTitle: {
    marginLeft: 14,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  headerTitleSmall: {
    fontSize: 22,
    marginLeft: 10,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  sectionTop: {
    marginTop: 2,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.sand,
  },
  sectionIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  mainTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  mainTitleSmall: {
    fontSize: 22,
    lineHeight: 28,
  },
  saveChip: {
    minWidth: 76,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD8CA",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(180, 80, 30, 0.3)",
    borderBottomWidth: 2,
    shadowColor: C.saffron,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  saveText: {
    color: C.ink,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  saveTextSmall: {
    fontSize: 14,
  },
  buttonDisabled: { opacity: 0.55 },
  timeCard: {
    minHeight: 236,
    borderRadius: 28,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255, 252, 248, 0.98)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(216, 144, 64, 0.35)",
    borderBottomWidth: 3,
    shadowColor: "#8C4010",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  timeCardSmall: {
    minHeight: 206,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 14,
    borderRadius: 22,
  },
  windowTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  windowText: {
    fontSize: 15,
    lineHeight: 22,
    color: C.inkSoft,
    fontWeight: "500",
  },
  timePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  wheelColumnWrapper: {
    width: 82,
    position: "relative",
    overflow: "hidden",
    justifyContent: "center",
  },
  wheelColumnWrapperSmall: {
    width: 66,
  },
  wheelLens: {
    position: "absolute",
    left: 2,
    right: 2,
    borderRadius: 14,
    backgroundColor: "rgba(235, 120, 60, 0.08)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(216, 144, 64, 0.25)",
  },
  wheelItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  wheelItemText: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "300",
    color: C.mutedSoft,
    opacity: 0.4,
    letterSpacing: -0.5,
  },
  wheelItemTextSmall: {
    fontSize: 22,
    lineHeight: 28,
  },
  wheelItemTextSelected: {
    fontSize: 48,
    lineHeight: 54,
    fontWeight: "300",
    color: C.ink,
    opacity: 1,
    letterSpacing: -1.8,
  },
  colon: {
    marginHorizontal: 4,
    fontSize: 44,
    lineHeight: 52,
    color: "rgba(168,71,12,0.67)",
    fontWeight: "300",
    alignSelf: "center",
  },
  colonSmall: {
    fontSize: 34,
    lineHeight: 42,
    marginHorizontal: 1,
  },
  meridiemTrack: {
    marginLeft: 10,
    padding: 4,
    borderRadius: 24,
    backgroundColor: "rgba(255,248,245,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  meridiemTrackSmall: {
    marginLeft: 6,
    padding: 3,
  },
  meridiemButton: {
    minWidth: 44,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  meridiemButtonSmall: {
    minWidth: 36,
    height: 30,
    borderRadius: 15,
  },
  meridiemActive: {
    backgroundColor: C.primary,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    borderTopColor: "#FFFFFF",
    shadowColor: C.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  meridiemText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.6,
    color: C.muted,
  },
  meridiemTextSmall: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  meridiemActiveText: {
    color: C.white,
  },
  countdownBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(235, 120, 60, 0.09)",
    borderWidth: 1,
    borderColor: "rgba(235, 120, 60, 0.18)",
  },
  countdownText: {
    color: "#9C4215",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  countdownTextSmall: {
    fontSize: 11.5,
  },
  recurrenceHeader: {
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  labelSmall: {
    fontSize: 17,
    lineHeight: 22,
  },
  recurrenceValue: {
    color: C.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  recurrenceValueSmall: {
    fontSize: 13,
  },
  weekRow: {
    marginBottom: 24,
    flexDirection: "row",
    flexWrap: 'wrap',
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  dayChip: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCEADD",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(180, 120, 80, 0.25)",
    borderBottomWidth: 2,
    shadowColor: "#8C4010",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  daySelected: {
    backgroundColor: C.primary,
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(140, 45, 5, 0.45)",
    borderBottomWidth: 3,
    shadowColor: C.primary,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  dayPressed: {
    transform: [{ scale: 0.93 }],
  },
  dayText: {
    color: C.inkSoft,
    fontSize: 16,
    fontWeight: "900",
  },
  dayTextSmall: {
    fontSize: 13,
  },
  dayTextSelected: {
    color: C.white,
  },
  modeHeader: {
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modeHeaderLeft: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  caption: {
    marginTop: 3,
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  captionSmall: {
    fontSize: 12,
    lineHeight: 17,
  },
  modeList: {
    gap: 12,
    marginBottom: 24,
  },
  modeCard: {
    minHeight: 100,
    borderRadius: 26,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderTopColor: "#FFFFFF",
  },
  modeCardSmall: {
    minHeight: 88,
    padding: 12,
    borderRadius: 20,
  },
  modeCardActive: {
    backgroundColor: "#FDE4D5",
    borderBottomColor: "rgba(195, 100, 45, 0.35)",
    borderBottomWidth: 3,
    shadowColor: "#C97544",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  modeCardRest: {
    backgroundColor: "#FFF0E8",
    borderBottomColor: "rgba(215, 170, 140, 0.25)",
    borderBottomWidth: 2,
    shadowColor: "#8C4010",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  modeIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  modeIconActive: {
    backgroundColor: C.saffron,
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(120, 35, 0, 0.4)",
    borderBottomWidth: 2,
    shadowColor: C.saffron,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  modeIconRest: {
    backgroundColor: "#F8DFCA",
  },
  modeBody: {
    flex: 1,
    paddingRight: 8,
    minWidth: 0,
  },
  modeTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  modeTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    letterSpacing: 0.1,
  },
  modeTitleSmall: {
    fontSize: 15,
    lineHeight: 19,
  },
  activePill: {
    paddingHorizontal: 10,
    height: 23,
    borderRadius: 12,
    justifyContent: "center",
    backgroundColor: "#FFD8CA",
  },
  activePillText: {
    color: C.ink,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  modeDescription: {
    marginTop: 4,
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  modeDescriptionSmall: {
    fontSize: 12,
    lineHeight: 17,
  },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FBE6D8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D6BAAA",
  },
  radioActive: {
    backgroundColor: C.primary,
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderTopColor: "#FFFFFF",
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  primaryButton: {
    minHeight: 62,
    borderRadius: 31,
    marginBottom: 10,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.saffron,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(160, 50, 10, 0.4)",
    borderBottomWidth: 3,
    shadowColor: C.saffron,
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  primaryButtonSmall: {
    minHeight: 54,
    borderRadius: 27,
    paddingHorizontal: 14,
  },
  primaryPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  primaryText: {
    color: C.white,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.1,
  },
  primaryTextSmall: {
    fontSize: 15,
  },
});
