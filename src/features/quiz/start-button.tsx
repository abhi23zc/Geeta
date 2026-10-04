import { useRouter } from 'expo-router';
import { startSession } from './engine';
import { useQuiz } from './provider';
import type { StartOptions } from './types';
import { Button, useCopy } from './ui';
import { confirmAction } from './actions';

export function StartButton({ label, options }: { label: string; options: StartOptions }) {
  const { bank, progress, busy, commit } = useQuiz(), router = useRouter(), t = useCopy();
  const start = async () => {
    if (!bank) return;
    if (await commit(p => ({ ...p, active: startSession(bank, { ...p, active: null }, options) }))) router.push('/quiz/play');
  };
  return <Button primary label={label} disabled={busy} onPress={() => {
    if (progress?.active && progress.active.phase !== 'results') {
      confirmAction(t('Unfinished quiz', 'अधूरी क्विज़'), t('Discard the unfinished round and start this one? To resume, use Continue on the quiz home.', 'अधूरी क्विज़ छोड़कर यह शुरू करें? जारी रखने के लिए क्विज़ होम पर जारी रखें चुनें।'), t('Discard & start', 'छोड़ें और शुरू करें'), () => { void start(); });
    } else void start();
  }} />;
}
