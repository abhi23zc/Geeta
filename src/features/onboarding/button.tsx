import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { TextR } from '@/components/ritual-ui';
import { C, R } from '@/constants/ritual-theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function OnboardingButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const pressed = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(pressed.value ? 0.98 : 1, {
          damping: 14,
          stiffness: 240,
        }),
      },
      {
        translateY: withSpring(pressed.value ? 2 : 0, {
          damping: 14,
          stiffness: 240,
        }),
      },
    ],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      style={[
        s.base,
        secondary ? s.secondary : s.primary,
        disabled && s.disabled,
        animStyle,
        style,
      ]}
    >
      <View style={s.content}>
        {icon && <View style={s.iconWrap}>{icon}</View>}
        <TextR
          style={[
            s.label,
            secondary ? s.labelSecondary : s.labelPrimary,
          ]}
        >
          {label}
        </TextR>
        {!secondary && !icon && (
          <ChevronRight size={22} color={C.white} strokeWidth={2.8} />
        )}
      </View>
    </AnimatedPressable>
  );
}

const s = StyleSheet.create({
  base: {
    minHeight: 58,
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: R.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  primary: {
    backgroundColor: C.saffron,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.5)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(140, 64, 16, 0.32)',
    shadowColor: C.saffron,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
  secondary: {
    backgroundColor: 'rgba(254, 236, 220, 0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: 'rgba(140, 64, 16, 0.16)',
    shadowColor: '#8C4010',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  disabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  label: {
    fontSize: 18,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  labelPrimary: {
    color: C.white,
  },
  labelSecondary: {
    color: C.ink,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
