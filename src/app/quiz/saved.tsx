import { FlatList } from 'react-native';
import { useQuiz } from '@/features/quiz/provider';
import { StartButton } from '@/features/quiz/start-button';
import { Button, Copy, Panel, QuizScreen, useCopy } from '@/features/quiz/ui';

export default function Saved() {
  const { bank, progress, commit, busy } = useQuiz(), t = useCopy(), lang = progress?.settings.language ?? 'hi';
  const questions = bank?.questions.filter(q => progress?.saved.includes(q.id)) ?? [];
  return <QuizScreen title={t('Saved explanations', 'सहेजी व्याख्याएं')} scroll={false}>
    {questions.length > 0 && <StartButton label={t('Practice saved questions', 'सहेजे प्रश्नों का अभ्यास')} options={{ mode: 'revision', revision: 'saved', count: 5 }} />}
    <FlatList data={questions} keyExtractor={q => q.id} contentContainerStyle={{ gap: 16, paddingBottom: 24 }} ListEmptyComponent={<Copy>{t('Save an explanation after answering a question.', 'प्रश्न का उत्तर देने के बाद व्याख्या सहेजें।')}</Copy>} renderItem={({ item }) => <Panel><Copy title>{item.prompt[lang]}</Copy><Copy>{item.explanation[lang]}</Copy><Copy small>{item.source[lang]}</Copy><Copy small>{item.context[lang]}</Copy><Button disabled={busy} label={t('Remove from saved', 'सहेजे प्रश्नों से हटाएं')} onPress={() => { void commit(p => ({ ...p, saved: p.saved.filter(id => id !== item.id) })); }} /></Panel>} />
  </QuizScreen>;
}
