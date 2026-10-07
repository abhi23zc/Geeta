import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Flower2,
  Minus,
  Sun,
} from 'lucide-react-native';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useLanguage } from '@/i18n/provider';
import { shiftDay } from './model';
import type { DailyProgress } from './model';

interface SadhanaCalendarProps {
  progress: DailyProgress;
  today: string;
}

export function SadhanaCalendar({ progress: p, today }: SadhanaCalendarProps) {
  const { t, language, formatNumber } = useLanguage();
  const [selectedMonth, setMonth] = useState<string | null>(null);
  const [inspectedDate, setInspectedDate] = useState<string | null>(today);

  const month = selectedMonth ?? (today || '2026-01-01').slice(0, 7);
  const monthDate = new Date(`${month}-01T12:00:00Z`);

  const changeMonth = (delta: number) => {
    const d = new Date(monthDate);
    d.setUTCMonth(d.getUTCMonth() + delta);
    setMonth(d.toISOString().slice(0, 7));
  };

  const daysInMonth = new Date(
    Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)
  ).getUTCDate();

  const firstDayOfWeek = monthDate.getUTCDay();
  const inspectedDayData = inspectedDate ? p.days[inspectedDate] : null;

  return (
    <View style={s.cardContainer3D}>
      {/* 3D Parchment Background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFDF9" />
              <Stop offset="100%" stopColor="#FFF2E2" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" rx={24} fill="url(#calGrad)" />
        </Svg>
      </View>

      {/* ── 1. Month Header & Switcher ────────────────────────────────────── */}
      <View style={s.monthHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Previous month')}
          style={({ pressed }) => [
            s.monthNavButton3D,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => changeMonth(-1)}
        >
          <ChevronLeft size={18} color={C.ink} />
        </Pressable>

        <View style={s.monthTitleGroup}>
          <View style={s.calIconWrap}>
            <CalendarIcon size={15} color={C.saffron} />
          </View>
          <TextR accessibilityRole="header" style={s.monthTitle}>
            {monthDate.toLocaleDateString(
              language === 'hi' ? 'hi-IN' : 'en-IN',
              { timeZone: 'UTC', month: 'long', year: 'numeric' }
            )}
          </TextR>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Next month')}
          disabled={month >= today.slice(0, 7)}
          style={({ pressed }) => [
            s.monthNavButton3D,
            month >= today.slice(0, 7) && { opacity: 0.3 },
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => changeMonth(1)}
        >
          <ChevronRight size={18} color={C.ink} />
        </Pressable>
      </View>

      {/* ── 2. Day of Week Headers ────────────────────────────────────────── */}
      <View style={s.weekdaysRow}>
        {Array.from({ length: 7 }, (_, i) => (
          <View key={`weekday-${i}`} style={s.weekdayCell}>
            <TextR style={s.weekdayText}>
              {new Date(Date.UTC(2026, 0, 4 + i)).toLocaleDateString(
                language === 'hi' ? 'hi-IN' : 'en-IN',
                { timeZone: 'UTC', weekday: 'narrow' }
              )}
            </TextR>
          </View>
        ))}
      </View>

      {/* ── 3. Calendar Day Grid ─────────────────────────────────────────── */}
      <View style={s.daysGrid}>
        {/* Blank days before start of month */}
        {Array.from({ length: firstDayOfWeek }, (_, i) => (
          <View key={`blank-${i}`} style={s.dayCell} />
        ))}

        {/* Month Day Tiles */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = shiftDay(`${month}-01`, i);
          const d = p.days[date];
          const isToday = date === today;
          const isSelected = date === inspectedDate;

          const status = d?.rewarded
            ? 'Complete'
            : d?.quiz || d?.ritual
            ? 'Partial'
            : p.activated && date > p.activated && date < today
            ? 'Missed'
            : 'Not started';

          return (
            <View key={date} style={s.dayCell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${date}: ${t(status)}`}
                onPress={() => setInspectedDate(date)}
                style={({ pressed }) => [
                  s.dayTile3D,
                  status === 'Complete' && s.dayTileComplete,
                  status === 'Partial' && s.dayTilePartial,
                  status === 'Missed' && s.dayTileMissed,
                  isToday && s.dayTileToday,
                  isSelected && s.dayTileSelected,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.94 }] },
                ]}
              >
                <TextR
                  style={[
                    s.dayNumber,
                    status === 'Complete' && s.dayNumberComplete,
                    isToday && s.dayNumberToday,
                  ]}
                >
                  {formatNumber(i + 1)}
                </TextR>

                <View style={s.dayIconWrap}>
                  {status === 'Complete' && (
                    <Check size={11} color={C.greenDark} strokeWidth={3} />
                  )}
                  {status === 'Partial' && (
                    <Sun size={10} color={C.saffron} />
                  )}
                  {status === 'Missed' && (
                    <Minus size={9} color={C.muted} />
                  )}
                  {status === 'Not started' && (
                    <View style={s.dotNeutral} />
                  )}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* ── 4. Legend ─────────────────────────────────────────────────────── */}
      <View style={s.legendRow}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: '#D6F5E1', borderColor: 'rgba(94, 158, 104, 0.4)' }]}>
            <Check size={9} color={C.greenDark} strokeWidth={3} />
          </View>
          <TextR style={s.legendText}>{t('Complete')}</TextR>
        </View>

        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: '#FFF0DE', borderColor: 'rgba(229, 107, 39, 0.3)' }]}>
            <Sun size={9} color={C.saffron} />
          </View>
          <TextR style={s.legendText}>{t('Partial')}</TextR>
        </View>

        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: 'rgba(222, 192, 180, 0.35)', borderColor: 'rgba(140, 64, 16, 0.15)' }]}>
            <Minus size={8} color={C.muted} />
          </View>
          <TextR style={s.legendText}>{t('Missed')}</TextR>
        </View>
      </View>

      {/* ── 5. Inspected Day Details Card ─────────────────────────────────── */}
      {inspectedDate && (
        <View style={s.inspectorCard3D}>
          <View style={s.inspectorHeader}>
            <View style={s.inspectorDateGroup}>
              <Flower2 size={15} color={C.saffron} />
              <TextR style={s.inspectorDateText}>{inspectedDate}</TextR>
            </View>
            <View
              style={[
                s.inspectorStatusPill,
                inspectedDayData?.rewarded && s.inspectorStatusPillDone,
              ]}
            >
              <TextR
                style={[
                  s.inspectorStatusText,
                  inspectedDayData?.rewarded && s.inspectorStatusTextDone,
                ]}
              >
                {t(
                  inspectedDayData?.rewarded
                    ? 'Complete'
                    : inspectedDayData?.quiz || inspectedDayData?.ritual
                    ? 'Partial'
                    : 'Not started'
                )}
              </TextR>
            </View>
          </View>

          <View style={s.inspectorActivitiesRow}>
            <View style={s.inspectorActivity}>
              <View
                style={[
                  s.activityCheckDot,
                  inspectedDayData?.ritual && s.activityCheckDotDone,
                ]}
              >
                {inspectedDayData?.ritual ? (
                  <Check size={11} color={C.white} strokeWidth={2.8} />
                ) : (
                  <Minus size={10} color={C.muted} />
                )}
              </View>
              <TextR style={s.activityLabel}>{t('Alarm-led ritual')}</TextR>
            </View>

            <View style={s.inspectorActivity}>
              <View
                style={[
                  s.activityCheckDot,
                  inspectedDayData?.quiz && s.activityCheckDotDone,
                ]}
              >
                {inspectedDayData?.quiz ? (
                  <Check size={11} color={C.white} strokeWidth={2.8} />
                ) : (
                  <Minus size={10} color={C.muted} />
                )}
              </View>
              <TextR style={s.activityLabel}>{t('Quiz round')}</TextR>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  cardContainer3D: {
    backgroundColor: '#FFFDF9',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.18)',
    borderBottomWidth: 3.5,
    shadowColor: '#8C4010',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
    gap: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthNavButton3D: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 107, 39, 0.25)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.15)',
    borderBottomWidth: 2,
  },
  monthTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFE8D1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.ink,
  },
  weekdaysRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(140, 64, 16, 0.08)',
    paddingBottom: 6,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#7A583E',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2.5,
  },
  dayTile3D: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 252, 248, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(222, 192, 180, 0.45)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.15)',
    borderBottomWidth: 2,
  },
  dayTileComplete: {
    backgroundColor: '#E6F9EE',
    borderColor: 'rgba(94, 158, 104, 0.5)',
    borderBottomColor: 'rgba(42, 92, 51, 0.25)',
  },
  dayTilePartial: {
    backgroundColor: '#FFF4E8',
    borderColor: 'rgba(229, 107, 39, 0.4)',
    borderBottomColor: 'rgba(140, 64, 16, 0.2)',
  },
  dayTileMissed: {
    backgroundColor: 'rgba(254, 236, 220, 0.45)',
    borderColor: 'rgba(222, 192, 180, 0.5)',
  },
  dayTileToday: {
    borderColor: C.saffron,
    borderWidth: 1.8,
  },
  dayTileSelected: {
    shadowColor: C.saffron,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    borderColor: '#7A4D00',
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2A1808',
  },
  dayNumberComplete: {
    color: C.greenDark,
    fontWeight: '800',
  },
  dayNumberToday: {
    color: C.saffron,
    fontWeight: '800',
  },
  dayIconWrap: {
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  dotNeutral: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(140, 64, 16, 0.2)',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(140, 64, 16, 0.06)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  legendText: {
    fontSize: 11.5,
    color: C.muted,
    fontWeight: '600',
  },
  inspectorCard3D: {
    backgroundColor: 'rgba(255, 248, 238, 0.95)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(244, 185, 66, 0.45)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.15)',
    borderBottomWidth: 2,
    gap: 8,
  },
  inspectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inspectorDateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inspectorDateText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.ink,
  },
  inspectorStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(222, 192, 180, 0.3)',
  },
  inspectorStatusPillDone: {
    backgroundColor: '#D1F2DD',
  },
  inspectorStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
  },
  inspectorStatusTextDone: {
    color: C.greenDark,
    fontWeight: '800',
  },
  inspectorActivitiesRow: {
    flexDirection: 'row',
    gap: 16,
  },
  inspectorActivity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  activityCheckDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(222, 192, 180, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCheckDotDone: {
    backgroundColor: C.green,
  },
  activityLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.ink,
  },
});
