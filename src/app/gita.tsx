import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import {
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  Flame,
  Flower2,
  RotateCcw,
  Share2,
  Sparkles,
  Sunrise,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Pressable,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useReducedMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Defs,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { AruMascot } from "@/components/aru-mascot";
import { MovingChakra } from "@/components/moving-chakra";
import { Screen, TextR } from "@/components/ritual-ui";
import { C } from "@/constants/ritual-theme";
import {
  GitaNarrationSegment,
  GitaWord,
} from "@/data/gita-verses";
import { useLocalDateKey } from "@/hooks/use-local-date-key";
import { replaceAppRoute } from "@/navigation/route-actions";
import { getAlarmPlaybackState } from "@/services/alarm";
import { useGitaProgress } from "@/state/gita-store";
import { useRitual } from "@/state/ritual-store";
import { useContent } from "@/state/content-store";
import { pinContent, saveTeaching } from "@/services/content-cache";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const EMPTY_SEGMENTS: readonly GitaNarrationSegment[] = [];

/**
 * `useAudioPlayer` owns and releases its native player when this screen
 * unmounts. Focus and AppState cleanup can race that release on Android, so
 * cleanup commands must be harmless if the native object has gone away.
 */
function runPlayerCommand(command: () => void | Promise<unknown>) {
  try {
    const result = command();
    if (result && typeof (result as Promise<unknown>).catch === "function") {
      void (result as Promise<unknown>).catch(() => undefined);
    }
  } catch {
    // A released player is expected during navigation/HMR teardown.
  }
}

/**
 * Converts academic Sanskrit IAST diacritics to clean, spoken phonetics.
 */
function toSimpleEnglish(text: string): string {
  if (!text) return "";
  return text
    .replace(/ā/g, "aa")
    .replace(/Ā/g, "Aa")
    .replace(/ī/g, "ee")
    .replace(/Ī/g, "Ee")
    .replace(/ū/g, "oo")
    .replace(/Ū/g, "Oo")
    .replace(/ṛ/g, "ri")
    .replace(/Ṛ/g, "Ri")
    .replace(/[śṣ]/g, "sh")
    .replace(/[ŚṢ]/g, "Sh")
    .replace(/ñ/g, "n")
    .replace(/ṅ/g, "n")
    .replace(/ṇ/g, "n")
    .replace(/ḍ/g, "d")
    .replace(/ṭ/g, "t")
    .replace(/ḥ/g, "h")
    .replace(/ṁ/g, "m")
    .replace(/’/g, "")
    .replace(/\bca\b/gi, "cha")
    .replace(/\bCa\b/g, "Cha")
    .replace(/\s*\|\s*/g, " · ")
    .trim();
}

function formatAlarmTime(value: string) {
  const [rawHour = "6", rawMinute = "30"] = value.split(":");
  const hour24 = Number(rawHour);
  const minute = Number(rawMinute);
  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) return "6:30 AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${hour24 >= 12 ? "PM" : "AM"}`;
}

// ─── 3D Tactile Round Button ──────────────────────────────────────────────────
function TactileRoundButton({
  onPress,
  children,
  size = 44,
  style,
  accessibilityLabel,
}: {
  onPress: () => void;
  children: React.ReactNode;
  size?: number;
  style?: any;
  accessibilityLabel?: string;
}) {
  const pressed = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withSpring(pressed.value ? 2.5 : 0, {
          damping: 14,
          stiffness: 240,
        }),
      },
      {
        scale: withSpring(pressed.value ? 0.94 : 1, {
          damping: 14,
          stiffness: 240,
        }),
      },
    ],
    shadowOffset: {
      width: 0,
      height: withSpring(pressed.value ? 1.5 : 4, {
        damping: 14,
        stiffness: 240,
      }),
    },
    shadowOpacity: withSpring(pressed.value ? 0.08 : 0.16, {
      damping: 14,
      stiffness: 240,
    }),
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      style={[
        s.tactileBtnBase,
        { width: size, height: size, borderRadius: size / 2 },
        animStyle,
        style,
      ]}
    >
      <View style={s.btnGlossHighlight} />
      {children}
      <View style={s.btnBottomBevel} />
    </AnimatedPressable>
  );
}

