import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  Flower2,
  Lock,
  CheckCircle2,
} from 'lucide-react-native';

import { C } from '@/constants/ritual-theme';
import { useQuiz } from '@/features/quiz/provider';
import { Copy, Panel, QuizScreen, useCopy } from '@/features/quiz/ui';

export default function Collection() {
  const { bank, progress } = useQuiz();
  const t = useCopy();
  const lang = progress?.settings.language ?? 'hi';

  const topicSummaries = useMemo(() => {
    const summaries = new Map<string, { name: string; completed: number }>();
    for (const topic of bank?.topics ?? []) summaries.set(topic.id, { name: topic.title[lang], completed: 0 });
    for (const lesson of bank?.lessons ?? []) {
      const topic = summaries.get(lesson.topic);
      if (topic && progress?.lessons[lesson.id]?.complete) topic.completed++;
    }
    return summaries;
  }, [bank, progress?.lessons, lang]);
  const unlockedCards = useMemo(() => new Set(progress?.cards ?? []), [progress?.cards]);
  const cards = bank?.cards ?? [];
  const unlockedCount = progress?.cards.length ?? 0;
  const totalCards = cards.length;

  return (
    <QuizScreen
      title={t('Knowledge Collection', 'ज्ञान संग्रह')}
      subtitle={t('Sacred Collectibles', 'वैदिक ज्ञान कार्ड्स')}
      scroll={false}
    >
      {/* Top Treasury Summary Card */}
      <Panel gold glow style={s.treasuryBanner}>
        <View style={s.bannerIconCircle}>
          <Flower2 size={26} color={C.goldDark} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Copy title style={{ fontSize: 17 }}>
            {unlockedCount} / {totalCards} {t('Cards Unlocked', 'कार्ड्स खुले')}
          </Copy>
          <Copy small style={{ color: C.muted }}>
            {t(
              'Complete 4 lessons in any subject to unlock its sacred knowledge card.',
              'किसी भी विषय के 4 पाठ पूरे करके उसका ज्ञान कार्ड प्राप्त करें।'
            )}
          </Copy>
        </View>
      </Panel>

      {/* Cards List */}
      <FlatList
        data={cards}
        keyExtractor={c => c.id}
        contentContainerStyle={s.cardsList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const unlocked = unlockedCards.has(item.id);
          const completed = topicSummaries.get(item.topic)?.completed ?? 0;
          const topicName = topicSummaries.get(item.topic)?.name ?? item.topic;

          return (
            <Panel
              gold={unlocked}
              style={[
                s.cardItem,
                unlocked && s.cardItemUnlocked,
              ]}
            >
              <View style={s.cardHeader}>
                <View
                  style={[
                    s.cardIconCircle,
                    unlocked && s.cardIconCircleUnlocked,
                  ]}
                >
                  {unlocked ? (
                    <Flower2 size={22} color={C.goldDark} />
                  ) : (
                    <Lock size={18} color={C.muted} />
                  )}
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <View style={s.cardTopicRow}>
                    <Copy small style={s.cardTopicText}>
                      {topicName}
                    </Copy>
                    {unlocked && (
                      <View style={s.unlockedPill}>
                        <CheckCircle2 size={10} color={C.goldDark} />
                        <Copy small style={s.unlockedPillText}>
                          {t('COLLECTED', 'सहेजा')}
                        </Copy>
                      </View>
                    )}
                  </View>
                  <Copy title style={s.cardTitle}>
                    {item.title[lang]}
                  </Copy>
                </View>
              </View>

              {unlocked ? (
                <View style={s.loreContent}>
                  <Copy style={s.loreText}>{item.body[lang]}</Copy>
                </View>
              ) : (
                <View style={s.lockedProgressRow}>
                  <View style={s.progressTrack}>
                    <View
                      style={[
                        s.progressFill,
                        {
                          width: `${Math.min(
                            (completed / Math.max(item.milestone, 1)) * 100,
                            100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <Copy small style={{ color: C.muted, fontWeight: '700' }}>
                    {completed}/{item.milestone} {t('lessons completed', 'पाठ पूरे')}
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
  treasuryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  bannerIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFE8C8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardsList: {
    gap: 12,
    paddingBottom: 32,
  },
  cardItem: {
    gap: 10,
    padding: 16,
  },
  cardItemUnlocked: {
    backgroundColor: 'rgba(255, 249, 235, 0.98)',
    borderColor: 'rgba(244, 185, 66, 0.55)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(235, 220, 205, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconCircleUnlocked: {
    backgroundColor: '#FFECC2',
  },
  cardTopicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTopicText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
  },
  unlockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF0C0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  unlockedPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: C.goldDark,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  loreContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(244, 185, 66, 0.3)',
  },
  loreText: {
    fontSize: 14,
    lineHeight: 22,
    color: C.ink,
  },
  lockedProgressRow: {
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: 10,
    borderRadius: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(230, 210, 195, 0.6)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: C.goldDark,
  },
});
