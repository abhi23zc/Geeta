import React from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Flame, Flower2, Check } from 'lucide-react-native';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useLanguage } from '@/i18n/provider';
import { useProgress } from './provider';

interface GoalStreakBadgeProps {
  onPress?: () => void;
  showPoints?: boolean;
}

export function GoalStreakBadge({
  onPress,
  showPoints = true,
}: GoalStreakBadgeProps) {
  const router = useRouter();
  const { t, formatNumber } = useLanguage();
  const { progress: p, today } = useProgress();

  if (!p) return null;

  const d = p.days[today];
  const count = (d?.ritual ? 1 : 0) + (d?.quiz ? 1 : 0);

  const handlePress = () => {
    if (onPress) onPress();
    else router.push('/progress');
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('Daily goal')}: ${count}/2, ${t('streakDays', { count: p.current })}`}
      onPress={handlePress}
      style={({ pressed }) => [
        s.container3D,
        pressed && { opacity: 0.88, transform: [{ scale: 0.96 }] },
      ]}
    >
      {/* 3D Glass Surface Gradient */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="badgePillGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#FFF2E5" stopOpacity="0.9" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" rx={999} fill="url(#badgePillGrad)" />
        </Svg>
      </View>

      {/* Streak Section */}
      <View style={s.streakGroup}>
        <View style={s.flameCircle}>
          <Flame
            size={13}
            color={C.saffron}
            fill={p.current > 0 ? C.saffron : 'none'}
          />
        </View>
        <TextR style={s.streakText}>{p.current}d</TextR>
      </View>

      <View style={s.divider} />

      {/* Goal Step Section */}
      <View style={s.goalGroup}>
        <View style={[s.goalDot, count === 2 && s.goalDotComplete]}>
          {count === 2 ? (
            <Check size={10} color={C.white} strokeWidth={3} />
          ) : (
            <Flower2 size={11} color={count === 1 ? C.saffron : C.goldDark} />
          )}
        </View>
        <TextR style={[s.goalText, count === 2 && s.goalTextComplete]}>
          {count === 2 ? '2/2' : `${count}/2`}
        </TextR>
      </View>

      {/* Points Section */}
      {showPoints && (
        <>
          <View style={s.divider} />
          <View style={s.pointsGroup}>
            <View style={s.miniCoin}>
              <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <Defs>
                  <LinearGradient id="miniCoinGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#FFF9C4" />
                    <Stop offset="50%" stopColor="#F4B942" />
                    <Stop offset="100%" stopColor="#8C5E0D" />
                  </LinearGradient>
                </Defs>
                <Rect width="16" height="16" rx="8" fill="url(#miniCoinGrad)" />
                <Rect x="2" y="2" width="12" height="12" rx="6" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.8" />
              </Svg>
              <TextR style={s.miniCoinLotus}>🪷</TextR>
            </View>
            <TextR style={s.pointsText}>{formatNumber(p.balance)}</TextR>
          </View>
        </>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  container3D: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.2)',
    borderBottomWidth: 2.2,
    shadowColor: '#8C4010',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    gap: 7,
    overflow: 'hidden',
    position: 'relative',
  },
  streakGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flameCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFEAD9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: C.saffron,
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(140, 64, 16, 0.14)',
  },
  goalGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goalDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(244, 185, 66, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalDotComplete: {
    backgroundColor: C.green,
  },
  goalText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.ink,
  },
  goalTextComplete: {
    color: C.greenDark,
    fontWeight: '800',
  },
  pointsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniCoin: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  miniCoinLotus: {
    position: 'absolute',
    fontSize: 8,
  },
  pointsText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#6E4300',
  },
});
