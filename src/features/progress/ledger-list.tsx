import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  ChevronDown,
  Flower2,
  Leaf,
  Trophy,
} from 'lucide-react-native';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useLanguage } from '@/i18n/provider';
import type { PointsEntry } from './model';

interface LedgerListProps {
  entries: PointsEntry[];
}

export function LedgerList({ entries }: LedgerListProps) {
  const { t, formatNumber } = useLanguage();
  const [limit, setLimit] = useState(15);

  const reversed = [...entries].reverse();
  const visible = reversed.slice(0, limit);

  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <View style={s.headerIconWrap}>
          <Flower2 size={16} color={C.saffron} />
        </View>
        <TextR accessibilityRole="header" style={s.title}>
          {t('Points history')}
        </TextR>
      </View>

      {!reversed.length ? (
        <View style={s.emptyCard3D}>
          <TextR style={s.emptyText}>{t('No points transactions yet.')}</TextR>
        </View>
      ) : (
        <View style={s.listWrap}>
          {visible.map((e) => {
            const isPositive = e.amount > 0;
            const isMilestone = e.kind === 'milestone';
            const isMissed = e.kind === 'missed';

            return (
              <View key={e.id} style={s.entryCard3D}>
                <View
                  style={[
                    s.iconWrap3D,
                    isMilestone && s.iconWrapMilestone,
                    isMissed && s.iconWrapMissed,
                  ]}
                >
                  {isMilestone ? (
                    <Trophy size={16} color={C.goldDark} />
                  ) : isMissed ? (
                    <Leaf size={16} color={C.orange} />
                  ) : (
                    <Flower2 size={16} color={C.saffron} />
                  )}
                </View>

                <View style={s.entryInfo}>
                  <TextR style={s.entryTitle}>
                    {t(
                      isMilestone
                        ? 'Milestone bonus'
                        : isMissed
                        ? 'Missed-day deduction'
                        : 'Daily reward'
                    )}
                  </TextR>
                  <TextR style={s.entryDate}>
                    {e.from}
                    {e.from !== e.to ? ` → ${e.to}` : ''} ·{' '}
                    {t('daysCount', { count: e.milestone ?? e.days })}
                  </TextR>
                </View>

                <View
                  style={[
                    s.amountBadge3D,
                    isPositive ? s.amountBadgePositive : s.amountBadgeNegative,
                  ]}
                >
                  <TextR
                    style={[
                      s.amountText,
                      isPositive ? s.amountTextPositive : s.amountTextNegative,
                    ]}
                  >
                    {isPositive ? '+' : ''}
                    {formatNumber(e.amount)}
                  </TextR>
                </View>
              </View>
            );
          })}

          {reversed.length > limit && (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                s.showMoreButton,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => setLimit((n) => n + 20)}
            >
              <TextR style={s.showMoreText}>{t('Show more')}</TextR>
              <ChevronDown size={16} color={C.saffron} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFE8D1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 107, 39, 0.25)',
  },
  title: {
    fontSize: 16.5,
    fontWeight: '800',
    color: C.ink,
  },
  emptyCard3D: {
    backgroundColor: 'rgba(255, 252, 248, 0.9)',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(222, 192, 180, 0.4)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.12)',
    borderBottomWidth: 2.5,
  },
  emptyText: {
    fontSize: 13,
    color: C.muted,
  },
  listWrap: {
    gap: 8,
  },
  entryCard3D: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF9',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.12)',
    borderBottomWidth: 2.5,
    gap: 12,
    shadowColor: '#8C4010',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  iconWrap3D: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF0DE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 107, 39, 0.25)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.18)',
    borderBottomWidth: 2,
  },
  iconWrapMilestone: {
    backgroundColor: '#FFF0CF',
    borderColor: 'rgba(244, 185, 66, 0.4)',
  },
  iconWrapMissed: {
    backgroundColor: '#FFDAD6',
    borderColor: 'rgba(186, 26, 26, 0.25)',
  },
  entryInfo: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.ink,
  },
  entryDate: {
    fontSize: 11.5,
    color: C.muted,
    marginTop: 2,
  },
  amountBadge3D: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderTopColor: '#FFFFFF',
  },
  amountBadgePositive: {
    backgroundColor: '#D8F4E2',
    borderColor: 'rgba(94, 158, 104, 0.4)',
    borderBottomColor: 'rgba(42, 92, 51, 0.25)',
    borderBottomWidth: 2,
  },
  amountBadgeNegative: {
    backgroundColor: '#FFDAD6',
    borderColor: 'rgba(186, 26, 26, 0.25)',
    borderBottomColor: 'rgba(147, 0, 10, 0.25)',
    borderBottomWidth: 2,
  },
  amountText: {
    fontSize: 13,
    fontWeight: '800',
  },
  amountTextPositive: {
    color: C.greenDark,
  },
  amountTextNegative: {
    color: '#BA1A1A',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.saffron,
  },
});
