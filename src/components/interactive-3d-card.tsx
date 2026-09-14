import { ReactNode } from "react";
import {
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

interface Interactive3DCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  maxTiltDeg?: number;
  night?: boolean;
}

export function Interactive3DCard({
  children,
  style,
  maxTiltDeg = 10,
  night = false,
}: Interactive3DCardProps) {
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const sheenX = useSharedValue(-200);

  const cardWidth = useSharedValue(340);
  const cardHeight = useSharedValue(400);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    cardWidth.value = width;
    cardHeight.value = height;
  };

  // Pan gesture — only fires when the user DRAGS (not taps).
  // Child Pressable/TouchableOpacity elements still receive their own tap events.
  const panGesture = Gesture.Pan()
    .minDistance(4) // must move at least 4px before considered a drag
    .onUpdate((e) => {
      "worklet";
      const centerX = cardWidth.value / 2;
      const centerY = cardHeight.value / 2;
      const normX = Math.max(-1, Math.min(1, (e.x - centerX) / centerX));
      const normY = Math.max(-1, Math.min(1, (e.y - centerY) / centerY));

      rotateY.value = withTiming(normX * maxTiltDeg, {
        duration: 80,
        easing: Easing.out(Easing.quad),
      });
      rotateX.value = withTiming(-normY * maxTiltDeg, {
        duration: 80,
        easing: Easing.out(Easing.quad),
      });
      sheenX.value = withTiming((normX + 0.5) * cardWidth.value, {
        duration: 80,
      });
    })
    .onEnd(() => {
      rotateX.value = withSpring(0, { damping: 14, stiffness: 140 });
      rotateY.value = withSpring(0, { damping: 14, stiffness: 140 });
      sheenX.value = withTiming(-200, { duration: 400 });
    });

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
    ],
  }));

  const animatedSheenStyle = useAnimatedStyle(() => {
    const maxOpacity = night ? 0.12 : 0.35;
    const opacity = interpolate(
      rotateY.value,
      [-maxTiltDeg, 0, maxTiltDeg],
      [maxOpacity, 0, maxOpacity],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateX: sheenX.value }],
      opacity,
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        onLayout={handleLayout}
        style={[
          styles.cardContainer,
          night && styles.cardContainerNight,
          animatedCardStyle,
          style,
        ]}
      >
        {/* Sacred 3D Parchment Gradient Texture */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient
                id={night ? "nightGlassGrad" : "parchmentGrad"}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                {night
                  ? [
                      <Stop
                        key="n1"
                        offset="0%"
                        stopColor="#161B33"
                        stopOpacity="0.98"
                      />,
                      <Stop
                        key="n2"
                        offset="60%"
                        stopColor="#12162C"
                        stopOpacity="0.98"
                      />,
                      <Stop
                        key="n3"
                        offset="100%"
                        stopColor="#0F1326"
                        stopOpacity="0.98"
                      />,
                    ]
                  : [
                      <Stop
                        key="d1"
                        offset="0%"
                        stopColor="#FFFDF9"
                        stopOpacity="0.98"
                      />,
                      <Stop
                        key="d2"
                        offset="50%"
                        stopColor="#FFF8EE"
                        stopOpacity="0.95"
                      />,
                      <Stop
                        key="d3"
                        offset="100%"
                        stopColor="#FFF2E5"
                        stopOpacity="0.92"
                      />,
                    ]}
              </LinearGradient>
            </Defs>
            <Rect
              width="100%"
              height="100%"
              fill={night ? "url(#nightGlassGrad)" : "url(#parchmentGrad)"}
            />
          </Svg>
        </View>

        {/* Dynamic Light Sheen Overlay */}
        <Animated.View
          style={[styles.sheenOverlay, animatedSheenStyle]}
          pointerEvents="none"
        >
          <Svg width="220%" height="100%" viewBox="0 0 400 400" fill="none">
            <Defs>
              <LinearGradient id="sheenGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                <Stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.5" />
                <Stop offset="55%" stopColor="#FFF9E6" stopOpacity="0.8" />
                <Stop offset="65%" stopColor="#FFFFFF" stopOpacity="0.35" />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect width="400" height="400" fill="url(#sheenGrad)" />
          </Svg>
        </Animated.View>

        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FFFDF9",
    borderRadius: 26,
    paddingVertical: 22,
    paddingHorizontal: 22,
    borderWidth: 1.5,
    borderColor: "rgba(255, 248, 235, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(216, 144, 64, 0.45)",
    shadowColor: "#8C4010",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
    overflow: "hidden",
    position: "relative",
  },
  cardContainerNight: {
    backgroundColor: "#13172E",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderTopColor: "rgba(255, 255, 255, 0.18)",
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    shadowColor: "#000000",
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  sheenOverlay: {
    position: "absolute",
    top: -50,
    bottom: -50,
    left: -100,
    right: -100,
    width: "250%",
    height: "200%",
    zIndex: 10,
  },
});
