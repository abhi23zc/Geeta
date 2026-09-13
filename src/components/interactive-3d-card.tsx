import React, { ReactNode } from 'react';
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
  const scale = useSharedValue(1);
  const sheenX = useSharedValue(-200);

  const cardWidth = useSharedValue(340);
  const cardHeight = useSharedValue(400);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    cardWidth.value = width;
    cardHeight.value = height;
  };

  const handleTouchMove = (evt: any) => {
    const { locationX, locationY } = evt.nativeEvent;
    const centerX = cardWidth.value / 2;
    const centerY = cardHeight.value / 2;

    const normX = (locationX - centerX) / centerX; // -1 to 1
    const normY = (locationY - centerY) / centerY; // -1 to 1

    rotateY.value = withTiming(normX * maxTiltDeg, { duration: 80, easing: Easing.out(Easing.quad) });
    rotateX.value = withTiming(-normY * maxTiltDeg, { duration: 80, easing: Easing.out(Easing.quad) });
    sheenX.value = withTiming((normX + 0.5) * cardWidth.value, { duration: 80 });
  };

  const handleTouchGrant = () => {
    scale.value = withSpring(1.02, { damping: 14, stiffness: 200 });
  };

  const handleTouchRelease = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 180 });
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
        { scale: scale.value },
      ],
    };
  });

  const animatedSheenStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      rotateY.value,
      [-maxTiltDeg, 0, maxTiltDeg],
      [0.4, 0.15, 0.5],
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
        {/* Dynamic Light Sheen Overlay */}
        <Animated.View style={[styles.sheenOverlay, animatedSheenStyle]} pointerEvents="none">
          <Svg width="220%" height="100%" viewBox="0 0 400 400" fill="none">
            <Defs>
              <LinearGradient id="sheenGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                <Stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.45" />
                <Stop offset="55%" stopColor="#FFF9E6" stopOpacity="0.75" />
                <Stop offset="65%" stopColor="#FFFFFF" stopOpacity="0.3" />
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(244, 185, 66, 0.35)',
    shadowColor: '#8C4010',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  cardContainerNight: {
    backgroundColor: 'rgba(35, 36, 74, 0.92)',
    borderColor: '#3C3D68',
    borderTopColor: '#5C5E98',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
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
