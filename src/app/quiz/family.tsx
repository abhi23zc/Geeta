import { useState } from 'react';
import { TextInput } from 'react-native';
import { StartButton } from '@/features/quiz/start-button';
import { Button, Copy, Panel, QuizScreen, styles, useCopy } from '@/features/quiz/ui';

export default function Family() {
  const t = useCopy(), [mode, setMode] = useState<'together' | 'turns'>('together'), [count, setCount] = useState(2), [names, setNames] = useState(['', '', '', '']);
  return <QuizScreen title={t('Play with Family', 'परिवार के साथ खेलें')}>
    <Copy>{t('One phone, shared discoveries. Family scores stay separate from your learning journey.', 'एक फोन पर मिलकर सीखें। परिवार के अंक आपकी ज्ञान यात्रा से अलग रहते हैं।')}</Copy>
    <Button label={t('Together • 10 questions', 'मिलकर • 10 प्रश्न')} selected={mode === 'together'} onPress={() => setMode('together')} />
    <Button label={t('Take turns • 5 questions each', 'बारी-बारी • प्रत्येक के लिए 5 प्रश्न')} selected={mode === 'turns'} onPress={() => setMode('turns')} />
    {mode === 'turns' && <Panel><Copy title>{t('Players', 'खिलाड़ी')}</Copy>{[2, 3, 4].map(n => <Button key={n} label={t(`${n} players`, `${n} खिलाड़ी`)} selected={count === n} onPress={() => setCount(n)} />)}{names.slice(0, count).map((name, i) => <TextInput key={i} accessibilityLabel={t(`Player ${i + 1} name`, `खिलाड़ी ${i + 1} का नाम`)} placeholder={t(`Player ${i + 1}`, `खिलाड़ी ${i + 1}`)} placeholderTextColor="#68564A" value={name} maxLength={40} style={styles.input} onChangeText={value => setNames(prev => prev.map((v, j) => j === i ? value : v))} />)}<Copy small>{t('Each player gets 3 easy and 2 medium questions.', 'हर खिलाड़ी को 3 सरल और 2 मध्यम प्रश्न मिलेंगे।')}</Copy></Panel>}
    <StartButton label={t('Start family round', 'परिवार की क्विज़ शुरू करें')} options={{ mode, players: names.slice(0, count).map((n, i) => n.trim() || t(`Player ${i + 1}`, `खिलाड़ी ${i + 1}`)) }} />
  </QuizScreen>;
}
