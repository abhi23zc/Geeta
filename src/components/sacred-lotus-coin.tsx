import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

interface SacredLotusCoinProps {
  size?: number;
}

export function SacredLotusCoin({ size = 64 }: SacredLotusCoinProps) {
  const rotation = useSharedValue(0);
  const auraPulse = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 22000, easing: Easing.linear }),
      -1,
      false,
    );

    auraPulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.94, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedRotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animatedAuraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: auraPulse.value }],
    opacity: auraPulse.value > 1 ? 0.6 : 0.35,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* 2. 3D Relief Gold Coin Plate Base */}
      <Svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          {/* Outer Metallic Bevel Ring Gradient */}
          <LinearGradient id="coinOuterRim" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFF8E1" />
            <Stop offset="30%" stopColor="#FFE082" />
            <Stop offset="65%" stopColor="#FFB74D" />
            <Stop offset="100%" stopColor="#8C5E0D" />
          </LinearGradient>

          {/* Inner Recessed Coin Face Radial Gradient */}
          <RadialGradient id="coinFaceInner" cx="50%" cy="40%" r="50%">
            <Stop offset="0%" stopColor="#FFFDE7" />
            <Stop offset="60%" stopColor="#FFF3E0" />
            <Stop offset="90%" stopColor="#FFE082" />
            <Stop offset="100%" stopColor="#F57C00" />
          </RadialGradient>

          {/* Gold Specular Highlight Edge */}
          <LinearGradient id="coinSpecularEdge" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#FFB74D" stopOpacity="0.2" />
          </LinearGradient>

          {/* 3D Drop Shadow Ring */}
          <RadialGradient id="coinBevelShadow" cx="50%" cy="50%" r="50%">
            <Stop offset="70%" stopColor="#000000" stopOpacity="0" />
            <Stop offset="95%" stopColor="#5D4037" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#3E2723" stopOpacity="0.6" />
          </RadialGradient>
        </Defs>

        {/* 3D Outer Cast Shadow */}
        <Circle cx="32" cy="34" r="28" fill="#5D2C0C" opacity="0.2" />

        {/* Outer Metallic Gold Coin Bevel Rim */}
        <Circle cx="32" cy="32" r="28" fill="url(#coinOuterRim)" />
        <Circle
          cx="32"
          cy="32"
          r="27"
          stroke="url(#coinSpecularEdge)"
          strokeWidth="1.2"
        />

        {/* Inner Recessed Medallion Face */}
        <Circle cx="32" cy="32" r="23" fill="url(#coinFaceInner)" />
        <Circle cx="32" cy="32" r="23" fill="url(#coinBevelShadow)" />

        {/* Inner Beaded Decorative Ring */}
        <Circle
          cx="32"
          cy="32"
          r="20.5"
          stroke="#E56B27"
          strokeWidth="0.8"
          strokeDasharray="2,2"
          opacity="0.75"
        />
      </Svg>

      {/* 3. 60 FPS Rotating Sacred Lotus Petals */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.centerFlex,
          animatedRotateStyle,
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
          <Defs>
            <LinearGradient id="lotusGoldPetalGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFEA00" />
              <Stop offset="60%" stopColor="#FF9100" />
              <Stop offset="100%" stopColor="#D84315" />
            </LinearGradient>
          </Defs>

          {/* 8 Sacred Lotus Petals */}
          <G origin="32, 32">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <G key={i} transform={`rotate(${angle} 32 32)`}>
                <Path
                  d="M32 13 C35 20 37 25 32 29 C27 25 29 20 32 13 Z"
                  fill="url(#lotusGoldPetalGrad)"
                  opacity="0.95"
                />
              </G>
            ))}
          </G>
        </Svg>
      </Animated.View>

      {/* 4. Center Glowing Divine Seed Core */}
      <View style={styles.centerCore}>
        <Svg
          width={size * 0.45}
          height={size * 0.45}
          viewBox="0 0 30 30"
          fill="none"
        >
          <Circle cx="15" cy="15" r="8" fill="#FFFDE7" />
          <Circle cx="15" cy="15" r="5.5" fill="#FF9100" />
          <Circle cx="15" cy="15" r="3" fill="#FFFFFF" />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  centerFlex: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerCore: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
