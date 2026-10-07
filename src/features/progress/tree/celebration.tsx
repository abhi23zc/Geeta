import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Leaf, X } from 'lucide-react-native';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useLanguage } from '@/i18n/provider';
import { useAlarmPresentation } from '@/navigation/alarm-presentation';
import { useProgress } from '../provider';
import type { GrowthEvent } from './model';
import { TreeScene } from './scene';
import { useTreeEnvironment } from './use-motion';
import { restoreGrowthFocus } from './focus-target';

export function GrowthCelebrationHost() {
  const { pendingGrowth, claimGrowth, today, progress, clockWarning, error } = useProgress();
  const pathname = usePathname();
  const alarm = useAlarmPresentation();
  const { active, motionReady } = useTreeEnvironment();
  const [event, setEvent] = useState<GrowthEvent | null>(null);
  const eligible = ['/', '/index', '/progress'].includes(pathname) && active && motionReady && !alarm.active && !clockWarning && !error;
  const live = useRef({ eligible, today, profile: progress?.createdAt });
  useEffect(() => { live.current = { eligible, today, profile: progress?.createdAt }; }, [eligible, today, progress?.createdAt]);
  const claiming = useRef(false);
  useEffect(() => {
    if (!eligible || event || !pendingGrowth || pendingGrowth.date !== today || claiming.current) return;
    // Let navigation finish before showing a modal over the destination screen.
    const timer = setTimeout(() => {
      claiming.current = true;
      void claimGrowth(pendingGrowth.id).then(next => {
        if (next && live.current.eligible && next.date === live.current.today && next.profile === live.current.profile) setEvent(next);
      }).finally(() => { claiming.current = false; });
    }, 350);
    return () => clearTimeout(timer);
  }, [eligible, event, pendingGrowth, today, claimGrowth]);
  useEffect(() => {
    if (eligible && event?.date === today) return;
    const timer = setTimeout(() => setEvent(null), 0);
    return () => clearTimeout(timer);
  }, [eligible, today, event]);
  const router = useRouter();
  if (!event || !eligible) return null;
  return <GrowthCelebration event={event} onClose={() => { setEvent(null); setTimeout(() => { if (live.current.eligible) restoreGrowthFocus(); }, 250); }} onViewGrowth={() => { setEvent(null); if (pathname !== '/progress') router.push('/progress'); }} />;
}

