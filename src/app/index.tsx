import React, { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  Bell,
  BookOpen,
  Bookmark,
  CheckCircle2,
  Flame,
  Flower2,
  Leaf,
  Moon,
  Music,
  SlidersHorizontal,
  Sun,
  Volume2,
} from 'lucide-react-native';

import { DiyaGraphic, Header, Screen, TextR } from '@/components/ritual-ui';
import { TactileTile } from '@/components/tactile-tile';
import { C } from '@/constants/ritual-theme';
import { useRitual } from '@/state/ritual-store';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DAWN_IMAGE_URL =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop';

export default function Home() {
  const router = useRouter();
  const { alarmTime } = useRitual();
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);

  const bookmarkScale = useSharedValue(1);

  const animatedBookmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }));

  const handleBookmarkPress = () => {
    bookmarkScale.value = withSpring(1.35, { damping: 10, stiffness: 300 }, () => {
      bookmarkScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    });
    setBookmarked(!bookmarked);
  };

  return (
    <Screen>
      <Header eyebrow="Home" />

      {/* Sacred Top Greeting & Muhurta Badge */}
      <View style={s.topRow}>
        <View style={s.muhurtaBadge}>
          <View style={s.pulseDot} />
          <TextR style={s.muhurtaText}>Brahma Muhurta · 05:45 AM</TextR>
        </View>
        <View style={s.streakBadge}>
          <Flame size={17} color={C.saffron} fill={C.saffron} />
          <TextR style={s.streakText}>Day 12</TextR>
        </View>
      </View>

      <View style={s.greetingContainer}>
        <TextR serif style={s.greetingTitle}>
          Shubh Prabhat
        </TextR>
        <TextR style={s.greetingSub}>
          Rise with calm intention & pure presence.
        </TextR>
      </View>

      {/* Devotional Hero Alarm Card */}
      <View style={s.heroAlarmCard}>
        <View style={s.alarmHeaderRow}>
          <View>
            <TextR style={s.alarmKicker}>AWAKENING SANKALPA</TextR>
            <View style={s.timeRow}>
              <TextR serif style={s.alarmTime}>
                {alarmTime}
              </TextR>
              <TextR style={s.amText}>AM</TextR>
            </View>
          </View>

          {/* 3D Glass Toggle Switch */}
          <Pressable
            onPress={() => setAlarmEnabled(!alarmEnabled)}
            style={[
              s.switchTrack,
              alarmEnabled ? s.switchTrackOn : s.switchTrackOff,
            ]}
          >
            <View
              style={[
                s.switchKnob,
                alarmEnabled ? s.switchKnobOn : s.switchKnobOff,
              ]}
            >
              <Sun
                size={15}
                color={C.saffron}
                fill={alarmEnabled ? C.saffron : 'transparent'}
              />
            </View>
          </Pressable>
        </View>

        <View style={s.toneRow}>
          <Music size={20} color={C.primary} />
          <TextR style={s.toneText}>Sacred Flute & Morning Shankh Naad</TextR>
        </View>

        <View style={s.alarmFooterRow}>
          <Link href="/alarm/setup" asChild>
            <Pressable style={s.customizeBtn}>
              <SlidersHorizontal size={18} color={C.saffron} />
              <TextR style={s.customizeText}>Customize tone & ritual</TextR>
            </Pressable>
          </Link>
          <View style={s.gentleWakeBadge}>
            <View style={s.greenDot} />
            <TextR style={s.gentleWakeText}>GENTLE WAKE</TextR>
          </View>
        </View>
      </View>

      {/* Awakening Vibe Banner */}
      <View style={s.vibeCard}>
        <View style={s.diyaGlowCircle}>
          <DiyaGraphic size={46} color={C.saffron} flameColor={C.gold} showAura={false} animated={true} />
        </View>
        <View style={s.vibeContent}>
          <TextR style={s.vibeKicker}>AWAKENING VIBE</TextR>
          <TextR style={s.vibeTitle}>Inner Light Sanctuary</TextR>
          <TextR style={s.vibeSub} numberOfLines={2}>
            Let gentle flute notes softly align your breathing rhythm as dawn unfolds.
          </TextR>
        </View>
      </View>

      {/* Quick Access Devotional Action Grid */}
      <View style={s.gatewaysSection}>
        <View style={s.sectionHeader}>
          <TextR style={s.sectionTitle}>SACRED GATEWAYS</TextR>
          <TextR style={s.sectionSubtitle}>Daily Rites</TextR>
        </View>

        <View style={s.gridRow}>
          <TactileTile
            href="/alarm/setup"
            icon={<Bell size={26} color="#271900" />}
            bgColor="#FEC24A"
            title="Set Alarm"
          />
          <TactileTile
            href="/breathe"
            icon={<Leaf size={26} color="#00210A" />}
            bgColor="#BDEFC1"
            title="Sadhana"
          />
          <TactileTile
            href="/gita"
            icon={<BookOpen size={26} color="#351000" />}
            bgColor="#FFDBCC"
            title="Daily Gita"
          />
          <TactileTile
            href="/night"
            icon={<Moon size={26} color="#574239" />}
            bgColor="#F2DFD1"
            title="Night Rest"
          />
        </View>
      </View>

      {/* Today's Bhagavad Gita Wisdom Card */}
      <View style={s.shlokaCard}>
        <View style={s.shlokaHeader}>
          <View style={s.shlokaKickerGroup}>
            <View style={s.shlokaDot} />
            <TextR style={s.shlokaKicker}>TODAY'S SACRED SHLOKA</TextR>
          </View>
          <TextR style={s.shlokaChapter}>Adhyaya 2 · 47</TextR>
        </View>

        <TextR serif style={s.shlokaDevanagari}>
          कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।
        </TextR>

        <TextR style={s.shlokaEnglish}>
          “You have a right to your action, never to its fruits. Let not the
          fruits of action be your motive.”
        </TextR>

        <View style={s.shlokaActionRow}>
          <Pressable
            onPress={() => router.push('/gita')}
            style={({ pressed }) => [
              s.reflectBtn,
              pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
            ]}
          >
            <TextR style={s.reflectText}>Reflect on Verse 47 →</TextR>
          </Pressable>
          <AnimatedPressable
            onPress={handleBookmarkPress}
            style={[s.bookmarkBtn, animatedBookmarkStyle]}
          >
            <Bookmark
              size={20}
              color={bookmarked ? C.saffron : C.inkSoft}
              fill={bookmarked ? C.saffron : 'transparent'}
            />
          </AnimatedPressable>
        </View>
      </View>

      {/* Visual Atmospheric Photo Frame */}
      <View style={s.atmosphereFrame}>
        <Image source={{ uri: DAWN_IMAGE_URL }} style={s.atmosphereImage} />
        <View style={s.atmosphereOverlay} />
        <View style={s.atmosphereContent}>
          <View>
            <TextR style={s.atmoKicker}>MINDFUL ATMOSPHERE</TextR>
            <TextR style={s.atmoTitle}>Peace of Pure Dawn</TextR>
          </View>
          <View style={s.volumeBtn}>
            <Volume2 size={22} color={C.white} />
          </View>
        </View>
      </View>

      {/* Sacred Habit / Pure Morning Awareness Strip */}
      <View style={s.sadhanaStrip}>
        <View style={s.sadhanaLeft}>
          <View style={s.sadhanaIconCircle}>
            <Flower2 size={22} color="#023314" />
          </View>
          <View>
            <TextR style={s.sadhanaTitle}>Morning Chanting Sadhana</TextR>
            <TextR style={s.sadhanaSub}>Completed 108 Gayatri Japa</TextR>
          </View>
        </View>
        <CheckCircle2 size={24} color={C.green} fill={C.greenLight} />
      </View>

    </Screen>
  );
}

