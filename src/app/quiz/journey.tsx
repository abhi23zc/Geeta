import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  BookOpen,
  CheckCircle2,
  Compass,
  Sparkles,
  Star,
} from 'lucide-react-native';

import { useQuiz } from '@/features/quiz/provider';
import { StartButton } from '@/features/quiz/start-button';
import { Copy, Panel, QuizScreen, useCopy } from '@/features/quiz/ui';
import { C } from '@/constants/ritual-theme';

export default function Journey() {
  const { topic: initialTopic } = useLocalSearchParams<{ topic?: string }>();
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopic ?? 'all');
  const { bank, progress } = useQuiz();
  const t = useCopy();
  const lang = progress?.settings.language ?? 'hi';

  const topics = bank?.topics ?? [];
  const lessons =
    bank?.lessons.filter(
      l => selectedTopic === 'all' || l.topic === selectedTopic
    ) ?? [];
  const nextLessonId = lessons.find(l => !progress?.lessons[l.id]?.complete)?.id;

  const totalLessons = lessons.length;
  const completedCount = lessons.filter(l => progress?.lessons[l.id]?.complete).length;

  return (
    <QuizScreen
      title={t('Learning Journey', 'ज्ञान यात्रा')}
      subtitle={t('Step by Step Wisdom', 'क्रमबद्ध ज्ञान व संस्कार')}
      scroll={false}
    >
      {/* Journey Stats Header */}
      <View style={s.statsHeader}>
        <View style={s.statsHeaderInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Compass size={18} color={C.primary} />
            <Copy title style={{ fontSize: 16 }}>
              {completedCount} / {totalLessons} {t('Lessons Completed', 'पाठ पूरे किए')}
            </Copy>
          </View>
          <Copy small style={{ color: C.muted }}>
            {t('5 questions per lesson. Complete at your own pace.', 'प्रत्येक पाठ में 5 प्रश्न। अपनी गति से सीखें।')}
          </Copy>
        </View>
      </View>

      {/* Topic Filter Chips */}
      <View style={s.topicFiltersWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 'all', title: { en: 'All Subjects', hi: 'सभी विषय', hinglish: 'All Subjects' } }, ...topics]}
          keyExtractor={item => item.id}
          contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
          renderItem={({ item }) => {
            const isSelected = selectedTopic === item.id;
            const title = item.id === 'all' ? t('All Topics', 'सभी विषय') : item.title[lang];
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedTopic(item.id)}
                style={[
                  s.filterChip,
                  isSelected && s.filterChipSelected,
                ]}
              >
                <Copy
                  small
                  style={[
                    s.filterChipText,
                    isSelected && s.filterChipTextSelected,
                  ]}
                >
                  {title}
                </Copy>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Lessons List */}
      <FlatList
        data={lessons}
        keyExtractor={l => l.id}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const completed = progress?.lessons[item.id];
          const isNext = item.id === nextLessonId;
          const topicData = bank?.topics.find(tp => tp.id === item.topic);
          const topicName = topicData?.title[lang] ?? item.topic;

          return (
            <Panel
              emerald={!!completed?.complete}
              gold={isNext}
              style={[
                s.lessonCard,
                isNext && s.lessonCardNext,
              ]}
            >
              <View style={s.lessonHeaderRow}>
                <View
                  style={[
                    s.lessonIconCircle,
                    completed?.complete && s.lessonIconCircleCompleted,
                    isNext && s.lessonIconCircleNext,
                  ]}
                >
                  {completed?.complete ? (
                    <CheckCircle2 size={20} color="#FFFFFF" />
                  ) : (
                    <BookOpen size={18} color={isNext ? C.primary : C.muted} />
                  )}
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <View style={s.lessonTopicTag}>
                    <Copy small style={s.lessonTopicTagText}>
                      {topicName}
                    </Copy>
                    {isNext && (
                      <View style={s.nextTag}>
                        <Sparkles size={10} color={C.primary} />
                        <Copy small style={s.nextTagText}>
                          {t('CURRENT', 'अगला')}
                        </Copy>
                      </View>
                    )}
                  </View>
                  <Copy title style={s.lessonTitle}>
                    {t(`Lesson ${item.number}`, `पाठ ${item.number}`)}
                  </Copy>
                </View>

                {completed?.complete && (
                  <View style={s.scoreBadge}>
                    <Star size={13} color={C.goldDark} fill={C.goldDark} />
                    <Copy small style={s.scoreBadgeText}>
                      {completed.best}/5
                    </Copy>
                  </View>
                )}
              </View>

              <StartButton
                label={
                  completed?.complete
                    ? t('Play again', 'दोबारा खेलें')
                    : isNext
                    ? t('Begin lesson →', 'पाठ शुरू करें →')
                    : t('Start lesson', 'पाठ शुरू करें')
                }
                options={{
                  mode: 'journey',
                  lesson: item.id,
                  topic: item.topic,
                }}
              />
            </Panel>
          );
        }}
      />
    </QuizScreen>
  );
}

const s = StyleSheet.create({
  statsHeader: {
    backgroundColor: 'rgba(255, 248, 240, 0.95)',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomColor: 'rgba(190, 140, 110, 0.3)',
    borderBottomWidth: 2.5,
    marginBottom: 4,
  },
  statsHeaderInfo: {
    gap: 4,
  },
  topicFiltersWrap: {
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(225, 205, 190, 0.7)',
  },
  filterChipSelected: {
    backgroundColor: C.saffron,
    borderColor: '#F88448',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.inkSoft,
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  listContent: {
    gap: 12,
    paddingBottom: 110,
  },
  lessonCard: {
    gap: 12,
    padding: 14,
  },
  lessonCardNext: {
    shadowColor: C.saffron,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  lessonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lessonIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(240, 225, 210, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonIconCircleCompleted: {
    backgroundColor: '#34A853',
  },
  lessonIconCircleNext: {
    backgroundColor: '#FFE5C4',
  },
  lessonTopicTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lessonTopicTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
  },
  nextTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF2C6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  nextTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: C.goldDark,
  },
  lessonTitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 240, 200, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(244, 185, 66, 0.4)',
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.goldDark,
  },
});
