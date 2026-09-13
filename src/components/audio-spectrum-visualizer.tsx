import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { C } from '@/constants/ritual-theme';

interface AudioSpectrumVisualizerProps {
  isPlaying: boolean;
  barCount?: number;
  height?: number;
}

function SpectrumBar({
  index,
  isPlaying,
  maxHeight,
}: {
  index: number;
  isPlaying: boolean;
  maxHeight: number;
}) {
  const heightVal = useSharedValue(6);
  const opacityVal = useSharedValue(0.5);

  useEffect(() => {
    if (isPlaying) {
      const targetHeight = Math.max(8, (Math.sin(index * 0.8) + 1.2) * (maxHeight / 2.2));
      const duration = 350 + (index % 5) * 90;

      heightVal.value = withRepeat(
        withSequence(
          withTiming(targetHeight, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(6 + (index % 4) * 3, { duration: duration * 0.9, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      opacityVal.value = withRepeat(
        withSequence(
          withTiming(1, { duration }),
          withTiming(0.6, { duration })
        ),
        -1,
        true
      );
    } else {
      heightVal.value = withTiming(6, { duration: 300 });
      opacityVal.value = withTiming(0.4, { duration: 300 });
    }
  }, [isPlaying]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: heightVal.value,
    opacity: opacityVal.value,
  }));

  return <Animated.View style={[styles.bar, animatedStyle]} />;
}

export function AudioSpectrumVisualizer({
  isPlaying,
  barCount = 14,
  height = 24,
}: AudioSpectrumVisualizerProps) {
  return (
    <View style={[styles.container, { height }]}>
      {Array.from({ length: barCount }).map((_, i) => (
        <SpectrumBar
          key={i}
          index={i}
          isPlaying={isPlaying}
          maxHeight={height}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3.5,
  },
  bar: {
    width: 3.5,
    borderRadius: 2,
    backgroundColor: C.saffron,
  },
});
