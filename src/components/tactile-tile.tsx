import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { C } from '@/constants/ritual-theme';
import { TextR } from '@/components/ritual-ui';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TactileTileProps {
  href: any;
  icon: React.ReactNode;
  bgColor: string;
  title: string;
  badgeText?: string;
}

export function TactileTile({
  href,
  icon,
  bgColor,
  title,
  badgeText,
}: TactileTileProps) {
  const router = useRouter();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: withSpring(pressed.value ? 4 : 0, { damping: 14, stiffness: 220 }) },
        { scale: withSpring(pressed.value ? 0.95 : 1, { damping: 14, stiffness: 220 }) },
      ],
      shadowOffset: {
        width: 0,
        height: withSpring(pressed.value ? 2 : 7, { damping: 14, stiffness: 220 }),
      },
      shadowOpacity: withSpring(pressed.value ? 0.08 : 0.16, { damping: 14, stiffness: 220 }),
    };
  });

  return (
    <AnimatedPressable
      onPress={() => {
        if (href) router.push(href);
      }}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      style={[styles.container, animatedStyle]}
    >
      {/* 3D Top Bevel Highlight Line */}
      <View style={styles.topBevelHighlight} />

      {/* 3D Tactile Icon Container with Glossy Inner Reflection */}
      <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
        <View style={styles.iconGlossArc} />
        {icon}
      </View>

      {/* Title */}
      <TextR style={styles.title}>{title}</TextR>

      {/* Optional Badge Indicator */}
      {badgeText && (
        <View style={styles.badge}>
          <TextR style={styles.badgeText}>{badgeText}</TextR>
        </View>
      )}

      {/* Bottom 3D Bevel Lip Shadow */}
      <View style={styles.bottomBevelShadow} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 248, 242, 0.94)',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    // 3D Bevel Borders
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 185, 170, 0.7)',
    borderBottomWidth: 3,
    // Dual Drop Shadows
    shadowColor: C.shadow3D,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
  },
  topBevelHighlight: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  bottomBevelShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(140, 64, 16, 0.08)',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
    // 3D Bevel styling on circle
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
    borderBottomWidth: 2.5,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  iconGlossArc: {
    position: 'absolute',
    top: 0,
    left: 4,
    right: 4,
    height: 18,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: C.saffron,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: C.white,
  },
});
