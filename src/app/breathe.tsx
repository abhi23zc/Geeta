import { router } from "expo-router";
import {
  CheckCircle2,
  Leaf,
  Pause,
  PauseCircle,
  Play,
  RotateCcw,
  Timer,
  Wind,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { AruMascot } from "@/components/aru-mascot";
import { Header, Screen, TextR } from "@/components/ritual-ui";
import { C } from "@/constants/ritual-theme";
import { useGitaProgress } from "@/state/gita-store";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ── Pranayama Configuration ───────────────────────────────────────
const phases = [
  {
    key: "inhale",
    label: "Inhale",
    seconds: 4,
    prompt:
      "Inhale deeply & gently through nostrils, filling abdomen and chest.",
    Icon: Wind,
    accentColor: C.saffron,
  },
  {
    key: "hold",
    label: "Hold",
    seconds: 4,
    prompt:
      "Gently retain the breath at the crest, resting in absolute tranquility.",
    Icon: PauseCircle,
    accentColor: "#E56B27",
  },
  {
    key: "exhale",
    label: "Exhale",
    seconds: 4,
    prompt: "Slowly release breath through nose, relaxing mind and shoulders.",
    Icon: Leaf,
    accentColor: "#D96B43",
  },
] as const;

// 190px Diameter Circle Settings
const R_INNER = 76;
const CIRCLE_PERIMETER = 2 * Math.PI * R_INNER; // 477.52
const TOTAL_ROUNDS = 5;
const ROUND_DURATION_SEC = 12; // 4s + 4s + 4s
const TOTAL_SESSION_SEC = TOTAL_ROUNDS * ROUND_DURATION_SEC; // 60s = 1 min

export default function Breathe() {
  const insets = useSafeAreaInsets();
  const { completeBreathing } = useGitaProgress();

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(4);
  const [paused, setPaused] = useState(false);
  const [complete, setComplete] = useState(false);
  const [elapsedTotalSeconds, setElapsedTotalSeconds] = useState(0);
  const completionHandled = useRef(false);

  const phase = phases[phaseIndex];
  const currentRound = Math.min(
    TOTAL_ROUNDS,
    Math.floor(elapsedTotalSeconds / ROUND_DURATION_SEC) + 1,
  );

  // 60 FPS Reanimated Shared Values
  const orbScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);
  const progressVal = useSharedValue(0);
  const celebrateScale = useSharedValue(0.7);

  // Smooth Ring Sweep & Orb Expansion
  useEffect(() => {
    if (paused || complete) {
      cancelAnimation(progressVal);
      cancelAnimation(orbScale);
      cancelAnimation(glowOpacity);
      return;
    }

    progressVal.value = 0;
    progressVal.value = withTiming(1, {
      duration: phase.seconds * 1000,
      easing: Easing.linear,
    });

    if (phase.key === "inhale") {
      orbScale.value = withTiming(1.15, {
        duration: phase.seconds * 1000,
        easing: Easing.inOut(Easing.ease),
      });
      glowOpacity.value = withTiming(0.85, {
        duration: phase.seconds * 1000,
      });
    } else if (phase.key === "hold") {
      orbScale.value = withRepeat(
        withSequence(
          withTiming(1.18, {
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1.12, {
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      );
      glowOpacity.value = withTiming(0.95, { duration: 600 });
    } else if (phase.key === "exhale") {
      orbScale.value = withTiming(0.92, {
        duration: phase.seconds * 1000,
        easing: Easing.inOut(Easing.ease),
      });
      glowOpacity.value = withTiming(0.38, {
        duration: phase.seconds * 1000,
      });
    }
  }, [phaseIndex, paused, complete]);

  // 1-Second Countdown Timer
  useEffect(() => {
    if (paused || complete) return;

    const id = setInterval(() => {
      setElapsedTotalSeconds((total) => {
        const nextTotal = total + 1;
        if (nextTotal >= TOTAL_SESSION_SEC) {
          setComplete(true);
        }
        return nextTotal;
      });

      setSecondsLeft((current) => {
        if (current > 1) {
          return current - 1;
        }

        setPhaseIndex((next) => (next + 1) % phases.length);
        return phases[0].seconds; // reset to phase duration
      });
    }, 1000);

    return () => clearInterval(id);
  }, [paused, complete]);

  // ── Completion handler (runs once when session completes) ──
  useEffect(() => {
    if (!complete || completionHandled.current) return;
    completionHandled.current = true;

    completeBreathing();

    // Celebrate animation
    celebrateScale.value = withSequence(
      withTiming(1.15, { duration: 400, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) }),
    );
  }, [complete, completeBreathing, celebrateScale]);

  // Animated circle dash offset
  const animatedCircleProps = useAnimatedProps(() => {
    const strokeDashoffset =
      CIRCLE_PERIMETER - CIRCLE_PERIMETER * progressVal.value;
    return {
      strokeDashoffset,
    };
  });

  // Roaming Gold Tip Orb
  const animatedRoamingOrbStyle = useAnimatedStyle(() => {
    const angleRad = -Math.PI / 2 + progressVal.value * (2 * Math.PI);
    const cx = 95 + R_INNER * Math.cos(angleRad);
    const cy = 95 + R_INNER * Math.sin(angleRad);

    return {
      transform: [{ translateX: cx - 6 }, { translateY: cy - 6 }],
    };
  });

  const animatedOrbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: orbScale.value * 1.06 }],
  }));

  const animatedCelebrateStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrateScale.value }],
  }));

  const handleRestart = useCallback(() => {
    setComplete(false);
    setElapsedTotalSeconds(0);
    setPhaseIndex(0);
    setSecondsLeft(phases[0].seconds);
    completionHandled.current = false;
    celebrateScale.value = 0.7;
  }, [celebrateScale]);

  const handleContinueToGita = useCallback(() => {
    router.replace("/gita");
  }, []);

  const formatMinSec = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <Screen
      contentStyle={{ paddingBottom: Math.max(insets.bottom + 140, 220) }}
    >
      <Header eyebrow="Breathe" />

      {/* Hero Header Section */}
      <View style={s.hero}>
        <View style={s.modeChip}>
          <Leaf size={13} color={C.primary} />
          <TextR style={s.modeText}>SAMA VRITTI PRANAYAMA</TextR>
        </View>
        <TextR style={s.title}>Morning Prana & Stillness</TextR>
        <TextR style={s.subtitle}>
          Awaken vital life-force through conscious, balanced breath intervals.
        </TextR>
      </View>

      {/* Clean 3D Volumetric Breathing Stage */}
      <View style={s.orbStage}>
        {/* Outer Pulsing Ambient Light Aura */}
        <Animated.View style={[s.glowOuter, animatedGlowStyle]} />
        <Animated.View style={[s.glowMiddle, animatedOrbStyle]} />

        {/* SVG Progress Ring */}
        <Animated.View style={[s.ringWrapper, animatedOrbStyle]}>
          <Svg width={190} height={190} style={s.progressRing}>
            <Defs>
              <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#FFEA00" />
                <Stop offset="50%" stopColor={C.saffron} />
                <Stop offset="100%" stopColor="#D84315" />
              </LinearGradient>
            </Defs>
            <Circle
              cx={95}
              cy={95}
              r={R_INNER}
              stroke="#F2DFD1"
              strokeWidth={4.5}
              strokeDasharray="4 9"
              fill="none"
            />
            <AnimatedCircle
              cx={95}
              cy={95}
              r={R_INNER}
              stroke="url(#ringGrad)"
              strokeWidth={7.5}
              strokeDasharray={CIRCLE_PERIMETER}
              animatedProps={animatedCircleProps}
              strokeLinecap="round"
              fill="none"
              rotation="-90"
              origin="95,95"
            />
          </Svg>

          {/* Smooth Roaming Gold Tip Orb */}
          <Animated.View
            style={[s.roamingOrbTip, animatedRoamingOrbStyle]}
            pointerEvents="none"
          />

          {/* Aru meditating inside the ring */}
          <View style={s.aruInOrb}>
            <AruMascot
              clip="breathing_loop"
              size={148}
              loop
              muted
              glow={false}
              interactive={false}
            />
          </View>
        </Animated.View>
      </View>

      {/* Phase + countdown badge */}
      <View style={s.phaseBadge}>
        <View style={[s.phaseDot, { backgroundColor: phase.accentColor }]} />
        <TextR style={[s.phaseText, { color: phase.accentColor }]}>
          {phase.label.toUpperCase()}
        </TextR>
        <TextR style={s.phaseBadgeSep}>·</TextR>
        <TextR serif style={[s.phaseBadgeSec, { color: phase.accentColor }]}>
          {String(secondsLeft).padStart(2, "0")}
        </TextR>
        <TextR style={s.phaseBadgeUnit}>s</TextR>
      </View>

      {/* Guided Instruction Prompt Pill */}
      <View style={s.prompt}>
        <TextR style={s.promptText}>{phase.prompt}</TextR>
      </View>

      {/* Breathing Cycle 3D Control Card (with integrated stats) */}
      <View style={s.cycleCard}>
        <View style={s.cardTopRow}>
          <TextR style={s.sectionTitle}>BREATHING CYCLE</TextR>
          <TextR style={s.pattern}>4 · 4 · 4 Pattern</TextR>
        </View>
        <View style={s.phaseGrid}>
          {phases.map((item, index) => {
            const isActive = index === phaseIndex;
            return (
              <View
                key={item.key}
                style={[
                  s.phaseTile,
                  isActive ? s.phaseTileActive : s.phaseTileIdle,
                ]}
              >
                <View style={s.phaseTileRow}>
                  <item.Icon size={16} color={isActive ? C.white : C.inkSoft} />
                  <TextR
                    style={[
                      s.phaseTileTitle,
                      isActive && s.phaseTileTitleActive,
                    ]}
                  >
                    {item.label}
                  </TextR>
                </View>
                <TextR
                  style={[s.phaseTileSub, isActive && s.phaseTileSubActive]}
                >
                  {item.seconds} Sec
                </TextR>
              </View>
            );
          })}
        </View>

        {/* Integrated Stats Row */}
        <View style={s.inlineStatsRow}>
          <View style={s.inlineStat}>
            <RotateCcw size={14} color={C.primary} />
            <TextR style={s.inlineStatLabel}>
              Round {currentRound}/{TOTAL_ROUNDS}
            </TextR>
          </View>
          <View style={s.inlineStatDivider} />
          <View style={s.inlineStat}>
            <Timer size={14} color={C.primary} />
            <TextR style={s.inlineStatLabel}>
              {formatMinSec(elapsedTotalSeconds)} /{" "}
              {formatMinSec(TOTAL_SESSION_SEC)}
            </TextR>
          </View>
        </View>
      </View>

      {/* 3D Action Row Buttons */}
      {!complete && (
        <View style={s.actionRow}>
          <Pressable
            onPress={() => setPaused((value) => !value)}
            style={({ pressed }) => [s.pauseButton, pressed && s.pressed]}
          >
            {paused ? (
              <Play size={18} color={C.ink} fill={C.ink} />
            ) : (
              <Pause size={18} color={C.ink} fill={C.ink} />
            )}
            <TextR style={s.pauseText}>{paused ? "Resume" : "Pause"}</TextR>
          </Pressable>
        </View>
      )}

      {/* ── Session Complete Celebration Overlay ── */}
      {complete && (
        <Animated.View
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(200)}
          style={s.celebrationCard}
        >
          <Animated.View style={[s.celebrationInner, animatedCelebrateStyle]}>
            <View style={s.celebrationIconWrap}>
              <CheckCircle2 size={36} color={C.white} strokeWidth={2.5} />
            </View>
            <TextR style={s.celebrationTitle}>Prana Awakened</TextR>
            <TextR style={s.celebrationSub}>
              {TOTAL_ROUNDS} rounds completed · {formatMinSec(TOTAL_SESSION_SEC)}{" "}
              of mindful breathing
            </TextR>

            {/* Continue to Gita (primary action) */}
            <Pressable
              onPress={handleContinueToGita}
              style={({ pressed }) => [
                s.continueButton,
                pressed && s.pressed,
              ]}
            >
              <TextR style={s.continueText}>Continue to Gita</TextR>
            </Pressable>

            {/* Restart (secondary action) */}
            <Pressable
              onPress={handleRestart}
              style={({ pressed }) => [
                s.restartButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <RotateCcw size={15} color={C.inkSoft} />
              <TextR style={s.restartText}>Breathe Again</TextR>
            </Pressable>
          </Animated.View>
        </Animated.View>
      )}
    </Screen>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  hero: {
    alignItems: "center",
    marginTop: 2,
    marginBottom: 8,
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: C.surfaceContainer,
    borderWidth: 1,
    borderColor: "rgba(229, 107, 39, 0.22)",
    shadowColor: C.primary,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 8,
  },
  modeText: {
    fontSize: 11.5,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 1.6,
    color: C.inkSoft,
  },
  title: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "800",
    textAlign: "center",
    color: C.ink,
  },
  subtitle: {
    maxWidth: 280,
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: C.inkSoft,
    textAlign: "center",
  },
  orbStage: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginVertical: 12,
  },
  glowOuter: {
    position: "absolute",
    width: 205,
    height: 205,
    borderRadius: 102.5,
    backgroundColor: "#FFE6CF",
    shadowColor: C.saffron,
    shadowOpacity: 0.32,
    shadowRadius: 36,
    elevation: 4,
  },
  glowMiddle: {
    position: "absolute",
    width: 175,
    height: 175,
    borderRadius: 87.5,
    backgroundColor: "#FFF2E9",
    borderWidth: 14,
    borderColor: "#FFE6D3",
    opacity: 0.94,
  },
  ringWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: 190,
    height: 190,
  },
  progressRing: {
    position: "absolute",
  },
  roamingOrbTip: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.gold,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    shadowColor: "#FF6D00",
    shadowOpacity: 0.95,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  aruInOrb: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  phaseBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.surfaceLow,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    borderTopColor: "#FFFFFF",
    alignSelf: "center",
    shadowColor: "#8C4010",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  phaseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  phaseText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  phaseBadgeSep: {
    fontSize: 14,
    color: C.muted,
    fontWeight: "300",
  },
  phaseBadgeSec: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "300",
  },
  phaseBadgeUnit: {
    fontSize: 13,
    color: C.inkSoft,
    fontWeight: "700",
    marginTop: 2,
  },
  prompt: {
    marginHorizontal: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: C.surfaceLow,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderTopColor: "#FFFFFF",
    alignItems: "center",
    shadowColor: "#8C4010",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 14,
  },
  promptText: {
    fontSize: 13.5,
    lineHeight: 19,
    color: C.inkSoft,
    textAlign: "center",
  },
  cycleCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(216, 144, 64, 0.25)",
    borderBottomWidth: 2.5,
    shadowColor: "#8C4010",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 14,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 1.3,
    color: C.inkSoft,
  },
  pattern: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 1.3,
    color: C.primary,
  },
  phaseGrid: {
    flexDirection: "row",
    gap: 8,
  },
  phaseTile: {
    flex: 1,
    minHeight: 70,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  phaseTileActive: {
    backgroundColor: C.saffron,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.85)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "#A8470C",
    borderBottomWidth: 3,
    shadowColor: C.saffron,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  phaseTileIdle: {
    backgroundColor: C.surfaceContainer,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(216, 144, 64, 0.2)",
    borderBottomWidth: 2,
  },
  phaseTileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  phaseTileTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: C.inkSoft,
  },
  phaseTileTitleActive: {
    color: C.white,
  },
  phaseTileSub: {
    fontSize: 12.5,
    color: C.muted,
    marginTop: 2,
  },
  phaseTileSubActive: {
    color: C.white,
    fontWeight: "700",
  },
  // ── Integrated inline stats row inside the cycle card ──
  inlineStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.divider,
    gap: 14,
  },
  inlineStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inlineStatLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.inkSoft,
  },
  inlineStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: C.divider,
  },
  // ── Action row ──
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  pauseButton: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    backgroundColor: C.surfaceContainer,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(216, 144, 64, 0.25)",
    borderBottomWidth: 2.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#8C4010",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pauseText: {
    fontSize: 15.5,
    fontWeight: "800",
    color: C.ink,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  // ── Celebration overlay ──
  celebrationCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(216, 144, 64, 0.25)",
    borderBottomWidth: 3,
    shadowColor: "#8C4010",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    marginBottom: 18,
    overflow: "hidden",
  },
  celebrationInner: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  celebrationIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.6)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: C.greenDark,
    borderBottomWidth: 3,
    shadowColor: C.green,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  celebrationTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: C.ink,
    marginBottom: 6,
  },
  celebrationSub: {
    fontSize: 14,
    lineHeight: 20,
    color: C.inkSoft,
    textAlign: "center",
    marginBottom: 22,
  },
  continueButton: {
    width: "100%",
    height: 52,
    borderRadius: 999,
    backgroundColor: C.saffron,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.5)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "#A8470C",
    borderBottomWidth: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: C.saffron,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
    marginBottom: 12,
  },
  continueText: {
    fontSize: 16,
    fontWeight: "800",
    color: C.white,
  },
  restartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  restartText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.inkSoft,
  },
});
