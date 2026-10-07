import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { treeAsset } from './assets';
import { useTreePlaybackLease } from './playback-lease';
import { useTreeEnvironment } from './use-motion';
import { useAlarmPresentation } from '@/navigation/alarm-presentation';
import { recoverySteps } from './session-model';
export function TreeRecovery({ from, to, rollover = false, reducedMotion = false, onEnd }: { from: number; to: number; rollover?: boolean; reducedMotion?: boolean; onEnd: () => void }) {
  const steps = recoverySteps(from, to, rollover);
  const [index, setIndex] = useState(0);
  const [opacity] = useState(() => new Animated.Value(0));
  const { active, reduced, motionReady } = useTreeEnvironment();
  const alarm = useAlarmPresentation();
  const playing = useTreePlaybackLease(active && motionReady && !reduced && !reducedMotion && !alarm.active, 3);
  const step = steps[index];
  useEffect(() => {
    if (!playing) return;
    opacity.setValue(0);
    const animation = Animated.timing(opacity, { toValue: 1, duration: step.duration, useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) { if (index + 1 < steps.length) setIndex(index + 1); else onEnd(); } });
    return () => animation.stop();
  }, [playing, opacity, index, step.duration, steps.length, onEnd]);
  return <View style={{ width: '100%', aspectRatio: 16 / 9, overflow: 'hidden', borderRadius: 16 }}>
    <Image source={treeAsset(playing ? step.from : to).poster} contentFit="contain" style={StyleSheet.absoluteFill} />
    {playing && <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}><Image source={treeAsset(step.to).poster} contentFit="contain" style={StyleSheet.absoluteFill} /></Animated.View>}
  </View>;
}
