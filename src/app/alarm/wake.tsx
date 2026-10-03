import { useNavigation } from "expo-router";
import {
  BellRing,
  Leaf,
  Music,
  SlidersVertical,
  Sparkles,
  Sun,
  Sunrise,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, BackHandler, Pressable, StyleSheet, View } from "react-native";

import { AruMascot } from "@/components/aru-mascot";
import { AudioSpectrumVisualizer } from "@/components/audio-spectrum-visualizer";
import { Interactive3DCard } from "@/components/interactive-3d-card";
import { Screen, TextR } from "@/components/ritual-ui";
import { C } from "@/constants/ritual-theme";
import { replaceAppRoute } from "@/navigation/route-actions";
import {
  addAlarmStoppedListener,
  addAlarmTriggeredListener,
  dismissAlarmAndScheduleNext,
  getAlarmPlaybackState,
  getNativeAlarmConfig,
  notifyWakeScreenReady,
  type AlarmPlaybackState,
  type NativeAlarmConfig,
} from "@/services/alarm";
import { useRitual } from "@/state/ritual-store";

function formatAlarm(value: string) {
  const [h = "06", m = "30"] = value.split(":");
  const hour24 = Number(h);
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24;
  return {
    time: `${String(hour12).padStart(2, "0")}:${m}`,
    meridiem,
  };
}

