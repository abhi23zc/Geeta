import { useQuiz } from '@/features/quiz/provider';
import { confirmAction } from '@/features/quiz/actions';
import { Button, Copy, Panel, QuizScreen, useCopy } from '@/features/quiz/ui';
import { LanguagePicker } from '@/i18n/language-picker';

export default function Settings() {
  const { progress, busy, commit, reset } = useQuiz(), t = useCopy();
  return <QuizScreen title={t('Settings', 'सेटिंग्स')}>
    <Panel><Copy title>{t('Language', 'भाषा')}</Copy><LanguagePicker /></Panel>
    <Panel><Copy title>{t('Text size', 'अक्षर आकार')}</Copy>{(['standard', 'large', 'extra'] as const).map(textSize => <Button key={textSize} label={{ standard: t('Standard', 'सामान्य'), large: t('Large', 'बड़ा'), extra: t('Extra large', 'बहुत बड़ा') }[textSize]} selected={progress?.settings.textSize === textSize} disabled={busy} onPress={() => { void commit(p => ({ ...p, settings: { ...p.settings, textSize } })); }} />)}</Panel>
    <Button label={progress?.settings.haptics ? t('Answer vibration: On', 'उत्तर पर कंपन: चालू') : t('Answer vibration: Off', 'उत्तर पर कंपन: बंद')} disabled={busy} onPress={() => { void commit(p => ({ ...p, settings: { ...p.settings, haptics: !p.settings.haptics } })); }} />
    <Panel><Copy>{t('All questions and explanations are bundled on this device. Progress is shared by people using this phone. No account is required.', 'सभी प्रश्न और व्याख्याएं इस फोन पर हैं। फोन उपयोग करने वालों का अभ्यास रिकॉर्ड साझा है। खाते की जरूरत नहीं है।')}</Copy><Copy small>{t('Question-level editorial review is pending. Sources and tradition notes are available after each answer.', 'प्रश्नों की संपादकीय समीक्षा बाकी है। हर उत्तर के बाद संदर्भ और परंपरा संबंधी जानकारी उपलब्ध है।')}</Copy></Panel>
    <Button disabled={busy} label={t('Reset quiz progress', 'क्विज़ प्रगति रीसेट करें')} onPress={() => confirmAction(t('Reset quiz?', 'क्विज़ रीसेट करें?'), t('This removes only quiz progress, saved questions and the current round. Other app data stays intact.', 'केवल क्विज़ प्रगति, सहेजे प्रश्न और वर्तमान क्विज़ हटेंगे। ऐप का अन्य डेटा सुरक्षित रहेगा।'), t('Reset quiz', 'क्विज़ रीसेट करें'), () => { void reset(); })} />
  </QuizScreen>;
}