function Tile({
  href,
  icon,
  bgColor,
  title,
}: {
  href: any;
  icon: React.ReactNode;
  bgColor: string;
  title: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable style={s.tile}>
        <View style={[s.tileIconCircle, { backgroundColor: bgColor }]}>
          {icon}
        </View>
        <TextR style={s.tileTitle}>{title}</TextR>
      </Pressable>
    </Link>
  );
}

const s = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  muhurtaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(254, 194, 74, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderTopColor: '#FFFFFF',
    shadowColor: C.gold,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  pulseDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: C.primary,
  },
  muhurtaText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 248, 242, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: C.saffron,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.ink,
  },
  greetingContainer: {
    marginTop: 4,
    marginBottom: 22,
  },
  greetingTitle: {
    fontSize: 32,
    lineHeight: 40,
    color: C.ink,
    fontWeight: '600',
  },
  greetingSub: {
    fontSize: 15,
    lineHeight: 22,
    color: C.muted,
    marginTop: 4,
    fontWeight: '500',
  },
  heroAlarmCard: {
    position: 'relative',
    backgroundColor: 'rgba(255, 248, 242, 0.94)',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.18)',
    borderBottomWidth: 3.5,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: C.saffron,
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  alarmHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  alarmKicker: {
    fontSize: 12.5,
    letterSpacing: 1.5,
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
    fontSize: 52,
    color: C.ink,
    fontWeight: '300',
  },
  amText: {
    fontSize: 18,
    fontWeight: '800',
    color: C.saffron,
  },
  switchTrack: {
    width: 60,
    height: 34,
    borderRadius: 17,
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
    width: 28,
    height: 28,
    borderRadius: 14,
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
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
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
    gap: 10,
    marginTop: 16,
  },
  toneText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
  },
  alarmFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  customizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customizeText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: C.saffron,
  },
  gentleWakeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.green,
  },
  gentleWakeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: C.greenDark,
    letterSpacing: 0.8,
  },
  vibeCard: {
    backgroundColor: 'rgba(254, 236, 220, 0.85)',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderTopColor: '#FFFFFF',
    shadowColor: C.saffron,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  diyaGlowCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: C.saffron,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  vibeContent: {
    flex: 1,
  },
  vibeKicker: {
    fontSize: 11.5,
    fontWeight: '800',
    color: C.goldDark,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  vibeTitle: {
    fontSize: 19.5,
    fontWeight: '700',
    color: C.ink,
    marginTop: 2,
  },
  vibeSub: {
    fontSize: 13.5,
    lineHeight: 20,
    color: C.muted,
    marginTop: 3,
    fontWeight: '500',
  },
  gatewaysSection: {
    marginBottom: 26,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12.5,
    letterSpacing: 1.5,
    fontWeight: '800',
    color: C.ink,
    textTransform: 'uppercase',
  },
  sectionSubtitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: C.saffron,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  tile: {
    flex: 1,
    backgroundColor: 'rgba(255, 248, 242, 0.88)',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderTopColor: '#FFFFFF',
    shadowColor: C.saffron,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  tileIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
  },
  shlokaCard: {
    backgroundColor: 'rgba(255, 252, 248, 0.96)',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#F4B942',
    borderTopWidth: 3,
    borderBottomColor: 'rgba(140, 64, 16, 0.14)',
    borderBottomWidth: 3,
    marginBottom: 22,
    shadowColor: C.saffron,
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
  },
  shlokaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  shlokaKickerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shlokaDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: C.saffron,
  },
  shlokaKicker: {
    fontSize: 12.5,
    fontWeight: '800',
    color: C.saffron,
    letterSpacing: 1.2,
  },
  shlokaChapter: {
    fontSize: 13,
    fontWeight: '700',
    color: C.ink,
  },
  shlokaDevanagari: {
    fontSize: 24,
    lineHeight: 36,
    color: C.primary,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  shlokaEnglish: {
    fontSize: 15,
    lineHeight: 23,
    fontStyle: 'italic',
    color: C.muted,
    marginBottom: 18,
    fontWeight: '500',
  },
  shlokaActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reflectBtn: {
    backgroundColor: '#FFDBCC',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.2)',
    borderBottomWidth: 2.5,
    shadowColor: C.saffron,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  reflectText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#351000',
  },
  bookmarkBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(254, 236, 220, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.15)',
    borderBottomWidth: 2,
    shadowColor: C.saffron,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  atmosphereFrame: {
    height: 170,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 18,
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(0, 0, 0, 0.25)',
    borderBottomWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
  },
  atmosphereImage: {
    width: '100%',
    height: '100%',
  },
  atmosphereOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(35, 26, 17, 0.42)',
  },
  atmosphereContent: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  atmoKicker: {
    fontSize: 12,
    fontWeight: '800',
    color: C.gold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  atmoTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: C.white,
    marginTop: 2,
  },
  volumeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  sadhanaStrip: {
    backgroundColor: 'rgba(248, 229, 214, 0.92)',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sadhanaIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.green,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  sadhanaTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: C.ink,
  },
  sadhanaSub: {
    fontSize: 13.5,
    color: C.muted,
    marginTop: 2,
    fontWeight: '500',
  },
});