export default function Wake() {
  // Target the root file-based stack explicitly. The wake screen can be
  // mounted by Android's full-screen alarm intent before a default navigation
  // context has settled.
  const navigation = useNavigation("/");
  const { alarmTime, alarmTone } = useRitual();
  const [started, setStarted] = useState(false);
  const reportedReady = useRef(false);
  const mounted = useRef(true);
  const dismissing = useRef(false);
  const [nativeConfig, setNativeConfig] = useState<NativeAlarmConfig | null>(null);
  const [playback, setPlayback] = useState<AlarmPlaybackState>({
    ringing: true,
    triggeredAt: 0,
    scheduledAt: 0,
    volumeProgress: 0,
  });

  useEffect(() => {
    mounted.current = true;
    getNativeAlarmConfig().then(setNativeConfig).catch(() => undefined);
    const refresh = () => getAlarmPlaybackState().then(setPlayback).catch(() => undefined);
    refresh();
    const timer = setInterval(refresh, 1_000);
    const triggered = addAlarmTriggeredListener(setPlayback);
    const stopped = addAlarmStoppedListener(() =>
      setPlayback((state) => ({ ...state, ringing: false })),
    );
    const back = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => {
      clearInterval(timer);
      mounted.current = false;
      triggered?.remove();
      stopped?.remove();
      back.remove();
    };
  }, []);

  const handleStartDay = async () => {
    if (dismissing.current) return;

    dismissing.current = true;
    setStarted(true);
    try {
      await dismissAlarmAndScheduleNext();
      if (!mounted.current) return;
      if (!replaceAppRoute(navigation, "/breathe", { entry: "alarm" })) {
        throw new Error("The breathing screen is not ready. Please try again.");
      }
    } catch (error) {
      if (!mounted.current) return;
      dismissing.current = false;
      setStarted(false);
      Alert.alert(
        "Could not stop alarm",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const formatted = useMemo(() => {
    if (playback.scheduledAt > 0) {
      const date = new Date(playback.scheduledAt);
      return formatAlarm(`${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`);
    }
    return formatAlarm(alarmTime);
  }, [alarmTime, playback.scheduledAt]);
  const playing = playback.ringing;
  const gradualProgress = nativeConfig?.gradualVolume
    ? Math.round(playback.volumeProgress * 100)
    : 100;
  const ragaTitle =
    playback.actualTone === 'system' || playback.actualTone === 'notification' ? 'System alarm sound' : playback.actualTone === 'silent' ? 'Sound unavailable — vibration active' : alarmTone === "Raag Bhairav & Sacred Flute"
      ? "Shiva / Gita Morning Raga"
      : alarmTone;

  return (
    <Screen night={false}>
      <View
        style={s.page}
        onLayout={() => {
          if (reportedReady.current) return;
          reportedReady.current = true;
          requestAnimationFrame(() => notifyWakeScreenReady().catch(() => undefined));
        }}
      >
        {/* Header Pill & Sacred Time */}
        <View style={s.topContainer}>
          <View style={s.sunriseChip}>
            <Sunrise size={18} color="#8A5D18" strokeWidth={2.2} />
            <TextR style={s.sunriseText}>BRAHMA MUHURTA · SUNRISE</TextR>
          </View>

          <View style={s.timeRow}>
            <TextR serif style={s.time}>
              {formatted.time}
            </TextR>
            <TextR style={s.meridiem}>{formatted.meridiem}</TextR>
          </View>
          <TextR style={s.subtitle}>
            Softly illuminated · Tuesday, Kartik Shukla
          </TextR>
        </View>

        {/* Aru Mascot — 3D Hero Shrine */}
        <View style={s.mascotHero}>
          <AruMascot
            clip="start_my_day_wake"
            size={260}
            loop
            muted
            glow="day"
            interactive
          />
        </View>

        {/* Sacred Gita Wisdom */}
        <View style={s.quoteBlock}>
          <Sparkles size={18} color={C.saffron} style={{ marginBottom: 6 }} />
          <TextR serif style={s.quote}>
            “Awaken with gratitude. A brand new dawn to act with dharma.”
          </TextR>
          <TextR style={s.quoteCaption}>
            GITA CH. 2 · SACRED CONTEMPLATION
          </TextR>
        </View>

        {/* Audio Experience — Interactive 3D Parchment Glass Card */}
        <Interactive3DCard maxTiltDeg={6} style={s.audioCard3D}>
          <View style={s.audioHeader}>
            <View style={s.audioLeft}>
              <View style={s.equalizerIcon}>
                <SlidersVertical
                  size={20}
                  color={C.saffron}
                  strokeWidth={2.3}
                />
              </View>
              <View style={s.audioCopy}>
                <TextR style={s.audioTitle}>{ragaTitle}</TextR>
                <View style={s.audioSubRow}>
                  <AudioSpectrumVisualizer
                    isPlaying={playing}
                    barCount={8}
                    height={16}
                  />
                  <TextR style={s.audioSub}>
                    {playback.fallbackReason ?? 'Downloaded alarm music'}
                  </TextR>
                </View>
              </View>
            </View>

            <View style={s.audioButton} accessibilityLabel={playing ? "Alarm is ringing" : "Alarm stopped"}>
              <BellRing size={20} color="#2C1E16" />
            </View>
          </View>

          <View style={s.progressMeta}>
            <BellRing size={16} color="#6B574B" strokeWidth={2} />
            <TextR style={s.progressLabel}>
              {playing ? `Harmonic crescendo (${gradualProgress}%)` : "Alarm stopped"}
            </TextR>
            <Music size={16} color={C.saffron} strokeWidth={2.2} />
          </View>

          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${gradualProgress}%` }]} />
            <View style={[s.progressKnob, { left: `${Math.max(0, gradualProgress - 1)}%` }]} />
          </View>

          <TextR style={s.audioNote}>
            {nativeConfig?.gradualVolume
              ? "Volume rises gently over five minutes while the alarm continues"
              : "Alarm is playing at the system alarm volume"}
          </TextR>
        </Interactive3DCard>

        {/* 3D Action Buttons */}
        <View style={s.actions}>
          <Pressable
            accessibilityHint="Keep holding for 1.5 seconds"
            delayLongPress={1500}
            disabled={started}
            onLongPress={handleStartDay}
            style={({ pressed }) => [
              s.primaryButton,
              pressed && s.pressedScale,
            ]}
          >
            <Sun size={23} color={C.white} strokeWidth={2.2} />
            <TextR style={s.primaryText}>
              {started ? "Starting your practice…" : "Hold to start my day"}
            </TextR>
          </Pressable>

          <TextR style={s.strictNote}>
            Keep holding for 1.5 seconds. Releasing early resets the action.
          </TextR>
        </View>

        {/* Footer Note */}
        <View style={s.footer}>
          <Leaf size={16} color="#8C7467" strokeWidth={2} />
          <TextR style={s.footerText}>
            Your Surya Namaskar routine is prepared for 06:45 AM
          </TextR>
        </View>

      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    paddingTop: 18,
    paddingBottom: 16,
  },
  topContainer: {
    alignItems: "center",
    marginTop: 6,
    marginBottom: 8,
  },
  sunriseChip: {
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(253, 242, 234, 0.95)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    shadowColor: "#8C4010",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  sunriseText: {
    color: "#8A5D18",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },
  timeRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  time: {
    fontSize: 52,
    lineHeight: 58,
    fontWeight: "300",
    color: "#1F140E",
    letterSpacing: -1,
  },
  meridiem: {
    color: C.saffron,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    marginLeft: 8,
  },
  subtitle: {
    marginTop: 4,
    color: "#7C675B",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  mascotHero: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  quoteBlock: {
    alignItems: "center",
    marginTop: 2,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  quote: {
    fontSize: 22,
    lineHeight: 32,
    textAlign: "center",
    fontStyle: "italic",
    color: "#261C14",
    letterSpacing: -0.2,
  },
  quoteCaption: {
    marginTop: 10,
    color: "#8C7467",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    textAlign: "center",
  },
  audioCard3D: {
    marginBottom: 20,
  },
  audioHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  audioLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  equalizerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "#FCDCCB",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderTopColor: "#FFFFFF",
    shadowColor: C.saffron,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  audioCopy: {
    flex: 1,
  },
  audioTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    color: "#1C130D",
    letterSpacing: -0.2,
  },
  audioSubRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  audioSub: {
    flex: 1,
    color: "#756054",
    fontSize: 13,
    lineHeight: 17,
  },
  audioButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5E4D7",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderTopColor: "#FFFFFF",
    shadowColor: "#8C4010",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  audioButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  progressMeta: {
    marginTop: 20,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    color: "#236B43",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "visible",
    backgroundColor: "rgba(240, 213, 195, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    position: "relative",
    justifyContent: "center",
  },
  progressFill: {
    width: "68%",
    height: "100%",
    borderRadius: 4,
    backgroundColor: C.saffron,
  },
  progressKnob: {
    position: "absolute",
    left: "67%",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: C.saffron,
    shadowColor: C.saffron,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  audioNote: {
    marginTop: 14,
    color: "#756054",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  actions: {
    gap: 12,
    marginBottom: 10,
  },
  primaryButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: C.saffron,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(160, 50, 10, 0.35)",
    borderBottomWidth: 2.5,
    shadowColor: C.saffron,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  strictNote: {
    marginTop: 10,
    color: "#8C7467",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  pressedScale: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  primaryText: {
    color: C.white,
    fontSize: 16.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  footer: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerText: {
    color: "#7A6659",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
