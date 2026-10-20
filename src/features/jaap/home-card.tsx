import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Flame } from 'lucide-react-native';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useLanguage } from '@/i18n/provider';
import { dayKey } from '@/features/progress/model';
import { useJaap } from './provider';
import { activeSession, selectedMantra } from './model';
import { MalaPreview } from './mala';
import { j } from './ui';

export function JaapHomeCard({ compact = false }: { compact?: boolean }) {
  const jaap = useJaap();
  const router = useRouter();
  const { t, formatNumber } = useLanguage();
  const day = dayKey(new Date(), jaap.timezone);
  const session = activeSession(jaap.state);
  const todayCount = jaap.state.days[day]?.total ?? 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('Open My Jaap')}
      onPress={() => router.push('/jaap')}
      style={({ pressed }) => [
        s.card,
        {
          marginHorizontal: compact ? 0 : 20,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      {/* 3D Top Bevel Highlight */}
      <View style={s.topHighlight} />

      {/* Mala Preview Medallion Container */}
      <View style={s.medallion}>
        <MalaPreview material={jaap.state.preferences.material} size={68} />
      </View>

      {/* Info Column */}
      <View style={s.infoCol}>
        <View style={s.tagRow}>
          <TextR style={s.eyebrow}>{t('MY JAAP')}</TextR>
          {todayCount > 0 && (
            <View style={s.streakPill}>
              <Flame size={10} color={C.saffron} />
              <TextR style={s.streakText}>
                {formatNumber(todayCount)} {t('jaap today')}
              </TextR>
            </View>
          )}
        </View>

        <TextR serif style={s.mantraText} numberOfLines={1}>
          {selectedMantra(jaap.state).text}
        </TextR>

        <TextR style={s.subText}>
          {t(session ? 'Continue' : 'Begin')} · {t('{count} malas today', { count: formatNumber(Math.floor(todayCount / 108)) })}
        </TextR>
      </View>

      {/* 3D Circle Chevron Button */}
      <View style={s.chevronBtn}>
        <ChevronRight size={18} color={C.saffron} strokeWidth={2.5} />
      </View>

      {/* 3D Bottom Bevel Shadow */}
      <View style={s.bottomRidge} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 248, 242, 0.95)',
    borderRadius: 24,
    marginVertical: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 185, 170, 0.7)',
    borderBottomWidth: 3,
    shadowColor: C.shadow3D,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  bottomRidge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(140, 64, 16, 0.08)',
  },
  medallion: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(254, 236, 220, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 150, 100, 0.2)',
    borderBottomWidth: 2,
  },
  infoCol: {
    flex: 1,
    gap: 3,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: C.saffron,
    textTransform: 'uppercase',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(229, 107, 39, 0.09)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  streakText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.primary,
  },
  mantraText: {
    fontSize: 20,
    fontWeight: '700',
    color: C.ink,
  },
  subText: {
    fontSize: 12,
    color: C.muted,
  },
  chevronBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 150, 100, 0.22)',
    borderBottomWidth: 2,
    shadowColor: '#8C4010',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
