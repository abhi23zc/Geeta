import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  BookOpen,
  Crown,
  Shield,
  Landmark,
  Feather,
  Sparkles,
  Flame,
  RotateCcw,
  Zap,
  Compass,
  Bookmark,
  Settings,
  ChevronRight,
  Flower2,
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
import { StartButton } from '@/features/quiz/start-button';
import { Button, Copy, Panel, QuizScreen, useCopy } from '@/features/quiz/ui';
import { C } from '@/constants/ritual-theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TOPIC_ICON_MAP: Record<string, typeof BookOpen> = {
  gita: BookOpen,
  ramayana: Crown,
  mahabharata: Shield,
  temples: Landmark,
  sanskrit: Feather,
  deities: Sparkles,
  festivals: Flame,
};

const TOPIC_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
  gita: { bg: '#FFF8F2', border: 'rgba(229, 107, 39, 0.35)', accent: C.saffron },
  ramayana: { bg: '#F4F9FF', border: 'rgba(37, 99, 235, 0.3)', accent: '#2563EB' },
  mahabharata: { bg: '#FFF5F6', border: 'rgba(190, 18, 60, 0.3)', accent: '#BE123C' },
  temples: { bg: '#FDF8F2', border: 'rgba(180, 83, 9, 0.3)', accent: '#B45309' },
  sanskrit: { bg: '#FAF6FF', border: 'rgba(126, 34, 206, 0.3)', accent: '#7E22CE' },
  deities: { bg: '#FFFDF0', border: 'rgba(217, 119, 6, 0.3)', accent: '#D97706' },
  festivals: { bg: '#F4FDF6', border: 'rgba(21, 128, 61, 0.3)', accent: '#15803D' },
};

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
  const { bank, progress } = useQuiz();
  const router = useRouter();
  const t = useCopy();

  const explored = Object.keys(progress?.questions ?? {}).length;
  const completedLessons = Object.values(progress?.lessons ?? {}).filter(l => l.complete).length;
  const lang = progress?.settings.language ?? 'hi';

  return (
    <QuizScreen
      title={t('Culture Quiz', 'संस्कृति क्विज़')}
      subtitle={t('Vedic Wisdom Arena', 'वैदिक ज्ञान साधना')}
      showBack={false}
      leftElement={
        <View style={s.streakHeaderPill}>
          <Flame size={15} color={C.saffron} />
          <Copy small style={s.streakHeaderText}>
            {explored > 0 ? `${explored}` : t('Daily', 'दैनिक')}
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
      {/* ── 1. Daily Sacred Quest Hero Card (Primary Hook) ───────────────────── */}
      <View style={s.heroCard}>
        <View style={s.heroLeft}>
          <View style={s.questChip}>
            <Sparkles size={12} color={C.goldDark} />
            <Copy small style={s.questChipText}>
              {t("TODAY'S SACRED QUEST", 'आज का दैनिक अभ्यास')}
            </Copy>
          </View>

          <Copy serif title style={s.heroTitle}>
            {t('Daily 5-Minute Shloka Quest', 'दैनिक 5-मिनट ज्ञान प्रश्नोत्तरी')}
          </Copy>

          <Copy small style={s.heroSub}>
            {t('5 curated questions · Double Lotus Coins', '5 चुनिंदा प्रश्न • दोहरा ज्ञान पुरस्कार')}
          </Copy>

          <View style={s.heroButtonWrap}>
            <StartButton
              label={t("Start Today's Quest →", 'आज का अभ्यास शुरू करें →')}
              options={{ mode: 'quick', count: 5, topic: 'all', difficulty: 'any' }}
            />
          </View>
        </View>

        <View style={s.mascotAnchor}>
          <View style={s.mascotDisc} />
          <AruMascot clip="gita_reading" size={110} interactive={false} />
        </View>
      </View>

      {/* ── 2. Active Session Banner (If active) ────────────────────────────── */}
      {progress?.active && (
        <Panel gold glow style={s.activeResumeCard}>
          <View style={s.resumeHeader}>
            <View style={s.resumeIconBadge}>
              <Zap size={18} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Copy title style={{ fontSize: 16, lineHeight: 20 }}>
                {progress.active.phase === 'results'
                  ? t('Round completed', 'क्विज़ पूरी हुई')
                  : t('Round in progress', 'क्विज़ प्रगति पर है')}
              </Copy>
              <Copy small>
                {progress.active.phase === 'results'
                  ? t('Review your score and answers', 'अपने अंक व उत्तर देखें')
                  : t(`Question ${progress.active.index + 1} of ${progress.active.questions.length}`, `प्रश्न ${progress.active.index + 1}/${progress.active.questions.length}`)}
              </Copy>
            </View>
          </View>
          <Button
            primary
            label={
              progress.active.phase === 'results'
                ? t('View results →', 'परिणाम देखें →')
                : t('Resume quiz now →', 'क्विज़ जारी रखें →')
            }
            onPress={() => router.push('/quiz/play')}
          />
        </Panel>
      )}

      {/* ── 3. Balanced Pathways Grid ────────────────────────────────────────── */}
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
          subtitle={t('Pass-and-play on one phone', 'एक फोन पर मिलकर खेलें')}
          icon={<Users size={20} color="#7E22CE" />}
          bgColor="#FAF6FF"
          borderColor="rgba(126, 34, 206, 0.25)"
          onPress={() => router.push('/quiz/family')}
        />

        <PathwayCard
          title={t('Practice & Revisit', 'दोबारा अभ्यास')}
          subtitle={t('Smart spaced recall for missed questions', 'गलत प्रश्नों का अभ्यास')}
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

      {/* ── 4. Sacred Subjects (Pure Lucide Vector Icons) ───────────────────── */}
      <View style={[s.sectionTitleRow, { marginTop: 10 }]}>
        <View style={s.sectionDot} />
        <Copy title style={s.sectionHeading}>
          {t('SACRED SUBJECTS', 'पवित्र विषय')}
        </Copy>
      </View>

      <View style={s.topicsList}>
        {bank?.topics.map(topic => {
          const styleConfig = TOPIC_COLORS[topic.id] ?? {
            bg: '#FFF8F2',
            border: 'rgba(215, 188, 165, 0.4)',
            accent: C.primary,
          };
          const IconComp = TOPIC_ICON_MAP[topic.id] ?? BookOpen;
          const topicTitle = topic.title[lang];

          return (
            <Pressable
              key={topic.id}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/quiz/journey',
                  params: { topic: topic.id },
                })
              }
              style={({ pressed }) => [
                s.topicItem,
                { backgroundColor: styleConfig.bg, borderColor: styleConfig.border },
                pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
              ]}
            >
              <View
                style={[
                  s.topicIconCircle,
                  { backgroundColor: '#FFFFFF', borderColor: styleConfig.border },
                ]}
              >
                <IconComp size={20} color={styleConfig.accent} />
              </View>

              <View style={s.topicInfo}>
                <Copy title style={s.topicTitle}>{topicTitle}</Copy>
                <Copy small style={s.topicCount}>
                  {t(`${topic.count} questions • 4 lessons`, `${topic.count} प्रश्न • 4 पाठ`)}
                </Copy>
              </View>

              <View style={s.topicChevronWrap}>
                <ChevronRight size={18} color={styleConfig.accent} />
              </View>
            </Pressable>
          );
        })}
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
    borderBottomWidth: 3.5,
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
    fontSize: 18,
    lineHeight: 23,
    color: C.ink,
    fontWeight: '800',
  },
  heroSub: {
    fontSize: 12,
    lineHeight: 16,
    color: C.muted,
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
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
  pathwaySub: {
    fontSize: 11,
    color: C.muted,
  },
  topicsList: {
    gap: 8,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    borderBottomWidth: 2.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
    shadowColor: '#5C2B0B',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  topicIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  topicInfo: {
    flex: 1,
    gap: 2,
  },
  topicTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
  topicCount: {
    fontSize: 11,
    color: C.muted,
  },
  topicChevronWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
