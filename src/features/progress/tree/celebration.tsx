import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Check, Leaf, Sparkles, X } from 'lucide-react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
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

export function SunlitGildedChip({
  index,
  totalCount,
  screenWidth,
  screenHeight,
  reducedMotion = false,
}: {
  index: number;
  totalCount: number;
  screenWidth: number;
  screenHeight: number;
  reducedMotion?: boolean;
}) {
  const colRatio = (index + 0.5) / totalCount;
  const startX = colRatio * (screenWidth - 24) + 12;
  const chipType = index % 4;
  const size = chipType === 1 ? 8 + (index % 3) * 2 : 10 + (index % 4) * 3;

  const translateY = useSharedValue(-size - 20);
  const translateX = useSharedValue(startX);
  const rotateZ = useSharedValue((index * 47) % 360);
  const rotateY = useSharedValue((index * 31) % 180);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;

    const delay = ((index * 135) % 2600) + (index % 3) * 70;
    const duration = 3200 + (index % 6) * 400;
    const swayRange = 10 + (index % 4) * 6;
    const swayDuration = 680 + (index % 3) * 140;
    const spinDuration = 450 + (index % 5) * 90;

    // Continuous downward rainfall across the full screen
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-size - 20, { duration: 0 }),
          withTiming(screenHeight + 40, {
            duration,
            easing: Easing.linear,
          })
        ),
        -1,
        false
      )
    );

    // Natural horizontal breeze sway
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(startX + swayRange, {
            duration: swayDuration,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(startX - swayRange, {
            duration: swayDuration,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        -1,
        true
      )
    );

    // 3D glint & sunlight reflection catching the chip face
    rotateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(85, { duration: spinDuration, easing: Easing.inOut(Easing.sin) }),
          withTiming(-85, { duration: spinDuration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    // 2D natural tumbling
    rotateZ.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming((index * 47 + 55) % 360, { duration: 850, easing: Easing.inOut(Easing.sin) }),
          withTiming((index * 47 - 55) % 360, { duration: 850, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    // Fade in gracefully at top, shine during descent, fade out near bottom
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(0.95, { duration: 350 }),
          withTiming(0.85, { duration: duration - 950 }),
          withTiming(0, { duration: 600 })
        ),
        -1,
        false
      )
    );
  }, [index, reducedMotion, screenHeight, startX, translateX, translateY, rotateZ, rotateY, opacity, size]);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotateZ: `${rotateZ.value}deg` },
      { rotateY: `${rotateY.value}deg` },
    ],
    opacity: opacity.value,
  }));

  if (reducedMotion) return null;

  return (
    <Animated.View pointerEvents="none" style={style}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <RadialGradient id={`chipGlint_${index}`} cx="35%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#FFFDF0" stopOpacity="1" />
            <Stop offset="25%" stopColor="#FEF3C7" stopOpacity="0.98" />
            <Stop offset="65%" stopColor="#F59E0B" stopOpacity="0.92" />
            <Stop offset="100%" stopColor="#B45309" stopOpacity="0.85" />
          </RadialGradient>
        </Defs>
        {chipType === 0 && (
          // Diamond Rhombus Gold Chip
          <Path
            d="M12 2 L22 12 L12 22 L2 12 Z"
            fill={`url(#chipGlint_${index})`}
          />
        )}
        {chipType === 1 && (
          // 4-Point Sunlit Starburst Flake
          <Path
            d="M12 2 Q12 12 22 12 Q12 12 12 22 Q12 12 2 12 Q12 12 12 2 Z"
            fill={`url(#chipGlint_${index})`}
          />
        )}
        {chipType === 2 && (
          // Hexagonal Amber Crystal
          <Path
            d="M12 2 L20 7 L20 17 L12 22 L4 17 L4 7 Z"
            fill={`url(#chipGlint_${index})`}
          />
        )}
        {chipType === 3 && (
          // Gilded Shard / Gold Foil Fleck
          <Path
            d="M4 3 L21 6 L18 21 L3 15 Z"
            fill={`url(#chipGlint_${index})`}
          />
        )}
      </Svg>
    </Animated.View>
  );
}

export function SunlitGildedChipsShower({
  count = 30,
  screenWidth,
  screenHeight,
  reducedMotion = false,
}: {
  count?: number;
  screenWidth: number;
  screenHeight: number;
  reducedMotion?: boolean;
}) {
  if (reducedMotion) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <SunlitGildedChip
          key={i}
          index={i}
          totalCount={count}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
          reducedMotion={reducedMotion}
        />
      ))}
    </View>
  );
}

