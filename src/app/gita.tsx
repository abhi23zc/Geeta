/* eslint-disable react-hooks/preserve-manual-memoization */
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useRouter, useFocusEffect } from "expo-router";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Flame,
  Flower2,
  RotateCcw,
  Share2,
  Sparkles,
  Sunrise,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AppState,
  BackHandler,
  Modal,
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
import { AudioSpectrumVisualizer } from "@/components/audio-spectrum-visualizer";
import { MovingChakra } from "@/components/moving-chakra";
import { Screen, TextR } from "@/components/ritual-ui";
import { C } from "@/constants/ritual-theme";
import {
  GitaNarrationSegment,
  GitaWord,
  getDailyGitaVerse,
} from "@/data/gita-verses";
import { useLocalDateKey } from "@/hooks/use-local-date-key";
import { getAlarmPlaybackState } from "@/services/alarm";
import { useGitaProgress } from "@/state/gita-store";
import { useRitual } from "@/state/ritual-store";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const EMPTY_SEGMENTS: readonly GitaNarrationSegment[] = [];

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
}: {
  segment: GitaNarrationSegment;
  currentMs: number;
  isPlaying: boolean;
  transliteration?: string;
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
      ? withTiming(active ? 1 : complete ? 0.85 : 0.52, { duration: 240 })
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
}: {
  segment: GitaNarrationSegment;
  currentMs: number;
  isPlaying: boolean;
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
      ? withTiming(active ? 1 : complete ? 0.85 : 0.52, { duration: 240 })
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

  return (
    <Animated.View style={[s.meaningRow, animStyle]}>
      <TextR
        style={[
          s.meaningSentenceText,
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
}: {
  onMascotPress: () => void;
  blessingMessage: string | null;
  isCompact?: boolean;
}) {
  const auraGlow = useSharedValue(0.55);

  useEffect(() => {
    auraGlow.value = withRepeat(
      withSequence(
        withTiming(0.92, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.46, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [auraGlow]);

  const auraAnimStyle = useAnimatedStyle(() => ({
    opacity: auraGlow.value,
    transform: [{ scale: 0.95 + auraGlow.value * 0.1 }],
  }));

  const mascotSize = isCompact ? 165 : 205;

  return (
    <View style={[s.daisContainer, isCompact && { height: 165, marginTop: 0, marginBottom: 2 }]}>
      {/* Soft Orangish Dawn Light Halo */}
      <Animated.View style={[s.daisAuraHalo, auraAnimStyle]} pointerEvents="none">
        <Svg width={360} height={230} viewBox="0 0 360 230">
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
      <Pressable onPress={onMascotPress} style={s.mascotTouch}>
        <AruMascot
          clip="gita_reading"
          size={mascotSize}
          loop
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
          style={s.blessingBubble}
        >
          <Sparkles size={14} color="#D97706" />
          <TextR style={s.blessingText}>{blessingMessage}</TextR>
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
}: {
  words: GitaWord[];
  onSelectWord: (word: GitaWord) => void;
  selectedWord: GitaWord | null;
}) {
  return (
    <View style={s.padarthaContainer}>
      <View style={s.padarthaHeaderRow}>
        <View style={s.padarthaBadge}>
          <Sparkles size={12} color="#9A3C08" />
          <TextR style={s.padarthaKicker}>PADARTHA · SACRED ROOTS</TextR>
        </View>
        <TextR style={s.padarthaSubtext}>Tap to reveal depth</TextR>
      </View>

      <View style={s.padarthaChipsRow}>
        {words.map((item, i) => {
          const isSelected = selectedWord?.sanskrit === item.sanskrit;
          return (
            <Pressable
              key={i}
              onPress={() => onSelectWord(item)}
              style={({ pressed }) => [
                s.padarthaChip,
                isSelected && s.padarthaChipActive,
                pressed && { opacity: 0.82, transform: [{ scale: 0.96 }] },
              ]}
            >
              <TextR
                serif
                style={[
                  s.padarthaChipSanskrit,
                  isSelected && s.padarthaChipSanskritActive,
                ]}
              >
                {item.sanskrit}
              </TextR>
              <TextR
                style={[
                  s.padarthaChipMeaning,
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
        <Animated.View entering={FadeInDown.duration(200)} style={s.padarthaDetailCard}>
          <View style={s.padarthaDetailGlow} />
          <TextR serif style={s.padarthaDetailWord}>{selectedWord.sanskrit}</TextR>
          <TextR style={s.padarthaDetailMeaning}>“{selectedWord.meaning}”</TextR>
          <TextR style={s.padarthaDetailHint}>Reflect on how this applies to your actions today.</TextR>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Krishna Invitation Modal ────────────────────────────────────────────────
function KrishnaInvitation({
  visible,
  onContinue,
}: {
  visible: boolean;
  onContinue: () => void;
}) {
  return (
    <Modal
      animationType="none"
      transparent
      visible={visible}
      onRequestClose={onContinue}
      statusBarTranslucent
    >
      <View style={s.overlay}>
        <Animated.View
          entering={FadeIn.duration(380)}
          exiting={FadeOut.duration(180)}
          style={s.overlaySurface}
        >
          <View style={s.lightField}>
            <View style={[s.orb, s.orbOne]} />
            <View style={[s.orb, s.orbTwo]} />
            <View style={[s.orb, s.orbThree]} />
          </View>
          <Animated.View
            entering={FadeInDown.delay(130).duration(480)}
            style={s.overlayContent}
          >
            <View style={s.overlayMascot}>
              <AruMascot
                clip="teaching_guidance"
                size={220}
                loop
                muted
                glow={false}
                interactive={false}
              />
            </View>
            <View style={s.overlayPill}>
              <Sparkles size={13} color="#F4B942" />
              <TextR style={s.overlayPillText}>THE TEACHING HAS LANDED</TextR>
            </View>
            <TextR serif style={s.overlayTitle}>
              Would you like to{"\n"}speak with Krishna?
            </TextR>
            <TextR style={s.overlayBody}>
              Bring one honest question from your heart for your day ahead.
            </TextR>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                Alert.alert(
                  "Coming soon",
                  "Speak with Krishna will be available in a future update.",
                )
              }
              style={({ pressed }) => [
                s.overlayPrimary,
                pressed && s.pressed,
              ]}
            >
              <Sparkles size={18} color={C.white} />
              <TextR style={s.overlayPrimaryText}>Speak with Krishna</TextR>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onContinue}
              style={({ pressed }) => [
                s.overlaySecondary,
                pressed && s.pressed,
              ]}
            >
              <TextR style={s.overlaySecondaryText}>Continue quietly</TextR>
              <ChevronRight size={18} color="#805E4D" />
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Main Gita Screen ────────────────────────────────────────────────────────
export default function Gita() {
  const { ready } = useGitaProgress();
  const today = useLocalDateKey();
  if (!ready) {
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
  const router = useRouter();
  const { alarmTime } = useRitual();
  const { height } = useWindowDimensions();
  const isCompact = height < 750;

  const [year, month, day] = today.split("-").map(Number);
  const verse = getDailyGitaVerse(new Date(year, month - 1, day));
  const narration = verse.narration;
  const player = useAudioPlayer(narration?.audioSource ?? null, {
    updateInterval: 80,
  });
  const status = useAudioPlayerStatus(player);
  const progressStore = useGitaProgress();

  const [narrationSkipped, setNarrationSkipped] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [viewTab, setViewTab] = useState<"shloka" | "meaning" | "padartha">(
    "shloka",
  );
  const [selectedWord, setSelectedWord] = useState<GitaWord | null>(null);
  const [blessingMessage, setBlessingMessage] = useState<string | null>(null);

  const segments = narration?.segments ?? EMPTY_SEGMENTS;
  const startMs = segments[0]?.startMs ?? 0;
  const completionMs = narration?.completionMs ?? 0;
  const currentMs = Math.round(status.currentTime * 1000);
  const complete =
    narrationSkipped || Boolean(narration && currentMs >= completionMs);
  const meaningPhase = currentMs >= 36_000 && !complete;
  const displayTab =
    viewTab === "padartha" ? "padartha" : meaningPhase ? "meaning" : "shloka";
  const isPlaying = Boolean(narration && status.playing);
  const isPromptVisible = complete && !promptDismissed;

  const sanskrit = segments.filter((item) => item.kind === "sanskrit");
  const hindi = segments.filter((item) => item.kind === "meaning");
  const isBookmarked = progressStore.bookmarks.has(verse.id);
  const currentStreak = progressStore.streak;

  const transliterationLines = verse.transliteration
    ? verse.transliteration.split("\n").map(toSimpleEnglish)
    : [];

  const pause = useCallback(() => player.pause(), [player]);
  const playFromStart = useCallback(() => {
    setNarrationSkipped(false);
    setPromptDismissed(false);
    player.seekTo(startMs / 1000).catch(() => undefined);
    player.play();
  }, [player, startMs]);

  const skip = useCallback(() => {
    if (!narration) return;
    player.pause();
    player.seekTo(completionMs / 1000).catch(() => undefined);
    setNarrationSkipped(true);
    setPromptDismissed(false);
  }, [completionMs, narration, player]);

  const continueQuietly = useCallback(() => {
    setPromptDismissed(true);
  }, []);

  const { completeReflection } = progressStore;
  useEffect(() => {
    if (complete) {
      completeReflection(today, verse.id, verse.takeaway);
    }
  }, [complete, completeReflection, today, verse.id, verse.takeaway]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
      shouldPlayInBackground: false,
    }).catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let focused = true;
      getAlarmPlaybackState()
        .then((alarm) => {
          if (focused && !alarm.ringing) playFromStart();
        })
        .catch(() => {
          if (focused) playFromStart();
        });
      return () => {
        focused = false;
        pause();
      };
    }, [pause, playFromStart]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") pause();
    });
    return () => subscription.remove();
  }, [pause]);

  useEffect(() => {
    if (!isPromptVisible) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        continueQuietly();
        return true;
      },
    );
    return () => subscription.remove();
  }, [continueQuietly, isPromptVisible]);

  useEffect(() => {
    if (narration && currentMs >= completionMs && status.playing) {
      player.pause();
      player.seekTo(completionMs / 1000).catch(() => undefined);
    }
  }, [completionMs, currentMs, narration, player, status.playing]);

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
    setTimeout(() => setBlessingMessage(null), 3800);
  };

  return (
    <Screen contentContainerStyle={[s.screenContent, isCompact && { paddingBottom: 40 }]}>
      {/* ─── 0. Morning Alarm Awakening Pill ─────────────────────────────────── */}
      <View style={s.topAlarmRow}>
        <View style={s.topAlarmPill}>
          <Sunrise size={13} color="#8A5D18" strokeWidth={2.3} />
          <TextR style={s.topAlarmText}>
            BRAHMA MUHURTA AWAKENING · {alarmTime || "06:30 AM"}
          </TextR>
        </View>
      </View>

      {/* ─── 1. Sacred Header with Diya Streak Altar ────────────────────────── */}
      <View style={s.headerRow}>
        <TactileRoundButton
          onPress={() => router.back()}
          accessibilityLabel="Back"
          size={isCompact ? 38 : 40}
        >
          <ChevronLeft size={20} color={C.ink} />
        </TactileRoundButton>

        {/* Sacred Chapter Pill with Morning Sadhana Streak */}
        <View style={s.chapterPill}>
          <View style={s.chapterDotGlow}>
            <View style={s.chapterDot} />
          </View>
          <TextR style={s.chapterText}>
            CHAPTER {verse.chapter} · SHLOKA {verse.verse}
          </TextR>
          {currentStreak > 0 && (
            <View style={s.streakBadge}>
              <Flame size={12} color="#D97706" fill="#F59E0B" />
              <TextR style={s.streakBadgeText}>{currentStreak}d</TextR>
            </View>
          )}
        </View>

        {/* Top Tactile Action Cluster */}
        <View style={s.headerActions}>
          <TactileRoundButton
            onPress={() => progressStore.toggleBookmark(verse.id)}
            accessibilityLabel="Bookmark verse"
            size={isCompact ? 38 : 40}
          >
            <Bookmark
              size={17}
              color={isBookmarked ? C.saffron : C.ink}
              fill={isBookmarked ? C.gold : "transparent"}
            />
          </TactileRoundButton>

          <TactileRoundButton
            onPress={shareVerse}
            accessibilityLabel="Share verse"
            size={isCompact ? 38 : 40}
          >
            <Share2 size={16} color={C.ink} />
          </TactileRoundButton>
        </View>
      </View>

      {!complete ? (
        <Animated.View entering={FadeIn.duration(260)} style={s.listeningScreen}>
          {/* ─── 2. Sacred Sanctum Dais & Meditative Mascot ─────────────────── */}
          <MascotStage
            onMascotPress={handleMascotTap}
            blessingMessage={blessingMessage}
            isCompact={isCompact}
          />

          {/* Mode Pill Indicator */}
          <View style={[s.modePillRow, isCompact && { marginBottom: 6 }]}>
            <View style={s.modePill}>
              {isPlaying ? (
                <AudioSpectrumVisualizer isPlaying={true} barCount={6} height={13} />
              ) : (
                <Flower2 size={13} color={C.saffron} />
              )}
              <TextR style={s.modePillText}>
                {displayTab === "meaning"
                  ? "SACRED BHAVARTHA"
                  : displayTab === "padartha"
                  ? "WORD-BY-WORD PADARTHA"
                  : isPlaying
                  ? "SACRED AWAKENING RECITATION"
                  : "SACRED RECITATION"}
              </TextR>
            </View>
          </View>

          {/* ─── 3. Unified Sacred Shloka Sanctum ───────────────────────────── */}
          <View style={[s.shlokaCardWrapper, isCompact && { marginBottom: 10 }]}>
            <View style={[s.shlokaCard3D, isCompact && { paddingVertical: 14, paddingHorizontal: 12 }]}>
              {/* Tab Switcher */}
              <View style={[s.cardTabRow, isCompact && { marginBottom: 10 }]}>
                <Pressable
                  onPress={() => setViewTab("shloka")}
                  style={[s.cardTab, displayTab === "shloka" && s.cardTabActive]}
                >
                  <TextR
                    style={[
                      s.cardTabText,
                      displayTab === "shloka" && s.cardTabTextActive,
                    ]}
                  >
                    श्लोक
                  </TextR>
                </Pressable>

                <Pressable
                  onPress={() => setViewTab("meaning")}
                  style={[s.cardTab, displayTab === "meaning" && s.cardTabActive]}
                >
                  <TextR
                    style={[
                      s.cardTabText,
                      displayTab === "meaning" && s.cardTabTextActive,
                    ]}
                  >
                    भावार्थ
                  </TextR>
                </Pressable>

                <Pressable
                  onPress={() => setViewTab("padartha")}
                  style={[s.cardTab, displayTab === "padartha" && s.cardTabActive]}
                >
                  <TextR
                    style={[
                      s.cardTabText,
                      displayTab === "padartha" && s.cardTabTextActive,
                    ]}
                  >
                    पदार्थ
                  </TextR>
                </Pressable>
              </View>

              {/* Central Dynamic Verse Stage */}
              <View style={[s.wordStage, isCompact && { minHeight: 130, paddingVertical: 4 }]}>
                {displayTab === "shloka" && (
                  <Animated.View entering={FadeIn.duration(240)} style={s.sanskritList}>
                    {sanskrit.map((segment, idx) => (
                      <SacredShlokaLine
                        key={String(segment.startMs) + segment.text}
                        segment={segment}
                        currentMs={currentMs}
                        isPlaying={isPlaying}
                        transliteration={transliterationLines[idx]}
                      />
                    ))}
                  </Animated.View>
                )}

                {displayTab === "meaning" && (
                  <Animated.View entering={FadeIn.duration(240)} style={s.meaningList}>
                    {hindi.map((segment) => (
                      <MeaningSentenceRow
                        key={String(segment.startMs) + segment.text}
                        segment={segment}
                        currentMs={currentMs}
                        isPlaying={isPlaying}
                      />
                    ))}
                  </Animated.View>
                )}

                {displayTab === "padartha" && (
                  <Animated.View entering={FadeIn.duration(240)}>
                    <WordMeaningsTray
                      words={verse.words}
                      onSelectWord={(w) => setSelectedWord(w)}
                      selectedWord={selectedWord}
                    />
                  </Animated.View>
                )}
              </View>
            </View>
          </View>
        </Animated.View>
      ) : (
        /* ─── 5. Completed Contemplation & Daily Morning Sankalpa Altar ───── */
        <Animated.View entering={FadeIn.duration(320)} style={s.completedScreen}>
          {/* Meditative Hero Mascot Stage */}
          <MascotStage
            onMascotPress={handleMascotTap}
            blessingMessage={blessingMessage}
            isCompact={isCompact}
          />

          {/* Full Shloka Wisdom Parchment */}
          <View style={s.completedVerseCard}>
            <TextR serif style={s.completedSanskrit}>
              {verse.sanskrit}
            </TextR>

            <View style={s.completedTranslitBox}>
              <TextR serif style={s.completedTranslation}>
                “{toSimpleEnglish(verse.transliteration)}”
              </TextR>
            </View>

            <View style={s.goldDivider} />

            <TextR style={s.completedMeaning}>{verse.meaning}</TextR>

            {/* Daily Morning Sankalpa / Sacred Action Ray */}
            <View style={s.takeawayCard}>
              <View style={s.takeawayIconWrap}>
                <Sparkles size={16} color="#D97706" />
              </View>
              <View style={s.takeawayContent}>
                <View style={s.takeawayKickerRow}>
                  <TextR style={s.takeawayKicker}>TODAY’S SANKALPA · ACTION</TextR>
                </View>
                <TextR style={s.takeawayText}>{verse.takeaway}</TextR>
              </View>
            </View>
          </View>

          {/* Re-listen Trigger */}
          <Pressable
            onPress={playFromStart}
            style={({ pressed }) => [s.relistenBtn, pressed && s.pressed]}
          >
            <RotateCcw size={15} color={C.saffron} />
            <TextR style={s.relistenText}>Listen to recitation again</TextR>
          </Pressable>
        </Animated.View>
      )}

      <KrishnaInvitation
        visible={isPromptVisible}
        onContinue={continueQuietly}
      />
    </Screen>
  );
}

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screenContent: {
    paddingBottom: 60,
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
    flexDirection: "row",
    alignItems: "center",
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
    backgroundColor: "rgba(254, 236, 220, 0.7)",
    borderRadius: 999,
    padding: 3.5,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  cardTab: {
    paddingHorizontal: 15,
    paddingVertical: 5,
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
    fontSize: 12.5,
    fontWeight: "700",
    color: "#7D5845",
  },
  cardTabTextActive: {
    color: C.white,
    fontWeight: "800",
  },

  // ─── Sacred Chanting Stage ─────────────────────────────────────────────────
  wordStage: {
    minHeight: 150,
    justifyContent: "center",
    paddingVertical: 8,
  },
  sanskritList: {
    gap: 18,
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
    lineHeight: 20,
    fontStyle: "italic",
    textAlign: "center",
  },
  goldDivider: {
    width: 50,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: "rgba(244, 185, 66, 0.6)",
    marginVertical: 12,
  },
  completedMeaning: {
    color: C.ink,
    fontSize: 16,
    lineHeight: 24,
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

  relistenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
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

  // ─── Modal Overlay ─────────────────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: "rgba(47,26,14,0.48)",
    justifyContent: "flex-end",
  },
  overlaySurface: {
    minHeight: "78%",
    overflow: "hidden",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: "#FFF7EE",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
  },
  lightField: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
    backgroundColor: "#FFF8EE",
  },
  orb: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#F4B942",
  },
  orbOne: {
    top: 112,
    left: "18%",
  },
  orbTwo: {
    top: 175,
    right: "17%",
    width: 5,
    height: 5,
  },
  orbThree: {
    top: 280,
    left: "25%",
    width: 4,
    height: 4,
  },
  overlayContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 26,
    paddingBottom: 36,
  },
  overlayMascot: {
    height: 210,
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.68)",
  },
  overlayPillText: {
    color: "#9B672B",
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: "800",
  },
  overlayTitle: {
    color: "#2F2119",
    fontSize: 26,
    lineHeight: 33,
    textAlign: "center",
    marginTop: 14,
  },
  overlayBody: {
    color: "#805E4D",
    fontSize: 13.5,
    textAlign: "center",
    marginTop: 7,
    marginBottom: 22,
  },
  overlayPrimary: {
    width: "100%",
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 18,
    backgroundColor: C.saffron,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.7)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "#A8470C",
    borderBottomWidth: 3.5,
    shadowColor: C.saffron,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  overlayPrimaryText: {
    color: C.white,
    fontSize: 14.5,
    fontWeight: "800",
  },
  overlaySecondary: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  overlaySecondaryText: {
    color: "#805E4D",
    fontSize: 13.5,
    fontWeight: "800",
  },
});
