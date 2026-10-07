import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import { Check, Leaf, RotateCcw } from 'lucide-react-native';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useLanguage } from '@/i18n/provider';
import { dayKey } from '../model';
import { useProgress } from '../provider';
import { useTreeSession } from './session';
import { TreeRecovery } from './recovery';
import { useAlarmPresentation } from '@/navigation/alarm-presentation';
import { treeAsset } from './assets';
import { TreeScene } from './scene';
import { useTreeEnvironment } from './use-motion';

type GrowthCardProps = {
  streak: number; cycle?: number; screen?: 'home' | 'progress'; completed?: boolean; count?: number; compact?: boolean;
  reducedMotion?: boolean; simulateFailure?: boolean;
};

export function GrowthCard({ streak, cycle = 1, screen, completed = false, count = 0, compact = false, reducedMotion = false, simulateFailure = false }: GrowthCardProps) {
  const { t, formatNumber } = useLanguage();
  const [replay, setReplay] = useState(0);
  const [playing, setPlaying] = useState(false);
  const stop = useCallback(() => setPlaying(false), []);
  const focused = useIsFocused();
  const { active, reduced, motionReady } = useTreeEnvironment();
  const session = useTreeSession();
  const { progress, ready, pendingGrowth, error, clockWarning } = useProgress();
  const alarm = useAlarmPresentation();
  const [mode, setMode] = useState<'entry' | 'replay' | 'recovery'>('entry');
  const [recovery, setRecovery] = useState<{ from: number; to: number; rollover: boolean } | null>(null);
  const attempted = useRef('');
  useEffect(() => {
    if (focused && active && !alarm.active && !pendingGrowth && !reduced && !reducedMotion) return;
    const timer = setTimeout(() => { setPlaying(false); setRecovery(null); }, 0);
    return () => clearTimeout(timer);
  }, [focused, active, alarm.active, pendingGrowth, reduced, reducedMotion]);
  useEffect(() => {
    if (!screen || !focused || !active || !ready || !motionReady || alarm.active || error || clockWarning || !progress || progress.lastObserved !== dayKey(new Date(), progress.timezone)) return;
    const identity = `${session.revision}:${progress.tree.revision}:${screen}`;
    if (attempted.current === identity) return;
    attempted.current = identity;
    let cancelled = false;
    const visit = session.claim(screen);
    const x = progress.tree.transition;
    void (async () => {
      const recovered = x && await session.claimTransition(progress.createdAt, x.revision);
      if (cancelled || pendingGrowth) return;
      if (recovered && x && x.kind !== 'growth' && !reduced && !reducedMotion) {
        setMode('recovery'); setRecovery({ from: x.from, to: x.to, rollover: x.kind === 'rollover' }); setPlaying(true);
      } else if (visit && !reduced && !reducedMotion) { setMode('entry'); setReplay(n => n + 1); setPlaying(true); }
    })();
    return () => { cancelled = true; };
  }, [screen, focused, active, ready, motionReady, alarm.active, error, clockWarning, progress, session, pendingGrowth, reduced, reducedMotion]);
  const canReplay = !compact && (!!treeAsset(streak).video || streak === 0) && !reduced && !reducedMotion;
  const isPlaying = playing && focused && active && !alarm.active && !pendingGrowth && !reduced && !reducedMotion;
  const milestone = streak < 7 ? 7 : streak < 30 ? 30 : null;
  const title = t(streak === 0 ? 'A new beginning' : streak === 1 ? 'Your first leaf.' : streak <= 3 ? 'Your first leaves' : streak < 14 ? 'Taking root' : streak < 30 ? 'Growing stronger' : 'Rooted in practice');

  return <View style={compact ? s.inline : s.card}>
    {!compact && <View style={s.heading}>
      <View style={s.headingText}>
        <View style={s.titleRow}><Leaf size={15} color={C.greenDark} /><TextR style={s.kicker}>{t('Your daily growth')}</TextR></View>
        <TextR serif style={s.title}>{title}</TextR>
      </View>
      <TextR style={s.badge}>{t('Level {count} of 30', { count: formatNumber(streak) })}</TextR>
    </View>}
    <TextR style={s.kicker}>{t('Tree {count}', { count: formatNumber(cycle) })} · {t('Level {count} of 30', { count: formatNumber(streak) })}</TextR>
    {recovery && isPlaying ? <TreeRecovery {...recovery} onEnd={stop} /> : <TreeScene key={`${streak}:${replay}`} streak={streak} play={isPlaying} recap={mode !== 'entry'} priority={mode === 'entry' ? 2 : 1} reducedMotion={reducedMotion} simulateFailure={simulateFailure} onEnd={stop} onError={stop} />}
    {progress?.tree.transition?.kind === 'rollover' && <TextR style={s.caption}>{t('A new tree begins')}</TextR>}
    {!!progress?.tree.transition?.lost && <TextR style={s.caption}>{t('missedTreeDays', { count: progress.tree.transition.lost })}</TextR>}
    <View style={[s.footer, compact && s.compactFooter]}>
      <View style={s.status}>
        {completed && <View style={s.statusCheck}><Check size={12} color={C.greenDark} strokeWidth={2.5} /></View>}
        <TextR style={[s.caption, completed && s.completeCaption]}>{t(completed ? 'Today’s growth is complete' : count === 1 ? 'One more practice to grow' : 'Complete both to grow your tree')}</TextR>
      </View>
      {canReplay && <Pressable
        accessibilityRole="button" accessibilityState={{ disabled: isPlaying, busy: isPlaying }} disabled={isPlaying}
        onPress={() => { setMode('replay'); setRecovery(null); setReplay(n => n + 1); setPlaying(true); }}
        style={({ pressed }) => [s.replay, pressed && { opacity: 0.7 }, isPlaying && s.replayActive]}>
        <RotateCcw size={15} color={C.primary} />
        <TextR style={s.replayText}>{t(isPlaying ? 'Playing growth' : 'Replay growth')}</TextR>
      </Pressable>}
    </View>
    {!compact && milestone !== null && <View style={s.milestone}>
      <View style={s.milestoneLabels}>
        <TextR style={s.milestoneLabel}>{t('Next growth milestone')}</TextR>
        <TextR style={s.milestoneDay}>{t('Level {count} of 30', { count: formatNumber(milestone) })}</TextR>
      </View>
      <View accessible accessibilityRole="progressbar" accessibilityLabel={t('Next growth milestone')} accessibilityValue={{ min: 0, max: milestone, now: streak }} style={s.track}>
        <View style={[s.fill, { width: `${Math.min(100, streak / milestone * 100)}%` }]} />
      </View>
      <TextR style={s.remaining}>{milestone - streak === 1 ? t('One more complete day') : t('{count} more complete days', { count: formatNumber(milestone - streak) })}</TextR>
    </View>}
  </View>;
}
const s = StyleSheet.create({
  inline: { gap: 10 },
  card: { padding: 16, gap: 14, borderRadius: 24, backgroundColor: C.card, borderWidth: 1, borderColor: C.glassBorder, shadowColor: C.saffron, shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  headingText: { flex: 1, minWidth: 160, gap: 4 }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kicker: { color: C.greenDark, fontSize: 12, fontWeight: '700' }, title: { color: C.ink, fontSize: 25, lineHeight: 32 },
  badge: { color: C.greenDark, backgroundColor: '#E9EFD9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, fontSize: 13, fontWeight: '800' },
  footer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }, compactFooter: { paddingVertical: 3 },
  status: { flex: 1, minWidth: 150, flexDirection: 'row', alignItems: 'center', gap: 7 }, statusCheck: { width: 21, height: 21, borderRadius: 11, backgroundColor: '#E9EFD9', alignItems: 'center', justifyContent: 'center' },
  caption: { flex: 1, color: C.muted, fontSize: 14, lineHeight: 20 }, completeCaption: { color: C.greenDark, fontWeight: '600' },
  replay: { minHeight: 48, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#FFF0E3', flexDirection: 'row', alignItems: 'center', gap: 6 }, replayActive: { opacity: 0.6 }, replayText: { color: C.primary, fontWeight: '700', fontSize: 13 },
  milestone: { gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.divider }, milestoneLabels: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 }, milestoneLabel: { fontSize: 13, color: C.muted }, milestoneDay: { fontSize: 13, color: C.greenDark, fontWeight: '700' },
  track: { height: 5, borderRadius: 5, backgroundColor: '#E9E6D8', overflow: 'hidden' }, fill: { height: '100%', borderRadius: 5, backgroundColor: C.green }, remaining: { fontSize: 12, color: C.muted, lineHeight: 18 },
});
