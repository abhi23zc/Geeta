import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { revisionPool } from '@/features/quiz/engine';
import { useQuiz } from '@/features/quiz/provider';
import { StartButton } from '@/features/quiz/start-button';
import type { Difficulty } from '@/features/quiz/types';
import { Button, Copy, Panel, QuizScreen, useCopy } from '@/features/quiz/ui';

export default function QuizSetup() {
  const params = useLocalSearchParams<{ mode?: string }>(), revision = params.mode === 'revision';
  const { bank, progress } = useQuiz(), t = useCopy();
  const [topic, setTopic] = useState('all'), [difficulty, setDifficulty] = useState<Difficulty | 'any'>('any'), [count, setCount] = useState(5);
  const [kind, setKind] = useState<'wrong' | 'due' | 'saved'>('due');
  const eligible = bank && progress ? (revision ? revisionPool(bank, progress, kind) : bank.questions).filter(q => (topic === 'all' || q.topic === topic) && (difficulty === 'any' || q.difficulty === difficulty)).length : 0;
  return <QuizScreen title={revision ? t('Practice Again', 'दोबारा अभ्यास') : t('Quick Quiz', 'छोटी क्विज़')}>
    {revision && <Panel><Copy>{t('What would you like to revisit?', 'क्या दोहराना चाहेंगे?')}</Copy>{(['due', 'wrong', 'saved'] as const).map(k => <Button key={k} selected={kind === k} label={k === 'due' ? t('Due for revision', 'दोहराने का समय') : k === 'wrong' ? t('Previously missed', 'पहले गलत हुए प्रश्न') : t('Saved questions', 'सहेजे गए प्रश्न')} onPress={() => setKind(k)} />)}</Panel>}
    <Panel><Copy title>{t('Topic', 'विषय')}</Copy><Button label={t('Mixed topics', 'मिश्रित विषय')} selected={topic === 'all'} onPress={() => setTopic('all')} />{bank?.topics.map(q => <Button key={q.id} label={q.title[progress!.settings.language]} selected={topic === q.id} onPress={() => setTopic(q.id)} />)}</Panel>
    <Panel><Copy title>{t('Difficulty', 'कठिनाई')}</Copy>{(['any', 'easy', 'medium', 'advanced'] as const).map(d => <Button key={d} label={{ any: t('Any', 'सभी'), easy: t('Easy', 'सरल'), medium: t('Medium', 'मध्यम'), advanced: t('Advanced', 'गहन') }[d]} selected={difficulty === d} onPress={() => setDifficulty(d)} />)}</Panel>
    <Panel><Copy title>{t('Round length', 'प्रश्नों की संख्या')}</Copy>{[5, 10].map(n => <Button key={n} label={t(`${n} questions`, `${n} प्रश्न`)} selected={count === n} onPress={() => setCount(n)} />)}<Copy small>{t(`${Math.min(count, eligible)} questions available for this round. No timer.`, `इस क्विज़ के लिए ${Math.min(count, eligible)} प्रश्न उपलब्ध हैं। समय सीमा नहीं है।`)}</Copy></Panel>
    {eligible ? <StartButton label={t('Start quiz', 'क्विज़ शुरू करें')} options={{ mode: revision ? 'revision' : 'quick', topic, difficulty, count, revision: kind }} /> : <Copy>{t('No matching questions yet. Try another selection or explore a lesson first.', 'अभी ऐसे प्रश्न नहीं हैं। दूसरा चयन करें या पहले कोई पाठ पढ़ें।')}</Copy>}
  </QuizScreen>;
}
