import React, { useCallback, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  useIsFocused,
  useNavigation,
  usePreventRemove,
} from 'expo-router/react-navigation';
import { useReducedMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Flower2,
  HelpCircle,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react-native';

import { AruMascot } from '@/components/aru-mascot';
import { useAlarmPresentation } from '@/navigation/alarm-presentation';
import {
  bestKey,
  continueSession,
  scoreSession,
  submitAnswer,
} from '@/features/quiz/engine';
import { confirmAction } from '@/features/quiz/actions';
import { useQuiz } from '@/features/quiz/provider';
import { StartButton } from '@/features/quiz/start-button';
import {
  Button,
  Copy,
  OptionTile,
  Panel,
  QuizProgressBar,
  QuizScreen,
  useCopy,
} from '@/features/quiz/ui';
import { LanguagePicker } from '@/i18n/language-picker';
import { C } from '@/constants/ritual-theme';

export default function Play() {
  const { bank, progress, busy, commit } = useQuiz();
  const router = useRouter();
  const navigation = useNavigation();
  const t = useCopy();

  const [selection, setSelection] = useState<{ key: string; id: string } | null>(null);
  const [sourceKey, setSourceKey] = useState<string | null>(null);
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const alarm = useAlarmPresentation();

  const session = progress?.active;
  const q = session?.questions[session.index];
  const lang = progress?.settings.language ?? 'hi';

  const questionKey = `${session?.id}:${q?.id}`;
  const selected = selection?.key === questionKey ? selection.id : null;
  const sourceOpen = sourceKey === questionKey;

  const leave = useCallback(
    (done: () => void) => {
      confirmAction(
        t('Save and leave?', 'सेव करके वापस जाएं?'),
        t(
          'Your submitted answers are saved. Resume from the quiz home anytime.',
          'आपके दिए गए उत्तर सुरक्षित हैं। क्विज़ होम से कभी भी जारी रखें।'
        ),
        t('Save and leave', 'सेव करके वापस जाएं'),
        done
      );
    },
    [t]
  );

  usePreventRemove(
    !!session && session.phase !== 'results' && focused && !alarm.active,
    ({ data }) => leave(() => navigation.dispatch(data.action))
  );

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/quiz');
  };

  const saveQuestion = () => {
    if (q) {
      void commit(p => ({
        ...p,
        saved: p.saved.includes(q.id)
          ? p.saved.filter(id => id !== q.id)
          : [...p.saved, q.id],
      }));
    }
  };

  const submit = async () => {
    if (!selected) return;
    const success = await commit(p => submitAnswer(p, selected));
    if (success) {
      AccessibilityInfo.announceForAccessibility(
        selected === q?.correct
          ? t('Correct. Explanation follows.', 'सही उत्तर। आगे व्याख्या है।')
          : t(
              'Let us discover the answer. Explanation follows.',
              'सही उत्तर जानें। आगे व्याख्या है।'
            )
      );
      if (progress?.settings.haptics) {
        void Haptics.notificationAsync(
          selected === q?.correct
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning
        ).catch(() => undefined);
      }
    }
  };

  if (!session || !q) {
    return (
      <QuizScreen title={t('Your Quiz', 'आपकी क्विज़')}>
        <Panel>
          <Copy title>{t('Ready to begin', 'शुरू करने के लिए तैयार')}</Copy>
          <Copy>{t('Choose a quiz from the hub to begin your sacred journey.', 'शुरू करने के लिए क्विज़ होम से एक अभ्यास चुनें।')}</Copy>
        </Panel>
        <Button primary label={t('Go to Quiz Home →', 'क्विज़ होम पर जाएं →')} onPress={() => router.replace('/quiz')} />
      </QuizScreen>
    );
  }

  // ─── 1. RESULTS & VICTORY PHASE ───────────────────────────────────────────
  if (session.phase === 'results') {
    const summary = progress!.history.find(h => h.id === session.id);
    const score = scoreSession(session);
    const total = session.questions.length;
    const percentage = Math.round((score / Math.max(total, 1)) * 100);
    const missed = session.questions.filter(
      question => session.answers[question.id] !== question.correct
    );
    const fresh =
      session.mode === 'revision'
        ? { mode: 'revision' as const, revision: 'wrong' as const, count: 5 }
        : {
            mode: session.mode,
            lesson: session.lesson,
            topic: session.topic,
            difficulty: session.difficulty,
            players: session.players,
            count: session.questions.length,
          };

    return (
      <QuizScreen
        title={t('Discovery Summary', 'ज्ञान परिणाम')}
        subtitle={t('Wisdom & Insights', 'सीख व उपलब्धियां')}
        onBack={back}
      >
        {/* Celebration Hero Card */}
        <View style={s.celebrationCard}>
          {!reduced && focused && (
            <View style={s.celebrationMascot}>
              <AruMascot clip="streak_celebration" size={135} interactive={false} />
            </View>
          )}

          <View style={s.scoreBadge}>
            <Trophy size={18} color={C.goldDark} />
            <Copy style={s.scoreBadgeText}>
              {percentage >= 80 ? t('EXCELLENT!', 'अति उत्तम!') : t('ROUND COMPLETE', 'क्विज़ पूरी हुई')}
            </Copy>
          </View>

          <Copy serif title style={s.celebrationTitle}>
            {score === total
              ? t('Flawless Mastery!', 'पूर्ण सफलता!')
              : t('Well Discovered!', 'उत्कृष्ट प्रयास!')}
          </Copy>

          <View style={s.scoreCircle}>
            <Copy title style={s.scoreMainText}>
              {score} / {total}
            </Copy>
            <Copy small style={{ color: C.muted, fontWeight: '700' }}>
              {percentage}% {t('Accuracy', 'सटीकता')}
            </Copy>
          </View>

          <Copy small style={{ textAlign: 'center', color: C.muted, paddingHorizontal: 16 }}>
            {t(
              'Every question explored brings you closer to the timeless Vedic wisdom.',
              'हर उत्तर आपको प्राचीन ज्ञान व संस्कृति के और करीब लाता है।'
            )}
          </Copy>
        </View>

        {/* Family Scores Table (if multiplayer) */}
        {session.mode === 'turns' && (
          <Panel gold style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Users size={18} color={C.primary} />
              <Copy title style={{ fontSize: 16 }}>{t('Family Scoreboard', 'परिवार के अंक')}</Copy>
            </View>
            {session.players.map((player, i) => (
              <View key={i} style={s.playerScoreRow}>
                <Copy style={{ fontWeight: '700' }}>{player}</Copy>
                <View style={s.playerScorePill}>
                  <Copy style={{ color: C.primary, fontWeight: '800' }}>
                    {summary?.playerScores[i] ?? 0} / 5
                  </Copy>
                </View>
              </View>
            ))}
          </Panel>
        )}

        {/* Personal Best Alert */}
        {session.mode === 'quick' && (
          <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Zap size={22} color={C.saffron} />
            <View style={{ flex: 1 }}>
              <Copy small style={{ fontWeight: '700', color: C.ink }}>
                {t('Personal Best', 'सर्वश्रेष्ठ स्कोर')}: {progress!.bests[bestKey(session)] ?? score}/{session.questions.length}
              </Copy>
            </View>
          </Panel>
        )}

        {/* Unlocked Knowledge Cards */}
        {(summary?.unlockedCards ?? []).map(id => {
          const card = bank?.cards.find(c => c.id === id);
          return card ? (
            <Panel gold glow key={id} style={s.unlockedCard}>
              <View style={s.unlockedCardHeader}>
                <Flower2 size={24} color={C.goldDark} />
                <View style={{ flex: 1 }}>
                  <View style={s.unlockedPill}>
                    <Sparkles size={11} color={C.goldDark} />
                    <Copy small style={s.unlockedPillText}>
                      {t('NEW KNOWLEDGE CARD UNLOCKED', 'नया ज्ञान कार्ड मिला')}
                    </Copy>
                  </View>
                  <Copy title style={{ fontSize: 17, marginTop: 4 }}>
                    {card.title[lang]}
                  </Copy>
                </View>
              </View>
              <Copy small style={{ color: C.inkSoft }}>
                {card.body[lang]}
              </Copy>
            </Panel>
          ) : null;
        })}

        {/* Journey Progress */}
        {session.mode === 'journey' && (
          <Panel emerald style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={20} color={C.greenDark} />
              <Copy title style={{ fontSize: 16 }}>
                {t('Lesson Completed!', 'पाठ पूरा हुआ!')}
              </Copy>
            </View>
            <Copy small>
              {t(
                `Knowledge cards collected: ${progress!.cards.length}/30`,
                `ज्ञान कार्ड संग्रह: ${progress!.cards.length}/30`
              )}
            </Copy>
            <Button
              primary
              label={t('Continue Journey →', 'ज्ञान यात्रा जारी रखें →')}
              onPress={() => router.replace('/quiz/journey')}
            />
          </Panel>
        )}

        {/* Missed Questions Review */}
        <View style={{ marginTop: 8, gap: 8 }}>
          <Copy title style={{ fontSize: 16, color: C.ink }}>
            {t('Wisdom to Revisit', 'दोहराने योग्य ज्ञान')}
          </Copy>
          {missed.length === 0 ? (
            <Panel emerald>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} color={C.greenDark} />
                <Copy style={{ color: C.greenDark, fontWeight: '700' }}>
                  {t('Outstanding! You answered every question correctly.', 'अद्भुत! आपने हर प्रश्न का सही उत्तर दिया।')}
                </Copy>
              </View>
            </Panel>
          ) : (
            missed.map(question => (
              <Panel key={question.id} style={s.missedCard}>
                <Copy title style={{ fontSize: 15 }}>
                  {question.prompt[lang]}
                </Copy>
                <View style={s.missedDivider} />
                <Copy small style={{ color: C.inkSoft }}>
                  {question.explanation[lang]}
                </Copy>
                {question.source && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <FileText size={12} color={C.muted} />
                    <Copy small style={{ color: C.muted, fontStyle: 'italic' }}>
                      {question.source[lang]}
                    </Copy>
                  </View>
                )}
              </Panel>
            ))
          )}
        </View>

        {/* Action Buttons */}
        <View style={{ gap: 10, marginTop: 12 }}>
          {session.mode === 'revision' ? (
            <Button
              primary
              label={t('Practice another round', 'दूसरा अभ्यास शुरू करें')}
              onPress={() =>
                router.replace({
                  pathname: '/quiz/setup',
                  params: { mode: 'revision' },
                })
              }
            />
          ) : (
            <StartButton
              label={t('Play Again', 'दोबारा खेलें')}
              options={fresh}
            />
          )}
          <Button
            variant="outline"
            label={t('Back to Quiz Home', 'क्विज़ होम पर जाएं')}
            onPress={() => router.replace('/quiz')}
          />
        </View>
      </QuizScreen>
    );
  }

  // ─── 2. FAMILY HANDOVER PHASE ─────────────────────────────────────────────
  if (session.phase === 'handover') {
    const currentPlayer = session.players[session.index % session.players.length];
    const playerQuestionNum = Math.floor(session.index / session.players.length) + 1;

    return (
      <QuizScreen
        title={t('Pass the phone', 'फोन आगे दें')}
        subtitle={t('Multiplayer Round', 'परिवार की क्विज़')}
        onBack={back}
      >
        <Panel gold glow style={s.handoverCard}>
          <View style={s.handoverAvatarCircle}>
            <Users size={32} color={C.primary} />
          </View>

          <View style={s.handoverBadge}>
            <Copy small style={s.handoverBadgeText}>
              {t(`Question ${playerQuestionNum} of 5`, `प्रश्न ${playerQuestionNum}/5`)}
            </Copy>
          </View>

          <Copy serif title style={s.handoverPlayerName}>
            {currentPlayer}
          </Copy>

          <Copy style={{ textAlign: 'center', color: C.inkSoft }}>
            {t('It is your turn now. Take your time and reflect.', 'अब आपकी बारी है। शांत मन से सोचकर उत्तर दें।')}
          </Copy>

          <Button
            primary
            disabled={busy}
            label={t('I am ready! →', 'मैं तैयार हूं! →')}
            onPress={() => {
              void commit(p =>
                p.active
                  ? { ...p, active: { ...p.active, phase: 'question' } }
                  : p
              );
            }}
          />
        </Panel>
      </QuizScreen>
    );
  }

  // ─── 3. ACTIVE QUESTION & FEEDBACK PHASE ───────────────────────────────────
  const answered = session.phase === 'feedback';
  const correct = session.answers[q.id] === q.correct;
  const isSaved = progress?.saved.includes(q.id);
  const currentPlayerName =
    session.players.length > 0
      ? session.players[session.index % session.players.length]
      : null;

  return (
    <QuizScreen
      title={t('Vedic Quiz', 'वैदिक क्विज़')}
      subtitle={
        currentPlayerName
          ? `${t('Turn', 'बारी')}: ${currentPlayerName}`
          : t('Discover & Learn', 'ज्ञान व संस्कार')
      }
      onBack={back}
    >
      {/* Animated Top Progress Bar */}
      <QuizProgressBar
        current={session.index + 1}
        total={session.questions.length}
      />

      {/* 3D Question Card */}
      <View style={s.questionCard}>
        <View style={s.questionHeaderRow}>
          <View style={s.questionNumberBadge}>
            <Copy small style={s.questionNumberText}>
              {t('QUESTION', 'प्रश्न')} {session.index + 1}/{session.questions.length}
            </Copy>
          </View>
          {q.difficulty && (
            <View style={s.difficultyPill}>
              <View
                style={[
                  s.difficultyDot,
                  {
                    backgroundColor:
                      q.difficulty === 'easy'
                        ? '#16A34A'
                        : q.difficulty === 'medium'
                        ? C.goldDark
                        : '#DC2626',
                  },
                ]}
              />
              <Copy small style={s.difficultyText}>
                {q.difficulty === 'easy'
                  ? t('Easy', 'सरल')
                  : q.difficulty === 'medium'
                  ? t('Medium', 'मध्यम')
                  : t('Advanced', 'गहन')}
              </Copy>
            </View>
          )}
        </View>

        <Copy serif title style={s.questionPrompt}>
          {q.prompt[lang]}
        </Copy>
      </View>

      {lang === 'hinglish' && q.translationUnavailable && (
        <Panel style={{ padding: 10 }}>
          <Copy small style={{ color: C.muted }}>
            {t(
              'This question is displayed in English because Hinglish translation is currently pending.',
              'हिंग्लिश उपलब्ध न होने के कारण यह प्रश्न अंग्रेज़ी में दिखाया गया है।'
            )}
          </Copy>
        </Panel>
      )}

      {/* 4 Interactive Option Tiles */}
      <View style={s.optionsContainer}>
        {q.options.map((option, idx) => (
          <OptionTile
            key={option.id}
            index={idx}
            label={option.label[lang]}
            selected={answered ? option.id === session.answers[q.id] : selected === option.id}
            answered={answered}
            isCorrect={option.id === q.correct}
            isUserChoice={option.id === session.answers[q.id]}
            disabled={busy || answered}
            onPress={() => setSelection({ key: questionKey, id: option.id })}
          />
        ))}
      </View>

      {/* Action Footer: Submit or Feedback Wisdom Drawer */}
      {!answered ? (
        <Button
          primary
          label={t('Check answer →', 'उत्तर जांचें →')}
          disabled={!selected || busy}
          onPress={() => {
            void submit();
          }}
        />
      ) : (
        <View style={{ gap: 12 }}>
          {/* Feedback Wisdom Card */}
          <Panel emerald={correct} gold={!correct} style={s.feedbackPanel}>
            <View style={s.feedbackHeader}>
              <View
                style={[
                  s.feedbackIconWrap,
                  { backgroundColor: correct ? '#34A853' : C.saffron },
                ]}
              >
                {correct ? (
                  <CheckCircle2 size={20} color="#FFFFFF" />
                ) : (
                  <HelpCircle size={20} color="#FFFFFF" />
                )}
              </View>
              <Copy title style={{ fontSize: 18, color: correct ? '#1B5E20' : C.primary }}>
                {correct ? t('Correct Discovery! ✓', 'बिल्कुल सही! ✓') : t('Let us discover why', 'आइए समझें')}
              </Copy>
            </View>

            <Copy style={{ color: C.ink, lineHeight: 24 }}>
              {q.explanation[lang]}
            </Copy>

            {/* Collapsible Source & Tradition Accordion */}
            <Pressable
              accessibilityRole="button"
              onPress={() => setSourceKey(sourceOpen ? null : questionKey)}
              style={s.sourceToggle}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <BookOpen size={14} color={C.primary} />
                <Copy small style={{ color: C.primary, fontWeight: '700' }}>
                  {sourceOpen
                    ? t('Hide scripture source', 'संदर्भ छिपाएं')
                    : t('View scripture & tradition', 'संदर्भ व शास्त्र देखें')}
                </Copy>
              </View>
              {sourceOpen ? <ChevronUp size={16} color={C.primary} /> : <ChevronDown size={16} color={C.primary} />}
            </Pressable>

            {sourceOpen && (
              <View style={s.sourceContent}>
                {q.source && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <FileText size={13} color={C.primary} />
                    <Copy small style={{ color: C.inkSoft, fontWeight: '600' }}>
                      {q.source[lang]}
                    </Copy>
                  </View>
                )}
                {q.context && (
                  <Copy small style={{ color: C.muted, marginTop: 4 }}>
                    {q.context[lang]}
                  </Copy>
                )}
              </View>
            )}
          </Panel>

          {/* Save Wisdom & Continue Controls */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              variant="outline"
              disabled={busy}
              icon={<Bookmark size={18} color={isSaved ? C.primary : C.muted} />}
              label={isSaved ? t('Saved ✓', 'सहेजा गया ✓') : t('Save wisdom', 'सहेजें')}
              style={{ flex: 1 }}
              onPress={saveQuestion}
            />
            <Button
              primary
              disabled={busy}
              label={
                session.index + 1 === session.questions.length
                  ? t('See results →', 'परिणाम देखें →')
                  : t('Next question →', 'अगला प्रश्न →')
              }
              style={{ flex: 1.4 }}
              onPress={() => {
                if (bank) void commit(p => continueSession(p, bank));
              }}
            />
          </View>
        </View>
      )}

      {/* Language Switcher Footer Tile */}
      <View style={s.languageFooter}>
        <Copy small style={{ color: C.muted, fontWeight: '700' }}>
          {t('Language', 'भाषा')}
        </Copy>
        <LanguagePicker />
      </View>
    </QuizScreen>
  );
}

