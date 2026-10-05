import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Bookmark, Trash2 } from 'lucide-react-native';

import { useQuiz } from '@/features/quiz/provider';
import { StartButton } from '@/features/quiz/start-button';
import { Button, Copy, Panel, QuizScreen, useCopy } from '@/features/quiz/ui';
import { C } from '@/constants/ritual-theme';

export default function Saved() {
  const { bank, progress, commit, busy } = useQuiz();
  const t = useCopy();
  const lang = progress?.settings.language ?? 'hi';

  const questions =
    bank?.questions.filter(q => progress?.saved.includes(q.id)) ?? [];

  return (
    <QuizScreen
      title={t('Saved Wisdom', 'सहेजी व्याख्याएं')}
      subtitle={t('Your Personal Treasury', 'आपका निजी संग्रह')}
      scroll={false}
    >
      {/* Top Action / Summary Bar */}
      {questions.length > 0 && (
        <View style={s.topBar}>
          <StartButton
            label={t('Practice Saved Questions (5 Qs) →', 'सहेजे प्रश्नों का अभ्यास करें →')}
            options={{ mode: 'revision', revision: 'saved', count: 5 }}
          />
        </View>
      )}

      {/* Saved Questions List */}
      <FlatList
        data={questions}
        keyExtractor={q => q.id}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Panel style={s.emptyPanel}>
            <View style={s.emptyIconCircle}>
              <Bookmark size={28} color={C.muted} />
            </View>
            <Copy title style={{ textAlign: 'center', fontSize: 17 }}>
              {t('No Saved Explanations Yet', 'अभी कोई व्याख्या सहेजी नहीं गई है')}
            </Copy>
            <Copy small style={{ textAlign: 'center', color: C.muted, paddingHorizontal: 16 }}>
              {t(
                'When you answer a question in any quiz round, tap "Save wisdom" to revisit it anytime.',
                'क्विज़ खेलते समय "सहेजें" दबाकर आप किसी भी प्रश्न की व्याख्या यहां सहेज सकते हैं।'
              )}
            </Copy>
          </Panel>
        }
        renderItem={({ item }) => (
          <Panel style={s.savedCard}>
            <View style={s.savedHeader}>
              <View style={s.savedTag}>
                <Bookmark size={12} color={C.primary} />
                <Copy small style={s.savedTagText}>
                  {t('SAVED EXPLANATION', 'सहेजी व्याख्या')}
                </Copy>
              </View>
            </View>

            <Copy title style={s.savedPrompt}>
              {item.prompt[lang]}
            </Copy>

            <View style={s.explanationWrap}>
              <Copy style={s.explanationText}>
                {item.explanation[lang]}
              </Copy>
            </View>

            {item.source && (
              <Copy small style={{ color: C.muted, fontStyle: 'italic' }}>
                📖 {item.source[lang]}
              </Copy>
            )}

            {item.context && (
              <Copy small style={{ color: C.muted }}>
                📜 {item.context[lang]}
              </Copy>
            )}

            <Button
              variant="outline"
              disabled={busy}
              icon={<Trash2 size={16} color="#BA1A1A" />}
              label={t('Remove from treasury', 'संग्रह से हटाएं')}
              onPress={() => {
                void commit(p => ({
                  ...p,
                  saved: p.saved.filter(id => id !== item.id),
                }));
              }}
              style={s.removeBtn}
            />
          </Panel>
        )}
      />
    </QuizScreen>
  );
}

const s = StyleSheet.create({
  topBar: {
    marginBottom: 8,
  },
  listContent: {
    gap: 12,
    paddingBottom: 32,
  },
  emptyPanel: {
    alignItems: 'center',
    padding: 24,
    gap: 10,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(235, 220, 205, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedCard: {
    gap: 10,
    padding: 16,
  },
  savedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 237, 215, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  savedTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 0.5,
  },
  savedPrompt: {
    fontSize: 16,
    lineHeight: 22,
  },
  explanationWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(225, 205, 190, 0.6)',
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 22,
    color: C.ink,
  },
  removeBtn: {
    minHeight: 44,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
});
