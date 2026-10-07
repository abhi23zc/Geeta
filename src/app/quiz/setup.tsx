import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  BookOpen,
  Flower2,
  RotateCcw,
} from 'lucide-react-native';

import { revisionPool } from '@/features/quiz/engine';
import { useQuiz } from '@/features/quiz/provider';
import { StartButton } from '@/features/quiz/start-button';
import type { Difficulty } from '@/features/quiz/types';
import { Button, Copy, Panel, QuizScreen, useCopy } from '@/features/quiz/ui';
import { C } from '@/constants/ritual-theme';

export default function QuizSetup() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const revision = params.mode === 'revision';
  const { bank, progress } = useQuiz();
  const t = useCopy();
  const lang = progress?.settings.language ?? 'hi';

  const [topic, setTopic] = useState('all');
  const [difficulty, setDifficulty] = useState<Difficulty | 'any'>('any');
  const [count, setCount] = useState(5);
  const [kind, setKind] = useState<'wrong' | 'due' | 'saved'>('due');

  const eligible =
    bank && progress
      ? (revision ? revisionPool(bank, progress, kind) : bank.questions).filter(
          q =>
            (topic === 'all' || q.topic === topic) &&
            (difficulty === 'any' || q.difficulty === difficulty)
        ).length
      : 0;

  return (
    <QuizScreen
      title={revision ? t('Practice & Recall', 'दोबारा अभ्यास') : t('Quick Quiz Setup', 'छोटी क्विज़')}
      subtitle={
        revision
          ? t('Spaced Memory Reinforcement', 'स्मृति अभ्यास')
          : t('Customize Your Round', 'प्रश्नों का चयन करें')
      }
    >
      {/* Revision Mode Selection */}
      {revision && (
        <Panel gold style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <RotateCcw size={18} color={C.primary} />
            <Copy title style={{ fontSize: 16 }}>
              {t('What would you like to revisit?', 'क्या दोहराना चाहेंगे?')}
            </Copy>
          </View>
          <View style={{ gap: 8 }}>
            {(['due', 'wrong', 'saved'] as const).map(k => (
              <Button
                key={k}
                selected={kind === k}
                label={
                  k === 'due'
                    ? t('Due for revision', 'दोहराने का समय')
                    : k === 'wrong'
                    ? t('Previously missed questions', 'पहले गलत हुए प्रश्न')
                    : t('Saved questions in treasury', 'सहेजे गए प्रश्न')
                }
                onPress={() => setKind(k)}
              />
            ))}
          </View>
        </Panel>
      )}

      {/* Topic Picker */}
      <Panel style={{ gap: 10 }}>
        <Copy title style={{ fontSize: 16 }}>
          {t('Select Subject', 'विषय चुनें')}
        </Copy>
        <View style={s.chipsGrid}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setTopic('all')}
            style={[
              s.chip,
              topic === 'all' && s.chipSelected,
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <BookOpen size={12} color={topic === 'all' ? '#FFFFFF' : C.primary} />
              <Copy small style={[s.chipText, topic === 'all' && s.chipTextSelected]}>
                {t('All Subjects', 'सभी विषय')}
              </Copy>
            </View>
          </Pressable>
          {bank?.topics.map(tp => (
            <Pressable
              key={tp.id}
              accessibilityRole="button"
              onPress={() => setTopic(tp.id)}
              style={[
                s.chip,
                topic === tp.id && s.chipSelected,
              ]}
            >
              <Copy small style={[s.chipText, topic === tp.id && s.chipTextSelected]}>
                {tp.title[lang]}
              </Copy>
            </Pressable>
          ))}
        </View>
      </Panel>

      {/* Difficulty Level */}
      <Panel style={{ gap: 10 }}>
        <Copy title style={{ fontSize: 16 }}>
          {t('Difficulty Level', 'कठिनाई स्तर')}
        </Copy>
        <View style={s.buttonRow}>
          {(['any', 'easy', 'medium', 'advanced'] as const).map(d => (
            <Button
              key={d}
              label={
                {
                  any: t('Any', 'सभी'),
                  easy: t('Easy', 'सरल'),
                  medium: t('Medium', 'मध्यम'),
                  advanced: t('Advanced', 'गहन'),
                }[d]
              }
              selected={difficulty === d}
              onPress={() => setDifficulty(d)}
              style={{ flex: 1, minHeight: 46 }}
            />
          ))}
        </View>
      </Panel>

      {/* Question Count */}
      <Panel style={{ gap: 10 }}>
        <Copy title style={{ fontSize: 16 }}>
          {t('Round Length', 'प्रश्नों की संख्या')}
        </Copy>
        <View style={s.buttonRow}>
          {[5, 10].map(n => (
            <Button
              key={n}
              label={t(`${n} Questions`, `${n} प्रश्न`)}
              selected={count === n}
              onPress={() => setCount(n)}
              style={{ flex: 1, minHeight: 46 }}
            />
          ))}
        </View>

        <View style={s.eligibleBadge}>
          <Flower2 size={14} color={C.primary} />
          <Copy small style={{ color: C.inkSoft }}>
            {t(
              `${Math.min(count, eligible)} questions ready for this round. No time limit.`,
              `इस अभ्यास के लिए ${Math.min(count, eligible)} प्रश्न तैयार हैं। कोई समय सीमा नहीं है।`
            )}
          </Copy>
        </View>
      </Panel>

      {/* Start Quiz CTA */}
      <View style={{ marginTop: 4 }}>
        {eligible ? (
          <StartButton
            label={t('Start Quiz Now →', 'क्विज़ शुरू करें →')}
            options={{
              mode: revision ? 'revision' : 'quick',
              topic,
              difficulty,
              count,
              revision: kind,
            }}
          />
        ) : (
          <Panel style={{ alignItems: 'center', padding: 16 }}>
            <Copy small style={{ textAlign: 'center', color: C.muted }}>
              {t(
                'No matching questions found for this filter. Try selecting All Subjects or explore a lesson first.',
                'इस चयन के लिए प्रश्न उपलब्ध नहीं हैं। सभी विषय चुनें या पहले कोई पाठ पढ़ें।'
              )}
            </Copy>
          </Panel>
        )}
      </View>
    </QuizScreen>
  );
}

const s = StyleSheet.create({
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(225, 205, 190, 0.8)',
    borderBottomColor: 'rgba(180, 140, 110, 0.35)',
    borderBottomWidth: 2.5,
  },
  chipSelected: {
    backgroundColor: C.saffron,
    borderColor: '#F88448',
    borderBottomColor: '#BA501A',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.inkSoft,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  eligibleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 240, 225, 0.8)',
    padding: 10,
    borderRadius: 12,
  },
});
