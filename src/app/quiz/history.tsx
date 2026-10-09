import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Compass,
  Flower2,
  History,
  RotateCcw,
  Users,
  Zap,
} from 'lucide-react-native';

import { useLanguage } from '@/i18n/provider';
import { useQuiz } from '@/features/quiz/provider';
import { Button, Copy, Panel, QuizScreen } from '@/features/quiz/ui';
import {
  filterHistory,
  HISTORY_FILTERS,
  HISTORY_MODE_LABELS,
  historyCalendarDate,
  historyDifficultyLabel,
} from '@/features/quiz/history';
import type { HistoryFilter } from '@/features/quiz/history';
import type { Mode } from '@/features/quiz/types';
import { C } from '@/constants/ritual-theme';

const filterLabels = {
  all: 'All rounds',
  solo: 'Solo rounds',
  family: 'Family rounds',
} as const;

const MODE_ICON_CONFIG: Record<
  Mode,
  { icon: typeof Compass; color: string; bg: string }
> = {
  journey: { icon: Compass, color: '#2563EB', bg: '#EFF6FF' },
  quick: { icon: Zap, color: '#D97706', bg: '#FFFBEB' },
  revision: { icon: RotateCcw, color: '#15803D', bg: '#F0FDF4' },
  together: { icon: Users, color: '#7E22CE', bg: '#FAF5FF' },
  turns: { icon: Users, color: '#7E22CE', bg: '#FAF5FF' },
};

