import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G, Path } from "react-native-svg";

import { C } from "@/constants/ritual-theme";

interface MovingChakraProps {
  size?: number;
  color?: string;
  duration?: number;
}

export function MovingChakra({
  size = 18,
  color = C.saffron,
  duration = 8000,
}: MovingChakraProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration, easing: Easing.linear }),
      -1,
      false
    );
  }, [duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, animatedStyle]}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Outer Ring */}
          <Circle
            cx="12"
            cy="12"
            r="10.5"
            stroke={color}
            strokeWidth="1.6"
            fill="none"
          />

          {/* Inner Dashed Beaded Ring */}
          <Circle
            cx="12"
            cy="12"
            r="7.8"
            stroke={color}
            strokeWidth="0.8"
            strokeDasharray="1.5 1.5"
            opacity={0.7}
          />

          {/* 8 Sacred Chakra Rays / Spokes */}
          <G origin="12, 12">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <G key={i} transform={`rotate(${angle} 12 12)`}>
                <Path
                  d="M 12 3.2 L 10.3 8 L 13.7 8 Z"
                  fill={color}
                />
              </G>
            ))}
          </G>

          {/* Center Hub */}
          <Circle cx="12" cy="12" r="3.2" fill={color} />
          <Circle cx="12" cy="12" r="1.5" fill="#FFFDE7" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});
