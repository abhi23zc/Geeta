import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight, Flame, Trophy } from 'lucide-react-native';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useLanguage } from '@/i18n/provider';
import { useJaap } from '@/features/jaap/provider';
import { dayKey } from '@/features/progress/model';
import { JaapButton, JaapPage, j } from '@/features/jaap/ui';

export default function HistoryScreen() {
  const jaap = useJaap();
  const { t, formatNumber, formatDate } = useLanguage();
  const today = dayKey(new Date(), jaap.timezone);
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(new Date(`${today.slice(0, 7)}-01T12:00:00`));

  const start = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const offset = start.getDay();
  const length = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = Array.from(
    { length: Math.ceil((offset + length) / 7) * 7 },
    (_, i) => i - offset + 1
  );

  const day = jaap.state.days[selected];
  const lifetime = Object.values(jaap.state.days).reduce((n, d) => n + d.total, 0);
  const sessions = jaap.state.sessions.filter(s => Object.hasOwn(s.dayCounts, selected));

  return (
    <JaapPage
      title={t('My practice history')}
      subtitle={t('A quiet record of returning.')}
    >
      {/* 3D Lifetime Jaap Milestone Card */}
      <View style={[j.card, s.lifetimeCard]}>
        <View style={s.lifetimeHeader}>
          <View style={s.trophyCircle}>
            <Trophy size={20} color={C.saffron} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <TextR style={s.eyebrow}>{t('Lifetime jaap')}</TextR>
            <TextR style={s.lifetimeNumber}>{formatNumber(lifetime)}</TextR>
          </View>
        </View>
        <TextR style={j.small}>
          {t('{count} complete malas', { count: formatNumber(Math.floor(lifetime / 108)) })} · {t('Session total')}
        </TextR>
      </View>

      {/* 3D Monthly Calendar Card */}
      <View style={[j.card, s.calendarCard]}>
        {/* Month Navigation Row */}
        <View style={s.monthNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Previous month')}
            onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))}
            style={({ pressed }) => [s.navBtn, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}
          >
            <ChevronLeft size={18} color={C.saffron} strokeWidth={2.5} />
          </Pressable>

          <TextR style={s.monthTitle}>
            {formatDate(month, { month: 'long', year: 'numeric' })}
          </TextR>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Next month')}
            onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))}
            style={({ pressed }) => [s.navBtn, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}
          >
            <ChevronRight size={18} color={C.saffron} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Weekday Header Row */}
        <View style={s.weekHeaderRow}>
          {Array.from({ length: 7 }, (_, i) => (
            <TextR key={`w${i}`} style={s.weekdayLabel}>
              {formatDate(new Date(2026, 0, 4 + i), { weekday: 'narrow' })}
            </TextR>
          ))}
        </View>

        {/* Days Grid */}
        <View style={s.daysGrid}>
          {days.map((d, i) => {
            if (d < 1 || d > length) {
              return <View key={i} style={s.emptyDayCell} />;
            }
            const date = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const active = jaap.state.days[date]?.active;
            const isSelected = selected === date;

            return (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`${date}, ${formatNumber(jaap.state.days[date]?.total ?? 0)} ${t('jaap')}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelected(date)}
                style={({ pressed }) => [
                  s.dayCell,
                  isSelected && s.dayCellSelected,
                  { transform: [{ scale: pressed ? 0.93 : 1 }] },
                ]}
              >
                <TextR style={[s.dayNumber, isSelected && s.dayNumberSelected]}>
                  {formatNumber(d)}
                </TextR>
                {active ? (
                  <View style={[s.activeDot, isSelected && s.activeDotSelected]} />
                ) : (
                  <View style={s.emptyDot} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Selected Day Header */}
      <TextR accessibilityRole="header" serif style={s.selectedDateHeading}>
        {formatDate(new Date(`${selected}T12:00:00`), {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
      </TextR>

      {/* Selected Day Summary Card */}
      <View style={[j.card, s.daySummaryCard]}>
        <View style={s.daySummaryRow}>
          <View>
            <TextR style={s.dayCountBig}>{formatNumber(day?.total ?? 0)}</TextR>
            <TextR style={j.small}>{t('jaap today')}</TextR>
          </View>
          <View style={s.malaCountBadge}>
            <TextR style={s.malaCountText}>
              {t('{count} complete malas', { count: formatNumber(Math.floor((day?.total ?? 0) / 108)) })}
            </TextR>
          </View>
        </View>
      </View>

      {!sessions.length && (
        <TextR style={[j.small, { textAlign: 'center', marginVertical: 8 }]}>
          {t('No practice recorded on this day.')}
        </TextR>
      )}

      {/* Session Breakdown Cards */}
      {sessions
        .slice()
        .reverse()
        .map(sess => {
          const counts = sess.dayCounts[selected] ?? 0;
          return (
            <View key={sess.id} style={[j.card, s.sessionCard]}>
              <View style={s.sessionHeader}>
                <TextR style={s.sessionMantraName}>{sess.mantra.name}</TextR>
                <View style={s.sessionStatusPill}>
                  <TextR style={s.sessionStatusText}>
                    {t(sess.finishedAt ? 'Finished' : 'Paused')}
                  </TextR>
                </View>
              </View>

              <TextR serif style={s.sessionMantraText}>
                {sess.mantra.text}
              </TextR>

              <View style={s.sessionFooter}>
                <TextR style={j.small}>
                  {t('{count} jaap', { count: formatNumber(counts) })} ·{' '}
                  {t('{count} active minutes', {
                    count: formatNumber(Math.floor(sess.activeMs / 60000)),
                  })}
                </TextR>
                {!!sess.finishedAt && (
                  <TextR style={[j.small, { fontSize: 11 }]}>
                    {formatDate(new Date(sess.finishedAt), {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </TextR>
                )}
              </View>
            </View>
          );
        })}
    </JaapPage>
  );
}

const s = StyleSheet.create({
  lifetimeCard: {
    padding: 20,
    gap: 8,
  },
  lifetimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  trophyCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(229, 107, 39, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 150, 100, 0.22)',
    borderBottomWidth: 2,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: C.saffron,
    textTransform: 'uppercase',
  },
  lifetimeNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.5,
  },
  calendarCard: {
    padding: 16,
    gap: 10,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 150, 100, 0.22)',
    borderBottomWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8C4010',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 192, 180, 0.4)',
    paddingBottom: 6,
  },
  weekdayLabel: {
    width: '14.285%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: C.muted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyDayCell: {
    width: '14.285%',
    height: 44,
  },
  dayCell: {
    width: '14.285%',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    gap: 2,
  },
  dayCellSelected: {
    backgroundColor: C.saffron,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.45)',
    borderBottomWidth: 2.5,
    borderBottomColor: 'rgba(140, 64, 16, 0.35)',
    shadowColor: C.saffron,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
  },
  dayNumberSelected: {
    color: C.white,
    fontWeight: '800',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.saffron,
  },
  activeDotSelected: {
    backgroundColor: C.white,
  },
  emptyDot: {
    width: 4,
    height: 4,
  },
  selectedDateHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  daySummaryCard: {
    padding: 18,
  },
  daySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayCountBig: {
    fontSize: 28,
    fontWeight: '800',
    color: C.ink,
  },
  malaCountBadge: {
    backgroundColor: 'rgba(254, 236, 220, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  malaCountText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: C.primary,
  },
  sessionCard: {
    padding: 16,
    gap: 6,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionMantraName: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: C.saffron,
    textTransform: 'uppercase',
  },
  sessionStatusPill: {
    backgroundColor: 'rgba(229, 107, 39, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  sessionStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
  },
  sessionMantraText: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
  },
  sessionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
});
