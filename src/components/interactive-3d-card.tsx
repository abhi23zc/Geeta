import React, { ReactNode, useRef } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { C } from '@/constants/ritual-theme';

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

  const cardWidthRef = useRef(340);
  const cardHeightRef = useRef(400);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    cardWidthRef.current = width;
    cardHeightRef.current = height;
  };

  const handleTouchMove = (evt: any) => {
    const { locationX, locationY } = evt.nativeEvent;
    const centerX = cardWidthRef.current / 2;
    const centerY = cardHeightRef.current / 2;

    const normX = (locationX - centerX) / centerX; // -1 to 1
    const normY = (locationY - centerY) / centerY; // -1 to 1

    rotateY.value = withTiming(normX * maxTiltDeg, { duration: 80, easing: Easing.out(Easing.quad) });
    rotateX.value = withTiming(-normY * maxTiltDeg, { duration: 80, easing: Easing.out(Easing.quad) });
    sheenX.value = withTiming((normX + 0.5) * cardWidthRef.current, { duration: 80 });
  };

  const handleTouchGrant = () => {
    // Keep scale stable to avoid tap distortion
  };

  const handleTouchRelease = () => {
    rotateX.value = withSpring(0, { damping: 14, stiffness: 140 });
    rotateY.value = withSpring(0, { damping: 14, stiffness: 140 });
    sheenX.value = withTiming(-200, { duration: 400 });
  };

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1000 },
        { rotateX: `${rotateX.value}deg` },
        { rotateY: `${rotateY.value}deg` },
      ],
    };
  });

  const animatedSheenStyle = useAnimatedStyle(() => {
    const maxOpacity = night ? 0.12 : 0.35;
    const opacity = interpolate(
      rotateY.value,
      [-maxTiltDeg, 0, maxTiltDeg],
      [maxOpacity, 0, maxOpacity],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateX: sheenX.value }],
      opacity,
    };
  });

  return (
    <View
      onLayout={handleLayout}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleTouchGrant}
      onResponderMove={handleTouchMove}
      onResponderRelease={handleTouchRelease}
      onResponderTerminate={handleTouchRelease}
      style={{ position: 'relative' }}
    >
      <Animated.View
        style={[
          styles.cardContainer,
          night && styles.cardContainerNight,
          animatedCardStyle,
          style,
        ]}
      >
        {/* Sacred 3D Parchment / Night Celestial Glass Mesh Texture */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={night ? "nightGlassGrad" : "parchmentGrad"} x1="0" y1="0" x2="0" y2="1">
                {night ? [
                  <Stop key="n1" offset="0%" stopColor="#161B33" stopOpacity="0.98" />,
                  <Stop key="n2" offset="60%" stopColor="#12162C" stopOpacity="0.98" />,
                  <Stop key="n3" offset="100%" stopColor="#0F1326" stopOpacity="0.98" />,
                ] : [
                  <Stop key="d1" offset="0%" stopColor="#FFFDF9" stopOpacity="0.98" />,
                  <Stop key="d2" offset="50%" stopColor="#FFF8EE" stopOpacity="0.95" />,
                  <Stop key="d3" offset="100%" stopColor="#FFF2E5" stopOpacity="0.92" />,
                ]}
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={night ? "url(#nightGlassGrad)" : "url(#parchmentGrad)"} />
          </Svg>
        </View>

        {/* Dynamic Light Sheen Overlay */}
        <Animated.View style={[styles.sheenOverlay, animatedSheenStyle]} pointerEvents="none">
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
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFDF9',
    borderRadius: 26,
    paddingVertical: 22,
    paddingHorizontal: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 248, 235, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(216, 144, 64, 0.45)',
    shadowColor: '#8C4010',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
    overflow: 'hidden',
    position: 'relative',
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
    position: 'absolute',
    top: -50,
    bottom: -50,
    left: -100,
    right: -100,
    width: '250%',
    height: '200%',
    zIndex: 10,
  },
});
