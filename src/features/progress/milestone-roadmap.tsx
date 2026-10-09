import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Award, Check, Flame, Trophy } from 'lucide-react-native';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useLanguage } from '@/i18n/provider';
import type { DailyProgress } from './model';

interface MilestoneRoadmapProps {
  progress: DailyProgress;
}

export function MilestoneRoadmap({ progress }: MilestoneRoadmapProps) {
  const { t, formatNumber } = useLanguage();
  const { width } = useWindowDimensions();
  const isSmall = width < 375;
  const currentStreak = progress.tree.level;
  const milestones = progress.tree.bonuses ?? [];

  const m7Unlocked = milestones.includes(7) || currentStreak >= 7;
  const m30Unlocked = milestones.includes(30) || currentStreak >= 30;

  const m7Progress = m7Unlocked ? 100 : Math.round((currentStreak / 7) * 100);
  const m30Progress = m30Unlocked ? 100 : Math.round((currentStreak / 30) * 100);

  return (
    <View style={s.container}>
      <View style={s.sectionHeader}>
        <View style={s.sectionIconCircle}>
          <Trophy size={16} color="#7A4D00" />
        </View>
        <TextR accessibilityRole="header" style={s.sectionTitle}>
          {t('Milestone bonus')}
        </TextR>
      </View>

      <View style={[s.milestoneGrid, isSmall && { gap: 8 }]}>
        {/* ── 7-Day Tapasya Milestone ─────────────────────────────────────── */}
        <View style={[s.milestoneCard3D, isSmall && { padding: 11 }, m7Unlocked && s.milestoneCardUnlocked3D]}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="m7Grad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#FFFDF8" />
                  <Stop offset="100%" stopColor={m7Unlocked ? "#FFF8E7" : "#FFF4E8"} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" rx={20} fill="url(#m7Grad)" />
            </Svg>
          </View>

          <View style={s.cardTop}>
            <View style={[s.medallionWrap3D, m7Unlocked && s.medallionWrapUnlocked]}>
              {m7Unlocked ? (
                <Check size={16} color="#92400E" strokeWidth={2.8} />
              ) : (
                <Flame size={16} color={C.saffron} />
              )}
            </View>
            <View style={[s.bonusPill3D, m7Unlocked && s.bonusPillUnlocked]}>
              <TextR style={[s.bonusPillText, m7Unlocked && s.bonusPillTextUnlocked]}>
                +40 {t('Points')}
              </TextR>
            </View>
          </View>

          <TextR style={s.milestoneName}>{t('Unlock at level {count}', { count: formatNumber(7) })}</TextR>
          <TextR style={s.milestoneStatus}>
            {m7Unlocked
              ? t('Bonus earned')
              : t('{current} / {target} levels', { current: formatNumber(currentStreak), target: formatNumber(7) })}
          </TextR>

          <View style={s.progressBarTrack3D}>
            <View
              style={[
                s.progressBarFill3D,
                { width: `${m7Progress}%` },
                m7Unlocked && s.progressBarFillUnlocked,
              ]}
            />
          </View>
        </View>

        {/* ── 30-Day Mahatapasya Milestone ─────────────────────────────────── */}
        <View style={[s.milestoneCard3D, m30Unlocked && s.milestoneCardUnlocked3D]}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="m30Grad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#FFFDF8" />
                  <Stop offset="100%" stopColor={m30Unlocked ? "#FFF8E7" : "#FFF4E8"} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" rx={20} fill="url(#m30Grad)" />
            </Svg>
          </View>

          <View style={s.cardTop}>
            <View style={[s.medallionWrap3D, m30Unlocked && s.medallionWrapUnlocked]}>
              {m30Unlocked ? (
                <Check size={16} color="#92400E" strokeWidth={2.8} />
              ) : (
                <Award size={16} color={C.goldDark} />
              )}
            </View>
            <View style={[s.bonusPill3D, m30Unlocked && s.bonusPillUnlocked]}>
              <TextR style={[s.bonusPillText, m30Unlocked && s.bonusPillTextUnlocked]}>
                +100 {t('Points')}
              </TextR>
            </View>
          </View>

          <TextR style={s.milestoneName}>{t('Unlock at level {count}', { count: formatNumber(30) })}</TextR>
          <TextR style={s.milestoneStatus}>
            {m30Unlocked
              ? t('Bonus earned')
              : t('{current} / {target} levels', { current: formatNumber(currentStreak), target: formatNumber(30) })}
          </TextR>

          <View style={s.progressBarTrack3D}>
            <View
              style={[
                s.progressBarFill3D,
                { width: `${m30Progress}%` },
                m30Unlocked && s.progressBarFillUnlocked,
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 12,
    marginVertical: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF0D4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 185, 66, 0.4)',
  },
  sectionTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: C.ink,
  },
  milestoneGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  milestoneCard3D: {
    flex: 1,
    backgroundColor: '#FFFDF8',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.2,
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.16)',
    borderLeftColor: 'rgba(255, 255, 255, 0.95)',
    borderRightColor: 'rgba(217, 119, 6, 0.15)',
    borderBottomWidth: 2,
    gap: 8,
    shadowColor: '#8C4010',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  milestoneCardUnlocked3D: {
    borderColor: 'rgba(244, 185, 66, 0.65)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 94, 13, 0.25)',
    borderBottomWidth: 2,
    shadowColor: C.gold,
    shadowOpacity: 0.14,
    shadowRadius: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  medallionWrap3D: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF0DE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 107, 39, 0.3)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.2)',
    borderBottomWidth: 2,
  },
  medallionWrapUnlocked: {
    backgroundColor: '#FEF3C7',
    borderColor: 'rgba(217, 119, 6, 0.4)',
    borderBottomColor: 'rgba(180, 83, 9, 0.25)',
  },
  bonusPill3D: {
    backgroundColor: 'rgba(254, 194, 74, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(244, 185, 66, 0.5)',
  },
  bonusPillUnlocked: {
    backgroundColor: 'rgba(254, 194, 74, 0.35)',
    borderColor: 'rgba(217, 119, 6, 0.4)',
  },
  bonusPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8C5E0D',
  },
  bonusPillTextUnlocked: {
    color: '#92400E',
  },
  milestoneName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#2A1808',
  },
  milestoneStatus: {
    fontSize: 12.5,
    color: '#7A583E',
    fontWeight: '600',
  },
  progressBarTrack3D: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EFE5D6',
    overflow: 'hidden',
    marginTop: 2,
  },
  progressBarFill3D: {
    height: '100%',
    backgroundColor: C.saffron,
    borderRadius: 4,
  },
  progressBarFillUnlocked: {
    backgroundColor: '#D97706',
  },
});
