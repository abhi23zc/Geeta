import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Sparkles, CheckCircle2, X } from 'lucide-react-native';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';

interface MindsetCelebrationModalProps {
  visible: boolean;
  onClose: () => void;
}

function FloatingPetal({ index }: { index: number }) {
  const startX = (index - 6) * 28;
  const translateY = useSharedValue(50);
  const translateX = useSharedValue(startX);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.4);
  const rotate = useSharedValue(0);

  useEffect(() => {
    const delay = index * 60;
    const duration = 2200 + (index % 4) * 300;

    translateY.value = withDelay(
      delay,
      withTiming(-320 - (index % 3) * 50, { duration, easing: Easing.out(Easing.quad) })
    );

    translateX.value = withDelay(
      delay,
      withTiming(startX + (index % 2 === 0 ? 40 : -40), { duration })
    );

    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(0.9, { duration: 300 }),
        withTiming(0.9, { duration: duration - 700 }),
        withTiming(0, { duration: 400 })
      )
    );

    scale.value = withDelay(
      delay,
      withSequence(
        withSpring(1, { damping: 12 }),
        withTiming(0.6, { duration: duration - 300 })
      )
    );

    rotate.value = withDelay(
      delay,
      withTiming(index % 2 === 0 ? 360 : -360, { duration })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.petal, animatedStyle]}>
      <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <Defs>
          <LinearGradient id={`petalGrad-${index}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFE082" />
            <Stop offset="100%" stopColor="#FF9100" />
          </LinearGradient>
        </Defs>
        <Path
          d="M12 2 C15 7 19 12 12 22 C5 12 9 7 12 2 Z"
          fill={`url(#petalGrad-${index})`}
        />
      </Svg>
    </Animated.View>
  );
}

export function MindsetCelebrationModal({
  visible,
  onClose,
}: MindsetCelebrationModalProps) {
  const cardScale = useSharedValue(0.7);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      cardScale.value = withSpring(1, { damping: 14, stiffness: 180 });
      cardOpacity.value = withTiming(1, { duration: 250 });
    } else {
      cardScale.value = withTiming(0.7, { duration: 200 });
      cardOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Burst of Floating Lotus Petals */}
        {visible &&
          Array.from({ length: 12 }).map((_, i) => (
            <FloatingPetal key={i} index={i} />
          ))}

        {/* Celebration Dialog Plaque */}
        <Animated.View style={[styles.celebrationCard, animatedCardStyle]}>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <X size={20} color={C.inkSoft} />
          </Pressable>

          <View style={styles.iconRing}>
            <CheckCircle2 size={42} color={C.white} fill={C.green} />
          </View>

          <TextR style={styles.title}>Sankalpa Completed!</TextR>
          <TextR style={styles.subtitle}>
            You have embraced Detached Excellence & Inner Peace for today.
          </TextR>

          <View style={styles.clarityBadge}>
            <Sparkles size={18} color={C.goldDark} />
            <TextR style={styles.clarityText}>+100 Daily Spiritual Clarity</TextR>
          </View>

          <Pressable
            style={styles.doneBtn}
            onPress={onClose}
          >
            <TextR style={styles.doneBtnText}>Continue Morning Ritual</TextR>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(23, 24, 51, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  petal: {
    position: 'absolute',
    bottom: '40%',
  },
  celebrationCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFBF7',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(244, 185, 66, 0.5)',
    shadowColor: '#8C4010',
    shadowOpacity: 0.3,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(254, 236, 220, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(94, 158, 104, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14.5,
    color: '#423227',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 21,
    fontWeight: '500',
  },
  clarityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 185, 66, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 8,
    marginVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(244, 185, 66, 0.5)',
  },
  clarityText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: C.goldDark,
  },
  doneBtn: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    backgroundColor: C.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: C.saffron,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  doneBtnText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: C.white,
  },
});
