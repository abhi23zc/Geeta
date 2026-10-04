import { useRouter } from 'expo-router';
import { BookOpen, Flower2, Users, Sparkles } from 'lucide-react-native';
import { useQuiz } from '@/features/quiz/provider';
import { Button, Copy, Panel, QuizScreen, useCopy } from '@/features/quiz/ui';
import { C } from '@/constants/ritual-theme';

export default function QuizHome() {
  const { bank, progress } = useQuiz(), router = useRouter(), t = useCopy();
  const explored = Object.keys(progress?.questions ?? {}).length;
  const mastered = Object.values(progress?.questions ?? {}).filter(p => p.mastered).length;
  return <QuizScreen title={t('Culture Quiz', 'संस्कृति क्विज़')} onBack={() => router.replace('/')}>
    <Panel><BookOpen size={32} color={C.primary} /><Copy title>{t('A little discovery, anytime', 'जब चाहें, कुछ नया जानें')}</Copy><Copy>{t('600 questions • Hindi, English & Hinglish • Fully offline', '600 प्रश्न • हिंदी, अंग्रेज़ी और हिंग्लिश • पूरी तरह ऑफलाइन')}</Copy><Copy small>{t('Explore stories, traditions and wisdom at your own pace.', 'अपनी गति से कथाएं, परंपराएं और ज्ञान जानें।')}</Copy></Panel>
    {progress?.active && <Button primary label={progress.active.phase === 'results' ? t('View last result', 'पिछला परिणाम देखें') : t('Resume unfinished quiz', 'अधूरी क्विज़ जारी रखें')} onPress={() => router.push('/quiz/play')} />}
    <Button label={t('Learning Journey →', 'ज्ञान यात्रा →')} onPress={() => router.push('/quiz/journey')} />
    <Button label={t('Quick Quiz →', 'छोटी क्विज़ →')} onPress={() => router.push('/quiz/setup')} />
    <Button label={t('Practice Again →', 'दोबारा अभ्यास →')} onPress={() => router.push({ pathname: '/quiz/setup', params: { mode: 'revision' } })} />
    <Panel><Users size={28} color={C.primary} /><Copy>{t('Learn with your family', 'परिवार के साथ सीखें')}</Copy><Button label={t('Play with Family →', 'परिवार के साथ खेलें →')} onPress={() => router.push('/quiz/family')} /></Panel>
    <Panel><Flower2 size={28} color={C.greenDark} /><Copy title>{t('Your discoveries', 'आपका ज्ञान')}</Copy><Copy>{t(`${explored} explored • ${mastered} mastered`, `${explored} प्रश्न देखे • ${mastered} याद किए`)}</Copy><Copy small>{t(`${Object.values(progress?.lessons ?? {}).filter(l => l.complete).length}/120 lessons completed`, `${Object.values(progress?.lessons ?? {}).filter(l => l.complete).length}/120 पाठ पूरे`)}</Copy></Panel>
    {!!progress?.history.length && <Panel><Copy title>{t('Recent rounds', 'पिछली क्विज़')}</Copy>{progress.history.slice(0, 5).map(round => <Copy small key={round.id}>{round.date} • {round.mode === 'turns' || round.mode === 'together' ? t('Family', 'परिवार') : t('Solo', 'अभ्यास')} • {round.score}/{round.total}</Copy>)}</Panel>}
    {bank?.topics.map(topic => <Panel key={topic.id}><Copy title>{topic.title[progress!.settings.language]}</Copy><Copy small>{t(`${topic.count} questions`, `${topic.count} प्रश्न`)}</Copy><Button label={t('Explore topic', 'विषय जानें')} onPress={() => router.push({ pathname: '/quiz/journey', params: { topic: topic.id } })} /></Panel>)}
    <Button label={t('Saved explanations', 'सहेजी हुई व्याख्याएं')} onPress={() => router.push('/quiz/saved')} />
    <Panel><Sparkles size={28} color={C.primary} /><Button label={t(`Knowledge collection (${progress?.cards.length ?? 0}/30)`, `ज्ञान संग्रह (${progress?.cards.length ?? 0}/30)`)} onPress={() => router.push('/quiz/collection')} /></Panel>
    <Button label={t('Language, text size & settings', 'भाषा, अक्षर आकार और सेटिंग्स')} onPress={() => router.push('/quiz/settings')} />
  </QuizScreen>;
}
