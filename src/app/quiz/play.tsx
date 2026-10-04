import { useCallback, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused, useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import { useReducedMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AruMascot } from '@/components/aru-mascot';
import { useAlarmPresentation } from '@/navigation/alarm-presentation';
import { bestKey, continueSession, scoreSession, submitAnswer } from '@/features/quiz/engine';
import { confirmAction } from '@/features/quiz/actions';
import { useQuiz } from '@/features/quiz/provider';
import { StartButton } from '@/features/quiz/start-button';
import { Button, Copy, Panel, QuizScreen, useCopy } from '@/features/quiz/ui';
import { LanguagePicker } from '@/i18n/language-picker';

export default function Play() {
  const { bank, progress, busy, commit } = useQuiz(), router = useRouter(), navigation = useNavigation(), t = useCopy();
  const [selection, setSelection] = useState<{ key: string; id: string } | null>(null), [sourceKey, setSourceKey] = useState<string | null>(null);
  const focused = useIsFocused(), reduced = useReducedMotion(), alarm = useAlarmPresentation();
  const session = progress?.active, q = session?.questions[session.index], lang = progress?.settings.language ?? 'hi';
  const questionKey = `${session?.id}:${q?.id}`;
  const selected = selection?.key === questionKey ? selection.id : null, sourceOpen = sourceKey === questionKey;
  const leave = useCallback((done: () => void) => {
    confirmAction(t('Save and leave?', 'सेव करके वापस जाएं?'), t('Your submitted answers are saved. Resume from the quiz home anytime.', 'आपके दिए गए उत्तर सुरक्षित हैं। क्विज़ होम से कभी भी जारी रखें।'), t('Save and leave', 'सेव करके वापस जाएं'), done);
  }, [t]);
  usePreventRemove(!!session && session.phase !== 'results' && focused && !alarm.active, ({ data }) => leave(() => navigation.dispatch(data.action)));
  const back = () => { if (router.canGoBack()) router.back(); else router.replace('/quiz'); };
  const saveQuestion = () => { if (q) void commit(p => ({ ...p, saved: p.saved.includes(q.id) ? p.saved.filter(id => id !== q.id) : [...p.saved, q.id] })); };
  const submit = async () => {
    if (!selected) return;
    const success = await commit(p => submitAnswer(p, selected));
    if (success) {
      AccessibilityInfo.announceForAccessibility(selected === q?.correct ? t('Correct. Explanation follows.', 'सही उत्तर। आगे व्याख्या है।') : t('Let us discover the answer. Explanation follows.', 'सही उत्तर जानें। आगे व्याख्या है।'));
      if (progress?.settings.haptics) void Haptics.notificationAsync(selected === q?.correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    }
  };
  if (!session || !q) return <QuizScreen title={t('Your Quiz', 'आपकी क्विज़')}><Copy>{t('Choose a quiz to begin.', 'शुरू करने के लिए क्विज़ चुनें।')}</Copy><Button label={t('Quiz home', 'क्विज़ होम')} onPress={() => router.replace('/quiz')} /></QuizScreen>;
  if (session.phase === 'results') {
    const summary = progress!.history.find(h => h.id === session.id), score = scoreSession(session);
    const missed = session.questions.filter(question => session.answers[question.id] !== question.correct);
    const fresh = session.mode === 'revision' ? { mode: 'revision' as const, revision: 'wrong' as const, count: 5 } : { mode: session.mode, lesson: session.lesson, topic: session.topic, difficulty: session.difficulty, players: session.players, count: session.questions.length };
    return <QuizScreen title={t('Your discoveries', 'आपका ज्ञान')} onBack={back}>
      <Panel>{!reduced && focused && <View style={{ alignItems: 'center' }}><AruMascot clip="streak_celebration" size={120} interactive={false} /></View>}<Copy title>{t('Round complete', 'क्विज़ पूरी हुई')}</Copy><Copy>{t(`${score} of ${session.questions.length} correct`, `${session.questions.length} में ${score} सही`)}</Copy><Copy small>{t('Every answer is a chance to learn.', 'हर उत्तर सीखने का अवसर है।')}</Copy></Panel>
      {session.mode === 'turns' && <Panel><Copy title>{t('Family scores', 'परिवार के अंक')}</Copy>{session.players.map((player, i) => <Copy key={i}>{player}: {summary?.playerScores[i] ?? 0}/5</Copy>)}<Copy small>{t('Equal scores share the place.', 'समान अंक होने पर स्थान साझा है।')}</Copy></Panel>}
      {session.mode === 'quick' && <Copy>{t(`Personal best for this selection: ${progress!.bests[bestKey(session)] ?? score}/${session.questions.length}`, `इस चयन में सर्वश्रेष्ठ: ${progress!.bests[bestKey(session)] ?? score}/${session.questions.length}`)}</Copy>}
      {(summary?.unlockedCards ?? []).map(id => { const card = bank?.cards.find(c => c.id === id); return card ? <Panel key={id}><Copy title>{t('New knowledge card unlocked', 'नया ज्ञान कार्ड मिला')}</Copy><Copy>{card.title[lang]}</Copy><Copy small>{card.body[lang]}</Copy></Panel> : null; })}
      {session.mode === 'journey' && <Panel><Copy>{t('Lesson completed', 'पाठ पूरा हुआ')}</Copy><Copy small>{t(`Knowledge cards collected: ${progress!.cards.length}/30`, `ज्ञान कार्ड: ${progress!.cards.length}/30`)}</Copy><Button label={t('Continue journey', 'ज्ञान यात्रा जारी रखें')} onPress={() => router.replace('/quiz/journey')} /></Panel>}
      <Copy title>{t('Ideas to revisit', 'दोहराने योग्य बातें')}</Copy>
      {missed.length === 0 ? <Copy>{t('You answered every question correctly. Try another topic!', 'आपने हर प्रश्न सही किया। कोई दूसरा विषय चुनें!')}</Copy> : missed.map(question => <Panel key={question.id}><Copy>{question.prompt[lang]}</Copy><Copy small>{question.explanation[lang]}</Copy><Copy small>{question.source[lang]}</Copy></Panel>)}
      {session.mode === 'revision' ? <Button label={t('Choose another practice round', 'दूसरा अभ्यास चुनें')} onPress={() => router.replace({ pathname: '/quiz/setup', params: { mode: 'revision' } })} /> : <StartButton label={t('Play again', 'दोबारा खेलें')} options={fresh} />}
      <Button label={t('Quiz home', 'क्विज़ होम')} onPress={() => router.replace('/quiz')} />
    </QuizScreen>;
  }
  if (session.phase === 'handover') return <QuizScreen title={t('Pass the phone', 'फोन आगे दें')} onBack={back}><Panel><Copy title>{session.players[session.index % session.players.length]}</Copy><Copy>{t('It is your turn. Take your time.', 'अब आपकी बारी है। आराम से उत्तर दें।')}</Copy><Copy small>{t(`Your question ${Math.floor(session.index / session.players.length) + 1} of 5`, `आपका प्रश्न ${Math.floor(session.index / session.players.length) + 1}/5`)}</Copy><Button primary disabled={busy} label={t('I am ready', 'मैं तैयार हूं')} onPress={() => { void commit(p => p.active ? { ...p, active: { ...p.active, phase: 'question' } } : p); }} /></Panel></QuizScreen>;
  const answered = session.phase === 'feedback', correct = session.answers[q.id] === q.correct;
  return <QuizScreen title={t('Discover & learn', 'जानें और सीखें')} onBack={back}>
    <Copy small>{t(`Question ${session.index + 1} of ${session.questions.length}`, `प्रश्न ${session.index + 1}/${session.questions.length}`)}{session.players.length > 0 ? ` • ${session.players[session.index % session.players.length]}` : ''}</Copy>
    <Panel><Copy title>{q.prompt[lang]}</Copy></Panel>
    {lang === 'hinglish' && q.translationUnavailable && <Copy small>{t('This saved question is shown in English because its Hinglish version is unavailable.', 'हिंग्लिश संस्करण उपलब्ध न होने के कारण यह सहेजा प्रश्न अंग्रेज़ी में दिखाया गया है।')}</Copy>}
    {q.options.map(option => <Button radio key={option.id} label={`${option.label[lang]}${answered && option.id === q.correct ? t(' • Correct answer', ' • सही उत्तर') : answered && option.id === session.answers[q.id] ? t(' • Your answer', ' • आपका उत्तर') : ''}`} selected={answered ? option.id === session.answers[q.id] : selected === option.id} disabled={busy} readOnly={answered} onPress={() => setSelection({ key: questionKey, id: option.id })} />)}
    {!answered ? <Button primary label={t('Check answer', 'उत्तर जांचें')} disabled={!selected || busy} onPress={() => { void submit(); }} /> : <>
      <Panel><Copy title>{correct ? t('Correct ✓', 'सही ✓') : t('Let us discover why', 'आइए समझें क्यों')}</Copy><Copy>{q.explanation[lang]}</Copy><Button label={sourceOpen ? t('Hide source', 'संदर्भ छिपाएं') : t('Source & tradition', 'संदर्भ और परंपरा')} onPress={() => setSourceKey(sourceOpen ? null : questionKey)} />{sourceOpen && <><Copy small>{q.source[lang]}</Copy><Copy small>{q.context[lang]}</Copy></>}</Panel>
      <Button disabled={busy} label={progress!.saved.includes(q.id) ? t('Saved ✓ • Remove', 'सहेजा गया ✓ • हटाएं') : t('Save explanation', 'व्याख्या सहेजें')} onPress={saveQuestion} />
      <Button primary disabled={busy} label={session.index + 1 === session.questions.length ? t('See results', 'परिणाम देखें') : t('Continue', 'आगे बढ़ें')} onPress={() => { if (bank) void commit(p => continueSession(p, bank)); }} />
    </>}
    <Panel><Copy small>{t('Language', 'भाषा')}</Copy><LanguagePicker /></Panel>
  </QuizScreen>;
}
