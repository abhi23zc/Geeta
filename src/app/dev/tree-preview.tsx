import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Screen, TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { createTreeSession } from '@/features/progress/tree/session-model';
import { TreeScene } from '@/features/progress/tree/scene';
import { TreeRecovery } from '@/features/progress/tree/recovery';
import { GrowthCard } from '@/features/progress/tree/growth-card';
import { GrowthCelebration } from '@/features/progress/tree/celebration';

export default function TreePreview() {
  return __DEV__ ? <Preview /> : <Redirect href="/" />;
}
function Preview() {
  const router = useRouter();
  const [session] = useState(createTreeSession);
  const [sessionMessage, setSessionMessage] = useState('Choose a focused screen to claim a visit.');
  const [entry, setEntry] = useState({ screen: '', play: false, revision: 0 });
  const [stage, setStage] = useState(1);
  const [count, setCount] = useState(2);
  const [reduced, setReduced] = useState(false);
  const [failure, setFailure] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [loss, setLoss] = useState(0);
  const [transition, setTransition] = useState(0);
  const [open, setOpen] = useState(false);
  const bonus = !repeat ? stage === 7 ? 40 : stage === 30 ? 100 : 0 : 0;
  return <Screen><View style={s.page}>
    <Pressable style={s.button} onPress={() => router.back()}><TextR style={s.link}>← Progress</TextR></Pressable>
    <TextR serif style={s.title}>Tree growth preview</TextR>
    <TextR style={s.note}>Development only. These examples never change your real progress, points, or celebration history.</TextR>
    <View style={s.options}>{Array.from({ length: 31 }, (_, i) => i).map(day => <Pressable accessibilityRole="button" accessibilityState={{ selected: stage === day }} key={day} style={[s.button, stage === day && s.selected]} onPress={() => setStage(day)}><TextR>{day === 0 ? 'Seed / reset' : `Day ${day}`}</TextR></Pressable>)}</View>
    <View style={s.options}>{[0, 1, 2].map(value => <Pressable accessibilityRole="button" accessibilityState={{ selected: count === value }} key={value} style={[s.button, count === value && s.selected]} onPress={() => setCount(value)}><TextR>{value}/2 complete</TextR></Pressable>)}</View>
    {[['Reduced motion', reduced, setReduced], ['Simulate video failure', failure, setFailure], ['Milestone previously earned', repeat, setRepeat]].map(([label, value, change]) => <View key={String(label)} style={s.row}><TextR style={s.rowLabel}>{String(label)}</TextR><Switch accessibilityLabel={String(label)} value={value as boolean} onValueChange={change as (v: boolean) => void} trackColor={{ true: C.green }} /></View>)}
    <View style={s.options}>{[1, 3, 8, 30].map(n => <Pressable key={n} style={s.button} onPress={() => { setLoss(n); setTransition(v => v + 1); }}><TextR>{n === 30 ? 'Cycle rollover' : `Lose ${n} levels`}</TextR></Pressable>)}</View>
    {loss > 0 && <TreeRecovery reducedMotion={reduced} key={transition} from={loss === 30 ? 30 : Math.min(30, stage + loss)} to={loss === 30 ? 0 : stage} rollover={loss === 30} onEnd={() => setLoss(0)} />}
    <TextR style={s.note}>Session playback · {sessionMessage}</TextR>
    <View style={s.options}>{['home', 'progress', 'inactive', 'background'].map(name => <Pressable key={name} style={s.button} onPress={() => {
      if (name === 'inactive' || name === 'background') { session.change(name); session.change('active'); setSessionMessage(`${name} → active, session ${session.revision}`); setEntry({ screen: '', play: false, revision: session.revision }); }
      else { const play = session.claim(name); setEntry({ screen: name, play, revision: session.revision }); setSessionMessage(`${name}: ${play ? 'first focused visit' : 'already visited; poster'}`); }
    }}><TextR>{name}</TextR></Pressable>)}</View>
    <TreeScene key={`${entry.screen}:${entry.revision}:${entry.play}`} streak={stage} play={entry.play} recap={false} priority={2} reducedMotion={reduced} simulateFailure={failure} />
    <TextR style={s.note}>Home placement</TextR>
    <View style={s.homeCard}><GrowthCard compact streak={stage} completed={count === 2} count={count} /></View>
    <TextR style={s.note}>Progress placement</TextR>
    <GrowthCard key={`${stage}:${reduced}:${failure}`} streak={stage} completed={count === 2} count={count} reducedMotion={reduced} simulateFailure={failure} />
    <Pressable accessibilityRole="button" disabled={stage === 0 || count !== 2} style={[s.button, s.primary, (stage === 0 || count !== 2) && { opacity: 0.4 }]} onPress={() => setOpen(true)}><TextR style={{ color: C.white }}>Preview completion celebration</TextR></Pressable>
    {open && <GrowthCelebration event={{ id: 'preview', profile: 'preview', date: 'preview', streak: stage, dailyPoints: 20, bonus }} reducedMotion={reduced} simulateFailure={failure} onClose={() => setOpen(false)} onViewGrowth={() => setOpen(false)} />}
  </View></Screen>;
}
const s = StyleSheet.create({ page: { gap: 16, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' }, title: { fontSize: 28, color: C.ink }, note: { color: C.muted, lineHeight: 21 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, button: { minHeight: 48, justifyContent: 'center', alignItems: 'center', padding: 12, backgroundColor: C.sand, borderRadius: 14 }, selected: { borderWidth: 2, borderColor: C.saffron }, row: { flexDirection: 'row', alignItems: 'center', gap: 16 }, rowLabel: { flex: 1 }, homeCard: { backgroundColor: C.card, padding: 16, borderRadius: 24 }, primary: { backgroundColor: C.saffron }, link: { color: C.saffron } });
