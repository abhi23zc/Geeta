import { Image } from 'expo-image';
import { localDateKey } from '@/data/gita-verses';
import { prepareAlarmImage } from '@/services/content-cache';
import { useLanguage } from '@/i18n/provider';
import { useNavigation } from "expo-router";
import {
  Leaf,
  Sun,
  Sunrise,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  AppState,
  BackHandler,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { AruMascot } from "@/components/aru-mascot";
import { Interactive3DCard } from "@/components/interactive-3d-card";
import { Screen, TextR } from "@/components/ritual-ui";
import { C } from "@/constants/ritual-theme";
import { replaceAppRoute } from "@/navigation/route-actions";
import {
  addAlarmSnoozeRequestedListener,
  addAlarmStoppedListener,
  addAlarmTriggeredListener,
  startMyDay,
  snoozeAlarm,
  getAlarmPlaybackState,
  getAlarmPresentationState,
  notifyWakeScreenReady,
  type AlarmPlaybackState,
} from "@/services/alarm";
import * as Haptics from "expo-haptics";
import { useContent } from "@/state/content-store";
import { formatWakeClock, wakeHeading, showScheduledAlarm } from "@/features/alarm/wake-presentation";

const HOLD_DURATION_MS = 1500;

export default function Wake() {
  const { t: translate, formatDate } = useLanguage();
  const navigation = useNavigation("/");
  const { width, height, fontScale } = useWindowDimensions();
  const isSmall = width < 360;
  const isTablet = width >= 768;
  const isCompact = height < 750;

  const { practice, ready: contentReady } = useContent();
  // Pin the first cache-ready teaching for this screen's lifetime.
  const [capturedVerse, setCapturedVerse] = useState<typeof practice | null>(() => contentReady ? practice : null);
  if (contentReady && capturedVerse === null) setCapturedVerse(practice);
  const currentVerse = capturedVerse ?? practice;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => { clearInterval(timer); timer = undefined; };
    const refresh = () => setNow(new Date());
    const start = () => {
      stop();
      if (AppState.currentState !== 'active' || !navigation.isFocused()) return;
      refresh();
      timer = setInterval(refresh, 1_000);
    };
    start();
    const appState = AppState.addEventListener('change', state => { if (state === 'active') start(); else stop(); });
    const focus = navigation.addListener('focus', start);
    const blur = navigation.addListener('blur', stop);
    return () => { stop(); appState.remove(); focus(); blur(); };
  }, [navigation]);

  const [alarmImage, setAlarmImage] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    let release: (() => void) | undefined;
    // Resolve once from local storage. Content sync never changes this session's image.
    const imageSession = getAlarmPresentationState().sessionId;
    const occurrence = Number(imageSession?.split(':')[0]);
    const date = Number.isFinite(occurrence) && occurrence > 0 ? new Date(occurrence) : new Date();
    void prepareAlarmImage(localDateKey(date), imageSession).then(image => {
      if (!alive) { image?.release(); return; }
      release = image?.release;
      setAlarmImage(image?.uri ?? null);
    }).catch(() => undefined);
    return () => { alive = false; release?.(); };
  }, []);

  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isScreenReaderEnabled().then(enabled => { if (alive) setScreenReaderEnabled(enabled); }).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReaderEnabled);
    return () => { alive = false; listener.remove(); };
  }, []);
  const [started, setStarted] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const reportedReady = useRef(false);
  const mounted = useRef(true);
  const dismissing = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hapticPulseTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [playback, setPlayback] = useState<AlarmPlaybackState>({
    ringing: true,
    triggeredAt: 0,
    scheduledAt: 0,
    volumeProgress: 0,
  });

  // Animated Hold Progress (0 to 1)
  const holdProgress = useSharedValue(0);
  const session = useRef(getAlarmPresentationState().sessionId);
  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    hapticPulseTimersRef.current.forEach(clearTimeout);
    hapticPulseTimersRef.current = [];
    cancelAnimation(holdProgress);
    holdProgress.set(0);
    if (mounted.current) setIsHolding(false);
  }, [holdProgress]);

  useEffect(() => {
    mounted.current = true;
    const refresh = () => getAlarmPlaybackState().then(setPlayback).catch(() => undefined);
    refresh();
    const timer = setInterval(refresh, 1_000);
    const triggered = addAlarmTriggeredListener(setPlayback);
    const stopped = addAlarmStoppedListener(event => {
      if (event.sessionId && event.sessionId !== session.current) return;
      cancelHold();
      setPlayback(state => ({ ...state, ringing: false }));
      if (event.reason === 'notification-stop' || event.reason === 'timeout' || event.reason === 'snoozed') {
        if (navigation.isFocused()) replaceAppRoute(navigation, '/');
      }
    });
    const snoozeRequested = addAlarmSnoozeRequestedListener(event => {
      if (event.sessionId === session.current) cancelHold();
    });
    const foreground = AppState.addEventListener('change', state => { if (state !== 'active') cancelHold(); });
    const blur = navigation.addListener('blur', cancelHold);
    const back = BackHandler.addEventListener("hardwareBackPress", () => getAlarmPresentationState().active);
    return () => {
      clearInterval(timer);
      mounted.current = false;
      cancelHold();
      triggered?.remove();
      stopped?.remove();
      snoozeRequested?.remove();
      back.remove();
      foreground.remove();
      blur();
      hapticPulseTimersRef.current.forEach(clearTimeout);
    };
  }, [cancelHold, navigation]);

  const handleStartDay = async () => {
    if (dismissing.current) return;
    const expectedSession = session.current;
    const state = getAlarmPresentationState();
    if (!expectedSession || !mounted.current || !navigation.isFocused() || AppState.currentState !== 'active' || !state.active || !['wake', 'breathe', 'gita'].includes(state.stage ?? '') || state.sessionId !== expectedSession) return;

    dismissing.current = true;
    setStarted(true);

    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    try {
      const result = await startMyDay(expectedSession);
      const latest = getAlarmPresentationState();
      if (!mounted.current || !navigation.isFocused() || AppState.currentState !== 'active' || !latest.active || latest.sessionId !== expectedSession) return;
      if (!replaceAppRoute(navigation, result.stage === 'gita' ? '/gita' : '/breathe', { entry: "alarm" })) {
        throw new Error(translate("The breathing screen is not ready. Please try again."));
      }
    } catch (error) {
      if (!mounted.current) return;
      dismissing.current = false;
      setStarted(false);
      const latest = getAlarmPresentationState();
      if (!navigation.isFocused() || AppState.currentState !== 'active' || !latest.active || latest.sessionId !== expectedSession) return;
      Alert.alert(
        translate("Could not continue the ritual. Please retry."),
        error instanceof Error && error.message === 'Update the Android app to restore ritual progress.'
          ? translate('Update the Android app to restore ritual progress.')
          : translate('Your progress is preserved. Try again to continue.'),
      );
    }
  };

  const onPressIn = () => {
    if (started || dismissing.current) return;
    cancelHold();
    setIsHolding(true);

    // Initial tactile engagement
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    holdProgress.set(withTiming(1, {
      duration: HOLD_DURATION_MS,
      easing: Easing.linear,
    }));

    // Rhythmic charging haptic pulses at 500ms and 1000ms
    hapticPulseTimersRef.current.forEach(clearTimeout);
    hapticPulseTimersRef.current = [
      setTimeout(() => {
        try {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
      }, 500),
      setTimeout(() => {
        try {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {}
      }, 1000),
    ];

    holdTimerRef.current = setTimeout(() => {
      handleStartDay();
    }, HOLD_DURATION_MS);
  };

  const onPressOut = () => {
    if (started || dismissing.current) return;
    setIsHolding(false);

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    hapticPulseTimersRef.current.forEach(clearTimeout);
    hapticPulseTimersRef.current = [];

    // Subtle release feedback if released early
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    } catch {}

    cancelAnimation(holdProgress);
    holdProgress.set(withSpring(0, { damping: 15, stiffness: 220 }));
  };

  const formatted = formatWakeClock(now);
  // Explicit zone keeps the shared formatter cache correct after timezone changes.
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dateLabel = formatDate(now, { weekday: 'long', day: 'numeric', month: 'long', timeZone });
  const scheduledLabel = showScheduledAlarm(now.getTime(), playback.scheduledAt)
    ? formatDate(new Date(playback.scheduledAt), { hour: 'numeric', minute: '2-digit', hour12: true, timeZone })
    : null;

  // Responsive sizes for zero-scroll viewport
  const mascotSize = isSmall ? 150 : isCompact ? 175 : isTablet ? 240 : 195;

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${holdProgress.value * 100}%`,
  }));

  const animatedScaleStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(isHolding ? 0.98 : 1, {
          damping: 14,
          stiffness: 240,
        }),
      },
    ],
  }));

  return (
    <Screen scroll={fontScale > 1.15 || height < 680}>
      <View
        style={[s.singleViewportContainer, (fontScale > 1.15 || height < 680) && { flex: undefined, gap: 20 }]}
        onLayout={() => {
          if (reportedReady.current) return;
          reportedReady.current = true;
          void notifyWakeScreenReady().catch(() => undefined);
        }}
      >
        {/* ─── 1. Header, Live Local Time & Date ───────────────────── */}
        <View style={s.topContainer}>
          <View style={[s.sunriseChip, isSmall && { minHeight: 28, paddingHorizontal: 12 }]}>
            <Sunrise size={isSmall ? 14 : 16} color="#8A5D18" strokeWidth={2.4} />
            <TextR style={[s.sunriseText, isSmall && { fontSize: 10 }]}>
               {translate(wakeHeading(now))} </TextR>
          </View>

          <View style={s.timeRow}>
            <TextR
              serif
              style={[
                s.time,
                isSmall && { fontSize: 42, lineHeight: 48 },
                isTablet && { fontSize: 58, lineHeight: 64 },
              ]}
            >
              {formatted.time}
            </TextR>
            <TextR
              style={[
                s.meridiem,
                isSmall && { fontSize: 18, lineHeight: 22 },
                isTablet && { fontSize: 24, lineHeight: 28 },
              ]}
            >
              {formatted.meridiem}
            </TextR>
          </View>

          {scheduledLabel && <TextR style={s.subtitle}>{translate("Alarm set for {time}", { time: scheduledLabel })}</TextR>}
          <TextR style={[s.subtitle, isSmall && { fontSize: 11.5 }]}>
            {dateLabel} · {translate("Awaken with Dharma")}
          </TextR>
        </View>

        {/* ─── 2. Aru Mascot — Meditative Awakening Dais ─────────────────────── */}
        <View style={s.mascotHero}>
          {alarmImage && !imageFailed ? <Image source={{ uri: alarmImage }} style={{ width: mascotSize, height: mascotSize }} contentFit="contain" onError={() => setImageFailed(true)} /> : <AruMascot
            clip="start_my_day_wake"
            size={mascotSize}
            loop
            muted
            glow="day"
            interactive
          />}
        </View>

        {/* ─── 3. Daily Sacred Sankalpa Wisdom Card (Clean & Serene) ────────── */}
        <Interactive3DCard maxTiltDeg={4} style={s.sankalpaCard3D}>
          <View style={s.sankalpaHeader}>
            <TextR style={s.gitaRefText}>
               {translate("GITA CH.")} {currentVerse.chapter} · {currentVerse.verse}
            </TextR>
          </View>

          {/* Sanskrit Verse Calligraphy & Takeaway */}
          <View style={s.verseBox}>
            <TextR serif style={[s.sanskritSnippet, isSmall && { fontSize: 15, lineHeight: 22 }]}>
              {currentVerse.sanskrit.split("\n")[0]}
            </TextR>
            <TextR style={[s.takeawayText, isSmall && { fontSize: 13, lineHeight: 18 }]}>
              “{currentVerse.takeaway}”
            </TextR>
          </View>
        </Interactive3DCard>

        {/* ─── 4. Tactile 1.5s Hold to Start Action with Live Progress ──────── */}
        <View style={s.actions}>
          {playback.snoozeAvailable && <Pressable accessibilityRole="button" accessibilityState={{ disabled: started }} disabled={started} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }} onPress={async () => {
            const id = session.current;
            if (!id || dismissing.current || !navigation.isFocused() || AppState.currentState !== 'active') return;
            dismissing.current = true; cancelHold(); setStarted(true);
            try { await snoozeAlarm(id); if (mounted.current && navigation.isFocused() && !getAlarmPresentationState().active) replaceAppRoute(navigation, '/'); }
            catch {
              const latest = getAlarmPresentationState();
              if (mounted.current && navigation.isFocused() && latest.active && latest.sessionId === id) {
                setStarted(false); Alert.alert(translate('Could not snooze. Please retry.'));
              }
            }
            finally { dismissing.current = false; }
          }}><TextR style={{ color: C.saffron, fontWeight: '700' }}>{translate('Snooze · 5 min')}</TextR></Pressable>}
          <Animated.View style={animatedScaleStyle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={translate(screenReaderEnabled ? "Start my day" : "Hold for 1.5 seconds to start morning ritual")}
              disabled={started}
              accessibilityState={{ disabled: started, busy: started }}
              onPress={() => { if (screenReaderEnabled) { cancelHold(); void handleStartDay(); } }}
              accessibilityActions={[{ name: 'activate', label: translate('Start my day') }]}
              onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'activate') { cancelHold(); void handleStartDay(); } }}
              {...{ onKeyDown: (event: { key?: string; repeat?: boolean; nativeEvent?: { key: string; repeat?: boolean }; preventDefault(): void }) => {
                // SDK 57's RN keyboard events expose nativeEvent; web exposes key directly.
                const key = event.nativeEvent?.key ?? event.key;
                if ((key === 'Enter' || key === ' ') && !(event.nativeEvent?.repeat ?? event.repeat)) {
                  event.preventDefault(); cancelHold(); void handleStartDay();
                }
              } }}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              style={[s.primaryButton, isSmall && { height: 48, borderRadius: 24 }]}
            >
              {/* Dynamic Live Charging Fill */}
              <Animated.View style={[s.holdFillProgress, animatedFillStyle]} />

              {/* Button Content */}
              <View style={s.buttonContent}>
                <Sun size={isSmall ? 19 : 22} color={C.white} strokeWidth={2.4} />
                <TextR style={[s.primaryText, isSmall && { fontSize: 15 }]}>
                  {started
                    ? translate("Awakening your day…")
                    : isHolding
                      ? translate("Keep holding to awaken…")
                      : translate("Hold to start my day")}
                </TextR>
              </View>

              <View style={s.btnGlossHighlight} />
            </Pressable>
          </Animated.View>

          {/* Micro-Instruction */}
          <View style={s.footerInfo}>
            <Leaf size={13} color="#8C7467" strokeWidth={2} />
            <TextR style={[s.strictNote, isSmall && { fontSize: 10.5 }]}>
               {translate("Keep holding for 1.5s to awaken mind & body")} </TextR>
          </View>
        </View>
      </View>
    </Screen>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  singleViewportContainer: {
    flex: 1,
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 540,
    alignSelf: "center",
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 4,
  },

  // ─── Header & Sacred Dawn Time ──────────────────────────────────────────────
  topContainer: {
    alignItems: "center",
    marginTop: 2,
    marginBottom: 2,
  },
  sunriseChip: {
    minHeight: 30,
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255, 246, 236, 0.95)",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(216, 144, 64, 0.25)",
    borderBottomWidth: 2,
    shadowColor: "#8C4010",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sunriseText: {
    color: "#8A5D18",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1.6,
    flexShrink: 1,
    textAlign: "center",
  },
  timeRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  time: {
    fontSize: 48,
    lineHeight: 54,
    fontWeight: "300",
    color: "#1F140E",
    letterSpacing: -1.2,
  },
  meridiem: {
    color: C.saffron,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
    marginLeft: 7,
  },
  subtitle: {
    marginTop: 2,
    color: "#7C675B",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    fontWeight: "500",
  },

  // ─── Mascot Hero ────────────────────────────────────────────────────────────
  mascotHero: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },

  // ─── Daily Sacred Sankalpa Card ─────────────────────────────────────────────
  sankalpaCard3D: {
    backgroundColor: "rgba(255, 252, 248, 0.98)",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(216, 144, 64, 0.3)",
    borderBottomWidth: 3,
    shadowColor: "#8C4010",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    marginHorizontal: 2,
  },
  sankalpaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  gitaRefText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9A3C08",
    letterSpacing: 0.8,
  },
  verseBox: {
    alignItems: "center",
    paddingVertical: 4,
  },
  sanskritSnippet: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    color: "#8C3A08",
    textAlign: "center",
    marginBottom: 6,
  },
  takeawayText: {
    fontSize: 13.5,
    lineHeight: 19,
    color: "#3D2B1F",
    fontStyle: "italic",
    textAlign: "center",
    fontWeight: "500",
  },

  // ─── Hold Button & Footer ───────────────────────────────────────────────────
  actions: {
    marginTop: 4,
    marginBottom: 4,
  },
  primaryButton: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(216, 107, 39, 0.25)",
    overflow: "hidden",
    position: "relative",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "#A8470C",
    borderBottomWidth: 3,
    shadowColor: C.saffron,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  holdFillProgress: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: C.saffron,
  },
  buttonContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    zIndex: 2,
  },
  btnGlossHighlight: {
    position: "absolute",
    top: 0,
    left: 10,
    right: 10,
    height: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
    zIndex: 3,
  },
  primaryText: {
    color: C.white,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  footerInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  strictNote: {
    color: "#7A6659",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
    textAlign: "center",
  },
});
