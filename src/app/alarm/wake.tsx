import { router } from "expo-router";
import {
  AlarmClock,
  BellRing,
  Leaf,
  Music,
  Pause,
  Play,
  SlidersVertical,
  Sparkles,
  Sun,
  Sunrise,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { AruMascot } from "@/components/aru-mascot";
import { AudioSpectrumVisualizer } from "@/components/audio-spectrum-visualizer";
import { Interactive3DCard } from "@/components/interactive-3d-card";
import { Screen, TextR } from "@/components/ritual-ui";
import { C } from "@/constants/ritual-theme";
import { useRitual } from "@/state/ritual-store";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const { alarmTime, alarmTone } = useRitual();
  const [playing, setPlaying] = useState(true);
  const [started, setStarted] = useState(false);
  const [snoozed, setSnoozed] = useState(false);

  const formatted = useMemo(() => formatAlarm(alarmTime), [alarmTime]);
  const ragaTitle =
    alarmTone === "Raag Bhairav & Sacred Flute"
      ? "Shiva / Gita Morning Raga"
      : alarmTone;

  return (
    <Screen night={false}>
      <View style={s.page}>
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
                    Gentle Tanpura & Bansuri Flute
                  </TextR>
                </View>
              </View>
            </View>

            <Pressable
              accessibilityLabel={playing ? "Pause audio" : "Play audio"}
              onPress={() => setPlaying((value) => !value)}
              style={({ pressed }) => [
                s.audioButton,
                pressed && s.audioButtonPressed,
              ]}
            >
              {playing ? (
                <Pause size={20} color="#2C1E16" fill="#2C1E16" />
              ) : (
                <Play
                  size={20}
                  color="#2C1E16"
                  fill="#2C1E16"
                  style={{ marginLeft: 2 }}
                />
              )}
            </Pressable>
          </View>

          <View style={s.progressMeta}>
            <BellRing size={16} color="#6B574B" strokeWidth={2} />
            <TextR style={s.progressLabel}>Harmonic crescendo (68%)</TextR>
            <Music size={16} color={C.saffron} strokeWidth={2.2} />
          </View>

          <View style={s.progressTrack}>
            <View style={s.progressFill} />
            <View style={s.progressKnob} />
          </View>

          <TextR style={s.audioNote}>
            Volume gradually rose over 3 minutes with tranquil ambient birdsong
          </TextR>
        </Interactive3DCard>

        {/* 3D Action Buttons */}
        <View style={s.actions}>
          <Pressable
            onPress={() => {
              setStarted(true);
              router.replace("/");
            }}
            style={({ pressed }) => [
              s.primaryButton,
              pressed && s.pressedScale,
            ]}
          >
            <Sun size={23} color={C.white} strokeWidth={2.2} />
            <TextR style={s.primaryText}>
              {started ? "Peaceful Morning Begins..." : "Start my day"}
            </TextR>
          </Pressable>

          <Pressable
            onPress={() => {
              setSnoozed(true);
              router.back();
            }}
            style={({ pressed }) => [
              s.snoozeButton,
              snoozed && s.snoozeActive,
              pressed && s.pressedScale,
            ]}
          >
            <AlarmClock size={20} color="#524035" strokeWidth={2.2} />
            <TextR style={s.snoozeText}>
              {snoozed ? "Gentle bell in 5 minutes" : "Snooze 5 min"}
            </TextR>
          </Pressable>
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
  snoozeButton: {
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(254, 236, 220, 0.92)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(180, 125, 95, 0.25)",
    borderBottomWidth: 2,
    shadowColor: "#8C4010",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  snoozeActive: {
    backgroundColor: "#F8E5D6",
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
  snoozeText: {
    color: "#2C1E16",
    fontSize: 15.5,
    fontWeight: "800",
    letterSpacing: 0.2,
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
