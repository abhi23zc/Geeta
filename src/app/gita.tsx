/* eslint-disable react-hooks/preserve-manual-memoization */
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useRouter, useFocusEffect } from "expo-router";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Flower2,
  Info,
  Music,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Volume2,
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
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { AruMascot } from "@/components/aru-mascot";
import { AudioSpectrumVisualizer } from "@/components/audio-spectrum-visualizer";
import { MindsetCelebrationModal } from "@/components/mindset-celebration-modal";
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const EMPTY_SEGMENTS: readonly GitaNarrationSegment[] = [];

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return (
    String(Math.floor(whole / 60)) + ":" + String(whole % 60).padStart(2, "0")
  );
}

/**
 * Converts academic Sanskrit IAST diacritics to clean, simple,
 * intuitive spoken English phonetics that anyone can pronounce easily.
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

// ─── Master 3D Play/Pause Button ──────────────────────────────────────────────
function MasterPlayButton({
  isPlaying,
  onPress,
}: {
  isPlaying: boolean;
  onPress: () => void;
}) {
  const pressed = useSharedValue(0);
  const auraPulse = useSharedValue(1);

  useEffect(() => {
    if (isPlaying) {
      auraPulse.value = withRepeat(
        withSequence(
          withTiming(1.22, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      auraPulse.value = withTiming(1, { duration: 300 });
    }
  }, [isPlaying, auraPulse]);

  const auraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: auraPulse.value }],
    opacity: isPlaying ? 0.45 : 0,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withSpring(pressed.value ? 4 : 0, {
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
  }));

  return (
    <View style={s.masterPlayWrapper}>
      {/* Dynamic Saffron Aura Ring */}
      <Animated.View style={[s.masterPlayAura, auraStyle]} />

      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? "Pause narration" : "Play narration"}
        onPress={onPress}
        onPressIn={() => {
          pressed.value = 1;
        }}
        onPressOut={() => {
          pressed.value = 0;
        }}
        style={[s.masterPlayBtn, buttonStyle]}
      >
        {/* 3D Gold Specular Top Rim */}
        <View style={s.masterPlayTopSpecular} />

        {/* Gloss Arc Reflection */}
        <View style={s.masterPlayGlossArc} />

        {isPlaying ? (
          <Pause size={28} color={C.white} fill={C.white} />
        ) : (
          <Play size={28} color={C.white} fill={C.white} style={{ marginLeft: 3 }} />
        )}

        {/* 3D Bottom Cast Bevel Lip */}
        <View style={s.masterPlayBottomLip} />
      </AnimatedPressable>
    </View>
  );
}

// ─── Word Karaoke Highlighter ─────────────────────────────────────────────────
function Word({
  segment,
  currentMs,
  last,
}: {
  segment: GitaNarrationSegment;
  currentMs: number;
  last: boolean;
}) {
  const active = currentMs >= segment.startMs && currentMs < segment.endMs;
  const complete = currentMs >= segment.endMs;
  const intensity = useSharedValue(0);

  useEffect(() => {
    intensity.value = withTiming(active ? 1 : complete ? 0.38 : 0, {
      duration: 180,
    });
  }, [active, complete, intensity]);

  const style = useAnimatedStyle(() => ({
    color: interpolateColor(
      intensity.value,
      [0, 0.38, 1],
      ["#8A766B", "#38241A", "#CA5A18"],
    ),
    textShadowColor: "rgba(229,107,39,0.35)",
    textShadowRadius: intensity.value * 12,
    transform: [{ scale: 1 + intensity.value * 0.045 }],
  }));

  return (
    <Animated.Text
      accessibilityState={{ selected: active }}
      style={[s.word, style]}
    >
      {segment.text}
      {last ? "" : " "}
    </Animated.Text>
  );
}

function WordLine({
  words,
  currentMs,
  meaning = false,
}: {
  words: readonly GitaNarrationSegment[];
  currentMs: number;
  meaning?: boolean;
}) {
  return (
    <Text style={[s.wordLine, meaning && s.meaningLine]}>
      {words.map((word, index) => (
        <Word
          key={String(word.startMs) + word.text}
          segment={word}
          currentMs={currentMs}
          last={index === words.length - 1}
        />
      ))}
    </Text>
  );
}

