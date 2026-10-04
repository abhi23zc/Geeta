import { FlatList } from 'react-native';
import { Flower2 } from 'lucide-react-native';
import { C } from '@/constants/ritual-theme';
import { useQuiz } from '@/features/quiz/provider';
import { Copy, Panel, QuizScreen, useCopy } from '@/features/quiz/ui';

export default function Collection() {
  const { bank, progress } = useQuiz(), t = useCopy(), lang = progress?.settings.language ?? 'hi';
  return <QuizScreen title={t('Knowledge collection', 'ज्ञान संग्रह')} scroll={false}>
    <Copy>{t('Complete four different lessons in a topic to unlock each knowledge card.', 'हर ज्ञान कार्ड पाने के लिए उस विषय के चार अलग पाठ पूरे करें।')}</Copy>
    <FlatList data={bank?.cards ?? []} keyExtractor={c => c.id} contentContainerStyle={{ gap: 16, paddingBottom: 24 }} renderItem={({ item }) => {
      const unlocked = progress?.cards.includes(item.id), completed = bank!.lessons.filter(l => l.topic === item.topic && progress?.lessons[l.id]?.complete).length;
      return <Panel><Flower2 size={30} color={unlocked ? C.primary : C.muted} /><Copy title>{item.title[lang]}</Copy>{unlocked ? <Copy>{item.body[lang]}</Copy> : <Copy small>{t(`${completed}/${item.milestone} topic lessons completed`, `विषय के ${completed}/${item.milestone} पाठ पूरे`)}</Copy>}</Panel>;
    }} />
  </QuizScreen>;
}
