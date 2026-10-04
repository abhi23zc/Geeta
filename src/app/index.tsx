import { useLanguage } from '@/i18n/provider';
import { translate } from '@/i18n/translations';
import type { AppLanguage } from '@/i18n/model';
import React, { useCallback, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import {
  Bell,
  BookOpen,
  Bookmark,
  Check,
  Flame,
  Flower2,
  Leaf,
  Moon,
  Music,
  SlidersHorizontal,
  Sun,
} from 'lucide-react-native';

import { DiyaGraphic, Header, Screen, TextR } from '@/components/ritual-ui';
import { TactileTile } from '@/components/tactile-tile';
import { C } from '@/constants/ritual-theme';
import { toneLabel } from '../../shared/content';
import { useContent } from '@/state/content-store';
import { saveTeaching } from '@/services/content-cache';
import { useLocalDateKey } from '@/hooks/use-local-date-key';
import {
  cancelScheduledAlarm,
  getAlarmHomeSnapshot,
  openExactAlarmSettings,
  openFullScreenIntentSettings,
  openNotificationChannelSettings,
  scheduleRecurringAlarm,
  type AlarmHomeSnapshot,
} from '@/services/alarm';
import { useGitaProgress } from '@/state/gita-store';
import { useRitual } from '@/state/ritual-store';

type AlarmHomeStatus =
  | 'loading'
  | 'off'
  | 'updating'
  | 'scheduled'
  | 'action-required'
  | 'unavailable';

type AlarmIssue =
  | 'exact-alarm'
  | 'notifications'
  | 'full-screen'
  | 'channel'
  | null;

function formatAlarm(value: string) {
  const [rawHour = '6', minute = '30'] = value.split(':');
  const hour = Number(rawHour);
  return {
    time: `${hour % 12 || 12}:${minute}`,
    meridiem: hour >= 12 ? 'PM' : 'AM',
  };
}

function getAlarmStatus(
  snapshot: AlarmHomeSnapshot | null,
  isUpdating: boolean,
): AlarmHomeStatus {
  if (isUpdating) return 'updating';
  if (!snapshot) return 'loading';
  if (!snapshot.available) return 'unavailable';
  if (!snapshot.config?.enabled) return 'off';

  const { capabilities } = snapshot;
  if (
    !snapshot.scheduled ||
    !capabilities.notifications ||
    !capabilities.notificationChannelReady
  ) {
    return 'action-required';
  }
  return 'scheduled';
}

function getAlarmIssue(snapshot: AlarmHomeSnapshot | null): AlarmIssue {
  if (!snapshot) return null;
  const { capabilities } = snapshot;
  if (!capabilities.exactAlarm) return 'exact-alarm';
  if (!capabilities.notifications) return 'notifications';
  if (!capabilities.notificationChannelReady) return 'channel';
  if (!capabilities.fullScreenIntent) return 'full-screen';
  return null;
}

function issueCopy(issue: AlarmIssue, language: AppLanguage) {
  switch (issue) {
    case 'exact-alarm':
      return translate("Allow Alarms & reminders so Android can schedule this wake-up.", undefined, language);
    case 'notifications':
      return translate("Allow notifications so your alarm can appear over the lock screen.", undefined, language);
    case 'full-screen':
      return translate("Full-screen access is off. Use the alarm notification to open or stop it.", undefined, language);
    case 'channel':
      return translate("Set the Morning Ritual alarm channel to High importance.", undefined, language);
    default:
      return translate("This alarm needs attention before it can wake you reliably.", undefined, language);
  }
}

function formatDays(days: readonly string[], language: AppLanguage) {
  const labels = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' } as const;
  if (days.length === 7) return translate('Every day', undefined, language);
  return days.map(day => day in labels ? translate(labels[day as keyof typeof labels], undefined, language) : day).join(', ');
}

export default function Home() {
  const { t: translate, text: translateText, language } = useLanguage();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isSmall = width < 360;

  const {
    alarmTime,
    alarmTone,
    alarmDays,
    alarmEnabled,
    setAlarmEnabled,
    alarmReady,
  } = useRitual();
  const {
    ready: gitaReady,
    bookmarks,
    completedDates,
    breathingCompletedDates,
    streak,
    toggleBookmark,
  } = useGitaProgress();
  const today = useLocalDateKey();
  const { practice: todayVerse, snapshot: content, fallback } = useContent();
  const [snapshot, setSnapshot] = useState<AlarmHomeSnapshot | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [alarmError, setAlarmError] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const refreshAlarm = useCallback(async () => {
    try {
      const next = await getAlarmHomeSnapshot();
      setSnapshot(next);
      setAlarmError(null);
    } catch {
      setAlarmError("We could not confirm your alarm status. Try again before relying on it.");
    }
  }, []);

  useEffect(() => {
    if (!alarmReady) return;
    const timer = setTimeout(() => {
      void refreshAlarm();
    }, 0);
    return () => clearTimeout(timer);
  }, [alarmReady, refreshAlarm]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && alarmReady) refreshAlarm();
    });
    return () => subscription.remove();
  }, [alarmReady, refreshAlarm]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReducedMotion)
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );
    return () => subscription.remove();
  }, []);

  const status = getAlarmStatus(snapshot, isUpdating);
  const issue = getAlarmIssue(snapshot);
  const activeConfig = snapshot?.config;
  const displayTime = activeConfig
    ? `${String(activeConfig.hour).padStart(2, '0')}:${String(activeConfig.minute).padStart(2, '0')}`
    : alarmTime;
  const formattedAlarm = formatAlarm(displayTime);
  const displayTone = translateText(toneLabel(activeConfig?.tone.key ?? alarmTone));
  const displayDays = activeConfig?.weekdays ?? alarmDays;
  const alarmRequested = activeConfig?.enabled ?? alarmEnabled;
  const reflectionComplete = completedDates.has(today);
  const breathingComplete = breathingCompletedDates.has(today);
  const ritualCount = Number(reflectionComplete) + Number(breathingComplete);
  const bookmarked = bookmarks.has(todayVerse.id);
  const loading = !alarmReady || !gitaReady || (!snapshot && !alarmError);

  const toggleAlarm = async () => {
    if (isUpdating || !snapshot?.available) return;
    setIsUpdating(true);
    setAlarmError(null);
    try {
      if (alarmRequested) {
        await cancelScheduledAlarm();
        setAlarmEnabled(false);
      } else {
        await scheduleRecurringAlarm({
          time: alarmTime,
          tone: alarmTone,
          days: alarmDays,
        });
        setAlarmEnabled(true);
      }
      await refreshAlarm();
    } catch (error) {
      setAlarmError(error instanceof Error ? error.message : translate("Please try again."));
      await refreshAlarm();
    } finally {
      setIsUpdating(false);
    }
  };

  const fixAlarm = async () => {
    try {
      switch (issue) {
        case 'exact-alarm':
          await openExactAlarmSettings();
          break;
        case 'notifications':
          await Linking.openSettings();
          break;
        case 'full-screen':
          await openFullScreenIntentSettings();
          break;
        case 'channel':
          await openNotificationChannelSettings();
          break;
        default:
          break;
      }
    } catch {
      setAlarmError("We could not open Android settings. Please open the app settings manually.");
    }
  };

  if (loading) {
    return (
      <Screen>
        <Header eyebrow={translate("Home")} showActions={false} />
        <View style={s.loadingCard} accessibilityRole="progressbar">
          <TextR serif style={s.loadingTitle}>{translate("Preparing your ritual")}</TextR>
          <TextR style={s.loadingSub}>{translate("Checking your alarm and today's progress.")}</TextR>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header eyebrow={translate("Home")} showActions={false} />

      <Pressable accessibilityRole="button" accessibilityLabel={translate('App language')} onPress={() => router.push('/language')} style={{ minHeight: 48, alignSelf: 'flex-end', justifyContent: 'center', paddingHorizontal: 14, marginBottom: 12 }}>
        <TextR style={{ fontSize: 18 }}>{translate('Language')} · English / हिंदी / Hinglish</TextR>
      </Pressable>

      {/* Sacred Top Greeting & Muhurta Badge */}
      <View style={s.topRow}>
        <View style={s.muhurtaBadge}>
          <View style={s.pulseDot} />
          <TextR style={s.muhurtaText}>{translate("Today's ritual")}</TextR>
        </View>
        <View style={s.streakBadge}>
          <Flame size={15} color={C.saffron} fill={C.saffron} />
          <TextR style={s.streakText}>
            {streak > 0 ? translate('streakDays', { count: streak }) : translate("Begin your streak")}
          </TextR>
        </View>
      </View>

      <View style={s.greetingContainer}>
        <TextR serif style={[s.greetingTitle, isSmall && { fontSize: 26, lineHeight: 32 }]}>
           {translate("Shubh Prabhat")} </TextR>
        <TextR style={s.greetingSub}>
           {translate("Rise with calm intention & pure presence.")} </TextR>
      </View>

      {/* Devotional Hero Alarm Card */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translate("Open alarm setup")}
        accessibilityHint={translate("Open alarm time, sound, and wake settings")}
        onPress={() => router.navigate('/alarm/setup')}
        style={({ pressed }) => [
          s.heroAlarmCard,
          status === 'action-required' && s.heroAlarmAttention,
          pressed && s.cardPressed,
        ]}
      >
        <View style={s.alarmHeaderRow}>
          <View style={{ flex: 1 }}>
            <TextR style={s.alarmKicker}>{translate("AWAKENING SANKALPA")}</TextR>
            <View style={s.timeRow}>
              <TextR serif style={[s.alarmTime, isSmall && { fontSize: 40 }]}>
                {formattedAlarm.time}
              </TextR>
              <TextR style={s.amText}>{formattedAlarm.meridiem}</TextR>
            </View>
          </View>

          {/* 3D Glass Toggle Switch */}
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              void toggleAlarm();
            }}
            disabled={isUpdating || status === 'unavailable'}
            accessibilityLabel={translate("Alarm enabled")}
            accessibilityHint={translateText(alarmRequested ? translate("Turn off your recurring alarm.") : translate("Schedule your recurring alarm."))}
            accessibilityRole="switch"
            accessibilityState={{ checked: alarmRequested, disabled: isUpdating || status === 'unavailable' }}
            style={[
              s.switchTrack,
              alarmRequested ? s.switchTrackOn : s.switchTrackOff,
              (isUpdating || status === 'unavailable') && s.switchTrackDisabled,
            ]}
          >
            <View
              style={[
                s.switchKnob,
                alarmRequested ? s.switchKnobOn : s.switchKnobOff,
              ]}
            >
              <Sun
                size={14}
                color={C.saffron}
                fill={alarmRequested ? C.saffron : 'transparent'}
              />
            </View>
          </Pressable>
        </View>

        <View style={s.toneRow}>
          <Music size={18} color={C.primary} />
          <TextR style={s.toneText} numberOfLines={1}>{displayTone}</TextR>
        </View>
        <TextR style={s.scheduleText}>{formatDays(displayDays, language)}</TextR>

        <View style={s.alarmFooterRow}>
          <Link href="/alarm/setup" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={translate("Customize alarm")}
              accessibilityHint={translate("Open alarm time, sound, and wake settings")}
              style={s.customizeBtn}
            >
              <SlidersHorizontal size={16} color={C.saffron} />
              <TextR style={s.customizeText}>{translate("Customize tone & ritual")}</TextR>
            </Pressable>
          </Link>
          <View style={s.gentleWakeBadge}>
            <View style={s.greenDot} />
            <TextR style={s.gentleWakeText}>
              {status === 'updating' ? translate("UPDATING") : status === 'scheduled' ? translate("SCHEDULED") : status === 'action-required' ? translate("ACTION REQUIRED") : status === 'unavailable' ? translate("ANDROID ONLY") : translate("OFF")}
            </TextR>
          </View>
        </View>
        {status === 'action-required' && (
          <View style={s.alarmStatusAlert}>
            <TextR style={s.alarmStatusText}>{issueCopy(issue, language)}</TextR>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={translate("Fix alarm permissions")}
              accessibilityHint={translate("Open the Android setting needed for this alarm")}
              onPress={(event) => {
                event.stopPropagation();
                void fixAlarm();
              }}
              style={({ pressed }) => [s.fixAlarmButton, pressed && s.pressedControl]}
            >
              <TextR style={s.fixAlarmText}>{translate("Fix alarm")}</TextR>
            </Pressable>
          </View>
        )}
        {status === 'scheduled' && !snapshot?.capabilities.fullScreenIntent && (
          <TextR style={s.alarmStatusText}>{translate("Full-screen access is off. Use the alarm notification to open or stop it.")}</TextR>
        )}
        {status === 'unavailable' && (
          <TextR style={s.alarmStatusText}>{translate("Alarms are available in the Android development or release app.")}</TextR>
        )}
        {alarmError && <TextR style={s.alarmErrorText}>{translateText(alarmError)}</TextR>}
      </Pressable>

      {/* Awakening Vibe Banner */}
      <View style={s.vibeCard}>
        <View style={s.diyaGlowCircle}>
          <DiyaGraphic size={isSmall ? 38 : 44} color={C.saffron} flameColor={C.gold} showAura={false} animated={!reducedMotion} />
        </View>
        <View style={s.vibeContent}>
          <TextR style={s.vibeKicker}>{translate("AWAKENING VIBE")}</TextR>
          <TextR style={s.vibeTitle}>{translate("Inner Light Sanctuary")}</TextR>
          <TextR style={s.vibeSub} numberOfLines={2}>
             {translate("Begin with a few quiet breaths before you enter today's ritual.")} </TextR>
        </View>
      </View>

      {/* Quick Access Devotional Action Grid */}
      <View style={s.gatewaysSection}>
        <View style={s.sectionHeader}>
          <TextR style={s.sectionTitle}>{translate("SACRED GATEWAYS")}</TextR>
          <TextR style={s.sectionSubtitle}>{translate("Daily Rites")}</TextR>
        </View>

        <View style={s.gridRow}>
          <TactileTile
            href="/alarm/setup"
            icon={<Bell size={isSmall ? 20 : 24} color="#271900" />}
            bgColor="#FEC24A"
            title={translate("Set Alarm")}
          />
          <TactileTile
            href="/breathe"
            icon={<Leaf size={isSmall ? 20 : 24} color="#00210A" />}
            bgColor="#BDEFC1"
            title={translate("Sadhana")}
          />
          <TactileTile
            href="/gita"
            icon={<BookOpen size={isSmall ? 20 : 24} color="#351000" />}
            bgColor="#FFDBCC"
            title={translate("Daily Gita")}
          />
          <TactileTile
            href="/night"
            icon={<Moon size={isSmall ? 20 : 24} color="#574239" />}
            bgColor="#F2DFD1"
            title={translate("Night Rest")}
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translate("Open Culture Quiz, 600 offline questions in Hindi and English")}
        onPress={() => router.navigate('/quiz')}
        style={({ pressed }) => [s.shlokaCard, pressed && s.cardPressed]}
      >
        <View style={s.shlokaHeader}>
          <BookOpen size={26} color={C.primary} />
          <TextR style={s.sectionTitle}>{translate("CULTURE QUIZ · संस्कृति क्विज़")}</TextR>
        </View>
        <TextR serif style={s.greetingTitle}>{translate("Discover your traditions")}</TextR>
        <TextR style={s.shlokaEnglish}>{translate("600 प्रश्न · Hindi & English · Fully offline")}</TextR>
        <TextR style={s.reflectText}>{translate("Learn anytime, or play together with family →")}</TextR>
      </Pressable>

      <View style={s.shlokaCard}>
        <View style={s.contentCachePillRow}>
          <Link href="/downloads" asChild>
            <Pressable style={s.cacheBadge}>
              <TextR style={s.cacheBadgeText}>
                {fallback ? translate("Offline practice") : translate("Today’s downloaded practice")} · {Object.keys(content.days).length}{translate("/7 days · Downloads →")} </TextR>
            </Pressable>
          </Link>
          <Link href="/saved" asChild>
            <Pressable style={s.savedTeachingsBtn}>
              <TextR style={s.savedTeachingsText}>{translate("Saved teachings →")}</TextR>
            </Pressable>
          </Link>
        </View>

        <View style={s.shlokaHeader}>
          <View style={s.shlokaKickerGroup}>
            <View style={s.shlokaDot} />
            <TextR style={s.shlokaKicker}>{translate("TODAY'S SACRED SHLOKA")}</TextR>
          </View>
          <TextR style={s.shlokaChapter}>{translate("Adhyaya")} {todayVerse.chapter} · {todayVerse.verse}</TextR>
        </View>

        <TextR serif style={[s.shlokaDevanagari, isSmall && { fontSize: 20, lineHeight: 28 }]}>
          {todayVerse.sanskrit.split('\n')[0]}
        </TextR>

        <TextR style={s.shlokaEnglish}>
          {todayVerse.meaning}
        </TextR>

        <View style={s.shlokaActionRow}>
          <Pressable
            onPress={() => router.navigate('/gita')}
            accessibilityRole="button"
            accessibilityLabel={translate("Reflect on today's verse")}
            accessibilityHint={translate("Open today's Bhagavad Gita reflection")}
            style={({ pressed }) => [
              s.reflectBtn,
              pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
            ]}
          >
            <TextR style={s.reflectText}>{translate("Reflect on Verse")} {todayVerse.verse} →</TextR>
          </Pressable>
          <Pressable
            onPress={() => { if (!bookmarked) void saveTeaching(todayVerse).catch(() => undefined); toggleBookmark(todayVerse.id); }}
            accessibilityRole="button"
            accessibilityLabel={translateText(bookmarked ? translate("Remove verse bookmark") : translate("Bookmark today's verse"))}
            style={({ pressed }) => [s.bookmarkBtn, pressed && s.pressedControl]}
          >
            <Bookmark
              size={18}
              color={bookmarked ? C.saffron : C.inkSoft}
              fill={bookmarked ? C.saffron : 'transparent'}
            />
          </Pressable>
        </View>
      </View>

      <View
        accessible
        style={s.sadhanaStrip}
        accessibilityLabel={translate('progressAccessibility', { count: ritualCount })}
      >
        <View style={s.sadhanaLeft}>
          <View style={s.sadhanaIconCircle}>
            <Flower2 size={20} color="#023314" />
          </View>
          <View style={{ flex: 1 }}>
            <TextR style={s.sadhanaTitle}>{translate("Today's ritual ·")} {ritualCount}/2</TextR>
            <TextR style={s.sadhanaSub} numberOfLines={2}>
              {reflectionComplete ? translate("Gita reflection complete") : translate("Gita reflection pending")}
              {' · '}
              {breathingComplete ? translate("Breathing complete") : translate("Breathing pending")}
            </TextR>
          </View>
        </View>
        <View style={[s.progressCheck, ritualCount === 2 && s.progressCheckComplete]}>
          <Check size={16} color={ritualCount === 2 ? C.white : C.greenDark} strokeWidth={3} />
        </View>
      </View>

    </Screen>
  );
}