// ─── Clean Soft Orangish Ambient Aura for Mascot ──────────────────────────────
function MascotStage({
  onMascotPress,
  blessingMessage,
}: {
  onMascotPress: () => void;
  blessingMessage: string | null;
}) {
  const auraGlow = useSharedValue(0.55);

  useEffect(() => {
    auraGlow.value = withRepeat(
      withSequence(
        withTiming(0.82, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.42, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [auraGlow]);

  const auraAnimStyle = useAnimatedStyle(() => ({
    opacity: auraGlow.value,
    transform: [{ scale: 0.94 + auraGlow.value * 0.1 }],
  }));

  return (
    <View style={s.daisContainer}>
      {/* Soft Orangish Ambient Light Glow (No shapes or harsh borders) */}
      <Animated.View style={[s.daisAuraHalo, auraAnimStyle]} pointerEvents="none">
        <Svg width={320} height={190} viewBox="0 0 320 190">
          <Defs>
            <RadialGradient id="softOrangeAura" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#FDBA74" stopOpacity="0.45" />
              <Stop offset="30%" stopColor="#FB923C" stopOpacity="0.22" />
              <Stop offset="65%" stopColor="#F97316" stopOpacity="0.06" />
              <Stop offset="100%" stopColor="#FFF9F5" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#softOrangeAura)" />
        </Svg>
      </Animated.View>

      {/* Interactive Mascot with pure transparent background */}
      <Pressable onPress={onMascotPress} style={s.mascotTouch}>
        <AruMascot
          clip="gita_reading"
          size={142}
          loop
          muted
          glow={false}
          interactive={false}
        />
      </Pressable>

      {/* Ephemeral Blessing Speech Bubble */}
      {blessingMessage && (
        <Animated.View
          entering={FadeInUp.duration(280)}
          exiting={FadeOut.duration(200)}
          style={s.blessingBubble}
        >
          <Sparkles size={13} color="#D97706" />
          <TextR style={s.blessingText}>{blessingMessage}</TextR>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Word Meanings (Padartha) Interactive Tray ────────────────────────────────
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
        <TextR style={s.padarthaKicker}>PADARTHA · WORD-BY-WORD MEANINGS</TextR>
        <TextR style={s.padarthaSubtext}>Tap to reveal</TextR>
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
              Bring one honest question from your heart.
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
  const [year, month, day] = today.split("-").map(Number);
  const verse = getDailyGitaVerse(new Date(year, month - 1, day));
  const narration = verse.narration;
  const player = useAudioPlayer(narration?.audioSource ?? null, {
    updateInterval: 80,
  });
  const status = useAudioPlayerStatus(player);
  const progressStore = useGitaProgress();

  const [reflection, setReflection] = useState(
    progressStore.getReflection(today)?.text ?? "",
  );
  const [reflectionExpanded, setReflectionExpanded] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
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
  const isPlaying = Boolean(narration && status.playing);
  const isPromptVisible = complete && !promptDismissed;
  const timedProgress =
    completionMs > startMs
      ? Math.max(0, Math.min(1, (currentMs - startMs) / (completionMs - startMs)))
      : 0;

  const sanskrit = segments.filter((item) => item.kind === "sanskrit");
  const hindi = segments.filter((item) => item.kind === "meaning");
  const sanskritLineOne = sanskrit.filter((item) => item.startMs < 29_000);
  const sanskritLineTwo = sanskrit.filter((item) => item.startMs >= 29_000);
  const hindiLineOne = hindi.filter((item) => item.startMs < 47_000);
  const hindiLineTwo = hindi.filter((item) => item.startMs >= 47_000);
  const reflectionComplete = progressStore.completedDates.has(today);
  const isBookmarked = progressStore.bookmarks.has(verse.id);

  // Sync tab mode with auto-narration phase if user hasn't explicitly switched
  useEffect(() => {
    if (meaningPhase && viewTab === "shloka") {
      setViewTab("meaning");
    } else if (!meaningPhase && !complete && viewTab === "meaning") {
      setViewTab("shloka");
    }
  }, [complete, meaningPhase, viewTab]);

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
    setReflectionExpanded(true);
  }, []);

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

  const togglePlay = () => {
    if (!narration) return;
    if (complete || status.didJustFinish) playFromStart();
    else if (status.playing) pause();
    else player.play();
  };

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

  const finishReflection = () => {
    if (!progressStore.completeReflection(today, verse.id, reflection)) {
      Alert.alert(
        "एक विचार लिखें",
        "आज की reflection पूरी करने के लिए एक छोटा सा वाक्य भी पर्याप्त है।",
      );
      return;
    }
    setShowCelebration(true);
    setReflectionExpanded(false);
  };

  const handleMascotTap = () => {
    const blessings = [
      "अहमात्मा गुडाकेश · The Divine resides within you",
      "Listen with pure presence & inner peace",
      "सर्वभूताशयस्थितः · Seeing the sacred in every being",
    ];
    const pick = blessings[Math.floor(Math.random() * blessings.length)];
    setBlessingMessage(pick);
    setTimeout(() => setBlessingMessage(null), 3500);
  };

  return (
    <Screen contentContainerStyle={s.screenContent}>
      {/* ─── 1. Ethereal 3D Sacred Header ───────────────────────────────────── */}
      <View style={s.headerRow}>
        <TactileRoundButton
          onPress={() => router.back()}
          accessibilityLabel="Back"
          size={42}
        >
          <ChevronLeft size={22} color={C.ink} />
        </TactileRoundButton>

        {/* 3D Sacred Chapter Pill */}
        <View style={s.chapterPill}>
          <View style={s.chapterDotGlow}>
            <View style={s.chapterDot} />
          </View>
          <TextR style={s.chapterText}>
            CHAPTER {verse.chapter} · SHLOKA {verse.verse}
          </TextR>
        </View>

        {/* Top 3D Action Cluster */}
        <View style={s.headerActions}>
          <TactileRoundButton
            onPress={() => progressStore.toggleBookmark(verse.id)}
            accessibilityLabel="Bookmark verse"
            size={42}
          >
            <Bookmark
              size={18}
              color={isBookmarked ? C.saffron : C.ink}
              fill={isBookmarked ? C.gold : "transparent"}
            />
          </TactileRoundButton>

          <TactileRoundButton
            onPress={shareVerse}
            accessibilityLabel="Share verse"
            size={42}
          >
            <Share2 size={17} color={C.ink} />
          </TactileRoundButton>
        </View>
      </View>

      {!complete ? (
        <Animated.View entering={FadeIn.duration(260)} style={s.listeningScreen}>
          {/* ─── 2. Sacred Sanctum Dais & Mascot ────────────────────────────── */}
          <MascotStage
            onMascotPress={handleMascotTap}
            blessingMessage={blessingMessage}
          />

          {/* Mode Pill Indicator */}
          <View style={s.modePillRow}>
            <View style={s.modePill}>
              {isPlaying ? (
                <AudioSpectrumVisualizer isPlaying={true} barCount={6} height={14} />
              ) : (
                <Flower2 size={13} color={C.saffron} />
              )}
              <TextR style={s.modePillText}>
                {viewTab === "meaning"
                  ? "THE SACRED MEANING"
                  : viewTab === "padartha"
                  ? "WORD-BY-WORD PADARTHA"
                  : "SACRED RECITATION"}
              </TextR>
            </View>
          </View>

          {/* ─── 3. 3D Sacred Parchment Shloka Card ────────────── */}
          <View style={s.shlokaCardWrapper}>
            <View style={s.shlokaCard3D}>
              {/* View Switcher Tabs inside the 3D card */}
              <View style={s.cardTabRow}>
                <Pressable
                  onPress={() => setViewTab("shloka")}
                  style={[s.cardTab, viewTab === "shloka" && s.cardTabActive]}
                >
                  <TextR
                    style={[
                      s.cardTabText,
                      viewTab === "shloka" && s.cardTabTextActive,
                    ]}
                  >
                    श्लोक
                  </TextR>
                </Pressable>

                <Pressable
                  onPress={() => setViewTab("meaning")}
                  style={[s.cardTab, viewTab === "meaning" && s.cardTabActive]}
                >
                  <TextR
                    style={[
                      s.cardTabText,
                      viewTab === "meaning" && s.cardTabTextActive,
                    ]}
                  >
                    भावार्थ
                  </TextR>
                </Pressable>

                <Pressable
                  onPress={() => setViewTab("padartha")}
                  style={[s.cardTab, viewTab === "padartha" && s.cardTabActive]}
                >
                  <TextR
                    style={[
                      s.cardTabText,
                      viewTab === "padartha" && s.cardTabTextActive,
                    ]}
                  >
                    पदार्थ
                  </TextR>
                </Pressable>
              </View>

              {/* Central Karaoke Stage */}
              <View style={s.wordStage}>
                {viewTab === "shloka" && (
                  <Animated.View entering={FadeIn.duration(240)}>
                    <WordLine words={sanskritLineOne} currentMs={currentMs} />
                    <WordLine words={sanskritLineTwo} currentMs={currentMs} />
                  </Animated.View>
                )}

                {viewTab === "meaning" && (
                  <Animated.View entering={FadeIn.duration(240)}>
                    <WordLine
                      words={hindiLineOne}
                      currentMs={currentMs}
                      meaning
                    />
                    <WordLine
                      words={hindiLineTwo}
                      currentMs={currentMs}
                      meaning
                    />
                  </Animated.View>
                )}

                {viewTab === "padartha" && (
                  <Animated.View entering={FadeIn.duration(240)}>
                    <WordMeaningsTray
                      words={verse.words}
                      onSelectWord={(w) => setSelectedWord(w)}
                      selectedWord={selectedWord}
                    />
                  </Animated.View>
                )}
              </View>

              {/* Transliteration Sub-Card with simple, easy-to-read spoken English */}
              {viewTab !== "padartha" && (
                <View style={s.transliterationBox}>
                  <TextR serif style={s.transliterationText}>
                    {viewTab === "meaning"
                      ? "“Let the sacred meaning settle into your heart.”"
                      : `“${toSimpleEnglish(verse.transliteration)}”`}
                  </TextR>
                </View>
              )}
            </View>
          </View>

          {/* ─── 4. Floating 3D Tactile Audio Sanctuary Dock ────────────────── */}
          <View style={s.audioDock}>
            {/* 3D Top Bevel Line */}
            <View style={s.dockTopBevel} />

            {/* Interactive Progress Bar */}
            <View style={s.progressSection}>
              <View style={s.progressRail}>
                <View
                  style={[
                    s.progressFill,
                    { width: `${Math.round(timedProgress * 100)}%` as any },
                  ]}
                />
                {/* 3D Glowing Head Bead */}
                <View
                  style={[
                    s.progressBead,
                    { left: `${Math.max(0, Math.min(100, timedProgress * 100))}%` as any },
                  ]}
                />
              </View>

              {/* Time Indicators */}
              <View style={s.timeRow}>
                <TextR style={s.timeText}>
                  {formatTime(Math.max(0, status.currentTime - startMs / 1000))}
                </TextR>
                <TextR style={s.timeText}>
                  {formatTime(Math.max(0, (completionMs - startMs) / 1000))}
                </TextR>
              </View>
            </View>

            {/* 3D Master Control Row */}
            <View style={s.controlRow}>
              <TactileRoundButton
                onPress={playFromStart}
                accessibilityLabel="Replay narration"
                size={48}
              >
                <RotateCcw size={20} color="#7D5845" />
              </TactileRoundButton>

              <MasterPlayButton isPlaying={isPlaying} onPress={togglePlay} />

              <TactileRoundButton
                onPress={skip}
                accessibilityLabel="Skip narration"
                size={48}
              >
                <ChevronRight size={23} color="#7D5845" />
              </TactileRoundButton>
            </View>

            {/* Playback Status Caption & Spectrum */}
            <View style={s.playbackCaption}>
              <Volume2 size={15} color={C.saffron} />
              <TextR style={s.playbackCaptionText}>
                {isPlaying ? "Listening with presence" : "Narration paused"}
              </TextR>
              <View style={s.captionSpectrum}>
                <AudioSpectrumVisualizer
                  isPlaying={isPlaying}
                  barCount={8}
                  height={13}
                />
              </View>
            </View>
          </View>
        </Animated.View>
      ) : (
        /* ─── 5. Completed Contemplation & Reflection State ────────────────── */
        <Animated.View entering={FadeIn.duration(320)} style={s.completedScreen}>
          {/* 3D Wisdom Card */}
          <View style={s.completedVerseCard}>
            <View style={s.completedMascot}>
              <AruMascot
                clip="gita_reading"
                size={110}
                loop
                muted
                glow={false}
                interactive={false}
              />
            </View>

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

            {/* 3D Emerald Glass Key Takeaway Plaque */}
            <View style={s.takeaway3D}>
              <View style={s.takeawayGloss} />
              <Sparkles size={17} color="#FFF6DF" />
              <TextR style={s.takeawayText}>{verse.takeaway}</TextR>
            </View>
          </View>

          {/* Interactive Word Meanings in Completed State */}
          <View style={s.completedPadarthaWrap}>
            <WordMeaningsTray
              words={verse.words}
              onSelectWord={(w) => setSelectedWord(w)}
              selectedWord={selectedWord}
            />
          </View>

          {/* 3D Interactive Reflection Journal */}
          <View style={s.reflectionCard3D}>
            <View style={s.reflectionTopBevel} />

            <Pressable
              accessibilityRole="button"
              onPress={() => setReflectionExpanded((open) => !open)}
              style={({ pressed }) => [
                s.reflectionToggle,
                pressed && s.pressed,
              ]}
            >
              <View style={s.reflectionCopy}>
                <View style={s.reflectionKickerRow}>
                  <View style={s.reflectionKickerDot} />
                  <TextR style={s.reflectionKicker}>TODAY’S REFLECTION</TextR>
                </View>
                <TextR serif style={s.reflectionPrompt}>
                  {verse.reflectionPrompt}
                </TextR>
              </View>
              <View style={s.reflectionChevronWrap}>
                <ChevronRight
                  size={20}
                  color={C.saffron}
                  style={{
                    transform: [{ rotate: reflectionExpanded ? "90deg" : "0deg" }],
                  }}
                />
              </View>
            </Pressable>

            {reflectionExpanded && (
              <Animated.View entering={FadeInDown.duration(240)}>
                <TextInput
                  accessibilityLabel="Your reflection"
                  value={reflection}
                  onChangeText={setReflection}
                  onBlur={() =>
                    progressStore.saveReflection(today, verse.id, reflection)
                  }
                  placeholder="Write one honest thought from your heart…"
                  placeholderTextColor="#9A8173"
                  multiline
                  textAlignVertical="top"
                  maxLength={600}
                  style={s.reflectionInput}
                />
                <View style={s.reflectionFooter}>
                  <TextR style={s.savedHint}>
                    {reflection.length}/600 · Saved locally
                  </TextR>
                  <Pressable
                    accessibilityRole="button"
                    onPress={finishReflection}
                    style={({ pressed }) => [
                      s.completeButton3D,
                      reflectionComplete && s.completeButtonDone3D,
                      pressed && s.pressed,
                    ]}
                  >
                    <View style={s.btnGlossHighlight} />
                    <Check size={18} color={C.white} strokeWidth={3} />
                    <TextR style={s.completeText}>
                      {reflectionComplete
                        ? "Reflection Completed"
                        : "Complete reflection"}
                    </TextR>
                    <View style={s.btnBottomBevel} />
                  </Pressable>
                </View>
              </Animated.View>
            )}
          </View>

          {/* Re-listen Option */}
          <Pressable
            onPress={playFromStart}
            style={({ pressed }) => [s.relistenBtn, pressed && s.pressed]}
          >
            <RotateCcw size={16} color={C.saffron} />
            <TextR style={s.relistenText}>Listen to recitation again</TextR>
          </Pressable>
        </Animated.View>
      )}

      <KrishnaInvitation
        visible={isPromptVisible}
        onContinue={continueQuietly}
      />
      <MindsetCelebrationModal
        visible={showCelebration}
        onClose={() => setShowCelebration(false)}
      />
    </Screen>
  );
}

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screenContent: {
    paddingBottom: 140,
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

  // ─── Header ────────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  chapterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255, 248, 240, 0.95)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(216, 144, 64, 0.35)",
    borderBottomWidth: 2,
    shadowColor: C.saffron,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  chapterDotGlow: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(229, 107, 39, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  chapterDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.saffron,
  },
  chapterText: {
    color: "#9A3C08",
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
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
    height: 12,
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
    marginTop: 4,
    marginBottom: 6,
    height: 156,
  },
  daisAuraHalo: {
    position: "absolute",
    alignSelf: "center",
    width: 320,
    height: 190,
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
    paddingHorizontal: 14,
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
    marginBottom: 10,
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
    letterSpacing: 1.4,
    fontWeight: "800",
  },

  // ─── 3D Shloka Parchment Card ──────────────────────────────────────────────
  shlokaCardWrapper: {
    marginHorizontal: 0,
    marginBottom: 16,
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
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  cardTab: {
    paddingHorizontal: 14,
    paddingVertical: 4.5,
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
    fontSize: 12,
    fontWeight: "700",
    color: "#7D5845",
  },
  cardTabTextActive: {
    color: C.white,
    fontWeight: "800",
  },

  // ─── Karaoke Word Stage ────────────────────────────────────────────────────
  wordStage: {
    minHeight: 120,
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  wordLine: {
    color: "#8A766B",
    fontFamily: "Georgia",
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 42,
    textAlign: "center",
    marginBottom: 4,
  },
  meaningLine: {
    fontSize: 21,
    lineHeight: 36,
  },
  word: {
    fontFamily: "Georgia",
    fontWeight: "600",
  },

  // ─── Transliteration Sub-Card ──────────────────────────────────────────────
  transliterationBox: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(254, 244, 234, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.85)",
  },
  transliterationText: {
    color: "#785848",
    fontSize: 12.5,
    fontStyle: "italic",
    lineHeight: 19,
    textAlign: "center",
  },

  // ─── Padartha Tray ─────────────────────────────────────────────────────────
  padarthaContainer: {
    paddingVertical: 4,
  },
  padarthaHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 4,
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
    gap: 8,
    justifyContent: "center",
  },
  padarthaChip: {
    backgroundColor: "rgba(255, 248, 242, 0.95)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    fontSize: 14,
    fontWeight: "700",
    color: "#351000",
  },
  padarthaChipSanskritActive: {
    color: C.saffron,
    fontWeight: "800",
  },
  padarthaChipMeaning: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
    fontWeight: "600",
  },
  padarthaChipMeaningActive: {
    color: "#6D3010",
    fontWeight: "700",
  },

  // ─── 3D Floating Audio Dock ────────────────────────────────────────────────
  audioDock: {
    backgroundColor: "rgba(255, 250, 245, 0.96)",
    borderRadius: 26,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(216, 144, 64, 0.35)",
    borderBottomWidth: 3,
    shadowColor: "#8C4010",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    position: "relative",
    overflow: "hidden",
  },
  dockTopBevel: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 1.5,
    backgroundColor: "#FFFFFF",
  },
  progressSection: {
    marginBottom: 16,
  },
  progressRail: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "#EAD5C5",
    overflow: "visible",
    position: "relative",
    justifyContent: "center",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: C.saffron,
  },
  progressBead: {
    position: "absolute",
    top: -4.5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFE082",
    borderWidth: 2,
    borderColor: C.saffron,
    shadowColor: C.saffron,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    transform: [{ translateX: -7 }],
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 7,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8C6A58",
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },

  // ─── Master 3D Play Button ─────────────────────────────────────────────────
  masterPlayWrapper: {
    width: 82,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  masterPlayAura: {
    position: "absolute",
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: C.saffron,
    shadowColor: C.saffron,
    shadowRadius: 18,
    shadowOpacity: 0.8,
    elevation: 6,
  },
  masterPlayBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.saffron,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.85)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "#A8470C",
    borderBottomWidth: 3.5,
    shadowColor: C.saffron,
    shadowOpacity: 0.38,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  masterPlayTopSpecular: {
    position: "absolute",
    top: 0,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  masterPlayGlossArc: {
    position: "absolute",
    top: 2,
    left: 6,
    right: 6,
    height: 22,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.28)",
  },
  masterPlayBottomLip: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(0, 0, 0, 0.12)",
  },

  // ─── Playback Caption ──────────────────────────────────────────────────────
  playbackCaption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 14,
  },
  playbackCaptionText: {
    color: "#8C604B",
    fontSize: 12,
    fontWeight: "700",
  },
  captionSpectrum: {
    marginLeft: 4,
  },

  // ─── Completed Screen Styles ───────────────────────────────────────────────
  completedScreen: {
    paddingTop: 4,
  },
  completedVerseCard: {
    backgroundColor: "rgba(255, 252, 248, 0.98)",
    borderRadius: 26,
    padding: 20,
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
    marginBottom: 16,
  },
  completedMascot: {
    marginBottom: -4,
  },
  completedSanskrit: {
    color: "#332016",
    fontSize: 21,
    lineHeight: 34,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 2,
  },
  completedTranslitBox: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  completedTranslation: {
    color: "#574236",
    fontSize: 13,
    lineHeight: 20,
    fontStyle: "italic",
    textAlign: "center",
  },
  goldDivider: {
    width: 60,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(244, 185, 66, 0.6)",
    marginVertical: 14,
  },
  completedMeaning: {
    color: C.ink,
    fontSize: 15.5,
    lineHeight: 24,
    textAlign: "center",
  },
  takeaway3D: {
    width: "100%",
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 18,
    backgroundColor: C.green,
    marginTop: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.7)",
    borderTopColor: "#A7F3D0",
    borderBottomColor: "#1B4D24",
    borderBottomWidth: 3,
    shadowColor: C.greenDark,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    position: "relative",
    overflow: "hidden",
  },
  takeawayGloss: {
    position: "absolute",
    top: 0,
    left: 8,
    right: 8,
    height: 14,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  takeawayText: {
    flex: 1,
    color: C.white,
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  completedPadarthaWrap: {
    marginBottom: 16,
  },

  // ─── 3D Reflection Journal Card ────────────────────────────────────────────
  reflectionCard3D: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: "rgba(255, 252, 248, 0.98)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(216, 144, 64, 0.35)",
    borderBottomWidth: 3,
    shadowColor: "#8C4010",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
    marginBottom: 16,
    position: "relative",
    overflow: "hidden",
  },
  reflectionTopBevel: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 1.5,
    backgroundColor: "#FFFFFF",
  },
  reflectionToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  reflectionCopy: {
    flex: 1,
  },
  reflectionKickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  reflectionKickerDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.saffron,
  },
  reflectionKicker: {
    color: C.goldDark,
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  reflectionPrompt: {
    color: C.ink,
    fontSize: 17,
    lineHeight: 25,
    marginTop: 6,
    fontWeight: "600",
  },
  reflectionChevronWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(254, 236, 220, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  reflectionInput: {
    minHeight: 115,
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: "#EAD8CA",
    borderTopColor: "#E0C8B8",
    borderBottomColor: "#FFFFFF",
    backgroundColor: "#FFF9F4",
    padding: 14,
    color: C.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  reflectionFooter: {
    marginTop: 12,
    gap: 12,
  },
  savedHint: {
    color: C.muted,
    fontSize: 11.5,
  },
  completeButton3D: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: C.saffron,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.7)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "#A8470C",
    borderBottomWidth: 3.5,
    shadowColor: C.saffron,
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    position: "relative",
    overflow: "hidden",
  },
  completeButtonDone3D: {
    backgroundColor: C.green,
    borderBottomColor: "#1B4D24",
    shadowColor: C.greenDark,
  },
  completeText: {
    color: C.white,
    fontSize: 15,
    fontWeight: "800",
  },
  relistenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  relistenText: {
    color: C.saffron,
    fontSize: 14,
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
    minHeight: "79%",
    overflow: "hidden",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
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
    paddingHorizontal: 28,
    paddingBottom: 38,
  },
  overlayMascot: {
    height: 215,
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
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
    fontSize: 28,
    lineHeight: 35,
    textAlign: "center",
    marginTop: 16,
  },
  overlayBody: {
    color: "#805E4D",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  overlayPrimary: {
    width: "100%",
    minHeight: 55,
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
    fontSize: 15,
    fontWeight: "800",
  },
  overlaySecondary: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 18,
    marginTop: 7,
  },
  overlaySecondaryText: {
    color: "#805E4D",
    fontSize: 14,
    fontWeight: "800",
  },
});
