import {
  CheckCircle2,
  Leaf,
  Music,
  Pause,
  PauseCircle,
  Play,
  RotateCcw,
  Timer,
  Volume2,
  VolumeX,
  Wind,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { AruMascot } from "@/components/aru-mascot";
import { AudioSpectrumVisualizer } from "@/components/audio-spectrum-visualizer";
import { Header, Screen, TextR } from "@/components/ritual-ui";
import { C } from "@/constants/ritual-theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const GHAT_IMAGE_URL =
  "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?q=80&w=800&auto=format&fit=crop";

const phases = [
  {
    key: "inhale",
    label: "Inhale",
    seconds: 10,
    prompt:
      "Inhale deeply & gently through nostrils, filling abdomen and chest.",
    Icon: Wind,
    accentColor: C.saffron,
  },
  {
    key: "hold",
    label: "Hold",
    seconds: 10,
    prompt:
      "Gently retain the breath at the crest, resting in absolute tranquility.",
    Icon: PauseCircle,
    accentColor: "#E56B27",
  },
  {
    key: "exhale",
    label: "Exhale",
    seconds: 10,
    prompt: "Slowly release breath through nose, relaxing mind and shoulders.",
    Icon: Leaf,
    accentColor: "#D96B43",
  },
] as const;

// 190px Diameter Circle Settings
const R_INNER = 76;
const CIRCLE_PERIMETER = 2 * Math.PI * R_INNER; // 477.52

export default function Breathe() {
  const insets = useSafeAreaInsets();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [complete, setComplete] = useState(false);

  const phase = phases[phaseIndex];

  // 60 FPS Reanimated Shared Values for Butter-Smooth 60 FPS Sweep
  const orbScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);
  const progressVal = useSharedValue(0);

  // Butter-Smooth 60 FPS Continuous Ring Sweep & Orb Movement
  useEffect(() => {
    if (paused) {
      cancelAnimation(progressVal);
      cancelAnimation(orbScale);
      cancelAnimation(glowOpacity);
      return;
    }

    // Reset & Animate Progress Value smoothly over phase duration (10,000ms)
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
  }, [phaseIndex, paused]);

  // 1-Second Countdown Timer
  useEffect(() => {
    if (paused) return;

    const id = setInterval(() => {
      setSecondsLeft((current) => {
        if (current > 1) {
          return current - 1;
        }

        setPhaseIndex((next) => (next + 1) % phases.length);
        return 10;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [paused]);

  // 60 FPS Reanimated Circle Props (UI Thread smooth stroke)
  const animatedCircleProps = useAnimatedProps(() => {
    const strokeDashoffset =
      CIRCLE_PERIMETER - CIRCLE_PERIMETER * progressVal.value;
    return {
      strokeDashoffset,
    };
  });

  // Smooth Roaming Gold Tip Orb along the 190px Circle Arc
  const animatedRoamingOrbStyle = useAnimatedStyle(() => {
    // Start angle: -90 deg (-PI/2), sweeps 360 deg (+2*PI)
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

          {/* Aru meditating inside the ring — ring becomes his sacred halo */}
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

      {/* Phase + countdown badge — compact info below the ring */}
      <View style={s.phaseBadge}>
        <View style={[s.phaseDot, { backgroundColor: phase.accentColor }]} />
        <TextR style={[s.phaseText, { color: phase.accentColor }]}>
          {phase.label}
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

      {/* Breathing Cycle 3D Control Cards - 10 Sec Pattern */}
      <View style={s.cycleCard}>
        <View style={s.cardTopRow}>
          <TextR style={s.sectionTitle}>BREATHING CYCLE</TextR>
          <TextR style={s.pattern}>10 · 10 · 10 Pattern</TextR>
        </View>
        <View style={s.phaseGrid}>
          {phases.map((item, index) => {
            const isActive = index === phaseIndex;
            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  setPhaseIndex(index);
                  setSecondsLeft(item.seconds);
                }}
                style={({ pressed }) => [
                  s.phaseTile,
                  isActive ? s.phaseTileActive : s.phaseTileIdle,
                  pressed && s.phaseTilePressed,
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
                  10 Sec
                </TextR>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Statistics Grid */}
      <View style={s.statsGrid}>
        <Metric
          icon={<RotateCcw size={19} color="#271900" />}
          iconBg={C.gold}
          label="CURRENT LAP"
          value="Round 3 of 6"
        />
        <Metric
          icon={<Timer size={19} color="#00210A" />}
          iconBg={C.greenLight}
          label="PRANA TIME"
          value="2:30 / 5:00"
        />
      </View>

      {/* Sacred Resonance Audio Pod with Perfect Spectrum Visualizer & Controls */}
      <View style={s.resonanceCard}>
        <View style={s.resonanceLeft}>
          <View style={[s.soundIcon, !muted && s.soundIconActive]}>
            {!muted ? (
              <AudioSpectrumVisualizer
                isPlaying={!muted}
                barCount={5}
                height={16}
              />
            ) : (
              <Music size={18} color={C.muted} />
            )}
          </View>
          <View style={s.resonanceCopy}>
            <TextR style={s.resonanceKicker}>SACRED RESONANCE</TextR>
            <TextR style={s.resonanceTitle}>Tanpura & River Ganga</TextR>
            <TextR style={s.resonanceSub}>432Hz Calm Vibrations</TextR>
          </View>
        </View>

        {/* Live Audio Spectrum Bar & Toggle Control */}
        <View style={s.audioControlsGroup}>
          {!muted && (
            <View style={s.spectrumContainer}>
              <AudioSpectrumVisualizer
                isPlaying={!muted}
                barCount={6}
                height={20}
              />
            </View>
          )}
          <Pressable
            onPress={() => setMuted((value) => !value)}
            style={({ pressed }) => [
              s.volumeBtn,
              !muted && s.volumeBtnActive,
              pressed && { opacity: 0.85 },
            ]}
          >
            {muted ? (
              <VolumeX size={19} color={C.muted} />
            ) : (
              <Volume2 size={19} color={C.white} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Sanctuary Image Banner */}
      <View style={s.imageCard}>
        <Image source={{ uri: GHAT_IMAGE_URL }} style={s.ghatImage} />
        <View style={s.imageOverlay} />
        <View style={s.imageText}>
          <TextR style={s.imageKicker}>VARANASI DAWN SANCTUARY</TextR>
          <TextR style={s.imageSub} numberOfLines={1}>
            Synchronize your soul with sacred river ripples
          </TextR>
        </View>
      </View>

      {/* 3D Action Row Buttons */}
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
        <Pressable
          onPress={() => setComplete((value) => !value)}
          style={({ pressed }) => [s.completeButton, pressed && s.pressed]}
        >
          <CheckCircle2 size={19} color={C.white} />
          <TextR style={s.completeText}>
            {complete ? "Session Complete" : "Complete Session"}
          </TextR>
        </Pressable>
      </View>
    </Screen>
  );
}

function Metric({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <View style={s.metricCard}>
      <View style={[s.metricIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <TextR style={s.metricLabel}>{label}</TextR>
        <TextR style={s.metricValue} numberOfLines={1}>
          {value}
        </TextR>
      </View>
    </View>
  );
}

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
    alignItems: "center",
    justifyContent: "center",
  },
  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  phaseDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.25,
  },
  phaseText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  phaseBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: -4,
    marginBottom: 10,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: C.surfaceLow,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    borderTopColor: "#FFFFFF",
    alignSelf: "center",
    shadowColor: "#8C4010",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
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
  phaseTilePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
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
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 74,
    padding: 12,
    borderRadius: 18,
    backgroundColor: C.surfaceLow,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    shadowColor: "#8C4010",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
    color: C.inkSoft,
  },
  metricValue: {
    fontSize: 16.5,
    lineHeight: 21,
    color: C.ink,
    marginTop: 1,
    fontWeight: "700",
  },
  resonanceCard: {
    minHeight: 80,
    borderRadius: 22,
    backgroundColor: C.white,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    shadowColor: "#8C4010",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 14,
  },
  resonanceLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  soundIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.85)",
    overflow: "hidden",
  },
  soundIconActive: {
    backgroundColor: "rgba(254, 236, 220, 0.95)",
    borderColor: "rgba(229, 107, 39, 0.3)",
  },
  resonanceCopy: {
    flex: 1,
  },
  resonanceKicker: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.7,
    color: C.primary,
  },
  resonanceTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "800",
    color: C.ink,
  },
  resonanceSub: {
    fontSize: 12,
    color: C.inkSoft,
  },
  audioControlsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  spectrumContainer: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(254, 236, 220, 0.6)",
  },
  volumeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.85)",
  },
  volumeBtnActive: {
    backgroundColor: C.saffron,
    borderColor: "#FFFFFF",
    shadowColor: C.saffron,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  imageCard: {
    height: 106,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: C.surfaceContainer,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#8C4010",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  ghatImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(35, 26, 17, 0.42)",
  },
  imageText: {
    position: "absolute",
    left: 15,
    right: 15,
    bottom: 15,
  },
  imageKicker: {
    color: "#FFDEA7",
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  imageSub: {
    color: C.white,
    fontSize: 14,
    marginTop: 2,
    fontWeight: "600",
  },
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
  completeButton: {
    flex: 1.62,
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
  },
  completeText: {
    fontSize: 15.5,
    fontWeight: "800",
    color: C.white,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
