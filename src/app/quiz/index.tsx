import React from 'react';
import { useProgress } from '@/features/progress/provider';
import { useLanguage } from '@/i18n/provider';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Flame,
  RotateCcw,
  Zap,
  Compass,
  Bookmark,
  Settings,
  ChevronRight,
  Flower2,
  History,
  Users,
} from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

import { AruMascot } from '@/components/aru-mascot';
import { useQuiz } from '@/features/quiz/provider';
import { Button, Copy, QuizScreen, useCopy } from '@/features/quiz/ui';
import { dayKey } from '@/features/progress/model';
import { C } from '@/constants/ritual-theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PathwayCard({
  title,
  subtitle,
  icon,
  bgColor,
  borderColor,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  onPress: () => void;
}) {
  const pressed = useSharedValue(0);
  const reduced = useReducedMotion();

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: reduced ? 1 : 1 - pressed.value * 0.02 },
      { translateY: reduced ? 0 : pressed.value * 2 },
    ],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 80 });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: 120 });
      }}
      style={[
        s.pathwayCard,
        { backgroundColor: bgColor, borderColor },
        animStyle,
      ]}
    >
      <View style={s.pathwayIconWrap}>{icon}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <Copy title style={s.pathwayTitle}>{title}</Copy>
        <Copy small style={s.pathwaySub}>{subtitle}</Copy>
      </View>
      <ChevronRight size={18} color={C.muted} />
    </AnimatedPressable>
  );
}

