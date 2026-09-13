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
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop, G } from 'react-native-svg';
import { C } from '@/constants/ritual-theme';

interface SacredLotusBadgeProps {
  size?: number;
}

export function SacredLotusBadge({ size = 56 }: SacredLotusBadgeProps) {
  const rotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const auraOpacity = useSharedValue(0.4);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    auraOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1800 }),
        withTiming(0.3, { duration: 1800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedRotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: auraOpacity.value,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Dynamic Glowing Radial Light Aura */}
      <Animated.View
        style={[
          styles.auraHalo,
          {
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: (size * 1.5) / 2,
          },
          animatedPulseStyle,
        ]}
      />

      {/* Rotating Outer Lotus Mandala Ring */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.centerFlex,
          animatedRotateStyle,
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 60 60" fill="none">
          <Defs>
            <LinearGradient id="goldPetalGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FFE082" />
              <Stop offset="50%" stopColor="#FFB74D" />
              <Stop offset="100%" stopColor="#E56B27" />
            </LinearGradient>
            <LinearGradient id="saffronCoreGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FF9100" />
              <Stop offset="100%" stopColor="#A8470C" />
            </LinearGradient>
          </Defs>

          {/* 8 Outer Sacred Lotus Petals */}
          <G origin="30, 30">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <G key={i} transform={`rotate(${angle} 30 30)`}>
                <Path
                  d="M30 6 C33 14 35 20 30 25 C25 20 27 14 30 6 Z"
                  fill="url(#goldPetalGrad)"
                  opacity="0.9"
                />
              </G>
            ))}
          </G>
        </Svg>
      </Animated.View>

      {/* Center Static Golden Flower Core */}
      <View style={styles.centerCore}>
        <Svg width={size * 0.65} height={size * 0.65} viewBox="0 0 40 40" fill="none">
          <Defs>
            <RadialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FFFDE7" />
              <Stop offset="60%" stopColor="#FFE082" />
              <Stop offset="100%" stopColor="#E56B27" />
            </RadialGradient>
          </Defs>

          {/* Inner Lotus Petal Ring */}
          <G origin="20, 20">
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <G key={i} transform={`rotate(${angle} 20 20)`}>
                <Path
                  d="M20 7 C23 13 24 17 20 21 C16 17 17 13 20 7 Z"
                  fill="url(#coreGlow)"
                />
              </G>
            ))}
          </G>

          {/* Glowing Divine Center Seed */}
          <Circle cx="20" cy="20" r="4.5" fill="#FFFDE7" />
          <Circle cx="20" cy="20" r="2.5" fill="#E56B27" />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerFlex: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraHalo: {
    position: 'absolute',
    backgroundColor: 'rgba(244, 185, 66, 0.35)',
    shadowColor: C.gold,
    shadowRadius: 16,
    shadowOpacity: 0.8,
    elevation: 4,
  },
  centerCore: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
});