export function GrowthCelebration({ event, onClose, onViewGrowth, reducedMotion = false, simulateFailure = false }: { event: GrowthEvent; onClose: () => void; onViewGrowth: () => void; reducedMotion?: boolean; simulateFailure?: boolean }) {
  const { t, formatNumber } = useLanguage();
  const { reduced, active } = useTreeEnvironment();
  const insets = useSafeAreaInsets();
  const title = useRef<View>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const milestone = (event.level ?? event.streak) === 7 || (event.level ?? event.streak) === 30;
  const heading = t((event.level ?? event.streak) === 1 ? 'Your first leaf.' : (event.level ?? event.streak) === 30 ? 'Look how far you’ve grown.' : 'A little growth, every day.');
  useEffect(() => {
    if (Platform.OS === 'web') previousFocus.current = document.activeElement as HTMLElement;
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); }
      if (e.key !== 'Tab') return;
      const dialog = document.querySelector('[role=dialog]');
      const elements = Array.from(dialog?.querySelectorAll<HTMLElement>('button,[tabindex="0"]') ?? []).filter(el => !el.hasAttribute('disabled'));
      const first = elements[0], last = elements.at(-1);
      if (e.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) { e.preventDefault(); first?.focus(); }
    };
    if (Platform.OS === 'web') document.addEventListener('keydown', keyboard);
    return () => { if (Platform.OS === 'web') document.removeEventListener('keydown', keyboard); previousFocus.current?.focus?.(); }; 
  }, []);
  const focusTitle = useCallback(() => {
    if (Platform.OS === 'web') {
      const element = document.querySelector<HTMLElement>('[role=dialog] [role=heading]');
      if (element) { element.tabIndex = -1; element.focus(); }
    } else {
      const handle = findNodeHandle(title.current);
      if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
    }
  }, []);
  return <Modal transparent visible animationType={reduced || reducedMotion ? 'none' : 'fade'} onRequestClose={onClose} onShow={focusTitle}>
    <View style={s.backdrop}>
      <View accessibilityViewIsModal importantForAccessibility="yes" role="dialog" aria-modal style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={s.handle} />
        <Pressable accessibilityRole="button" accessibilityLabel={t('Close')} onPress={onClose} style={s.close}><X size={22} color={C.inkSoft} /></Pressable>
        <ScrollView contentContainerStyle={s.content} bounces={false}>
          <View style={s.successRow}>
            <View style={s.check}><Check size={18} color={C.greenDark} /></View>
            <TextR style={s.kicker}>{t(milestone ? 'A milestone of intention' : 'Today’s goal complete')}</TextR>
          </View>
          <View ref={title} accessible accessibilityRole="header"><TextR serif style={s.title}>{heading}</TextR></View>
          <TextR style={s.subtitle}>{t((event.level ?? event.streak) === 1 ? 'One day of intention. A beginning.' : 'Both practices complete. Your tree has grown.')}</TextR>
          <TreeScene streak={event.level ?? event.streak} play={active} priority={4} reducedMotion={reducedMotion} simulateFailure={simulateFailure} />
          <View style={s.streak}><Leaf size={18} color={C.greenDark} /><TextR style={s.streakText}>{t('streakDays', { count: event.streak })}</TextR></View>
          {!!event.lost && <TextR style={s.subtitle}>{t('missedTreeDays', { count: event.lost })}</TextR>}
          <View style={s.tasks}>
            {[t('Alarm-led ritual'), t('Quiz round')].map(label => <View key={label} style={s.task}><Check size={15} color={C.greenDark} /><TextR style={s.taskLabel}>{label}</TextR></View>)}
          </View>
          <View style={s.reward}>
            <View style={s.rewardRow}><TextR style={s.rewardLabel}>{t('Today’s practice')}</TextR><TextR style={s.rewardValue}>+{formatNumber(event.dailyPoints)} <TextR style={s.rewardUnit}>{t('Points')}</TextR></TextR></View>
            {event.bonus > 0 && <View style={[s.rewardRow, s.bonusRow]}><TextR style={s.rewardLabel}>{t('Tree milestone bonus')}</TextR><TextR style={s.rewardValue}>+{formatNumber(event.bonus)} <TextR style={s.rewardUnit}>{t('Points')}</TextR></TextR></View>}
          </View>
        </ScrollView>
        <View style={s.actions}>
          <Pressable accessibilityRole="button" onPress={onClose} style={s.continue}><TextR style={s.continueText}>{t('Continue')}</TextR></Pressable>
          <Pressable accessibilityRole="button" onPress={onViewGrowth} style={s.view}><TextR style={s.viewText}>{t('View growth')}</TextR></Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(44,34,26,0.38)' },
  sheet: { width: '100%', maxWidth: 640, maxHeight: '92%', backgroundColor: C.canvas, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, shadowColor: C.ink, shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
  handle: { width: 36, height: 4, borderRadius: 4, backgroundColor: '#DCC5B5', alignSelf: 'center', marginBottom: 12 }, close: { position: 'absolute', right: 10, top: 12, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 18, alignItems: 'center', gap: 14 }, successRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 }, check: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9EFD9' }, kicker: { flexShrink: 1, color: C.saffron, textTransform: 'uppercase', fontWeight: '800', fontSize: 12, letterSpacing: 0.7, textAlign: 'center' },
  title: { fontSize: 32, lineHeight: 40, color: C.ink, textAlign: 'center' }, subtitle: { fontSize: 14, lineHeight: 21, color: C.muted, textAlign: 'center' },
  streak: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#E9EFD9', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 }, streakText: { color: C.greenDark, fontWeight: '800', fontSize: 15 }, tasks: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, task: { flex: 1, minWidth: 120, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, backgroundColor: '#FFF2E5', borderRadius: 14 }, taskLabel: { flex: 1, fontSize: 14, color: C.inkSoft },
  reward: { width: '100%', padding: 16, gap: 8, backgroundColor: '#FFF0D9', borderRadius: 16 }, rewardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }, rewardLabel: { color: C.goldDark, fontSize: 14, flex: 1, minWidth: 110 }, rewardValue: { color: C.goldDark, fontWeight: '800', fontSize: 22 }, rewardUnit: { fontSize: 13, fontWeight: '600' }, bonusRow: { paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(140,94,13,0.15)' }, actions: { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.divider, gap: 2 },
  continue: { width: '100%', minHeight: 50, padding: 14, borderRadius: 16, backgroundColor: C.saffron, alignItems: 'center', justifyContent: 'center' }, continueText: { color: C.white, fontWeight: '800', fontSize: 16 }, view: { minHeight: 48, padding: 10, justifyContent: 'center' }, viewText: { color: C.saffron, fontWeight: '700', fontSize: 14 },
});
