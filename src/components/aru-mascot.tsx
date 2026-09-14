/**
 * AruMascot — reusable mascot video player, zero background.
 *
 * Usage:
 *   <AruMascot clip="alarm_sleepy_idle" size={260} loop />
 *   <AruMascot clip="night_reflection_lamp" size={220} loop glow="night" />
 */

import { Image as ExpoImage } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

// ─── Asset maps ───────────────────────────────────────────────────────────────
const CLIP_ASSETS: Partial<Record<AruClip, number>> = {
  alarm_sleepy_idle:      require('@/assets/aru/video/transparent-optimized/aru_alarm_sleepy_idle.webp'),
  start_my_day_wake:      require('@/assets/aru/video/transparent-optimized/aru_start_my_day_wake.webp'),
  breathing_loop:         require('@/assets/aru/video/transparent-optimized/aru_breathing_loop.webp'),
  gita_reading:           require('@/assets/aru/video/transparent-optimized/aru_gita_reading_open_book.webp'),
  tasks_pointing:         require('@/assets/aru/video/transparent-optimized/aru_tasks_pointing.webp'),
  task_completed_namaste: require('@/assets/aru/video/transparent-optimized/aru_task_completed_namaste.webp'),
  streak_celebration:     require('@/assets/aru/video/transparent-optimized/aru_streak_celebration.webp'),
  night_reflection_lamp:  require('@/assets/aru/video/transparent-optimized/aru_night_reflection_lamp.webp'),
  teaching_guidance:      require('@/assets/aru/video/transparent-optimized/aru_teaching_guidance.webp'),
  happy_standing:         require('@/assets/aru/video/transparent-optimized/aru_happy_standing.webp'),
};

// ─── Types ────────────────────────────────────────────────────────────────────
export type AruClip =
  | 'alarm_sleepy_idle'
  | 'start_my_day_wake'
  | 'breathing_loop'
  | 'gita_reading'
  | 'tasks_pointing'
  | 'task_completed_namaste'
  | 'streak_celebration'
  | 'night_reflection_lamp'
  | 'teaching_guidance'
  | 'happy_standing';

export interface AruMascotProps {
  clip: AruClip;
  size?: number;
  loop?: boolean;
  muted?: boolean;
  glow?: 'day' | 'night' | false;
  onEnd?: () => void;
  onPress?: () => void;
  interactive?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function AruMascot({
  clip,
  size = 240,
  glow = false,
  onPress,
  interactive = true,
}: AruMascotProps) {
  const animationAsset = CLIP_ASSETS[clip];

  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(0.6)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,   duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();

    if (glow) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1,   duration: 2800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.6, duration: 2800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ).start();
    }
  }, [floatAnim, glowAnim, glow]);

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.08, friction: 3, tension: 200, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
    ]).start();

    if (onPress) {
      onPress();
    }
  };

  return (
    <Animated.View style={[styles.wrapper, { width: size, height: size }, { transform: [{ translateY: floatAnim }, { scale: scaleAnim }] }]}>
      {glow !== false && glow !== undefined && (
        <Animated.View
          style={[
            styles.glowBlob,
            {
              width: size * 1.1,
              height: size * 0.55,
              bottom: -size * 0.04,
              opacity: glowAnim,
            },
          ]}
          pointerEvents="none"
        >
          <Svg width="100%" height="100%" viewBox="0 0 200 120">
            <Defs>
              <RadialGradient
                id={glow === 'night' ? "aruNightGlow" : "aruDayGlow"}
                cx="50%"
                cy="50%"
                rx="50%"
                ry="50%"
                fx="50%"
                fy="50%"
              >
                {glow === 'night' ? [
                  <Stop key="n1" offset="0%" stopColor="#8E99C7" stopOpacity="0.45" />,
                  <Stop key="n2" offset="50%" stopColor="#7D86A9" stopOpacity="0.18" />,
                  <Stop key="n3" offset="100%" stopColor="#7D86A9" stopOpacity="0" />,
                ] : [
                  <Stop key="d1" offset="0%" stopColor="#FFB338" stopOpacity="0.55" />,
                  <Stop key="d2" offset="50%" stopColor="#F4A028" stopOpacity="0.22" />,
                  <Stop key="d3" offset="100%" stopColor="#F4A028" stopOpacity="0" />,
                ]}
              </RadialGradient>
            </Defs>
            <Ellipse
              cx="100"
              cy="60"
              rx="100"
              ry="60"
              fill={glow === 'night' ? "url(#aruNightGlow)" : "url(#aruDayGlow)"}
            />
          </Svg>
        </Animated.View>
      )}
      <View style={styles.videoWrap}>
        {animationAsset !== undefined ? (
          interactive ? (
            <Pressable onPress={handlePress} style={{ width: size, height: size }}>
              <ExpoImage source={animationAsset} style={{ width: size, height: size }} contentFit="contain" autoplay />
            </Pressable>
          ) : (
            <ExpoImage source={animationAsset} style={{ width: size, height: size }} contentFit="contain" autoplay />
          )
        ) : (
          <AruPlaceholder size={size} glow={glow} />
        )}
      </View>
    </Animated.View>
  );
}

// ─── Placeholder ─────────────────────────────────────────────────────────────
function AruPlaceholder({ size, glow }: { size: number; glow: AruMascotProps['glow'] }) {
  const emoji = glow === 'night' ? '🪔' : '😴';
  return (
    <View style={[styles.placeholder, { width: size, height: size }]}>
      <Animated.Text style={{ fontSize: size * 0.5 }}>{emoji}</Animated.Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper:     { alignItems: 'center', justifyContent: 'center' },
  glowBlob:    { position: 'absolute', alignSelf: 'center' },
  videoWrap:   { backgroundColor: 'transparent' },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
});
