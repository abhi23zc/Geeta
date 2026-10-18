import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  StyleSheet,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useDecorativeMotion } from '@/hooks/use-motion-environment';

export interface TactilePressableProps extends Omit<PressableProps, 'style'> {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  activeScale?: number;
  hapticFeedback?: boolean;
}

export function TactilePressable({
  children,
  style,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  activeScale = 0.97,
  hapticFeedback = true,
  ...rest
}: TactilePressableProps) {
  const motion = useDecorativeMotion();
  const scale = useSharedValue(1);

  const handlePressIn = (e: GestureResponderEvent) => {
    if (disabled) return;
    if (motion) {
      scale.value = withSpring(activeScale, { damping: 14, stiffness: 260 });
    }
    if (hapticFeedback) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (disabled) return;
    if (motion) {
      scale.value = withSpring(1, { damping: 14, stiffness: 260 });
    }
    onPressOut?.(e);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...rest}
    >
      <Animated.View style={[style, motion && animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