export default function QuizHome() {
  const { progress: daily, today } = useProgress();
  const { t: appCopy, formatNumber } = useLanguage();
  const { progress } = useQuiz();
  const router = useRouter();
  const t = useCopy();

  const completedLessons = Object.values(progress?.lessons ?? {}).filter(l => l.complete).length;

  // A results-phase session from a previous day should not block starting a fresh quiz.
  // Treat it as "no active session" so the user sees "Start Today's Quest" instead of "View Results".
  const rawActive = progress?.active ?? null;
  const effectiveActive = (() => {
    if (!rawActive) return null;
    if (rawActive.phase !== 'results') return rawActive;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const sessionDay = dayKey(new Date(rawActive.startedAt), timezone);
    return sessionDay === today ? rawActive : null;
  })();

  return (
    <QuizScreen
      title={t('Culture Quiz', 'संस्कृति क्विज़')}
      subtitle={t('Vedic Wisdom Arena', 'वैदिक ज्ञान साधना')}
      showBack={false}
      leftElement={
        <View style={s.streakHeaderPill}>
          <Flame size={15} color={C.saffron} />
          <Copy small style={s.streakHeaderText}>
            {appCopy('streakDays', { count: daily?.current ?? 0 })}
          </Copy>
        </View>
      }
      rightElement={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Settings', 'सेटिंग्स')}
          onPress={() => router.push('/quiz/settings')}
          style={s.settingsBtn}
        >
          <Settings size={18} color={C.inkSoft} />
        </Pressable>
      }
    >
      {/* ── 1. Daily Sacred Quest / Active Session Hero Card ───────────────── */}
      <View style={s.heroCard}>
        <View style={s.heroLeft}>
          <View style={s.questChip}>
            {effectiveActive ? (
              <Zap size={12} color={C.goldDark} />
            ) : (
              <Flower2 size={12} color={C.goldDark} />
            )}
            <Copy small style={s.questChipText}>
              {effectiveActive
                ? effectiveActive.phase === 'results'
                  ? t('ROUND COMPLETED', 'क्विज़ पूरी हुई')
                  : t('IN PROGRESS', 'प्रगति पर है')
                : t("TODAY'S SACRED QUEST", 'आज का दैनिक अभ्यास')}
            </Copy>
          </View>

          <Copy serif title style={s.heroTitle}>
            {effectiveActive
              ? effectiveActive.phase === 'results'
                ? t('Review Your Results', 'अपने परिणाम देखें')
                : t('Continue Your Quiz', 'अपनी क्विज़ जारी रखें')
              : t('Daily 5-Minute Shloka Quest', 'दैनिक 5-मिनट ज्ञान प्रश्नोत्तरी')}
          </Copy>

          <Copy small style={s.heroSub}>
            {effectiveActive
              ? effectiveActive.phase === 'results'
                ? t('Check your score and shloka insights', 'अपने अंक और श्लोक ज्ञान देखें')
                : t(`Question ${effectiveActive.index + 1} of ${effectiveActive.questions.length}`, `प्रश्न ${effectiveActive.index + 1}/${effectiveActive.questions.length}`)
              : appCopy('Complete a quiz round: +10 points once daily')}
          </Copy>

          <View style={s.heroButtonWrap}>
            {effectiveActive ? (
              <Button
                primary
                label={
                  effectiveActive.phase === 'results'
                    ? t('View results →', 'परिणाम देखें →')
                    : t('Resume quiz now →', 'क्विज़ जारी रखें →')
                }
                onPress={() => router.push('/quiz/play')}
              />
            ) : (
              <Button
                primary
                label={t("Start Today's Quest →", 'आज का अभ्यास शुरू करें →')}
                onPress={() => router.push('/quiz/setup')}
              />
            )}
          </View>
        </View>

        <View style={s.mascotAnchor}>
          <View style={s.mascotDisc} />
          <AruMascot clip="gita_reading" size={110} interactive={false} />
        </View>
      </View>

      {/* ── 2. Balanced Pathways Grid ────────────────────────────────────────── */}
      <View style={s.sectionTitleRow}>
        <View style={s.sectionDot} />
        <Copy title style={s.sectionHeading}>
          {t('DISCOVERY PATHWAYS', 'सीखने के मार्ग')}
        </Copy>
      </View>

      <View style={s.pathwaysWrap}>
        <PathwayCard
          title={t('Learning Journey', 'ज्ञान यात्रा')}
          subtitle={t(`${completedLessons}/120 lessons completed`, `${completedLessons}/120 पाठ पूरे`)}
          icon={<Compass size={20} color="#2563EB" />}
          bgColor="#F5F9FF"
          borderColor="rgba(37, 99, 235, 0.25)"
          onPress={() => router.push('/quiz/journey')}
        />

        <PathwayCard
          title={t('Play with Family', 'परिवार के साथ')}
          subtitle={t('Play together on one phone', 'एक फोन पर मिलकर खेलें')}
          icon={<Users size={20} color="#7E22CE" />}
          bgColor="#FAF6FF"
          borderColor="rgba(126, 34, 206, 0.25)"
          onPress={() => router.push('/quiz/family')}
        />

        <PathwayCard
          title={t('Practice & Revisit', 'दोबारा अभ्यास')}
          subtitle={t('Revise questions you missed', 'गलत प्रश्नों का पुनः अभ्यास')}
          icon={<RotateCcw size={20} color={C.greenDark} />}
          bgColor="#F4FDF6"
          borderColor="rgba(21, 128, 61, 0.25)"
          onPress={() =>
            router.push({
              pathname: '/quiz/setup',
              params: { mode: 'revision' },
            })
          }
        />
      </View>

      {/* ── 5. Treasury & Saved Wisdom Cards ─────────────────────────────────── */}
      <View style={[s.sectionTitleRow, { marginTop: 10 }]}>
        <View style={s.sectionDot} />
        <Copy title style={s.sectionHeading}>
          {t('WISDOM TREASURY', 'ज्ञान संग्रह')}
        </Copy>
      </View>

      <View style={s.treasuryRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/quiz/collection')}
          style={({ pressed }) => [
            s.treasuryCard,
            { backgroundColor: '#FFFDF5', borderColor: 'rgba(244, 185, 66, 0.45)' },
            pressed && { opacity: 0.88 },
          ]}
        >
          <View style={[s.treasuryIconCircle, { backgroundColor: '#FFECC2' }]}>
            <Flower2 size={20} color={C.goldDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Copy title style={s.treasuryTitle}>
              {t('Knowledge Cards', 'ज्ञान कार्ड')}
            </Copy>
            <Copy small style={{ color: C.muted }}>
              {progress?.cards.length ?? 0}/30 {t('unlocked', 'खुले')}
            </Copy>
          </View>
          <ChevronRight size={16} color={C.goldDark} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/quiz/saved')}
          style={({ pressed }) => [
            s.treasuryCard,
            { backgroundColor: '#F8F9FD', borderColor: 'rgba(125, 134, 169, 0.35)' },
            pressed && { opacity: 0.88 },
          ]}
        >
          <View style={[s.treasuryIconCircle, { backgroundColor: '#EAEBF5' }]}>
            <Bookmark size={20} color="#4A5568" />
          </View>
          <View style={{ flex: 1 }}>
            <Copy title style={s.treasuryTitle}>
              {t('Saved Explanations', 'सहेजी व्याख्याएं')}
            </Copy>
            <Copy small style={{ color: C.muted }}>
              {progress?.saved.length ?? 0} {t('saved', 'सहेजे')}
            </Copy>
          </View>
          <ChevronRight size={16} color="#4A5568" />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={appCopy('Quiz History')}
        onPress={() => router.push('/quiz/history')}
        style={({ pressed }) => [s.treasuryCard, { minHeight: 48, backgroundColor: '#F5F9FF', borderColor: 'rgba(37, 99, 235, 0.25)' }, pressed && { opacity: 0.88 }]}
      >
        <View style={[s.treasuryIconCircle, { backgroundColor: '#EAF1FF' }]}>
          <History size={20} color="#2563EB" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Copy title style={s.treasuryTitle}>{appCopy('Quiz History')}</Copy>
          <Copy small>{appCopy('{count} completed rounds', { count: formatNumber(progress?.history.length ?? 0) })}</Copy>
        </View>
        <ChevronRight size={16} color="#2563EB" />
      </Pressable>
    </QuizScreen>
  );
}

const s = StyleSheet.create({
  streakHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 240, 225, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 107, 39, 0.3)',
  },
  streakHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.primary,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(225, 205, 190, 0.7)',
  },
  heroCard: {
    backgroundColor: 'rgba(255, 250, 243, 0.98)',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomColor: 'rgba(190, 140, 110, 0.35)',
    borderBottomWidth: 2.5,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#5C2B0B',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 4,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 8,
    gap: 5,
  },
  questChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 242, 215, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 185, 66, 0.4)',
  },
  questChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.goldDark,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 19,
    lineHeight: 24,
    color: '#241407',
    fontWeight: '800',
  },
  heroSub: {
    fontSize: 13,
    lineHeight: 18,
    color: '#705139',
    fontWeight: '500',
  },
  heroButtonWrap: {
    marginTop: 4,
  },
  mascotAnchor: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 100,
    height: 100,
  },
  mascotDisc: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255, 238, 205, 0.65)',
    bottom: 2,
  },
  activeResumeCard: {
    gap: 12,
    borderColor: 'rgba(244, 185, 66, 0.6)',
    backgroundColor: 'rgba(255, 249, 235, 0.98)',
  },
  resumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resumeIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE9C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.saffron,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: C.muted,
  },
  pathwaysWrap: {
    gap: 8,
  },
  pathwayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    borderBottomWidth: 2.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#5C2B0B',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  pathwayIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(220, 200, 185, 0.6)',
  },
  pathwayTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    color: '#2A1808',
  },
  pathwaySub: {
    fontSize: 13,
    lineHeight: 17,
    color: '#6E4D36',
    fontWeight: '500',
  },
  treasuryRow: {
    gap: 8,
  },
  treasuryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderBottomWidth: 2.5,
  },
  treasuryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  treasuryTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
});
