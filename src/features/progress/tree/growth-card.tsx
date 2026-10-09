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
  const canReplay = (!!treeAsset(streak).video || streak === 0) && !reduced && !reducedMotion;
  const isPlaying = playing && focused && active && !alarm.active && !pendingGrowth && !reduced && !reducedMotion;
  const nextLevel = streak < 30 ? streak + 1 : null;
  const title = t(streak === 0 ? 'A new beginning' : streak === 1 ? 'Your first leaf.' : streak <= 3 ? 'Your first leaves' : streak < 14 ? 'Taking root' : streak < 30 ? 'Growing stronger' : 'Rooted in practice');

  if (compact) {
    return (
      <View style={s.compactRoot}>
        {/* Sacred Tree Sanctuary Viewport */}
        <View style={s.compactViewport}>
          {/* Floating Level Tag */}
          <View style={s.floatingTag}>
            <Leaf size={12} color={C.saffron} />
            <TextR style={s.floatingTagText}>
              {t('Tree {count}', { count: formatNumber(cycle) })} · {t('Level {count} of 30', { count: formatNumber(streak) })}
            </TextR>
          </View>

          {/* Floating Completed Badge */}
          {completed && (
            <View style={s.floatingDoneBadge}>
              <Check size={11} color="#92400E" strokeWidth={2.8} />
              <TextR style={s.floatingDoneText}>{t('Today’s growth is complete')}</TextR>
            </View>
          )}

          {recovery && isPlaying ? (
            <TreeRecovery {...recovery} onEnd={stop} />
          ) : (
            <TreeScene
              key={`${streak}:${replay}`}
              streak={streak}
              play={isPlaying}
              recap={mode !== 'entry'}
              priority={mode === 'entry' ? 2 : 1}
              reducedMotion={reducedMotion}
              simulateFailure={simulateFailure}
              onEnd={stop}
              onError={stop}
            />
          )}
        </View>

        {progress?.tree.transition?.kind === 'rollover' && (
          <TextR style={s.caption}>{t('A new tree begins')}</TextR>
        )}

        {/* Compact Footer: Status & Replay */}
        <View style={s.compactFooterRow}>
          <View style={s.compactStatusGroup}>
            {completed && (
              <View style={s.statusCheck}>
                <Check size={12} color="#92400E" strokeWidth={2.8} />
              </View>
            )}
            <TextR style={[s.caption, completed && s.completeCaption]}>
              {t(
                completed
                  ? 'Today’s growth is complete'
                  : count === 1
                    ? 'One more practice to grow'
                    : 'Complete both to grow your tree'
              )}
            </TextR>
          </View>

          {canReplay && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(isPlaying ? 'Playing growth' : 'Replay growth')}
              accessibilityState={{ disabled: isPlaying, busy: isPlaying }}
              disabled={isPlaying}
              onPress={() => {
                setMode('replay');
                setRecovery(null);
                setReplay(n => n + 1);
                setPlaying(true);
              }}
              style={({ pressed }) => [
                s.compactReplayBtn,
                pressed && { opacity: 0.75 },
                isPlaying && s.replayActive,
              ]}
            >
              <RotateCcw size={13} color={C.primary} />
              <TextR style={s.compactReplayText}>
                {t(isPlaying ? 'Playing growth' : 'Replay growth')}
              </TextR>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <View style={s.heading}>
        <View style={s.headingText}>
          <View style={s.titleRow}>
            <Leaf size={15} color={C.saffron} />
            <TextR style={s.kicker}>{t('Your daily growth')}</TextR>
          </View>
          <TextR serif style={s.title}>{title}</TextR>
        </View>
        <TextR style={s.badge}>{t('Level {count} of 30', { count: formatNumber(streak) })}</TextR>
      </View>

      <View style={s.viewportWrapper}>
        {recovery && isPlaying ? (
          <TreeRecovery {...recovery} onEnd={stop} />
        ) : (
          <TreeScene
            key={`${streak}:${replay}`}
            streak={streak}
            play={isPlaying}
            recap={mode !== 'entry'}
            priority={mode === 'entry' ? 2 : 1}
            reducedMotion={reducedMotion}
            simulateFailure={simulateFailure}
            onEnd={stop}
            onError={stop}
          />
        )}
      </View>

      {progress?.tree.transition?.kind === 'rollover' && (
        <TextR style={s.caption}>{t('A new tree begins')}</TextR>
      )}

      <View style={s.footer}>
        <View style={s.status}>
          {completed && (
            <View style={s.statusCheck}>
              <Check size={12} color="#92400E" strokeWidth={2.8} />
            </View>
          )}
          <TextR style={[s.caption, completed && s.completeCaption]}>
            {t(
              completed
                ? 'Today’s growth is complete'
                : count === 1
                  ? 'One more practice to grow'
                  : 'Complete both to grow your tree'
            )}
          </TextR>
        </View>
        {canReplay && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isPlaying, busy: isPlaying }}
            disabled={isPlaying}
            onPress={() => {
              setMode('replay');
              setRecovery(null);
              setReplay(n => n + 1);
              setPlaying(true);
            }}
            style={({ pressed }) => [
              s.replay,
              pressed && { opacity: 0.7 },
              isPlaying && s.replayActive,
            ]}
          >
            <RotateCcw size={15} color={C.primary} />
            <TextR style={s.replayText}>
              {t(isPlaying ? 'Playing growth' : 'Replay growth')}
            </TextR>
          </Pressable>
        )}
      </View>

      {nextLevel !== null && (
        <View style={s.milestone}>
          <View style={s.milestoneLabels}>
            <TextR style={s.milestoneLabel}>{t('Next level')}</TextR>
            <TextR style={s.milestoneDay}>
              {t('Level {count} of 30', { count: formatNumber(nextLevel) })}
            </TextR>
          </View>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={t('Next level')}
            accessibilityValue={{ min: 0, max: nextLevel, now: streak }}
            style={s.track}
          >
            <View
              style={[
                s.fill,
                { width: `${(streak / nextLevel) * 100}%` },
              ]}
            />
          </View>
          <TextR style={s.remaining}>
            {t('One more complete day')}
          </TextR>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  compactRoot: {
    gap: 8,
  },
  compactViewport: {
    position: 'relative',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FAF1E4',
  },
  viewportWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FAF1E4',
  },
  floatingTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(229, 107, 39, 0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    zIndex: 4,
  },
  floatingTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.2,
  },
  floatingDoneBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
    shadowColor: '#8C5E0D',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    zIndex: 4,
  },
  floatingDoneText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#92400E',
  },
  compactFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 2,
  },
  compactStatusGroup: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactReplayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FFF2E6',
    borderWidth: 1,
    borderColor: 'rgba(229, 107, 39, 0.25)',
  },
  compactReplayText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: C.primary,
  },
  card: {
    padding: 16,
    gap: 14,
    borderRadius: 24,
    backgroundColor: '#FAF1E4',
    borderWidth: 1.2,
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.16)',
    borderLeftColor: 'rgba(255, 255, 255, 0.95)',
    borderRightColor: 'rgba(217, 119, 6, 0.15)',
    borderBottomWidth: 2,
    shadowColor: '#8C4010',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headingText: {
    flex: 1,
    minWidth: 160,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kicker: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: C.ink,
    fontSize: 25,
    lineHeight: 32,
  },
  badge: {
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12.5,
    fontWeight: '800',
    borderWidth: 1.2,
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(217, 119, 6, 0.25)',
    borderLeftColor: 'rgba(255, 255, 255, 0.9)',
    borderRightColor: 'rgba(217, 119, 6, 0.15)',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  status: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    flex: 1,
    color: C.muted,
    fontSize: 13.5,
    lineHeight: 19,
  },
  completeCaption: {
    color: '#92400E',
    fontWeight: '700',
  },
  replay: {
    minHeight: 40,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFF2E6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(229, 107, 39, 0.25)',
    borderLeftColor: 'rgba(255, 255, 255, 0.85)',
    borderRightColor: 'rgba(229, 107, 39, 0.15)',
  },
  replayActive: {
    opacity: 0.6,
  },
  replayText: {
    color: C.primary,
    fontWeight: '700',
    fontSize: 12.5,
  },
  milestone: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(140, 64, 16, 0.1)',
  },
  milestoneLabels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
  },
  milestoneLabel: {
    fontSize: 13,
    color: C.muted,
    fontWeight: '600',
  },
  milestoneDay: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '800',
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EFE5D6',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: C.saffron,
  },
  remaining: {
    fontSize: 12,
    color: '#73563E',
    lineHeight: 18,
    fontWeight: '600',
  },
});