// ─── Flowing Sacred Shloka Line (Fluid Golden Chanting Typography) ───────────
function SacredShlokaLine({
  segment,
  currentMs,
  isPlaying,
  transliteration,
  isSmall = false,
  isTablet = false,
}: {
  segment: GitaNarrationSegment;
  currentMs: number;
  isPlaying: boolean;
  transliteration?: string;
  isSmall?: boolean;
  isTablet?: boolean;
}) {
  const active = isPlaying && currentMs >= segment.startMs && currentMs < segment.endMs;
  const complete = currentMs >= segment.endMs;
  const focus = useSharedValue(0);

  useEffect(() => {
    focus.value = withTiming(active ? 1 : complete ? 0.75 : 0, {
      duration: active ? 280 : 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, complete, focus]);

  const animStyle = useAnimatedStyle(() => ({
    // In resting/paused state, keep full 100% crisp visibility.
    // When chanting, active line is 1.0, inactive dims gently to 0.52 for lyrical focus.
    opacity: isPlaying
      ? withTiming(active ? 1 : complete ? 0.92 : 0.74, { duration: 240 })
      : withTiming(1, { duration: 200 }),
    transform: [
      {
        scale: withSpring(active ? 1.045 : 1, {
          damping: 16,
          stiffness: 220,
        }),
      },
    ],
  }));

  const sanskritDynamicStyle = isSmall
    ? { fontSize: 20, lineHeight: 30 }
    : isTablet
    ? { fontSize: 28, lineHeight: 42 }
    : undefined;

  const phoneticDynamicStyle = isSmall
    ? { fontSize: 13, lineHeight: 18 }
    : isTablet
    ? { fontSize: 17, lineHeight: 25 }
    : undefined;

  return (
    <Animated.View
      accessibilityState={{ selected: active }}
      style={[s.sacredLineWrap, animStyle]}
    >
      {/* Sacred Devanagari Verse Text */}
      <TextR
        serif
        style={[
          s.sacredLineSanskrit,
          sanskritDynamicStyle,
          !isPlaying && s.sacredLineSanskritResting,
          complete && s.sacredLineSanskritComplete,
          active && s.sacredLineSanskritActive,
        ]}
      >
        {segment.text}
      </TextR>

      {/* Phonetic Transliteration */}
      {transliteration ? (
        <TextR
          serif
          style={[
            s.sacredLinePhonetic,
            phoneticDynamicStyle,
            !isPlaying && s.sacredLinePhoneticResting,
            complete && s.sacredLinePhoneticComplete,
            active && s.sacredLinePhoneticActive,
          ]}
        >
          {transliteration}
        </TextR>
      ) : null}
    </Animated.View>
  );
}

// ─── Meaning Sentence Row ───────────────────────────────────────────────────
function MeaningSentenceRow({
  segment,
  currentMs,
  isPlaying,
  isSmall = false,
  isTablet = false,
}: {
  segment: GitaNarrationSegment;
  currentMs: number;
  isPlaying: boolean;
  isSmall?: boolean;
  isTablet?: boolean;
}) {
  const active = isPlaying && currentMs >= segment.startMs && currentMs < segment.endMs;
  const complete = currentMs >= segment.endMs;
  const focus = useSharedValue(0);

  useEffect(() => {
    focus.value = withTiming(active ? 1 : complete ? 0.75 : 0, {
      duration: active ? 260 : 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, complete, focus]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: isPlaying
      ? withTiming(active ? 1 : complete ? 0.92 : 0.74, { duration: 240 })
      : withTiming(1, { duration: 200 }),
    transform: [
      {
        scale: withSpring(active ? 1.035 : 1, {
          damping: 16,
          stiffness: 220,
        }),
      },
    ],
  }));

  const meaningDynamicStyle = isSmall
    ? { fontSize: 15, lineHeight: 23 }
    : isTablet
    ? { fontSize: 20, lineHeight: 30 }
    : undefined;

  return (
    <Animated.View style={[s.meaningRow, animStyle]}>
      <TextR
        style={[
          s.meaningSentenceText,
          meaningDynamicStyle,
          !isPlaying && s.meaningSentenceResting,
          complete && s.meaningSentenceComplete,
          active && s.meaningSentenceActive,
        ]}
      >
        {segment.text}
      </TextR>
    </Animated.View>
  );
}

// ─── Hero Meditative Dais & Ambient Sunrise Aura ─────────────────────────────
function MascotStage({
  onMascotPress,
  blessingMessage,
  isCompact = false,
  isSmall = false,
  isTablet = false,
  animated = true,
}: {
  onMascotPress: () => void;
  blessingMessage: string | null;
  isCompact?: boolean;
  isSmall?: boolean;
  isTablet?: boolean;
  animated?: boolean;
}) {
  const auraGlow = useSharedValue(0.55);

  useEffect(() => {
    if (!animated) {
      auraGlow.value = 0.55;
      return;
    }
    auraGlow.value = withRepeat(
      withSequence(
        withTiming(0.92, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.46, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [animated, auraGlow]);

  const auraAnimStyle = useAnimatedStyle(() => ({
    opacity: auraGlow.value,
    transform: [{ scale: 0.95 + auraGlow.value * 0.1 }],
  }));

  const mascotSize = isSmall ? 145 : isCompact ? 165 : isTablet ? 240 : 205;
  const daisHeight = isSmall ? 150 : isCompact ? 165 : isTablet ? 245 : 210;

  return (
    <View style={[s.daisContainer, { height: daisHeight, marginTop: isSmall ? 0 : 2, marginBottom: isSmall ? 2 : 4 }]}>
      {/* Soft Orangish Dawn Light Halo */}
      <Animated.View style={[s.daisAuraHalo, auraAnimStyle]} pointerEvents="none">
        <Svg width={360} height={daisHeight + 20} viewBox="0 0 360 230" preserveAspectRatio="xMidYMid meet">
          <Defs>
            <RadialGradient id="softOrangeAura" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#FDBA74" stopOpacity="0.55" />
              <Stop offset="30%" stopColor="#FB923C" stopOpacity="0.28" />
              <Stop offset="65%" stopColor="#F97316" stopOpacity="0.09" />
              <Stop offset="100%" stopColor="#FFF9F5" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#softOrangeAura)" />
        </Svg>
      </Animated.View>

      {/* Interactive Meditative Mascot */}
      <Pressable
        accessibilityHint="Shows a short morning blessing"
        accessibilityLabel="Aru reading the Gita"
        accessibilityRole="button"
        onPress={onMascotPress}
        style={s.mascotTouch}
      >
        <AruMascot
          clip="gita_reading"
          size={mascotSize}
          animated={animated}
          muted
          glow={false}
          interactive={false}
        />
      </Pressable>

      {/* Sacred Blessing Speech Bubble */}
      {blessingMessage && (
        <Animated.View
          entering={FadeInUp.duration(280)}
          exiting={FadeOut.duration(200)}
          style={[s.blessingBubble, isSmall && { paddingHorizontal: 10, paddingVertical: 4.5 }]}
        >
          <Sparkles size={isSmall ? 12 : 14} color="#D97706" />
          <TextR style={[s.blessingText, isSmall && { fontSize: 10 }, isTablet && { fontSize: 13 }]}>{blessingMessage}</TextR>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Word Meanings (Padartha) Tray ───────────────────────────────────────────
function WordMeaningsTray({
  words,
  onSelectWord,
  selectedWord,
  isSmall = false,
  isTablet = false,
}: {
  words: GitaWord[];
  onSelectWord: (word: GitaWord) => void;
  selectedWord: GitaWord | null;
  isSmall?: boolean;
  isTablet?: boolean;
}) {
  return (
    <View style={s.padarthaContainer}>
      <View style={s.padarthaHeaderRow}>
        <View style={s.padarthaBadge}>
          <Sparkles size={isSmall ? 10 : 12} color="#9A3C08" />
          <TextR style={[s.padarthaKicker, isSmall && { fontSize: 9.5 }]}>PADARTHA · SACRED ROOTS</TextR>
        </View>
        <TextR style={[s.padarthaSubtext, isSmall && { fontSize: 9.5 }]}>Tap to reveal depth</TextR>
      </View>

      <View style={s.padarthaChipsRow}>
        {words.map((item, i) => {
          const isSelected = selectedWord?.sanskrit === item.sanskrit;
          return (
            <Pressable
              accessibilityLabel={`${item.sanskrit}: ${item.meaning}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={i}
              onPress={() => onSelectWord(item)}
              style={({ pressed }) => [
                s.padarthaChip,
                isSmall && { paddingHorizontal: 8, paddingVertical: 5 },
                isSelected && s.padarthaChipActive,
                pressed && { opacity: 0.82, transform: [{ scale: 0.96 }] },
              ]}
            >
              <TextR
                serif
                style={[
                  s.padarthaChipSanskrit,
                  isSmall && { fontSize: 13.5 },
                  isTablet && { fontSize: 17 },
                  isSelected && s.padarthaChipSanskritActive,
                ]}
              >
                {item.sanskrit}
              </TextR>
              <TextR
                style={[
                  s.padarthaChipMeaning,
                  isSmall && { fontSize: 10 },
                  isTablet && { fontSize: 13 },
                  isSelected && s.padarthaChipMeaningActive,
                ]}
              >
                {item.meaning}
              </TextR>
            </Pressable>
          );
        })}
      </View>

      {selectedWord && (
        <Animated.View entering={FadeInDown.duration(200)} style={[s.padarthaDetailCard, isSmall && { padding: 10 }]}>
          <View style={s.padarthaDetailGlow} />
          <TextR serif style={[s.padarthaDetailWord, isSmall && { fontSize: 14.5 }]}>{selectedWord.sanskrit}</TextR>
          <TextR style={[s.padarthaDetailMeaning, isSmall && { fontSize: 12 }]}>“{selectedWord.meaning}”</TextR>
          <TextR style={[s.padarthaDetailHint, isSmall && { fontSize: 10 }]}>Reflect on how this applies to your actions today.</TextR>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Main Gita Screen ────────────────────────────────────────────────────────
export default function Gita() {
  const { ready } = useGitaProgress();
  const { ready: contentReady } = useContent();
  const currentDate = useLocalDateKey();
  const [today] = useState(currentDate);
  if (!ready || !contentReady) {
    return (
      <Screen>
        <View style={s.loading}>
          <MovingChakra size={32} color={C.saffron} />
          <TextR style={s.loadingText}>Preparing today’s contemplation…</TextR>
        </View>
      </Screen>
    );
  }
  return <GitaContent key={today} today={today} />;
}

function GitaContent({ today }: { today: string }) {
  const navigation = useNavigation("/");
  const { entry } = useLocalSearchParams<{ entry?: "alarm" | "manual" }>();
  const { alarmTime } = useRitual();
  const { width, height } = useWindowDimensions();
  const isSmall = width < 360;
  const isTablet = width >= 768;
  const isCompact = height < 750;
  const reduceMotion = useReducedMotion();

  const content = useContent();
  // Freeze this session's revision while the publisher or cache refreshes.
  const [verse] = useState(() => content.practice);
  const [fallback] = useState(() => content.fallback);
  useEffect(() => verse.narration?.assetId ? pinContent(verse.narration.assetId) : undefined, [verse]);
  const narration = verse.narration;
  const player = useAudioPlayer(narration?.audioSource ?? null, {
    updateInterval: 80,
  });
  const status = useAudioPlayerStatus(player);
  const progressStore = useGitaProgress();

  const [viewTab, setViewTab] = useState<"shloka" | "meaning" | "padartha">(
    "shloka",
  );
  const [selectedWord, setSelectedWord] = useState<GitaWord | null>(null);
  const [blessingMessage, setBlessingMessage] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(
    progressStore.completedDates.has(today),
  );
  const autoStartAttempted = useRef(false);
  const manualTabSelection = useRef(false);
  const blessingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const segments = narration?.segments ?? EMPTY_SEGMENTS;
  const startMs = segments[0]?.startMs ?? 0;
  const completionMs = narration?.completionMs ?? 0;
  const currentMs = Math.round(status.currentTime * 1000);
  const isPlaying = Boolean(narration && status.playing);
  const readerLabels = verse.readerLabels ?? {
    primary: "श्लोक",
    interpretation: "भावार्थ",
    glossary: "पदार्थ",
  };
  const referenceLabel = verse.referenceLabel ?? `CHAPTER ${verse.chapter} · SHLOKA ${verse.verse}`;

  const sanskrit = segments.filter((item) => item.kind === "sanskrit");
  const hindi = segments.filter((item) => item.kind === "meaning");
  const isBookmarked = progressStore.bookmarks.has(verse.id);
  const currentStreak = progressStore.streak;

  const transliterationLines = verse.transliteration
    ? verse.transliteration.split("\n").map(toSimpleEnglish)
    : [];

  const pause = useCallback(() => {
    runPlayerCommand(() => player.pause());
  }, [player]);

  const startNarration = useCallback(() => {
    if (!narration) return;
    runPlayerCommand(() => player.seekTo(startMs / 1000));
    runPlayerCommand(() => player.play());
  }, [narration, player, startMs]);

  const playFromStart = useCallback(() => {
    if (!narration) return;
    setSessionComplete(false);
    manualTabSelection.current = false;
    setViewTab("shloka");
    startNarration();
  }, [narration, startNarration]);

  const selectTab = useCallback((tab: "shloka" | "meaning" | "padartha") => {
    manualTabSelection.current = true;
    setViewTab(tab);
  }, []);

  const completePractice = useCallback(() => {
    pause();
    progressStore.completeDailyPractice(today, verse.id);
    setSessionComplete(true);
  }, [pause, progressStore, today, verse.id]);

  const exitToHome = useCallback(() => {
    pause();
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    replaceAppRoute(navigation, "/");
  }, [navigation, pause]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
      shouldPlayInBackground: false,
    }).catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        pause();
      };
    }, [pause]),
  );

  useEffect(() => {
    if (
      !focused ||
      entry !== "alarm" ||
      !narration ||
      !status.isLoaded ||
      autoStartAttempted.current
    ) return;

    autoStartAttempted.current = true;
    getAlarmPlaybackState()
      .then((alarm) => {
        if (!alarm.ringing) startNarration();
      })
      .catch(startNarration);
  }, [entry, focused, narration, startNarration, status.isLoaded]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") pause();
    });
    return () => subscription.remove();
  }, [pause]);

  useEffect(() => {
    if (narration && currentMs >= completionMs && status.playing) {
      pause();
      runPlayerCommand(() => player.seekTo(completionMs / 1000));
    }
  }, [completionMs, currentMs, narration, pause, player, status.playing]);

  useEffect(() => {
    if (!narration || !isPlaying || manualTabSelection.current) return;
    const meaningStart = narration.segments.find((segment) => segment.kind === "meaning")?.startMs;
    setViewTab(meaningStart && currentMs >= meaningStart ? "meaning" : "shloka");
  }, [currentMs, isPlaying, narration]);

  useEffect(() => () => {
    if (blessingTimer.current) clearTimeout(blessingTimer.current);
  }, []);

  const shareVerse = async () => {
    await Share.share({
      title: "Today’s Gita · " + verse.chapter + "." + verse.verse,
      message:
        verse.sanskrit +
        "\n\n" +
        verse.transliteration +
        "\n\n" +
        verse.meaning +
        "\n\n— Bhagavad Gita",
    }).catch(() => undefined);
  };

  const handleMascotTap = () => {
    const blessings = [
      "The Divine resides as the eternal Self within you",
      "Awaken with clear intent & calm mind",
      "See the sacred in all beings today",
      "Act with whole heart, free from anxiety",
    ];
    const pick = blessings[Math.floor(Math.random() * blessings.length)];
    setBlessingMessage(pick);
    if (blessingTimer.current) clearTimeout(blessingTimer.current);
    blessingTimer.current = setTimeout(() => setBlessingMessage(null), 3800);
  };

  const headerBtnSize = isSmall ? 36 : isTablet ? 46 : isCompact ? 38 : 42;
  const headerIconSize = isSmall ? 16 : isTablet ? 20 : 18;

  return (
    <Screen contentContainerStyle={[s.screenContent, { paddingBottom: isCompact ? 46 : 60 }]}>
      {entry === "alarm" ? (
        <View style={s.topAlarmRow}>
          <View style={[s.topAlarmPill, isSmall && { paddingHorizontal: 9, paddingVertical: 4 }]}>
            <Sunrise size={isSmall ? 11 : 13} color="#8A5D18" strokeWidth={2.3} />
            <TextR style={[s.topAlarmText, isSmall && { fontSize: 9.5 }]}>
              MORNING ALARM RITUAL · {formatAlarmTime(alarmTime)}
            </TextR>
          </View>
        </View>
      ) : null}

      {/* ─── 1. Sacred Header with Diya Streak Altar ────────────────────────── */}
      {fallback ? <TextR>Offline practice — today’s download is unavailable.</TextR> : null}
      <View style={s.headerRow}>
        <TactileRoundButton
          onPress={exitToHome}
          accessibilityLabel="Back to Home"
          size={headerBtnSize}
        >
          <ChevronLeft size={headerIconSize} color={C.ink} />
        </TactileRoundButton>

        {/* Sacred Chapter Pill with Morning Sadhana Streak */}
        <View style={[s.chapterPill, isSmall && { paddingHorizontal: 9, paddingVertical: 5, gap: 4 }]}>
          <View style={s.chapterDotGlow}>
            <View style={s.chapterDot} />
          </View>
          <TextR
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[s.chapterText, isSmall && { fontSize: 9.5 }, isTablet && { fontSize: 13 }]}
          >
            {referenceLabel}
          </TextR>
          {currentStreak > 0 && (
            <View style={[s.streakBadge, isSmall && { paddingHorizontal: 4, paddingVertical: 1 }]}>
              <Flame size={isSmall ? 10 : 12} color="#D97706" fill="#F59E0B" />
              <TextR style={[s.streakBadgeText, isSmall && { fontSize: 9 }]}>{currentStreak}d</TextR>
            </View>
          )}
        </View>

        {/* Top Tactile Action Cluster */}
        <View style={[s.headerActions, isSmall && { gap: 5 }]}>
          <TactileRoundButton
            onPress={() => { if (!isBookmarked) void saveTeaching(verse).catch(() => undefined); progressStore.toggleBookmark(verse.id); }}
            accessibilityLabel={isBookmarked ? "Remove verse bookmark" : "Bookmark verse"}
            size={headerBtnSize}
          >
            <Bookmark
              size={isSmall ? 15 : 17}
              color={isBookmarked ? C.saffron : C.ink}
              fill={isBookmarked ? C.gold : "transparent"}
            />
          </TactileRoundButton>

          <TactileRoundButton
            onPress={shareVerse}
            accessibilityLabel="Share verse"
            size={headerBtnSize}
          >
            <Share2 size={isSmall ? 14 : 16} color={C.ink} />
          </TactileRoundButton>
        </View>
      </View>

      {!sessionComplete ? (
        <Animated.View entering={FadeIn.duration(260)} style={s.listeningScreen}>
          {/* ─── 2. Sacred Sanctum Dais & Meditative Mascot ─────────────────── */}
          <MascotStage
            onMascotPress={handleMascotTap}
            blessingMessage={blessingMessage}
            isCompact={isCompact}
            isSmall={isSmall}
            isTablet={isTablet}
            animated={focused && !reduceMotion}
          />

          {/* Mode Pill Indicator */}
          <View style={[s.modePillRow, isCompact && { marginBottom: 6 }]}>
            <View style={[s.modePill, isSmall && { paddingHorizontal: 10, paddingVertical: 4 }]}>
              <Flower2 size={isSmall ? 11 : 13} color={C.saffron} />
              <TextR style={[s.modePillText, isSmall && { fontSize: 9.5 }, isTablet && { fontSize: 12 }]}>
                {viewTab === "meaning"
                  ? "SACRED BHAVARTHA"
                  : viewTab === "padartha"
                  ? "WORD-BY-WORD PADARTHA"
                  : narration
                    ? "GUIDED RECITATION"
                    : "TODAY’S CONTEMPLATION"}
              </TextR>
            </View>
          </View>

          {!narration ? (
            <View style={s.textOnlyNotice}>
              <Flower2 size={16} color={C.saffron} />
              <View style={s.textOnlyCopy}>
                <TextR style={s.textOnlyTitle}>Today’s reading</TextR>
                <TextR style={s.textOnlyText}>A reviewed recording is not available for this verse yet.</TextR>
              </View>
            </View>
          ) : null}

          {/* ─── 3. Unified Sacred Shloka Sanctum ───────────────────────────── */}
          <View style={[s.shlokaCardWrapper, isCompact && { marginBottom: 10 }]}>
            <View
              style={[
                s.shlokaCard3D,
                isSmall && { paddingVertical: 12, paddingHorizontal: 10, borderRadius: 20 },
                isTablet && { paddingVertical: 24, paddingHorizontal: 22, borderRadius: 28 },
                !isSmall && !isTablet && isCompact && { paddingVertical: 14, paddingHorizontal: 12 },
              ]}
            >
              {/* Tab Switcher */}
              <View style={[s.cardTabRow, isCompact && { marginBottom: 10 }]}>
                <Pressable
                  accessibilityLabel={readerLabels.primary}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: viewTab === "shloka" }}
                  onPress={() => selectTab("shloka")}
                  style={[s.cardTab, isSmall && { paddingHorizontal: 13, paddingVertical: 5.5 }, isTablet && { paddingHorizontal: 24, paddingVertical: 9 }, viewTab === "shloka" && s.cardTabActive]}
                >
                  <TextR
                    style={[
                      s.cardTabText,
                      isSmall && { fontSize: 13.5 },
                      isTablet && { fontSize: 17 },
                      viewTab === "shloka" && s.cardTabTextActive,
                    ]}
                  >
                    {readerLabels.primary}
                  </TextR>
                </Pressable>

                <Pressable
                  accessibilityLabel={readerLabels.interpretation}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: viewTab === "meaning" }}
                  onPress={() => selectTab("meaning")}
                  style={[s.cardTab, isSmall && { paddingHorizontal: 13, paddingVertical: 5.5 }, isTablet && { paddingHorizontal: 24, paddingVertical: 9 }, viewTab === "meaning" && s.cardTabActive]}
                >
                  <TextR
                    style={[
                      s.cardTabText,
                      isSmall && { fontSize: 13.5 },
                      isTablet && { fontSize: 17 },
                      viewTab === "meaning" && s.cardTabTextActive,
                    ]}
                  >
                    {readerLabels.interpretation}
                  </TextR>
                </Pressable>

                <Pressable
                  accessibilityLabel={readerLabels.glossary}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: viewTab === "padartha" }}
                  onPress={() => selectTab("padartha")}
                  style={[s.cardTab, isSmall && { paddingHorizontal: 13, paddingVertical: 5.5 }, isTablet && { paddingHorizontal: 24, paddingVertical: 9 }, viewTab === "padartha" && s.cardTabActive]}
                >
                  <TextR
                    style={[
                      s.cardTabText,
                      isSmall && { fontSize: 13.5 },
                      isTablet && { fontSize: 17 },
                      viewTab === "padartha" && s.cardTabTextActive,
                    ]}
                  >
                    {readerLabels.glossary}
                  </TextR>
                </Pressable>
              </View>

              {/* Central Dynamic Verse Stage */}
              <View style={[s.wordStage, isCompact && { minHeight: 120, paddingVertical: 4 }]}>
                {viewTab === "shloka" && (
                  <Animated.View entering={FadeIn.duration(240)} style={s.sanskritList}>
                    {sanskrit.length ? (
                      sanskrit.map((segment, idx) => (
                        <SacredShlokaLine
                          key={String(segment.startMs) + segment.text}
                          segment={segment}
                          currentMs={currentMs}
                          isPlaying={isPlaying}
                          transliteration={transliterationLines[idx]}
                          isSmall={isSmall}
                          isTablet={isTablet}
                        />
                      ))
                    ) : (
                      <View style={s.staticVerseBlock}>
                        <TextR
                          serif
                          style={[
                            s.staticSanskrit,
                            isSmall && { fontSize: 20, lineHeight: 30 },
                            isTablet && { fontSize: 27, lineHeight: 40 },
                          ]}
                        >
                          {verse.sanskrit}
                        </TextR>
                        <TextR
                          serif
                          style={[
                            s.staticTransliteration,
                            isSmall && { fontSize: 13, lineHeight: 19 },
                            isTablet && { fontSize: 16.5, lineHeight: 24 },
                          ]}
                        >
                          {toSimpleEnglish(verse.transliteration)}
                        </TextR>
                      </View>
                    )}
                  </Animated.View>
                )}

                {viewTab === "meaning" && (
                  <Animated.View entering={FadeIn.duration(240)} style={s.meaningList}>
                    {hindi.length ? (
                      hindi.map((segment) => (
                        <MeaningSentenceRow
                          key={String(segment.startMs) + segment.text}
                          segment={segment}
                          currentMs={currentMs}
                          isPlaying={isPlaying}
                          isSmall={isSmall}
                          isTablet={isTablet}
                        />
                      ))
                    ) : (
                      <TextR
                        style={[
                          s.staticMeaning,
                          isSmall && { fontSize: 15, lineHeight: 23 },
                          isTablet && { fontSize: 19.5, lineHeight: 29 },
                        ]}
                      >
                        {verse.meaning}
                      </TextR>
                    )}
                  </Animated.View>
                )}

                {viewTab === "padartha" && (
                  <Animated.View entering={FadeIn.duration(240)}>
                    <WordMeaningsTray
                      words={verse.words}
                      onSelectWord={(w) => setSelectedWord(w)}
                      selectedWord={selectedWord}
                      isSmall={isSmall}
                      isTablet={isTablet}
                    />
                  </Animated.View>
                )}
              </View>
            </View>
          </View>

          <Pressable
            accessibilityHint="Marks today’s Gita practice complete and updates your streak"
            accessibilityLabel="Complete today’s contemplation"
            accessibilityRole="button"
            onPress={completePractice}
            style={({ pressed }) => [
              s.completeButton,
              isSmall && { minHeight: 48, borderRadius: 24 },
              isTablet && { minHeight: 62, borderRadius: 31 },
              pressed && s.completeButtonPressed,
            ]}
          >
            <CheckCircle2 size={isSmall ? 18 : isTablet ? 23 : 20} color={C.white} strokeWidth={2.4} />
            <TextR style={[s.completeButtonText, isSmall && { fontSize: 13.5 }, isTablet && { fontSize: 17 }]}>
              Complete today’s contemplation
            </TextR>
          </Pressable>
        </Animated.View>
      ) : (
        /* ─── 5. Completed Contemplation & Daily Morning Sankalpa Altar ───── */
        <Animated.View entering={FadeIn.duration(320)} style={s.completedScreen}>
          {/* Meditative Hero Mascot Stage */}
          <MascotStage
            onMascotPress={handleMascotTap}
            blessingMessage={blessingMessage}
            isCompact={isCompact}
            isSmall={isSmall}
            isTablet={isTablet}
            animated={focused && !reduceMotion}
          />

          {/* Full Shloka Wisdom Parchment */}
          <View
            style={[
              s.completedVerseCard,
              isSmall && { padding: 14, borderRadius: 20 },
              isTablet && { padding: 26, borderRadius: 28 },
            ]}
          >
            <TextR
              serif
              style={[
                s.completedSanskrit,
                isSmall && { fontSize: 20, lineHeight: 30 },
                isTablet && { fontSize: 28, lineHeight: 42 },
              ]}
            >
              {verse.sanskrit}
            </TextR>

            <View style={[s.completedTranslitBox, isSmall && { paddingHorizontal: 6, paddingVertical: 2 }]}>
              <TextR
                serif
                style={[
                  s.completedTranslation,
                  isSmall && { fontSize: 12.5, lineHeight: 18 },
                  isTablet && { fontSize: 16, lineHeight: 24 },
                ]}
              >
                “{toSimpleEnglish(verse.transliteration)}”
              </TextR>
            </View>

            <View style={[s.goldDivider, isSmall && { width: 40, marginVertical: 10 }, isTablet && { width: 64, marginVertical: 16 }]} />

            <TextR
              style={[
                s.completedMeaning,
                isSmall && { fontSize: 14.5, lineHeight: 22 },
                isTablet && { fontSize: 18, lineHeight: 28 },
              ]}
            >
              {verse.meaning}
            </TextR>

            {/* Daily Morning Sankalpa / Sacred Action Ray */}
            <View
              style={[
                s.takeawayCard,
                isSmall && { paddingHorizontal: 11, paddingVertical: 10, gap: 10, marginTop: 12 },
                isTablet && { paddingHorizontal: 18, paddingVertical: 16, gap: 14, marginTop: 20 },
              ]}
            >
              <View style={[s.takeawayIconWrap, isSmall && { width: 28, height: 28 }, isTablet && { width: 36, height: 36 }]}>
                <Sparkles size={isSmall ? 13 : isTablet ? 18 : 16} color="#D97706" />
              </View>
              <View style={s.takeawayContent}>
                <View style={s.takeawayKickerRow}>
                  <TextR style={[s.takeawayKicker, isSmall && { fontSize: 8.5 }, isTablet && { fontSize: 11 }]}>
                    TODAY’S SANKALPA · ACTION
                  </TextR>
                </View>
                <TextR style={[s.takeawayText, isSmall && { fontSize: 12.5, lineHeight: 18 }, isTablet && { fontSize: 16, lineHeight: 23 }]}>
                  {verse.takeaway}
                </TextR>
              </View>
            </View>
          </View>

          {narration ? (
            <Pressable
              accessibilityLabel="Listen to recitation again"
              accessibilityRole="button"
              onPress={playFromStart}
              style={({ pressed }) => [
                s.relistenBtn,
                isSmall && { paddingHorizontal: 14, paddingVertical: 8 },
                isTablet && { paddingHorizontal: 26, paddingVertical: 13 },
                pressed && s.pressed,
              ]}
            >
              <RotateCcw size={isSmall ? 13 : isTablet ? 16 : 14.5} color={C.saffron} />
              <TextR style={[s.relistenText, isSmall && { fontSize: 12.5 }, isTablet && { fontSize: 15 }]}>
                Listen to recitation again
              </TextR>
            </Pressable>
          ) : (
            <Pressable
              accessibilityLabel="Review today’s verse"
              accessibilityRole="button"
              onPress={() => setSessionComplete(false)}
              style={({ pressed }) => [
                s.relistenBtn,
                isSmall && { paddingHorizontal: 14, paddingVertical: 8 },
                isTablet && { paddingHorizontal: 26, paddingVertical: 13 },
                pressed && s.pressed,
              ]}
            >
              <RotateCcw size={isSmall ? 13 : isTablet ? 16 : 14.5} color={C.saffron} />
              <TextR style={[s.relistenText, isSmall && { fontSize: 12.5 }, isTablet && { fontSize: 15 }]}>
                Review today’s verse
              </TextR>
            </Pressable>
          )}
        </Animated.View>
      )}
    </Screen>
  );
}

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screenContent: {
    paddingBottom: 36,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  loading: {
    minHeight: 500,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: {
    color: C.muted,
    fontSize: 15,
  },

  // ─── Morning Alarm Awakening Header ───────────────────────────────────────
  topAlarmRow: {
    alignItems: "center",
    marginBottom: 6,
    marginTop: 2,
  },
  topAlarmPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(254, 240, 226, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(229, 107, 39, 0.28)",
    shadowColor: "#8C4010",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  topAlarmText: {
    color: "#8A5D18",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1.3,
  },

  // ─── Header ────────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  chapterPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255, 248, 240, 0.95)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(216, 144, 64, 0.35)",
    borderBottomWidth: 2,
    shadowColor: C.saffron,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  chapterDotGlow: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(229, 107, 39, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  chapterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.saffron,
  },
  chapterText: {
    color: "#9A3C08",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(254, 236, 220, 0.9)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    marginLeft: 3,
  },
  streakBadgeText: {
    color: "#9A3C08",
    fontSize: 10,
    fontWeight: "800",
  },
  headerActions: {
    flexDirection: "row",
    gap: 7,
  },

  // ─── Tactile Button Base ───────────────────────────────────────────────────
  tactileBtnBase: {
    backgroundColor: "rgba(255, 250, 245, 0.96)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(180, 125, 95, 0.35)",
    borderBottomWidth: 2.5,
    shadowColor: "#7D4018",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  btnGlossHighlight: {
    position: "absolute",
    top: 0,
    left: 4,
    right: 4,
    height: 11,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
  },
  btnBottomBevel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(140, 64, 16, 0.08)",
  },

  // ─── Hero Mascot Dais ──────────────────────────────────────────────────────
  listeningScreen: {
    flex: 1,
  },
  daisContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginTop: 2,
    marginBottom: 4,
    height: 210,
  },
  daisAuraHalo: {
    position: "absolute",
    alignSelf: "center",
    width: 360,
    height: 230,
  },
  mascotTouch: {
    zIndex: 10,
  },
  blessingBubble: {
    position: "absolute",
    bottom: -6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 253, 248, 0.98)",
    borderWidth: 1.2,
    borderColor: "rgba(244, 185, 66, 0.7)",
    shadowColor: C.gold,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 20,
  },
  blessingText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8C4A10",
    letterSpacing: 0.2,
  },

  // ─── Mode Pill ─────────────────────────────────────────────────────────────
  modePillRow: {
    alignItems: "center",
    marginBottom: 8,
  },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 5.5,
    borderRadius: 999,
    backgroundColor: "rgba(254, 236, 220, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(229, 107, 39, 0.2)",
  },
  modePillText: {
    color: "#A2521E",
    fontSize: 10.5,
    letterSpacing: 1.3,
    fontWeight: "800",
  },

  textOnlyNotice: {
    minHeight: 62,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(254, 240, 226, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(229, 107, 39, 0.2)",
  },
  textOnlyCopy: { flex: 1 },
  textOnlyTitle: { color: C.ink, fontSize: 14, fontWeight: "800" },
  textOnlyText: { color: C.muted, fontSize: 11.5, lineHeight: 16, marginTop: 2 },

  // ─── Unified Sacred Shloka Card ────────────────────────────────────────────
  shlokaCardWrapper: {
    marginHorizontal: 0,
    marginBottom: 14,
  },
  shlokaCard3D: {
    backgroundColor: "rgba(255, 252, 248, 0.98)",
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(216, 144, 64, 0.4)",
    borderBottomWidth: 3.5,
    shadowColor: "#8C4010",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    position: "relative",
    overflow: "hidden",
  },

  // ─── Card Tab Switcher ─────────────────────────────────────────────────────
  cardTabRow: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: "rgba(254, 236, 220, 0.75)",
    borderRadius: 999,
    padding: 4.5,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  cardTab: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 999,
  },
  cardTabActive: {
    backgroundColor: C.saffron,
    shadowColor: C.saffron,
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardTabText: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#7D5845",
  },
  cardTabTextActive: {
    color: C.white,
    fontWeight: "800",
  },

  // ─── Sacred Chanting Stage ─────────────────────────────────────────────────
  wordStage: {
    minHeight: 140,
    justifyContent: "center",
    paddingVertical: 8,
  },
  sanskritList: {
    gap: 16,
    paddingVertical: 4,
    alignItems: "center",
  },
  sacredLineWrap: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  sacredLineSanskrit: {
    fontSize: 24,
    lineHeight: 36,
    fontWeight: "600",
    color: "#7E6759",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  sacredLineSanskritResting: {
    color: "#2E180D",
    fontWeight: "700",
    fontSize: 25.5,
    lineHeight: 39,
  },
  sacredLineSanskritComplete: {
    fontSize: 25,
    lineHeight: 38,
    color: "#3F2618",
    fontWeight: "700",
  },
  sacredLineSanskritActive: {
    fontSize: 27.5,
    lineHeight: 41,
    color: "#842A04",
    fontWeight: "800",
    textShadowColor: "rgba(235, 110, 30, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  sacredLinePhonetic: {
    fontSize: 15,
    color: "#9E877A",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 21,
  },
  sacredLinePhoneticResting: {
    color: "#5C4335",
    fontSize: 15.5,
    fontStyle: "italic",
    lineHeight: 22.5,
  },
  sacredLinePhoneticComplete: {
    fontSize: 15.5,
    color: "#52372A",
    lineHeight: 22.5,
  },
  sacredLinePhoneticActive: {
    fontSize: 16.5,
    color: "#6D3212",
    fontWeight: "600",
    lineHeight: 23.5,
  },
  staticVerseBlock: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
  },
  staticSanskrit: {
    color: "#2E180D",
    fontSize: 23,
    lineHeight: 36,
    fontWeight: "700",
    textAlign: "center",
  },
  staticTransliteration: {
    color: "#5C4335",
    fontSize: 14.5,
    lineHeight: 22,
    fontStyle: "italic",
    textAlign: "center",
  },

  // ─── Bhavartha Meaning Stage ───────────────────────────────────────────────
  meaningList: {
    gap: 16,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  meaningRow: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  meaningSentenceText: {
    fontSize: 17.5,
    lineHeight: 27,
    color: "#7E6759",
    fontWeight: "500",
    textAlign: "center",
  },
  meaningSentenceResting: {
    color: "#2E180D",
    fontWeight: "600",
    fontSize: 18,
    lineHeight: 28,
  },
  meaningSentenceComplete: {
    fontSize: 18,
    lineHeight: 28,
    color: "#3F2618",
    fontWeight: "600",
  },
  meaningSentenceActive: {
    fontSize: 19.5,
    lineHeight: 30,
    color: "#842A04",
    fontWeight: "800",
  },
  staticMeaning: {
    color: C.ink,
    fontSize: 17,
    lineHeight: 27,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 4,
  },

  // ─── Padartha Tray ─────────────────────────────────────────────────────────
  padarthaContainer: {
    paddingVertical: 2,
  },
  padarthaHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  padarthaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  padarthaKicker: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#9A3C08",
    letterSpacing: 1.1,
  },
  padarthaSubtext: {
    fontSize: 10.5,
    fontWeight: "600",
    color: C.muted,
  },
  padarthaChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    justifyContent: "center",
  },
  padarthaChip: {
    backgroundColor: "rgba(255, 248, 242, 0.95)",
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(216, 144, 64, 0.3)",
    borderBottomWidth: 2,
    shadowColor: C.saffron,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    alignItems: "center",
  },
  padarthaChipActive: {
    backgroundColor: "#FFEDE0",
    borderColor: C.saffron,
    borderBottomColor: "#C25010",
  },
  padarthaChipSanskrit: {
    fontSize: 15,
    fontWeight: "700",
    color: "#351000",
  },
  padarthaChipSanskritActive: {
    color: C.saffron,
    fontWeight: "800",
  },
  padarthaChipMeaning: {
    fontSize: 11.5,
    color: C.muted,
    marginTop: 2,
    fontWeight: "600",
  },
  padarthaChipMeaningActive: {
    color: "#6D3010",
    fontWeight: "700",
  },
  padarthaDetailCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(254, 244, 234, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(229, 107, 39, 0.2)",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  padarthaDetailGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: C.saffron,
  },
  padarthaDetailWord: {
    fontSize: 16,
    fontWeight: "700",
    color: "#351000",
  },
  padarthaDetailMeaning: {
    fontSize: 13,
    color: "#8C4A10",
    fontWeight: "700",
    marginTop: 2,
  },
  padarthaDetailHint: {
    fontSize: 11,
    color: "#8A6D5D",
    marginTop: 4,
    fontStyle: "italic",
  },

  // ─── Completed Screen Styles ───────────────────────────────────────────────
  completedScreen: {
    paddingTop: 2,
  },
  completedVerseCard: {
    backgroundColor: "rgba(255, 252, 248, 0.98)",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(216, 144, 64, 0.4)",
    borderBottomWidth: 3.5,
    shadowColor: "#8C4010",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    alignItems: "center",
    marginBottom: 14,
  },
  completedSanskrit: {
    color: "#332016",
    fontSize: 23,
    lineHeight: 35,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },
  completedTranslitBox: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  completedTranslation: {
    color: "#574236",
    fontSize: 14,
    lineHeight: 20.5,
    fontStyle: "italic",
    textAlign: "center",
  },
  goldDivider: {
    width: 50,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: "rgba(244, 185, 66, 0.7)",
    marginVertical: 12,
  },
  completedMeaning: {
    color: C.ink,
    fontSize: 16,
    lineHeight: 24.5,
    textAlign: "center",
  },
  takeawayCard: {
    width: "100%",
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255, 247, 237, 0.96)",
    borderWidth: 1.2,
    borderColor: "rgba(251, 146, 60, 0.35)",
    borderTopColor: "rgba(255, 255, 255, 0.95)",
    borderBottomColor: "rgba(234, 88, 12, 0.25)",
    borderBottomWidth: 2,
    shadowColor: "#EA580C",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginTop: 16,
  },
  takeawayIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(254, 240, 226, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  takeawayContent: {
    flex: 1,
  },
  takeawayKickerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  takeawayKicker: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#C2410C",
    letterSpacing: 1.2,
  },
  takeawayText: {
    color: "#431407",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },

  completeButton: {
    minHeight: 56,
    borderRadius: 28,
    marginTop: 2,
    marginBottom: 8,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: C.saffron,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderBottomColor: "#A8470C",
    borderBottomWidth: 3,
    shadowColor: C.saffron,
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  completeButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  completeButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: "900",
  },

  relistenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    gap: 7,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(254, 240, 226, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(229, 107, 39, 0.22)",
    marginTop: 4,
    marginBottom: 12,
  },
  relistenText: {
    color: C.saffron,
    fontSize: 13.5,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
