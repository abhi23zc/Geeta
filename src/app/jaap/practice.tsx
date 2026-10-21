import { TextR } from "@/components/ritual-ui";
import { C } from "@/constants/ritual-theme";
import { Bead, MalaCounter, materialNames } from "@/features/jaap/mala";
import {
  activeSession,
  selectedMantra,
  todayTarget,
} from "@/features/jaap/model";
import { useJaap } from "@/features/jaap/provider";
import { JaapButton, j } from "@/features/jaap/ui";
import { dayKey } from "@/features/progress/model";
import { useLanguage } from "@/i18n/provider";
import { useAlarmPresentation } from "@/navigation/alarm-presentation";
import { useMusicPlayer } from "@/state/music-player-store";
import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useKeepAwake } from "expo-keep-awake";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Flame,
  Flower2,
  Pause,
  Play,
  Undo2,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

function Awake() {
  useKeepAwake("jaap-practice-fullscreen");
  return null;
}

export default function FullScreenJaapPractice() {
  const jaap = useJaap();
  const router = useRouter();
  const params = useLocalSearchParams<{ start?: string }>();
  const { t, formatNumber } = useLanguage();
  const { width, height } = useWindowDimensions();
  const alarm = useAlarmPresentation();
  const music = useMusicPlayer(false);
  const bell = useAudioPlayer(require("../../../assets/jaap/mala-bell.wav"));

  const session = activeSession(jaap.state);
  const p = jaap.state.preferences;
  const mantra = session?.mantra ?? selectedMantra(jaap.state);
  const night = p.focus;

  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const [message, setMessage] = useState("");
  const [goal, setGoal] = useState(false);
  const [summary, setSummary] = useState<{
    count: number;
    activeMs: number;
  } | null>(null);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const [sanctuaryHeight, setSanctuaryHeight] = useState<number>(0);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3500);
    return () => clearTimeout(timer);
  }, [message]);

  const goalShown = useRef(new Set<string>());
  const pauseRef = useRef(jaap.pause);
  const resumePulse = useSharedValue(0);

  useEffect(() => {
    pauseRef.current = jaap.pause;
  }, [jaap.pause]);

  useEffect(() => {
    if (params.start === "1") {
      void jaap.begin();
    }
  }, [params.start]);

  const today = dayKey(new Date(), jaap.timezone);
  const target = todayTarget(jaap.state, today);

  useFocusEffect(
    useCallback(
      () => () => {
        void pauseRef.current();
      },
      [],
    ),
  );

  useEffect(() => {
    if (alarm.active) void pauseRef.current();
  }, [alarm.active]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => sub.remove();
  }, []);

  const threshold = () => {
    if (p.haptics !== "off")
      void Haptics.selectionAsync().catch(() => undefined);
  };

  const handlePausedAttempt = useCallback(() => {
    if (p.haptics !== "off") {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      ).catch(() => undefined);
    }
    setMessage(t("Practice is paused. Tap 'Resume practice' to continue."));
    resumePulse.value = withSequence(
      withTiming(1, { duration: 160 }),
      withTiming(0, { duration: 180 }),
      withTiming(1, { duration: 160 }),
      withTiming(0, { duration: 220 }),
    );
  }, [p.haptics, resumePulse, t]);

  const animatedResumeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + resumePulse.value * 0.04 }],
  }));

  const count = async () => {
    const value = await jaap.count();
    if (!value) return false;
    const updated = activeSession(value);
    if (!updated) return false;
    const malaComplete = updated.total > 0 && updated.total % 108 === 0;

    if (p.haptics !== "off") {
      if (malaComplete) {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => undefined);
      } else {
        void Haptics.impactAsync(
          p.haptics === "strong"
            ? Haptics.ImpactFeedbackStyle.Heavy
            : p.haptics === "medium"
              ? Haptics.ImpactFeedbackStyle.Medium
              : Haptics.ImpactFeedbackStyle.Light,
        ).catch(() => undefined);
      }
    }

    setMessage(
      malaComplete ? t("Mala complete. Continue at your own pace.") : "",
    );

    if (
      malaComplete &&
      p.bell &&
      !music.isPlaying &&
      !music.isLoading &&
      !alarm.active
    ) {
      try {
        void bell
          .seekTo(0)
          .then(() => bell.play())
          .catch(() => undefined);
      } catch {
        // Sound failure should not block practice
      }
    }

    if (
      target.count < target.target &&
      todayTarget(value, today).count >= target.target &&
      !goalShown.current.has(today)
    ) {
      goalShown.current.add(today);
      setGoal(true);
    }
    return true;
  };

  const finish = () => {
    void jaap.finish().then((value) => {
      const finished = value?.sessions.find((item) => item.id === session?.id);
      if (finished)
        setSummary({ count: finished.total, activeMs: finished.activeMs });
    });
  };

  const paused = !session || session.paused;
  const disabled = paused || !!jaap.error || alarm.active || !foreground;
  const ink = night ? "#FFF1DC" : C.ink;
  const muted = night ? "#C5C8B8" : "#756657";
  const strandSize = Math.min(420, Math.max(270, width - 36));
  const fallbackStrandHeight = Math.max(300, Math.min(560, height - 370));
  const strandHeight =
    sanctuaryHeight > 0
      ? Math.max(280, sanctuaryHeight - 62)
      : fallbackStrandHeight;

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={[s.safe, { backgroundColor: night ? "#12221A" : C.canvas }]}
    >
      <StatusBar style={night ? "light" : "dark"} />
      {p.keepAwake && !disabled && foreground && <Awake />}

      {/* Top Floating Sanctuary Header */}
      <View style={s.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Back to Jaap")}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/jaap")
          }
          style={({ pressed }) => [
            s.circleBtn,
            night && s.circleBtnNight,
            { transform: [{ scale: pressed ? 0.94 : 1 }] },
          ]}
        >
          <ArrowLeft
            color={night ? "#FFF3DE" : C.ink}
            size={20}
            strokeWidth={2.2}
          />
        </Pressable>

        {/* 3D Tactile Material Pill */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Choose your mala")}
          onPress={() => router.push("/jaap/mala")}
          style={({ pressed }) => [
            s.materialPill,
            night && s.materialPillNight,
            { transform: [{ scale: pressed ? 0.96 : 1 }] },
          ]}
        >
          <Bead material={p.material} size={24} />
          <TextR style={[s.materialPillText, { color: ink }]}>
            {t(materialNames[p.material])}
          </TextR>
          <ChevronDown
            size={14}
            color={night ? "#D6BA83" : C.saffron}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      {/* Main Full-Screen Sanctuary Body */}
      <View style={s.bodyContainer}>
        {/* Sacred Mantra Card (Top Focus) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Choose your mantra")}
          onPress={() => router.push("/jaap/mantras")}
          style={({ pressed }) => [
            s.mantraCard,
            night && s.mantraCardNight,
            { transform: [{ scale: pressed ? 0.985 : 1 }] },
          ]}
        >
          <TextR
            style={[s.mantraEyebrow, { color: night ? "#D7BC87" : C.saffron }]}
          >
            {t("YOUR MANTRA")}
          </TextR>
          <TextR serif style={[s.mantraText, { color: ink }]}>
            {mantra.text}
          </TextR>
          {!!mantra.transliteration && (
            <TextR style={[s.mantraSub, { color: muted }]}>
              {mantra.transliteration}
            </TextR>
          )}
        </Pressable>

        {/* Full-Height Center Mala Sanctuary */}
        <View
          onLayout={(e) => {
            const h = Math.round(e.nativeEvent.layout.height);
            if (h > 120 && Math.abs(h - sanctuaryHeight) > 2) {
              setSanctuaryHeight(h);
            }
          }}
          style={[s.malaSanctuary, night && s.malaSanctuaryNight]}
        >
          {p.background === "photo" &&
            p.photoUri &&
            failedPhoto !== p.photoUri && (
              <Image
                source={{ uri: p.photoUri }}
                contentFit="cover"
                style={StyleSheet.absoluteFill}
                onError={() => setFailedPhoto(p.photoUri ?? null)}
              />
            )}
          {p.background === "photo" && (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: night
                    ? "rgba(20,39,28,.90)"
                    : "rgba(255,245,229,.94)",
                },
              ]}
            />
          )}
          {p.background === "lotus" && (
            <Flower2
              pointerEvents="none"
              size={260}
              color={night ? "#D9BE87" : "#C09D62"}
              opacity={0.07}
              style={s.bgSymbol}
            />
          )}
          {p.background === "diya" && (
            <Flame
              pointerEvents="none"
              size={260}
              color={night ? "#D9BE87" : "#C09D62"}
              opacity={0.07}
              style={s.bgSymbol}
            />
          )}

          {/* The Exact Mala Counter Component */}
          <MalaCounter
            material={p.material}
            total={session?.total ?? 0}
            disabled={disabled}
            paused={paused}
            onPausedAttempt={handlePausedAttempt}
            onCount={count}
            onThreshold={threshold}
            size={strandSize}
            height={strandHeight}
            night={night}
          />

          {/* Practice Status & Rhythm Indicator */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(
              paused
                ? session
                  ? "Practice paused"
                  : "Your quiet moment"
                : "In your own rhythm",
            )}
            disabled={!paused}
            onPress={() => {
              if (paused) {
                void jaap.begin().then((value) => {
                  if (value) threshold();
                });
              }
            }}
            style={s.practiceState}
          >
            <View style={[s.stateBadge, paused && s.stateBadgePaused]}>
              {paused ? (
                <Pause size={12} color={night ? "#D6BA83" : C.primary} />
              ) : (
                <View style={s.pulsingGreenDot} />
              )}
              <TextR
                style={{
                  color: paused ? (night ? "#FADCA0" : C.saffron) : muted,
                  fontSize: 13,
                  fontWeight: paused ? "700" : "600",
                }}
              >
                {t(
                  paused
                    ? session
                      ? "Practice paused"
                      : "Your quiet moment"
                    : "In your own rhythm",
                )}
              </TextR>
              {paused && (
                <View
                  style={[s.resumeHintPill, night && s.resumeHintPillNight]}
                >
                  <TextR
                    style={[s.resumeHintText, night && s.resumeHintTextNight]}
                  >
                    {t("Tap to resume")}
                  </TextR>
                </View>
              )}
            </View>
          </Pressable>
        </View>
      </View>

      {/* Bottom Floating 3D Tactile Controls */}
      <View style={s.bottomControls}>
        {/* 3D Tactile Undo Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Undo")}
          disabled={!session?.total || jaap.busy || !!jaap.error}
          accessibilityState={{
            disabled: !session?.total || jaap.busy || !!jaap.error,
          }}
          onPress={() => {
            void jaap.undo().then((value) => {
              if (value) setMessage(t("Last count undone."));
            });
          }}
          style={({ pressed }) => [
            s.undoBtn,
            night && s.undoBtnNight,
            {
              opacity: !session?.total || jaap.busy ? 0.4 : pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <Undo2 color={ink} size={20} strokeWidth={2} />
          <TextR style={[s.undoText, { color: ink }]}>{t("Undo")}</TextR>
        </Pressable>

        {/* 3D Tactile Primary Resume / Pause Button with Awareness Pulse */}
        <Animated.View style={[{ flex: 1 }, animatedResumeStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(
              !session
                ? "Begin practice"
                : paused
                  ? "Resume practice"
                  : "Pause",
            )}
            disabled={jaap.busy || !!jaap.error || alarm.active}
            accessibilityState={{
              disabled: jaap.busy || !!jaap.error || alarm.active,
            }}
            onPress={() => {
              if (!paused) {
                void jaap.pause();
              } else {
                void jaap.begin().then((value) => {
                  if (value) threshold();
                });
              }
            }}
            style={({ pressed }) => [
              s.primaryBtn,
              night && s.primaryBtnNight,
              {
                opacity: jaap.busy ? 0.65 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            {paused ? (
              <Play
                size={20}
                color={night ? "#15271F" : C.white}
                fill={night ? "#15271F" : C.white}
              />
            ) : (
              <Pause
                size={20}
                color={night ? "#15271F" : C.white}
                fill={night ? "#15271F" : C.white}
              />
            )}
            <TextR
              style={[s.primaryBtnText, { color: night ? "#15271F" : C.white }]}
            >
              {t(
                !session
                  ? "Begin practice"
                  : paused
                    ? "Resume practice"
                    : "Pause",
              )}
            </TextR>
          </Pressable>
        </Animated.View>
      </View>

      {/* Finish Session Link */}
      <Pressable
        accessibilityRole="button"
        onPress={finish}
        disabled={!session || jaap.busy}
        style={({ pressed }) => [
          s.finishBtn,
          { opacity: !session ? 0 : pressed ? 0.6 : 1 },
        ]}
        pointerEvents={session ? "auto" : "none"}
      >
        <TextR style={[s.finishBtnText, { color: muted }]}>
          {t("Finish for now")}
        </TextR>
      </Pressable>

      {/* Goal & Session Summary Modal */}
      <Modal
        visible={goal || !!summary}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setGoal(false);
          setSummary(null);
        }}
      >
        <View style={s.scrim}>
          <View style={[j.card, s.modalCard]}>
            <Bead material={p.material} size={64} />
            <TextR
              serif
              style={{ fontSize: 26, textAlign: "center", color: C.ink }}
            >
              {t(
                summary
                  ? "A moment well spent"
                  : "Your daily intention is complete",
              )}
            </TextR>
            <TextR style={[j.small, { textAlign: "center" }]}>
              {summary
                ? t("{count} jaap · {minutes} active minutes", {
                    count: formatNumber(summary.count),
                    minutes: formatNumber(Math.floor(summary.activeMs / 60000)),
                  })
                : t("Continue whenever you feel ready.")}
            </TextR>
            {jaap.state.days[today]?.bonus && (
              <View style={s.bonusBadge}>
                <Check size={14} color={C.greenDark} />
                <TextR
                  style={{
                    fontSize: 13,
                    color: C.greenDark,
                    fontWeight: "700",
                  }}
                >
                  {t("Today’s jaap bonus earned")}
                </TextR>
              </View>
            )}
            <JaapButton
              label={t(summary ? "Another session" : "Continue chanting")}
              onPress={() => {
                if (summary) void jaap.begin();
                setSummary(null);
                setGoal(false);
              }}
            />
            <JaapButton
              secondary
              label={t("Done")}
              onPress={() => {
                setSummary(null);
                setGoal(false);
                void jaap.pause();
                router.replace("/jaap");
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(215, 150, 100, 0.25)",
    borderBottomWidth: 2.2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8C4010",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  circleBtnNight: {
    backgroundColor: "#20362B",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderTopColor: "rgba(255, 255, 255, 0.25)",
    borderBottomColor: "#101C15",
    borderBottomWidth: 2,
    shadowColor: "#000000",
  },
  materialPill: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 248, 242, 0.95)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(215, 185, 170, 0.7)",
    borderBottomWidth: 2.5,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#8C4010",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  materialPillNight: {
    backgroundColor: "#22382D",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderTopColor: "rgba(255, 255, 255, 0.25)",
    borderBottomColor: "#122018",
    borderBottomWidth: 2.5,
    shadowColor: "#000000",
  },
  materialPillText: {
    fontSize: 13,
    fontWeight: "700",
  },
  bodyContainer: {
    flex: 1,
    paddingHorizontal: 18,
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  mantraCard: {
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: "rgba(255, 248, 242, 0.85)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(215, 185, 170, 0.5)",
    borderBottomWidth: 2,
    shadowColor: "#8C4010",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 2,
  },
  mantraCardNight: {
    backgroundColor: "rgba(32, 54, 43, 0.85)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    borderBottomColor: "#122018",
    shadowColor: "#000000",
  },
  mantraEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  mantraText: {
    fontSize: 23,
    lineHeight: 31,
    textAlign: "center",
    fontWeight: "700",
  },
  mantraSub: {
    fontSize: 12.5,
    lineHeight: 17,
    textAlign: "center",
  },
  malaSanctuary: {
    flex: 1,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "rgba(255, 248, 242, 0.94)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(215, 185, 170, 0.7)",
    borderBottomWidth: 3,
    shadowColor: C.shadow3D,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    paddingTop: 0,
    paddingBottom: 10,
    justifyContent: "space-between",
    marginVertical: 6,
  },
  malaSanctuaryNight: {
    backgroundColor: "#1E3429",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    borderBottomColor: "#101D16",
    shadowColor: "#000000",
  },
  bgSymbol: {
    position: "absolute",
    alignSelf: "center",
    top: "20%",
  },
  practiceState: {
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 3,
    paddingTop: 4,
    paddingBottom: 4,
  },
  stateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  stateBadgePaused: {
    backgroundColor: "rgba(235, 106, 56, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  resumeHintPill: {
    backgroundColor: "rgba(235, 106, 56, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  resumeHintPillNight: {
    backgroundColor: "rgba(229, 192, 123, 0.2)",
  },
  resumeHintText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.saffron,
  },
  resumeHintTextNight: {
    color: "#FFE2B0",
  },
  pulsingGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3E9E54",
  },
  feedback: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
  },
  feedbackBanner: {
    marginTop: 8,
    marginHorizontal: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "rgba(235, 106, 56, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(235, 106, 56, 0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackBannerNight: {
    backgroundColor: "rgba(229, 192, 123, 0.12)",
    borderColor: "rgba(229, 192, 123, 0.32)",
  },
  bottomControls: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 8,
    alignItems: "center",
  },
  undoBtn: {
    width: 74,
    minHeight: 56,
    borderRadius: 22,
    backgroundColor: "rgba(255, 248, 242, 0.95)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(215, 185, 170, 0.7)",
    borderBottomWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    shadowColor: "#8C4010",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  undoBtnNight: {
    backgroundColor: "#20362B",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderTopColor: "rgba(255, 255, 255, 0.25)",
    borderBottomColor: "#101C15",
    borderBottomWidth: 2,
    shadowColor: "#000000",
  },
  undoText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  primaryBtn: {
    flex: 1,
    minHeight: 56,
    borderRadius: 24,
    backgroundColor: C.saffron,
    borderTopWidth: 1.5,
    borderTopColor: "rgba(255, 255, 255, 0.55)",
    borderBottomWidth: 3,
    borderBottomColor: "rgba(140, 64, 16, 0.35)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: C.saffron,
    shadowOpacity: 0.36,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryBtnNight: {
    backgroundColor: "#E5C07B",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(100, 70, 20, 0.4)",
    shadowColor: "#E5C07B",
  },
  primaryBtnText: {
    fontSize: 16.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  finishBtn: {
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  finishBtnText: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  scrim: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(30, 20, 12, 0.6)",
    padding: 24,
  },
  modalCard: {
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
    paddingVertical: 28,
  },
  bonusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E7F7ED",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
});
