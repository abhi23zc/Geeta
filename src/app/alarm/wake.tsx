import { router } from "expo-router";
import {
  AlarmClock,
  BellRing,
  Leaf,
  Music,
  Pause,
  Play,
  SlidersVertical,
  Sun,
  Sunrise,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { AruMascot } from "@/components/aru-mascot";
import { Screen, TextR } from "@/components/ritual-ui";
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
        {/* Header Pill & Time */}
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

        {/* Aru Mascot — full hero */}
        <View style={s.mascotHero}>
          <AruMascot clip="alarm_sleepy_idle" size={260} loop muted glow={false} />
        </View>

        {/* Quote Block */}
        <View style={s.quoteBlock}>
          <TextR serif style={s.quote}>
            “Awaken with gratitude. A brand new dawn to act with dharma.”
          </TextR>
          <TextR style={s.quoteCaption}>
            GITA CH. 2 · SACRED CONTEMPLATION
          </TextR>
        </View>

        {/* Audio Player Card */}
        <View style={s.audioCard}>
          <View style={s.audioHeader}>
            <View style={s.audioLeft}>
              <View style={s.equalizerIcon}>
                <SlidersVertical size={20} color="#E2631C" strokeWidth={2.3} />
              </View>
              <View style={s.audioCopy}>
                <TextR style={s.audioTitle}>{ragaTitle}</TextR>
                <View style={s.audioSubRow}>
                  <WaveBars />
                  <TextR style={s.audioSub}>
                    Gentle Tanpura & Bansuri Flute
                  </TextR>
                </View>
              </View>
            </View>

            <Pressable
              accessibilityLabel={playing ? "Pause audio" : "Play audio"}
              onPress={() => setPlaying((value) => !value)}
              style={({ pressed }) => [s.audioButton, pressed && s.pressed]}
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
            <Music size={16} color="#E2631C" strokeWidth={2.2} />
          </View>

          <View style={s.progressTrack}>
            <View style={s.progressFill} />
          </View>

          <TextR style={s.audioNote}>
            Volume gradually rose over 3 minutes with tranquil ambient birdsong
          </TextR>
        </View>

        {/* Action Buttons */}
        <View style={s.actions}>
          <Pressable
            onPress={() => {
              setStarted(true);
              router.replace("/");
            }}
            style={({ pressed }) => [
              s.primaryButton,
              pressed && s.primaryPressed,
            ]}
          >
            <Sun size={24} color="#FFFFFF" strokeWidth={2.3} />
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
              pressed && s.primaryPressed,
            ]}
          >
            <AlarmClock size={21} color="#524035" strokeWidth={2.2} />
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

function WaveBars() {
  return (
    <View style={s.waveBars}>
      <View style={[s.waveBar, { height: 7 }]} />
      <View style={[s.waveBar, { height: 12 }]} />
      <View style={[s.waveBar, { height: 9 }]} />
    </View>
  );
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 24,
    backgroundColor: "#FFF8F5",
  },
  topContainer: {
    alignItems: "center",
    marginBottom: 4,
  },
  sunriseChip: {
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FDF2EA",
    borderWidth: 1,
    borderColor: "#F7E5DA",
    shadowColor: "#8C4010",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
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
    color: "#E2631C",
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
    marginTop: 6,
    marginBottom: 6,
  },
  quoteBlock: {
    alignItems: "center",
    marginTop: 0,
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
  audioCard: {
    borderRadius: 28,
    padding: 18,
    marginBottom: 18,
    backgroundColor: "#FFF3EB",
    shadowColor: "#8C4010",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
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
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  waveBars: {
    height: 12,
    width: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    marginRight: 8,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: "#E2631C",
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
  },
  pressed: {
    opacity: 0.85,
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
    overflow: "hidden",
    backgroundColor: "#F0D5C3",
  },
  progressFill: {
    width: "68%",
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#E56B27",
  },
  audioNote: {
    marginTop: 12,
    color: "#756054",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#E2631C",
    shadowColor: "#E2631C",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  snoozeButton: {
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#FDEFE5",
    shadowColor: "#8C4010",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  snoozeActive: {
    backgroundColor: "#F8E5D6",
  },
  snoozeText: {
    color: "#2C1E16",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  footer: {
    marginTop: 20,
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