export default function QuizHistory() {
  const router = useRouter();
  const { t, language, formatDate, formatNumber } = useLanguage();
  const { bank, progress } = useQuiz();
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const history = progress?.history ?? [];
  const rounds = filterHistory(history, filter);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/quiz'));

  return (
    <QuizScreen title={t('Quiz History')} onBack={back} scroll={false}>
      <FlatList
        style={s.list}
        data={rounds}
        keyExtractor={round => round.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        ListHeaderComponent={
          <View style={s.header}>
            {/* 1. Device Storage Banner */}
            <View style={s.storageBanner}>
              <View style={s.storageIconCircle}>
                <History size={16} color={C.saffron} />
              </View>
              <Copy small style={s.storageBannerText}>
                {t('Your latest 50 completed rounds are saved on this device.')}
              </Copy>
            </View>

            {/* 2. Tactile Filter Segmented Tabs */}
            <View style={s.filterRow}>
              {HISTORY_FILTERS.map(value => {
                const selected = filter === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: filter === value }}
                    accessibilityLabel={t(filterLabels[value])}
                    onPress={() => setFilter(value)}
                    style={[s.filterPill, selected && s.selectedFilterPill]}
                  >
                    <Copy
                      small
                      style={[
                        s.filterText,
                        selected && s.selectedFilterText,
                      ]}
                    >
                      {t(filterLabels[value])}
                    </Copy>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <Panel style={s.empty}>
            <View style={s.emptyIconCircle}>
              <History size={28} color={C.saffron} />
            </View>
            <Copy title style={s.emptyTitle}>
              {t(history.length ? 'No rounds match this filter' : 'No completed rounds yet')}
            </Copy>
            {history.length ? (
              <Button
                variant="outline"
                label={t('Show all rounds')}
                onPress={() => setFilter('all')}
              />
            ) : (
              <>
                <Copy small style={s.emptySubtitle}>
                  {t('Complete a quiz to see its summary here.')}
                </Copy>
                <Button
                  primary
                  label={t('Back to Quiz Home')}
                  onPress={() => router.replace('/quiz')}
                />
              </>
            )}
          </Panel>
        }
        renderItem={({ item: round }) => {
          const difficulty = historyDifficultyLabel(round);
          const topic =
            round.topic === 'all'
              ? t('All Subjects')
              : bank?.topics.find(tItem => tItem.id === round.topic)?.title[language] ??
                t('Subject unavailable');

          const modeCfg = MODE_ICON_CONFIG[round.mode] ?? {
            icon: Compass,
            color: C.saffron,
            bg: '#FFF8F2',
          };
          const ModeIcon = modeCfg.icon;

          const isPerfect = round.total > 0 && round.score === round.total;
          const percentage = round.total > 0 ? Math.round((round.score / round.total) * 100) : 0;

          return (
            <Panel style={s.roundCard}>
              {/* Card Header: Mode Badge + Date */}
              <View style={s.cardHeaderRow}>
                <View style={s.modeGroup}>
                  <View style={[s.modeIconCircle, { backgroundColor: modeCfg.bg }]}>
                    <ModeIcon size={16} color={modeCfg.color} />
                  </View>
                  <Copy title style={s.modeTitle}>
                    {t(HISTORY_MODE_LABELS[round.mode])}
                  </Copy>
                </View>

                <View style={s.datePill}>
                  <Calendar size={12} color={C.muted} />
                  <Copy small style={s.dateText}>
                    {formatDate(historyCalendarDate(round.date), {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </Copy>
                </View>
              </View>

              {/* Subject & Difficulty Chips */}
              <View style={s.chipsRow}>
                <View style={s.topicChip}>
                  <BookOpen size={12} color={C.primary} />
                  <Copy small style={s.topicChipText}>
                    {topic}
                  </Copy>
                </View>

                {difficulty && (
                  <View style={s.diffChip}>
                    <Copy small style={s.diffChipText}>
                      {t(difficulty)}
                    </Copy>
                  </View>
                )}
              </View>

              {/* Tactile Score Banner */}
              <View style={[s.scoreBanner, isPerfect ? s.scoreBannerPerfect : s.scoreBannerStandard]}>
                <View style={s.scoreLeft}>
                  <View style={[s.scoreIconWrap, isPerfect ? s.scoreIconWrapPerfect : s.scoreIconWrapStandard]}>
                    {isPerfect ? (
                      <CheckCircle2 size={18} color="#16A34A" />
                    ) : (
                      <Award size={18} color={C.primary} />
                    )}
                  </View>
                  <Copy
                    style={[
                      s.scoreLabel,
                      isPerfect ? s.scoreLabelPerfect : s.scoreLabelStandard,
                    ]}
                  >
                    {t('{score} of {total} correct', {
                      score: formatNumber(round.score),
                      total: formatNumber(round.total),
                    })}
                  </Copy>
                </View>

                <View style={[s.percentPill, isPerfect ? s.percentPillPerfect : s.percentPillStandard]}>
                  <Copy small style={[s.percentText, isPerfect ? s.percentTextPerfect : s.percentTextStandard]}>
                    {percentage}%
                  </Copy>
                </View>
              </View>

              {/* Family Round: Individual Player Scores */}
              {round.mode === 'turns' && (
                <View style={s.players}>
                  <View style={s.playersHeader}>
                    <Users size={14} color={C.muted} />
                    <Copy small style={s.playersTitle}>
                      {t('Family rounds')}
                    </Copy>
                  </View>
                  <View style={s.playersList}>
                    {round.players.map((name, index) => (
                      <View key={index} style={s.player}>
                        <View style={s.playerAvatar}>
                          <Copy small style={s.playerAvatarText}>
                            {name.charAt(0)}
                          </Copy>
                        </View>
                        <Copy style={s.name}>{name}</Copy>
                        <Copy small style={s.playerScoreText}>
                          {t('{score} of {total} correct', {
                            score: formatNumber(round.playerScores[index]),
                            total: formatNumber(5),
                          })}
                        </Copy>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Unlocked Knowledge Cards Pill */}
              {round.unlockedCards.length > 0 && (
                <View style={s.unlockedBanner}>
                  <Flower2 size={14} color={C.goldDark} />
                  <Copy small style={s.unlockedText}>
                    {t('Knowledge cards unlocked: {count}', {
                      count: formatNumber(round.unlockedCards.length),
                    })}
                  </Copy>
                </View>
              )}
            </Panel>
          );
        }}
      />
    </QuizScreen>
  );
}

const s = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    gap: 12,
    paddingBottom: 28,
  },
  header: {
    gap: 12,
    paddingBottom: 6,
  },
  storageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(254, 236, 220, 0.55)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(229, 107, 39, 0.15)',
  },
  storageIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8C4010',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  storageBannerText: {
    fontSize: 12.5,
    lineHeight: 16.5,
    color: '#68564A',
    flex: 1,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(254, 236, 220, 0.75)',
    borderRadius: 999,
    padding: 4.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    gap: 4,
  },
  filterPill: {
    flex: 1,
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedFilterPill: {
    backgroundColor: C.saffron,
    shadowColor: C.saffron,
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.inkSoft,
    textAlign: 'center',
  },
  selectedFilterText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  roundCard: {
    backgroundColor: 'rgba(255, 252, 248, 0.98)',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 2.5,
    borderBottomColor: 'rgba(216, 144, 64, 0.35)',
    padding: 16,
    gap: 12,
    shadowColor: '#8C4010',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTitle: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '800',
    color: '#241407',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 237, 230, 0.7)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
  },
  dateText: {
    fontSize: 11.5,
    color: '#7A6251',
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    alignItems: 'center',
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF6ED',
    borderColor: 'rgba(229, 107, 39, 0.25)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
  },
  topicChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#43210C',
  },
  diffChip: {
    backgroundColor: 'rgba(240, 233, 226, 0.8)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
  },
  diffChipText: {
    fontSize: 11.5,
    color: '#6E5645',
    fontWeight: '600',
  },
  scoreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderBottomWidth: 2.5,
  },
  scoreBannerPerfect: {
    backgroundColor: '#F0FDF4',
    borderColor: 'rgba(74, 175, 105, 0.35)',
    borderBottomColor: 'rgba(34, 120, 60, 0.4)',
  },
  scoreBannerStandard: {
    backgroundColor: '#FFF8F2',
    borderColor: 'rgba(229, 107, 39, 0.22)',
    borderBottomColor: 'rgba(180, 75, 15, 0.3)',
  },
  scoreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  scoreIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreIconWrapPerfect: {
    backgroundColor: '#DCFCE7',
  },
  scoreIconWrapStandard: {
    backgroundColor: '#FFEAD9',
  },
  scoreLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  scoreLabelPerfect: {
    color: '#15803D',
  },
  scoreLabelStandard: {
    color: C.primary,
  },
  percentPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  percentPillPerfect: {
    backgroundColor: '#DCFCE7',
  },
  percentPillStandard: {
    backgroundColor: '#FFEAD9',
  },
  percentText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  percentTextPerfect: {
    color: '#15803D',
  },
  percentTextStandard: {
    color: C.primary,
  },
  players: {
    backgroundColor: '#FAF5EE',
    borderRadius: 16,
    padding: 12,
    gap: 9,
    borderWidth: 1,
    borderColor: 'rgba(220, 195, 175, 0.45)',
  },
  playersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playersTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  playersList: {
    gap: 8,
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EADBCF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5C381E',
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
  },
  playerScoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
  unlockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFFDF0',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
  },
  unlockedText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.goldDark,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 14,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFF2E6',
    borderWidth: 1.5,
    borderColor: 'rgba(229, 107, 39, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    color: C.muted,
    marginBottom: 8,
  },
});