export function GrowthCelebration({ event, onClose, onViewGrowth, reducedMotion = false, simulateFailure = false }: { event: GrowthEvent; onClose: () => void; onViewGrowth: () => void; reducedMotion?: boolean; simulateFailure?: boolean }) {
  const { t, formatNumber } = useLanguage();
  const { reduced, active } = useTreeEnvironment();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isCompact = width < 360 || height < 700;
  const title = useRef<View>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  const currentLevel = event.level ?? event.streak;

  const [isPlaying, setIsPlaying] = useState(active);
  const [replayCount, setReplayCount] = useState(0);

  // ── Entrance Cascade Animations ──────────────────────────────────────────
  const pillY = useSharedValue(reducedMotion ? 0 : -12);
  const pillOpacity = useSharedValue(reducedMotion ? 1 : 0);

  const headerY = useSharedValue(reducedMotion ? 0 : 10);
  const headerOpacity = useSharedValue(reducedMotion ? 1 : 0);

  const badgeScale = useSharedValue(reducedMotion ? 1 : 0.92);
  const badgeOpacity = useSharedValue(reducedMotion ? 1 : 0);

  const tasksY = useSharedValue(reducedMotion ? 0 : 12);
  const tasksOpacity = useSharedValue(reducedMotion ? 1 : 0);

  const rewardScale = useSharedValue(reducedMotion ? 1 : 0.95);
  const rewardOpacity = useSharedValue(reducedMotion ? 1 : 0);

  const haloScale = useSharedValue(1);
  const haloOpacity = useSharedValue(0.4);

  useEffect(() => {
    if (reducedMotion) return;

    pillY.value = withSpring(0, { damping: 14, stiffness: 180 });
    pillOpacity.value = withTiming(1, { duration: 300 });

    headerY.value = withDelay(80, withSpring(0, { damping: 14, stiffness: 180 }));
    headerOpacity.value = withDelay(80, withTiming(1, { duration: 350 }));

    badgeScale.value = withDelay(160, withSpring(1, { damping: 12, stiffness: 200 }));
    badgeOpacity.value = withDelay(160, withTiming(1, { duration: 350 }));

    tasksY.value = withDelay(240, withSpring(0, { damping: 14, stiffness: 180 }));
    tasksOpacity.value = withDelay(240, withTiming(1, { duration: 350 }));

    rewardScale.value = withDelay(320, withSpring(1, { damping: 12, stiffness: 190 }));
    rewardOpacity.value = withDelay(320, withTiming(1, { duration: 350 }));

    haloScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.96, { duration: 3200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    haloOpacity.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.35, { duration: 3200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [reducedMotion, pillY, pillOpacity, headerY, headerOpacity, badgeScale, badgeOpacity, tasksY, tasksOpacity, rewardScale, rewardOpacity, haloScale, haloOpacity]);

  const pillAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: pillY.value }],
    opacity: pillOpacity.value,
  }));

  const headerAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: headerY.value }],
    opacity: headerOpacity.value,
  }));

  const badgeAnim = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeOpacity.value,
  }));

  const tasksAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: tasksY.value }],
    opacity: tasksOpacity.value,
  }));

  const rewardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: rewardScale.value }],
    opacity: rewardOpacity.value,
  }));

  const haloAnim = useAnimatedStyle(() => ({
    transform: [{ scale: haloScale.value }],
    opacity: haloOpacity.value,
  }));

  const handleReplay = useCallback(() => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsPlaying(false);
    setTimeout(() => {
      setIsPlaying(true);
      setReplayCount(c => c + 1);
    }, 60);
  }, []);

  // Haptic feedback on celebration appearance
  useEffect(() => {
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }, []);

  const handleClose = useCallback(() => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onClose();
  }, [onClose]);

  const handleViewGrowth = useCallback(() => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onViewGrowth();
  }, [onViewGrowth]);

  const milestone = currentLevel === 7 || currentLevel === 30;
  const heading = t(currentLevel === 1 ? 'Your first leaf.' : currentLevel === 30 ? 'Look how far you’ve grown.' : 'A little growth, every day.');

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
        <Pressable accessibilityRole="button" accessibilityLabel={t('Close')} onPress={handleClose} style={({ pressed }) => [s.close, pressed && { opacity: 0.6 }]}>
          <X size={22} color={C.inkSoft} />
        </Pressable>

        <ScrollView contentContainerStyle={s.content} bounces={false} showsVerticalScrollIndicator={false}>
          {/* Success Pill */}
          <Animated.View style={[s.successPill, pillAnim]}>
            <View style={s.checkBadge}>
              <Check size={11} color="#92400E" strokeWidth={3} />
            </View>
            <TextR style={s.kicker}>{t(milestone ? 'A milestone of intention' : 'Today’s goal complete')}</TextR>
          </Animated.View>

          {/* Heading and Subtitle */}
          <Animated.View style={[s.headerGroup, headerAnim]}>
            <View ref={title} accessible accessibilityRole="header">
              <TextR serif style={[s.title, isCompact && s.titleCompact]}>{heading}</TextR>
            </View>
            <TextR style={[s.subtitle, isCompact && s.subtitleCompact]}>
              {t(currentLevel === 1 ? 'One day of intention. A beginning.' : 'Both practices complete. Your tree has grown.')}
            </TextR>
          </Animated.View>

          {/* Video Animation Completely Merged with Background (Zero Boundary) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Replay growth')}
            onPress={handleReplay}
            style={s.treeWrapper}
          >
            {/* Meditative Sun Aura Behind Sprout */}
            <Animated.View style={[s.sunHalo, haloAnim]} pointerEvents="none">
              <Svg width="260" height="260" viewBox="0 0 260 260">
                <Defs>
                  <RadialGradient id="sunHaloGrad" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor="#FDE68A" stopOpacity="0.5" />
                    <Stop offset="55%" stopColor="#FED7AA" stopOpacity="0.22" />
                    <Stop offset="100%" stopColor="#FAF1E4" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Circle cx="130" cy="130" r="130" fill="url(#sunHaloGrad)" />
              </Svg>
            </Animated.View>

            <TreeScene
              key={`${currentLevel}:${replayCount}`}
              streak={currentLevel}
              play={isPlaying}
              priority={4}
              reducedMotion={reducedMotion}
              simulateFailure={simulateFailure}
              onEnd={() => setIsPlaying(false)}
            />

            {milestone && (
              <View style={s.milestoneTag}>
                <Sparkles size={12} color="#92400E" />
                <TextR style={s.milestoneTagText}>
                  {currentLevel === 30 ? t('Tapasya milestone') : t('A milestone of intention')}
                </TextR>
              </View>
            )}
          </Pressable>

          {/* Streak and Level Pill */}
          <Animated.View style={[s.streakPill, badgeAnim]}>
            <Leaf size={13} color={C.saffron} />
            <TextR style={s.streakPillText}>
              {t('streakDays', { count: formatNumber(event.streak) })}
            </TextR>
            <View style={s.streakDivider} />
            <TextR style={s.stageText}>
              {t('Level {count} of 30', { count: formatNumber(currentLevel) })}
            </TextR>
          </Animated.View>

          {/* 3D Tactile Completed Practices Checklist */}
          <Animated.View style={[s.tasks, tasksAnim]}>
            {[t('Alarm-led ritual'), t('Quiz round')].map(label => (
              <View key={label} style={s.task}>
                <View style={s.taskCheck}>
                  <Check size={11} color="#92400E" strokeWidth={3} />
                </View>
                <TextR style={s.taskLabel}>{label}</TextR>
              </View>
            ))}
          </Animated.View>

          {/* 3D Golden Sacred Bullion Plaque (Reward Box) */}
          <Animated.View style={[s.reward, rewardAnim]}>
            <View style={s.rewardRow}>
              <View style={s.rewardHeading}>
                <Sparkles size={14} color={C.goldDark} />
                <TextR style={s.rewardLabel}>{t('Today’s practice')}</TextR>
              </View>
              <TextR style={s.rewardValue}>+{formatNumber(event.dailyPoints)} <TextR style={s.rewardUnit}>{t('Points')}</TextR></TextR>
            </View>
            {event.bonus > 0 && (
              <View style={[s.rewardRow, s.bonusRow]}>
                <View style={s.rewardHeading}>
                  <Sparkles size={14} color="#B45309" />
                  <TextR style={[s.rewardLabel, { color: '#B45309', fontWeight: '700' }]}>{t('Tree milestone bonus')}</TextR>
                </View>
                <TextR style={[s.rewardValue, { color: '#B45309' }]}>+{formatNumber(event.bonus)} <TextR style={s.rewardUnit}>{t('Points')}</TextR></TextR>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Clean 3D Tactile Actions Bar */}
        <View style={s.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={handleClose}
            style={({ pressed }) => [s.continue, pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] }]}
          >
            <TextR style={s.continueText}>{t('Continue')}</TextR>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleViewGrowth}
            style={({ pressed }) => [s.view, pressed && { opacity: 0.7 }]}
          >
            <TextR style={s.viewText}>{t('View growth')}</TextR>
          </Pressable>
        </View>
      </View>

      {/* Sunlit Gilded Chips Rain (Option 3) Across the ENTIRE Screen Viewport */}
      <SunlitGildedChipsShower
        count={32}
        screenWidth={width}
        screenHeight={height}
        reducedMotion={reducedMotion}
      />
    </View>
  </Modal>;
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(28,20,14,0.48)' },
  sheet: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '92%',
    backgroundColor: '#FAF1E4',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderTopColor: '#FFFFFF',
    borderLeftColor: 'rgba(255, 255, 255, 0.9)',
    borderRightColor: 'rgba(217, 119, 6, 0.15)',
    paddingTop: 12,
    shadowColor: '#2C1604',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#D6C4B4',
    alignSelf: 'center',
    marginBottom: 10,
  },
  close: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: { paddingHorizontal: 22, paddingTop: 4, paddingBottom: 16, alignItems: 'center', gap: 12 },
  successPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 13,
    borderWidth: 1.2,
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(217, 119, 6, 0.22)',
    borderLeftColor: 'rgba(255, 255, 255, 0.85)',
    borderRightColor: 'rgba(217, 119, 6, 0.14)',
    shadowColor: '#8C5E0D',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { color: '#92400E', textTransform: 'uppercase', fontWeight: '800', fontSize: 11, letterSpacing: 0.7 },
  headerGroup: { alignItems: 'center', gap: 4 },
  title: { fontSize: 29, lineHeight: 37, color: '#241407', textAlign: 'center', fontWeight: '800' },
  titleCompact: { fontSize: 25, lineHeight: 32 },
  subtitle: { fontSize: 13.5, lineHeight: 20, color: '#73563E', textAlign: 'center' },
  subtitleCompact: { fontSize: 12.5, lineHeight: 18 },
  treeWrapper: {
    width: '100%',
    backgroundColor: '#FAF1E4',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    // Zero border & zero corner clip: completely seamless with the modal canvas
  },
  sunHalo: {
    position: 'absolute',
    top: '5%',
    alignSelf: 'center',
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  milestoneTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  milestoneTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1.2,
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(217, 119, 6, 0.22)',
    borderLeftColor: 'rgba(255, 255, 255, 0.85)',
    borderRightColor: 'rgba(217, 119, 6, 0.14)',
    shadowColor: '#8C5E0D',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginVertical: 2,
  },
  streakPillText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#92400E',
  },
  streakDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(217, 119, 6, 0.25)',
  },
  stageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  tasks: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  task: {
    flex: 1,
    minWidth: 125,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFF8EF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 145, 75, 0.24)',
    borderLeftColor: 'rgba(255, 255, 255, 0.9)',
    borderRightColor: 'rgba(215, 145, 75, 0.16)',
    shadowColor: '#8C4010',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  taskCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: '#2B190D' },
  reward: {
    width: '100%',
    padding: 15,
    gap: 8,
    backgroundColor: '#FFF4DE',
    borderRadius: 18,
    borderWidth: 1.2,
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(217, 119, 6, 0.26)',
    borderLeftColor: 'rgba(255, 255, 255, 0.95)',
    borderRightColor: 'rgba(217, 119, 6, 0.18)',
    shadowColor: '#8C5E0D',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  rewardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  rewardHeading: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, minWidth: 120 },
  rewardLabel: { color: C.goldDark, fontSize: 13, fontWeight: '700' },
  rewardValue: { color: C.goldDark, fontWeight: '800', fontSize: 19 },
  rewardUnit: { fontSize: 12, fontWeight: '600' },
  bonusRow: { paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(180, 83, 9, 0.14)' },
  actions: { paddingHorizontal: 22, paddingTop: 10, gap: 4 },
  continue: {
    width: '100%',
    minHeight: 50,
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 16,
    backgroundColor: C.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.35)',
    borderBottomColor: '#A04505',
    borderBottomWidth: 2.5,
    shadowColor: C.saffron,
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  continueText: { color: C.white, fontWeight: '800', fontSize: 15.5, letterSpacing: 0.2 },
  view: { minHeight: 40, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  viewText: { color: C.saffron, fontWeight: '700', fontSize: 13.5 },
});

