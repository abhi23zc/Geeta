import { useLanguage } from '@/i18n/provider';
import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import {
  CheckCircle2,
  ChevronLeft,
  Leaf,
  PauseCircle,
  RotateCcw,
  Sparkles,
  Timer,
  Wind,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { AruMascot } from "@/components/aru-mascot";
import { Screen, TextR } from "@/components/ritual-ui";
import { C } from "@/constants/ritual-theme";
import { replaceAppRoute } from "@/navigation/route-actions";
import { getAlarmPresentationState, setAlarmRitualStage } from "@/services/alarm";
import { useGitaProgress } from "@/state/gita-store";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
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
    seconds: 6,
    prompt: "Slowly release breath through nose, relaxing mind and shoulders.",
    Icon: Leaf,
    accentColor: "#D96B43",
  },
] as const;

const TOTAL_ROUNDS = 5;
const ROUND_DURATION_SEC = 14; // 4s + 4s + 6s
const TOTAL_SESSION_SEC = TOTAL_ROUNDS * ROUND_DURATION_SEC; // 70s
const PREPARATION_SECONDS = 3;
type BreathingLifecycle = "preparing" | "active" | "paused" | "complete";

// ─── 3D Tactile Round Button ──────────────────────────────────────────────────
function TactileRoundButton({
  onPress,
  children,
  size = 42,
  style,
  accessibilityLabel,
}: {
  onPress: () => void;
  children: React.ReactNode;
  size?: number;
  style?: any;
  accessibilityLabel?: string;
}) {
  const { text: translateText } = useLanguage();
  const pressed = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withSpring(pressed.value ? 2.5 : 0, {
          damping: 14,
          stiffness: 240,
        }),
      },
      {
        scale: withSpring(pressed.value ? 0.94 : 1, {
          damping: 14,
          stiffness: 240,
        }),
      },
    ],
    shadowOffset: {
      width: 0,
      height: withSpring(pressed.value ? 1.5 : 4, {
        damping: 14,
        stiffness: 240,
      }),
    },
    shadowOpacity: withSpring(pressed.value ? 0.08 : 0.16, {
      damping: 14,
      stiffness: 240,
    }),
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={translateText(accessibilityLabel)}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      style={[
        s.tactileBtnBase,
        { width: size, height: size, borderRadius: size / 2 },
        animStyle,
        style,
      ]}
    >
      <View style={s.btnGlossHighlight} />
      {children}
      <View style={s.btnBottomBevel} />
    </AnimatedPressable>
  );
}