const s = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  muhurtaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(254, 194, 74, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderTopColor: '#FFFFFF',
    shadowColor: C.gold,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    flexShrink: 1,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },
  muhurtaText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 248, 242, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: C.saffron,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    flexShrink: 1,
  },
  streakText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: C.ink,
  },
  greetingContainer: {
    marginTop: 2,
    marginBottom: 18,
  },
  greetingTitle: {
    fontSize: 30,
    lineHeight: 38,
    color: C.ink,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  greetingSub: {
    fontSize: 14.5,
    lineHeight: 21,
    color: C.muted,
    marginTop: 3,
    fontWeight: '500',
  },
  heroAlarmCard: {
    position: 'relative',
    backgroundColor: 'rgba(255, 248, 242, 0.94)',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.18)',
    borderBottomWidth: 3.5,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: C.saffron,
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
  },
  alarmHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  alarmKicker: {
    fontSize: 12,
    letterSpacing: 1.4,
    fontWeight: '800',
    color: C.saffron,
    textTransform: 'uppercase',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
    gap: 6,
  },
  alarmTime: {
    fontSize: 48,
    color: C.ink,
    fontWeight: '300',
    letterSpacing: -0.5,
  },
  amText: {
    fontSize: 17,
    fontWeight: '800',
    color: C.saffron,
  },
  switchTrack: {
    width: 58,
    height: 32,
    borderRadius: 16,
    padding: 3,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderTopColor: 'rgba(0, 0, 0, 0.12)',
    borderBottomColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  switchTrackOn: {
    backgroundColor: C.gold,
  },
  switchTrackOff: {
    backgroundColor: C.surfaceHighest,
  },
  switchKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(0, 0, 0, 0.15)',
    borderBottomWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  switchKnobOn: {
    transform: [{ translateX: 26 }],
  },
  switchKnobOff: {
    transform: [{ translateX: 0 }],
  },
  toneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  toneText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: C.ink,
    flexShrink: 1,
  },
  alarmFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  customizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  customizeText: {
    fontSize: 14,
    fontWeight: '800',
    color: C.saffron,
  },
  gentleWakeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.green,
  },
  gentleWakeText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.greenDark,
    letterSpacing: 0.8,
  },
  vibeCard: {
    backgroundColor: 'rgba(254, 236, 220, 0.85)',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderTopColor: '#FFFFFF',
    shadowColor: C.saffron,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  diyaGlowCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: C.saffron,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    flexShrink: 0,
  },
  vibeContent: {
    flex: 1,
    minWidth: 0,
  },
  vibeKicker: {
    fontSize: 11,
    fontWeight: '800',
    color: C.goldDark,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  vibeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
    marginTop: 1,
  },
  vibeSub: {
    fontSize: 13,
    lineHeight: 19,
    color: C.muted,
    marginTop: 2,
    fontWeight: '500',
  },
  gatewaysSection: {
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 1.4,
    fontWeight: '800',
    color: C.ink,
    textTransform: 'uppercase',
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.saffron,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  shlokaCard: {
    backgroundColor: 'rgba(255, 252, 248, 0.96)',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#F4B942',
    borderTopWidth: 3,
    borderBottomColor: 'rgba(140, 64, 16, 0.14)',
    borderBottomWidth: 3,
    marginBottom: 18,
    shadowColor: C.saffron,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  contentCachePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(140, 64, 16, 0.08)',
  },
  cacheBadge: {
    flexShrink: 1,
  },
  cacheBadgeText: {
    fontSize: 11.5,
    color: C.muted,
    fontWeight: '600',
  },
  savedTeachingsBtn: {
    flexShrink: 0,
  },
  savedTeachingsText: {
    fontSize: 11.5,
    color: C.saffron,
    fontWeight: '700',
  },
  shlokaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shlokaKickerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 1,
  },
  shlokaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.saffron,
  },
  shlokaKicker: {
    fontSize: 12,
    fontWeight: '800',
    color: C.saffron,
    letterSpacing: 1.2,
  },
  shlokaChapter: {
    fontSize: 12.5,
    fontWeight: '700',
    color: C.ink,
    flexShrink: 0,
  },
  shlokaDevanagari: {
    fontSize: 22,
    lineHeight: 33,
    color: C.primary,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  shlokaEnglish: {
    fontSize: 14,
    lineHeight: 21,
    fontStyle: 'italic',
    color: C.muted,
    marginBottom: 14,
    fontWeight: '500',
  },
  shlokaActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  reflectBtn: {
    backgroundColor: '#FFDBCC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.2)',
    borderBottomWidth: 2.5,
    shadowColor: C.saffron,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    flexShrink: 1,
  },
  reflectText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#351000',
  },
  bookmarkBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(254, 236, 220, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.15)',
    borderBottomWidth: 2,
    shadowColor: C.saffron,
    shadowOpacity: 0.12,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    flexShrink: 0,
  },
  sadhanaStrip: {
    backgroundColor: 'rgba(248, 229, 214, 0.92)',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(42, 92, 51, 0.15)',
    borderBottomWidth: 3,
    shadowColor: C.green,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  sadhanaLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  sadhanaIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.green,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
    flexShrink: 0,
  },
  sadhanaTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: C.ink,
  },
  sadhanaSub: {
    fontSize: 12.5,
    color: C.muted,
    marginTop: 2,
    fontWeight: '500',
  },
  loadingCard: {
    backgroundColor: 'rgba(255, 248, 242, 0.94)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: C.glassBorder,
    shadowColor: C.saffron,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  loadingTitle: {
    fontSize: 26,
    color: C.ink,
  },
  loadingSub: {
    marginTop: 6,
    fontSize: 14,
    color: C.muted,
  },
  heroAlarmAttention: {
    borderColor: 'rgba(244, 185, 66, 0.8)',
  },
  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.992 }],
  },
  switchTrackDisabled: {
    opacity: 0.55,
  },
  scheduleText: {
    marginTop: 4,
    marginLeft: 26,
    fontSize: 12,
    color: C.muted,
    fontWeight: '600',
  },
  alarmStatusAlert: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  alarmStatusText: {
    fontSize: 13,
    lineHeight: 18,
    color: C.muted,
  },
  alarmErrorText: {
    marginTop: 10,
    fontSize: 12.5,
    lineHeight: 17,
    color: C.primary,
    fontWeight: '700',
  },
  fixAlarmButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: C.saffron,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixAlarmText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: C.white,
  },
  pressedControl: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  progressCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  progressCheckComplete: {
    backgroundColor: C.green,
  },
});