const s = StyleSheet.create({
  questionCard: {
    backgroundColor: 'rgba(255, 252, 248, 0.98)',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomColor: 'rgba(190, 140, 110, 0.35)',
    borderBottomWidth: 3,
    padding: 16,
    gap: 10,
    shadowColor: '#5C2B0B',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  questionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionNumberBadge: {
    backgroundColor: 'rgba(255, 237, 215, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  questionNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 0.5,
  },
  difficultyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(225, 205, 190, 0.6)',
  },
  difficultyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  questionPrompt: {
    fontSize: 20,
    lineHeight: 28,
    color: C.ink,
    fontWeight: '800',
  },
  optionsContainer: {
    gap: 10,
  },
  feedbackPanel: {
    gap: 10,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  feedbackIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(220, 190, 165, 0.4)',
    marginTop: 4,
  },
  sourceContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 10,
    borderRadius: 12,
  },
  languageFooter: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(230, 210, 195, 0.5)',
    gap: 6,
  },
  celebrationCard: {
    backgroundColor: 'rgba(255, 250, 242, 0.98)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomColor: 'rgba(190, 140, 110, 0.4)',
    borderBottomWidth: 4,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#5C2B0B',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  celebrationMascot: {
    marginBottom: -6,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 240, 200, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(244, 185, 66, 0.4)',
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.goldDark,
    letterSpacing: 0.6,
  },
  celebrationTitle: {
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
    color: C.ink,
  },
  scoreCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  scoreMainText: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
    color: C.primary,
  },
  playerScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(235, 200, 150, 0.4)',
  },
  playerScorePill: {
    backgroundColor: '#FFE9C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  unlockedCard: {
    borderColor: 'rgba(244, 185, 66, 0.6)',
    backgroundColor: 'rgba(255, 249, 230, 0.98)',
  },
  unlockedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unlockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF2C6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  unlockedPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: C.goldDark,
  },
  missedCard: {
    gap: 6,
    padding: 12,
  },
  missedDivider: {
    height: 1,
    backgroundColor: 'rgba(225, 200, 180, 0.5)',
    marginVertical: 2,
  },
  handoverCard: {
    padding: 24,
    alignItems: 'center',
    gap: 14,
    marginVertical: 20,
  },
  handoverAvatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFE8C8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(229, 107, 39, 0.3)',
  },
  handoverBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  handoverBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.primary,
  },
  handoverPlayerName: {
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
    color: C.ink,
  },
});