export default function Breathe() {
  const { t: translate, text: translateText } = useLanguage();
  const navigation = useNavigation("/");
  const { width, height } = useWindowDimensions();
  const isSmall = width < 360;
  const isTablet = width >= 768;
  const isCompact = height < 750;
  const isTall = height >= 820;

  const { completeBreathing } = useGitaProgress();
  const { entry } = useLocalSearchParams<{ entry?: "alarm" | "manual" }>();

  const [lifecycle, setLifecycle] = useState<BreathingLifecycle>("preparing");
  const [preparationSecondsLeft, setPreparationSecondsLeft] = useState(PREPARATION_SECONDS);
  const preparationRemaining = useRef(PREPARATION_SECONDS);
  const [elapsedTotalSeconds, setElapsedTotalSeconds] = useState(0);
  const elapsed = useRef(0);
  const [focused, setFocused] = useState(false);
  const focusedRef = useRef(false);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const completionHandled = useRef(false);
  const appState = useRef(AppState.currentState);
  const resumeOnForeground = useRef(false);

  const preparing = lifecycle === "preparing";
  const active = lifecycle === "active" && focused && foreground;
  const complete = lifecycle === "complete";

  // Derive the phase from one clock so every round stays exactly 4–4–6.
  const roundSecond = Math.min(elapsedTotalSeconds, TOTAL_SESSION_SEC - 1) % ROUND_DURATION_SEC;
  const phaseIndex = roundSecond < 4 ? 0 : roundSecond < 8 ? 1 : 2;
  const secondsLeft = (phaseIndex === 0 ? 4 : phaseIndex === 1 ? 8 : 14) - roundSecond;
  const phase = phases[phaseIndex];
  const remainingPhaseSeconds = useRef(secondsLeft);
  useEffect(() => {
    remainingPhaseSeconds.current = secondsLeft;
  }, [secondsLeft]);
  const currentRound = Math.min(
    TOTAL_ROUNDS,
    Math.floor(elapsedTotalSeconds / ROUND_DURATION_SEC) + 1,
  );

  // Responsive ring & stage sizing for rich, non-blank, zero-scroll single-viewport
  const ringSize = isSmall
    ? 168
    : isCompact
      ? 185
      : isTablet
        ? 280
        : isTall
          ? 250
          : 220;
  const rInner = Math.round(ringSize * 0.40);
  const circlePerimeter = 2 * Math.PI * rInner;
  const mascotSize = isSmall
    ? 128
    : isCompact
      ? 142
      : isTablet
        ? 220
        : isTall
          ? 195
          : 172;
  const orbStageHeight = isSmall
    ? 180
    : isCompact
      ? 200
      : isTablet
        ? 300
        : isTall
          ? 270
          : 236;
  const ringCenter = ringSize / 2;

  // 60 FPS Reanimated Shared Values
  const orbScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);
  const progressVal = useSharedValue(0);
  const celebrateScale = useSharedValue(0.7);

  // Smooth Ring Sweep: Inhale -> Half Circle (0.5), Hold -> Stop at 0.5, Exhale -> Complete Full Circle (1.0)
  useEffect(() => {
    if (!active) {
      cancelAnimation(progressVal);
      cancelAnimation(orbScale);
      cancelAnimation(glowOpacity);
      if (preparing) {
        progressVal.value = 0;
        orbScale.value = 1;
        glowOpacity.value = 0.5;
      }
      return;
    }

    if (phase.key === "inhale") {
      // Inhale: fill from current progress up to exactly 0.5 (half circle)
      const currentFrac = 0.5 * (1 - remainingPhaseSeconds.current / phase.seconds);
      progressVal.value = currentFrac;
      progressVal.value = withTiming(0.5, {
        duration: remainingPhaseSeconds.current * 1000,
        easing: Easing.linear,
      });

      orbScale.value = withTiming(1.15, {
        duration: remainingPhaseSeconds.current * 1000,
        easing: Easing.inOut(Easing.ease),
      });
      glowOpacity.value = withTiming(0.85, {
        duration: remainingPhaseSeconds.current * 1000,
      });
    } else if (phase.key === "hold") {
      // Hold: ring stops completely at 0.5 (half circle)
      progressVal.value = 0.5;

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
      // Exhale: continue from 0.5 to 1.0 (completing the full circle)
      const currentFrac = 0.5 + 0.5 * (1 - remainingPhaseSeconds.current / phase.seconds);
      progressVal.value = currentFrac;
      progressVal.value = withTiming(1.0, {
        duration: remainingPhaseSeconds.current * 1000,
        easing: Easing.linear,
      });

      orbScale.value = withTiming(0.92, {
        duration: remainingPhaseSeconds.current * 1000,
        easing: Easing.inOut(Easing.ease),
      });
      glowOpacity.value = withTiming(0.38, {
        duration: remainingPhaseSeconds.current * 1000,
      });
    }

    return () => {
      cancelAnimation(progressVal);
      cancelAnimation(orbScale);
      cancelAnimation(glowOpacity);
    };
  }, [active, preparing, glowOpacity, orbScale, phase.key, phase.seconds, phaseIndex, progressVal]);

  // Practice time advances only while visible and active.
  useEffect(() => {
    if (!active) return;

    const id = setInterval(() => {
      if (appState.current !== "active" || !focusedRef.current) return;
      elapsed.current = Math.min(elapsed.current + 1, TOTAL_SESSION_SEC);
      setElapsedTotalSeconds(elapsed.current);
      if (elapsed.current === TOTAL_SESSION_SEC) setLifecycle("complete");
    }, 1000);

    return () => clearInterval(id);
  }, [active]);

  // Preparation seconds countdown with tactile pulses.
  useEffect(() => {
    if (!preparing || !focused || !foreground) return;
    let remaining = preparationRemaining.current;
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const timer = setInterval(() => {
      if (appState.current !== "active" || !focusedRef.current) return;
      remaining -= 1;
      preparationRemaining.current = remaining;
      if (remaining === 0) {
        clearInterval(timer);
        try {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {}
        setLifecycle("active");
      } else {
        try {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
        setPreparationSecondsLeft(remaining);
      }
    }, 1_000);
    return () => clearInterval(timer);
  }, [focused, foreground, preparing]);

  useFocusEffect(useCallback(() => {
    focusedRef.current = true;
    setFocused(true);
    return () => {
      focusedRef.current = false;
      setFocused(false);
      preparationRemaining.current = PREPARATION_SECONDS;
      setPreparationSecondsLeft(PREPARATION_SECONDS);
      setLifecycle((current) => current === "active" ? "paused" : current);
    };
  }, []));

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasActive = appState.current === 'active';
      appState.current = nextState;
      setForeground(nextState === "active");
      if (nextState !== 'active') {
        if (wasActive) resumeOnForeground.current = lifecycle === 'active' && getAlarmPresentationState().active;
        setLifecycle(current => current === 'active' ? 'paused' : current);
      } else {
        const resume = resumeOnForeground.current && focusedRef.current;
        resumeOnForeground.current = false;
        setLifecycle(current => resume && current === 'paused' ? 'active' : current);
      }
    });
    return () => subscription.remove();
  }, [lifecycle]);

  // Distinct Sensory Tactile Haptics on Breath Phase Transitions
  const prevPhaseKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!active) {
      prevPhaseKeyRef.current = null;
      return;
    }

    if (prevPhaseKeyRef.current !== phase.key) {
      prevPhaseKeyRef.current = phase.key;
      try {
        if (phase.key === "inhale") {
          // Inhale: Medium crisp pulse to begin drawing the deep breath
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else if (phase.key === "hold") {
          // Hold: Rigid/firm tactile stop at the crest of the breath
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
        } else if (phase.key === "exhale") {
          // Exhale: Soft releasing pulse to signal the slow breath release
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch {}
    }
  }, [active, phase.key]);

  // Completion handler
  useEffect(() => {
    if (!complete || completionHandled.current) return;
    completionHandled.current = true;

    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    completeBreathing();

    celebrateScale.value = withSequence(
      withTiming(1.15, { duration: 400, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) }),
    );
  }, [complete, completeBreathing, celebrateScale]);

  // Animated circle dash offset
  const animatedCircleProps = useAnimatedProps(() => {
    const strokeDashoffset =
      circlePerimeter - circlePerimeter * progressVal.value;
    return {
      strokeDashoffset,
    };
  });

  // Roaming Gold Tip Orb
  const animatedRoamingOrbStyle = useAnimatedStyle(() => {
    const angleRad = -Math.PI / 2 + progressVal.value * (2 * Math.PI);
    const cx = ringCenter + rInner * Math.cos(angleRad);
    const cy = ringCenter + rInner * Math.sin(angleRad);

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
    setLifecycle("preparing");
    preparationRemaining.current = PREPARATION_SECONDS;
    setPreparationSecondsLeft(PREPARATION_SECONDS);
    elapsed.current = 0;
    setElapsedTotalSeconds(0);
    completionHandled.current = false;
    // eslint-disable-next-line react-hooks/immutability
    celebrateScale.value = 0.7;
  }, [celebrateScale]);

  const handleContinueToGita = useCallback(() => {
    setLifecycle("paused");
    void setAlarmRitualStage('gita').then(() => {
      if (!navigation.isFocused()) return;
      replaceAppRoute(navigation, "/gita", {
        entry: entry === "alarm" ? "alarm" : "manual",
      });
    }).catch(error => console.error(translate("Could not open Gita practice"), error));
  }, [entry, navigation, translate]);

  const exitToHome = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    replaceAppRoute(navigation, "/");
  }, [navigation]);

  const formatMinSec = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const headerBtnSize = isSmall ? 36 : isTablet ? 46 : isCompact ? 38 : 42;
  const headerIconSize = isSmall ? 16 : isTablet ? 20 : 18;

  return (
    <Screen scroll={false}>
      <View style={s.singleViewportContainer}>
        {/* ─── 1. Top Header Row with Addictive 5-Bead Sadhana Tracker ────────── */}
        <View style={s.topHeaderRow}>
          <TactileRoundButton
            onPress={exitToHome}
            accessibilityLabel={translate("Back to Home")}
            size={headerBtnSize}
          >
            <ChevronLeft size={headerIconSize} color={C.ink} />
          </TactileRoundButton>

          {/* 5-Bead Glowing Sadhana Round Flow Altar */}
          <View style={[s.beadTrackerPill, isSmall && { paddingHorizontal: 9, paddingVertical: 5 }]}>
            <TextR style={[s.beadTrackerText, isSmall && { fontSize: 10 }]}>
               {translate("Round")} {currentRound}/{TOTAL_ROUNDS}
            </TextR>
            <View style={s.beadsRow}>
              {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => {
                const isCompleted = i + 1 < currentRound || complete;
                const isCurrent = i + 1 === currentRound && !complete;
                return (
                  <View
                    key={i}
                    style={[
                      s.beadDot,
                      isCompleted && s.beadDotCompleted,
                      isCurrent && s.beadDotCurrent,
                    ]}
                  >
                    {isCompleted && <View style={s.beadSpark} />}
                    {isCurrent && <View style={s.beadActiveCore} />}
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* ─── 2. Meditative Dais & Aru Breathing Sanctum ────────────────────── */}
        <View style={s.sanctumCenter}>
          <View style={[s.orbStage, { height: orbStageHeight }]}>
            {/* Outer Pulsing Ambient Light Aura */}
            <Animated.View
              style={[
                s.glowOuter,
                {
                  width: ringSize + 16,
                  height: ringSize + 16,
                  borderRadius: (ringSize + 16) / 2,
                },
                animatedGlowStyle,
              ]}
            />
            <Animated.View
              style={[
                s.glowMiddle,
                {
                  width: ringSize - 16,
                  height: ringSize - 16,
                  borderRadius: (ringSize - 16) / 2,
                },
                animatedOrbStyle,
              ]}
            />

            {/* SVG Progress Ring */}
            <Animated.View
              style={[
                s.ringWrapper,
                { width: ringSize, height: ringSize },
                animatedOrbStyle,
              ]}
            >
              <Svg width={ringSize} height={ringSize} style={s.progressRing}>
                <Defs>
                  <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#FFEA00" />
                    <Stop offset="50%" stopColor={C.saffron} />
                    <Stop offset="100%" stopColor="#D84315" />
                  </LinearGradient>
                </Defs>
                <Circle
                  cx={ringCenter}
                  cy={ringCenter}
                  r={rInner}
                  stroke="#F2DFD1"
                  strokeWidth={isSmall ? 4 : isTablet ? 6 : 4.5}
                  strokeDasharray="4 9"
                  fill="none"
                />
                <AnimatedCircle
                  cx={ringCenter}
                  cy={ringCenter}
                  r={rInner}
                  stroke="url(#ringGrad)"
                  strokeWidth={isSmall ? 6.5 : isTablet ? 9 : 7.5}
                  strokeDasharray={circlePerimeter}
                  animatedProps={animatedCircleProps}
                  strokeLinecap="round"
                  fill="none"
                  rotation="-90"
                  origin={`${ringCenter},${ringCenter}`}
                />
              </Svg>

              {/* Smooth Roaming Gold Tip Orb */}
              <Animated.View
                style={[s.roamingOrbTip, animatedRoamingOrbStyle]}
                pointerEvents="none"
              />

              {/* Aru meditating inside the ring OR Big Countdown Numeral while preparing */}
              <View style={s.aruInOrb}>
                {preparing ? (
                  <Animated.View
                    key={`prep-stage-${preparationSecondsLeft}`}
                    entering={FadeIn.duration(220)}
                    style={s.countdownHeroStage}
                  >
                    <TextR
                      serif
                      style={[
                        s.countdownBigNumber,
                        isSmall && { fontSize: 58, lineHeight: 64 },
                        isTablet && { fontSize: 94, lineHeight: 102 },
                        isTall && { fontSize: 82, lineHeight: 90 },
                      ]}
                    >
                      {preparationSecondsLeft}
                    </TextR>
                    <TextR
                      style={[
                        s.countdownBigSub,
                        isSmall && { fontSize: 10.5 },
                        isTall && { fontSize: 13 },
                      ]}
                    >
                       {translate("GET READY")} </TextR>
                  </Animated.View>
                ) : (
                  <Animated.View entering={FadeIn.duration(400)}>
                    <AruMascot
                      clip="breathing_loop"
                      size={mascotSize}
                      loop
                      muted
                      glow={false}
                      interactive={false}
                    />
                  </Animated.View>
                )}
              </View>
            </Animated.View>
          </View>

          {/* Phase + Large Serene Countdown Badge */}
          <View
            style={[
              s.phaseBadge,
              isSmall && { paddingHorizontal: 12, paddingVertical: 4.5, marginBottom: 6 },
              isTablet && { paddingHorizontal: 20, paddingVertical: 8, marginBottom: 12 },
            ]}
            accessibilityLiveRegion="polite"
          >
            <View
              style={[
                s.phaseDot,
                { backgroundColor: preparing ? C.saffron : phase.accentColor },
              ]}
            />
            <TextR
              style={[
                s.phaseText,
                isSmall && { fontSize: 11.5 },
                isTablet && { fontSize: 14.5 },
                { color: preparing ? C.saffron : phase.accentColor },
              ]}
            >
              {preparing ? translate("PREPARE YOUR BREATH") : translateText(phase.label).toUpperCase()}
            </TextR>
            {!preparing && (
              <>
                <TextR style={s.phaseBadgeSep}>·</TextR>
                <TextR
                  serif
                  style={[
                    s.phaseBadgeSec,
                    isSmall && { fontSize: 19 },
                    isTablet && { fontSize: 25 },
                    { color: phase.accentColor },
                  ]}
                >
                  {String(secondsLeft).padStart(2, "0")}
                </TextR>
                <TextR
                  style={[
                    s.phaseBadgeUnit,
                    isSmall && { fontSize: 11.5 },
                    isTablet && { fontSize: 14 },
                  ]}
                >
                  s
                </TextR>
              </>
            )}
          </View>

          {/* Guided Instruction Prompt Pill */}
          <View
            style={[
              s.prompt,
              isSmall && { marginHorizontal: 2, paddingHorizontal: 12, paddingVertical: 7 },
              isTablet && { marginHorizontal: 16, paddingHorizontal: 20, paddingVertical: 12 },
            ]}
          >
            <TextR
              style={[
                s.promptText,
                isSmall && { fontSize: 11.5, lineHeight: 16 },
                isTablet && { fontSize: 14.5, lineHeight: 20 },
              ]}
            >
              {preparing
                ? translate("Sit comfortably. Follow Aru: inhale 4, hold 4, exhale 6.")
                : translateText(phase.prompt)}
            </TextR>
          </View>
        </View>

        {/* ─── 3. Connected 3-Phase Flow Ribbon & Session Tracker ─────────────── */}
        <View style={[s.flowRibbonCard, isSmall && { padding: 9, borderRadius: 18 }]}>
          <View style={[s.flowStepsRow, isSmall && { gap: 4 }]}>
            {phases.map((item, index) => {
              const isActive = !preparing && index === phaseIndex;
              return (
                <React.Fragment key={item.key}>
                  <View
                    style={[
                      s.flowStepItem,
                      isSmall && { paddingVertical: 6, paddingHorizontal: 6, borderRadius: 12 },
                      isActive ? s.flowStepItemActive : s.flowStepItemIdle,
                    ]}
                  >
                    <item.Icon
                      size={isSmall ? 13 : isTablet ? 18 : 15}
                      color={isActive ? C.white : C.inkSoft}
                    />
                    <TextR
                      style={[
                        s.flowStepTitle,
                        isSmall && { fontSize: 11.5 },
                        isTablet && { fontSize: 15 },
                        isActive && s.flowStepTitleActive,
                      ]}
                    >
                      {translateText(item.label)}
                    </TextR>
                    <TextR
                      style={[
                        s.flowStepSec,
                        isSmall && { fontSize: 10 },
                        isTablet && { fontSize: 12.5 },
                        isActive && s.flowStepSecActive,
                      ]}
                    >
                      {item.seconds}s
                    </TextR>
                  </View>

                  {index < phases.length - 1 && (
                    <View style={s.flowConnector}>
                      <View
                        style={[
                          s.flowConnectorLine,
                          index < phaseIndex && s.flowConnectorLineActive,
                        ]}
                      />
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* Integrated Session Progress Bar */}
          <View style={[s.flowFooterRow, isSmall && { marginTop: 8, paddingTop: 6 }]}>
            <View style={s.flowFooterItem}>
              <Timer size={isSmall ? 11 : 13} color="#9A3C08" />
              <TextR style={[s.flowFooterText, isSmall && { fontSize: 10.5 }, isTablet && { fontSize: 13 }]}>
                {formatMinSec(elapsedTotalSeconds)} / {formatMinSec(TOTAL_SESSION_SEC)}
              </TextR>
            </View>
            <View style={s.flowPatternBadge}>
              <Sparkles size={isSmall ? 9 : 11} color="#C2410C" />
              <TextR style={[s.flowPatternKicker, isSmall && { fontSize: 9 }, isTablet && { fontSize: 11.5 }]}>
                 {translate("4 · 4 · 6 PRANAYAMA")} </TextR>
            </View>
          </View>
        </View>

        {/* ─── 4. Session Complete Modal ────────────────────────────────────── */}
        <Modal
          visible={complete}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={handleRestart}
        >
          <View style={s.modalBackdrop}>
            <Animated.View
              entering={FadeIn.duration(350)}
              style={[
                s.celebrationCard,
                isSmall && { borderRadius: 22 },
                isTablet && { borderRadius: 32 },
              ]}
            >
              <Animated.View style={[s.celebrationInner, animatedCelebrateStyle]}>
                <View style={[s.celebrationIconWrap, isSmall && { width: 54, height: 54, borderRadius: 27 }]}>
                  <CheckCircle2 size={isSmall ? 30 : 36} color={C.white} strokeWidth={2.5} />
                </View>
                <TextR style={[s.celebrationTitle, isSmall && { fontSize: 19 }, isTablet && { fontSize: 25 }]}>
                   {translate("Prana Awakened")} </TextR>
                <TextR style={[s.celebrationSub, isSmall && { fontSize: 12.5, marginBottom: 16 }, isTablet && { fontSize: 15.5 }]}>
                  {TOTAL_ROUNDS}  {translate("rounds completed ·")} {formatMinSec(TOTAL_SESSION_SEC)}{" "}
                   {translate("of mindful breathing")} </TextR>

                {/* Continue to Gita (primary action) */}
                <Pressable
                  onPress={handleContinueToGita}
                  style={({ pressed }) => [
                    s.continueButton,
                    isSmall && { height: 48 },
                    isTablet && { height: 56 },
                    pressed && s.pressed,
                  ]}
                >
                  <TextR style={[s.continueText, isSmall && { fontSize: 14.5 }, isTablet && { fontSize: 17 }]}>
                     {translate("Continue to Gita")} </TextR>
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
                  <TextR style={[s.restartText, isSmall && { fontSize: 13 }, isTablet && { fontSize: 15 }]}>
                     {translate("Breathe Again")} </TextR>
                </Pressable>
              </Animated.View>
            </Animated.View>
          </View>
        </Modal>
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
    paddingHorizontal: 2,
    paddingTop: 2,
  },

  // ─── Header & Sadhana Bead Tracker ──────────────────────────────────────────
  topHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  beadTrackerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255, 248, 240, 0.95)",
    borderWidth: 1.2,
    borderColor: "rgba(229, 107, 39, 0.25)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(216, 144, 64, 0.35)",
    borderBottomWidth: 2,
    shadowColor: C.saffron,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  beadTrackerText: {
    color: "#9A3C08",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  beadsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  beadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "rgba(216, 144, 64, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(216, 144, 64, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  beadDotCompleted: {
    backgroundColor: C.saffron,
    borderColor: "#D97706",
    shadowColor: C.saffron,
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  beadDotCurrent: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: "rgba(254, 236, 220, 0.95)",
    borderColor: C.saffron,
    borderWidth: 1.5,
  },
  beadSpark: {
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
    backgroundColor: "#FFFFFF",
  },
  beadActiveCore: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: C.saffron,
  },

  // ─── 3D Tactile Button Base ────────────────────────────────────────────────
  tactileBtnBase: {
    backgroundColor: "rgba(255, 250, 245, 0.96)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(180, 125, 95, 0.35)",
    borderBottomWidth: 2.5,
    shadowColor: "#7D4018",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  btnGlossHighlight: {
    position: "absolute",
    top: 0,
    left: 4,
    right: 4,
    height: 11,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
  },
  btnBottomBevel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(140, 64, 16, 0.08)",
  },

  // ─── Sanctum Center ────────────────────────────────────────────────────────
  sanctumCenter: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  orbStage: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 6,
  },
  glowOuter: {
    position: "absolute",
    backgroundColor: "#FFE6CF",
    shadowColor: C.saffron,
    shadowOpacity: 0.32,
    shadowRadius: 36,
    elevation: 4,
  },
  glowMiddle: {
    position: "absolute",
    backgroundColor: "#FFF2E9",
    borderWidth: 12,
    borderColor: "#FFE6D3",
    opacity: 0.94,
  },
  ringWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  progressRing: {
    position: "absolute",
  },
  roamingOrbTip: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
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
  countdownHeroStage: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  countdownBigNumber: {
    fontSize: 72,
    lineHeight: 78,
    fontWeight: "300",
    color: C.saffron,
    letterSpacing: -2,
    textAlign: "center",
  },
  countdownBigSub: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#9A3C08",
    textAlign: "center",
    marginTop: -2,
  },
  phaseBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255, 250, 245, 0.95)",
    marginBottom: 10,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(216, 144, 64, 0.3)",
    borderBottomWidth: 2,
    alignSelf: "center",
    shadowColor: "#8C4010",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phaseText: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  phaseBadgeSep: {
    fontSize: 15,
    color: C.muted,
    fontWeight: "300",
  },
  phaseBadgeSec: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "300",
  },
  phaseBadgeUnit: {
    fontSize: 14,
    color: C.inkSoft,
    fontWeight: "700",
    marginTop: 2,
  },
  prompt: {
    marginHorizontal: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(254, 244, 234, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(229, 107, 39, 0.18)",
    borderTopColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    shadowColor: "#8C4010",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  promptText: {
    fontSize: 13.5,
    lineHeight: 19,
    color: "#5C3826",
    textAlign: "center",
    fontWeight: "600",
  },

  // ─── Connected 3-Phase Flow Ribbon ──────────────────────────────────────────
  flowRibbonCard: {
    backgroundColor: "rgba(255, 252, 248, 0.98)",
    borderRadius: 24,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(216, 144, 64, 0.35)",
    borderBottomWidth: 3,
    shadowColor: "#8C4010",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    marginBottom: 4,
  },
  flowStepsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  flowStepItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 15,
  },
  flowStepItemActive: {
    backgroundColor: C.saffron,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderBottomColor: "#A8470C",
    borderBottomWidth: 2.5,
    shadowColor: C.saffron,
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  flowStepItemIdle: {
    backgroundColor: "rgba(254, 238, 225, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  flowStepTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#7D5036",
    marginTop: 2,
  },
  flowStepTitleActive: {
    color: C.white,
    fontWeight: "900",
  },
  flowStepSec: {
    fontSize: 11.5,
    color: C.muted,
    marginTop: 1,
    fontWeight: "600",
  },
  flowStepSecActive: {
    color: "rgba(255, 255, 255, 0.92)",
    fontWeight: "700",
  },
  flowConnector: {
    width: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  flowConnectorLine: {
    width: "100%",
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(216, 144, 64, 0.25)",
  },
  flowConnectorLineActive: {
    backgroundColor: C.saffron,
  },
  flowFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "rgba(216, 144, 64, 0.15)",
    paddingHorizontal: 4,
  },
  flowFooterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  flowFooterText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#7D4A26",
  },
  flowPatternBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  flowPatternKicker: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#C2410C",
    letterSpacing: 1.1,
  },

  // ─── Modal Celebration Dialog ───────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(44, 34, 26, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  celebrationCard: {
    maxWidth: 440,
    width: "100%",
    backgroundColor: C.white,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(216, 144, 64, 0.25)",
    borderBottomWidth: 3.5,
    shadowColor: "#8C4010",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
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
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
