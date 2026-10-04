import { FlatList } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuiz } from '@/features/quiz/provider';
import { StartButton } from '@/features/quiz/start-button';
import { Copy, Panel, QuizScreen, useCopy } from '@/features/quiz/ui';

export default function Journey() {
  const { topic } = useLocalSearchParams<{ topic?: string }>(), { bank, progress } = useQuiz(), t = useCopy();
  const lessons = bank?.lessons.filter(l => !topic || l.topic === topic) ?? [];
  const next = lessons.find(l => !progress?.lessons[l.id]?.complete)?.id;
  return <QuizScreen title={t('Learning Journey', 'ज्ञान यात्रा')} scroll={false}>
    <Copy small>{t('Five questions per lesson. Every lesson is open to you.', 'हर पाठ में पांच प्रश्न। आप कोई भी पाठ चुन सकते हैं।')}</Copy>
    <FlatList data={lessons} keyExtractor={l => l.id} contentContainerStyle={{ gap: 14, paddingBottom: 24 }} renderItem={({ item }) => {
      const completed = progress?.lessons[item.id];
      return <Panel><Copy title>{bank?.topics.find(tp => tp.id === item.topic)?.title[progress!.settings.language]}</Copy><Copy>{t(`Lesson ${item.number}`, `पाठ ${item.number}`)}{item.id === next ? t(' • Continue here', ' • यहां से जारी रखें') : ''}</Copy><Copy small>{completed?.complete ? t(`Completed • Best ${completed.best}/5`, `पूरा हुआ • सर्वश्रेष्ठ ${completed.best}/5`) : t('Ready to discover', 'नया जानने के लिए तैयार')}</Copy><StartButton label={completed?.complete ? t('Play again', 'दोबारा खेलें') : t('Begin lesson', 'पाठ शुरू करें')} options={{ mode: 'journey', lesson: item.id, topic: item.topic }} /></Panel>;
    }} />
  </QuizScreen>;
}
