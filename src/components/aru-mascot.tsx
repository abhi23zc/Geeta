/**
 * AruMascot — reusable mascot video player, zero background.
 *
 * Usage:
 *   <AruMascot clip="alarm_sleepy_idle" size={260} loop />
 *   <AruMascot clip="night_reflection_lamp" size={220} loop glow="night" />
 */

import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

// ─── Asset map ────────────────────────────────────────────────────────────────
const CLIP_ASSETS: Partial<Record<AruClip, number>> = {
  alarm_sleepy_idle:      require('@/assets/aru/video/aru_alarm_sleepy_idle.mp4'),
  start_my_day_wake:      require('@/assets/aru/video/aru_start_my_day_wake.mp4'),
  breathing_loop:         require('@/assets/aru/video/aru_breathing_loop.mp4'),
  gita_reading:           require('@/assets/aru/video/aru_gita_reading_open_book.mp4'),
  tasks_pointing:         require('@/assets/aru/video/aru_tasks_pointing.mp4'),
  task_completed_namaste: require('@/assets/aru/video/aru_task_completed_namaste.mp4'),
  streak_celebration:     require('@/assets/aru/video/aru_streak_celebration.mp4'),
  night_reflection_lamp:  require('@/assets/aru/video/aru_night_reflection_lamp.mp4'),
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
  | 'night_reflection_lamp';

export interface AruMascotProps {
  clip: AruClip;
  size?: number;
  loop?: boolean;
  muted?: boolean;
  glow?: 'day' | 'night' | false;
  onEnd?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function AruMascot({
  clip,
  size = 240,
  loop = true,
  muted = true,
  glow = false,
  onEnd,
}: AruMascotProps) {
  const assetId = CLIP_ASSETS[clip];
  const hasVideo = assetId !== undefined;

  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(0.6)).current;

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

  const glowColor = glow === 'night'
    ? 'rgba(125, 134, 169, 0.28)'
    : 'rgba(244, 185, 66, 0.30)';

  return (
    <Animated.View style={[styles.wrapper, { width: size, height: size }, { transform: [{ translateY: floatAnim }] }]}>
      {glow !== false && glow !== undefined && (
        <Animated.View
          style={[styles.glowBlob, {
            width: size * 0.85,
            height: size * 0.45,
            borderRadius: (size * 0.85) / 2,
            backgroundColor: glowColor,
            bottom: size * 0.04,
            opacity: glowAnim,
          }]}
        />
      )}
      <View style={styles.videoWrap}>
        {hasVideo ? (
          <VideoPlayer assetId={assetId!} size={size} loop={loop} muted={muted} onEnd={onEnd} />
        ) : (
          <AruPlaceholder size={size} glow={glow} />
        )}
      </View>
    </Animated.View>
  );
}

// ─── Inner video player ───────────────────────────────────────────────────────
function VideoPlayer({ assetId, size, loop, muted, onEnd }: {
  assetId: number; size: number; loop: boolean; muted: boolean; onEnd?: () => void;
}) {
  const player = useVideoPlayer(assetId, (p) => {
    p.loop = loop;
    p.muted = muted;
    p.play();
  });

  useEffect(() => {
    if (!onEnd || loop) return;
    const sub = player.addListener('playToEnd', () => onEnd());
    return () => sub.remove();
  }, [player, loop, onEnd]);

  return (
    <VideoView
      player={player}
      style={{ width: size, height: size, backgroundColor: 'transparent' }}
      nativeControls={false}
      contentFit="contain"
      useExoShutter={false}
    />
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
