import { TextR } from "@/components/ritual-ui";
import { C } from "@/constants/ritual-theme";
import { Bead, MalaCounter, materialNames } from "@/features/jaap/mala";
import {
  activeSession,
  selectedMantra,
  todayTarget,
} from "@/features/jaap/model";
import { useJaap } from "@/features/jaap/provider";
import { JaapButton, JaapPage, j } from "@/features/jaap/ui";
import { confirmAction } from "@/features/quiz/actions";
import { dayKey } from "@/features/progress/model";
import { useLanguage } from "@/i18n/provider";
import { useAlarmPresentation } from "@/navigation/alarm-presentation";
import { useMusicPlayer } from "@/state/music-player-store";
import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useKeepAwake } from "expo-keep-awake";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Check,
  ChevronDown,
  Flame,
  Flower2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
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

function Awake() {
  useKeepAwake("jaap-practice");
  return null;
}

export default function JaapCounterScreen() {
  const jaap = useJaap(),
    router = useRouter(),
    { t, formatNumber } = useLanguage();
  const { width, height } = useWindowDimensions(),
    alarm = useAlarmPresentation();
  const music = useMusicPlayer(false),
    bell = useAudioPlayer(require("../../../assets/jaap/mala-bell.wav"));
  const session = activeSession(jaap.state),
    p = jaap.state.preferences;
  const mantra = session?.mantra ?? selectedMantra(jaap.state),
    night = p.focus;
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const [message, setMessage] = useState(""),
    [goal, setGoal] = useState(false);
  const [summary, setSummary] = useState<{
    count: number;
    activeMs: number;
  } | null>(null);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const goalShown = useRef(new Set<string>()),
    pauseRef = useRef(jaap.pause);
  const navigatingToPracticeRef = useRef(false);
  const resumePulse = useSharedValue(0);

  useEffect(() => {
    pauseRef.current = jaap.pause;
  }, [jaap.pause]);
  const today = dayKey(new Date(), jaap.timezone),
    target = todayTarget(jaap.state, today);
  const todayCount = jaap.state.days[today]?.total ?? 0;

  useFocusEffect(
    useCallback(() => {
      navigatingToPracticeRef.current = false;
      return () => {
        if (!navigatingToPracticeRef.current) {
          void pauseRef.current();
        }
      };
    }, []),
  );

  useEffect(() => {
    if (jaap.ready && !p.setupComplete) router.replace("/jaap/mala");
  }, [jaap.ready, p.setupComplete, router]);
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
      if (malaComplete)
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => undefined);
      else
        void Haptics.impactAsync(
          p.haptics === "strong"
            ? Haptics.ImpactFeedbackStyle.Heavy
            : p.haptics === "medium"
              ? Haptics.ImpactFeedbackStyle.Medium
              : Haptics.ImpactFeedbackStyle.Light,
        ).catch(() => undefined);
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
        /* Sound never blocks the practice. */
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
  const ink = night ? "#FFF1DC" : C.ink,
    muted = night ? "#C5C8B8" : "#756657";
  const reachedTarget = target.count >= target.target;
  const strandSize = Math.min(
    380,
    Math.max(232, Math.min(width - 68, height * 0.46)),
  );

  return (
    <JaapPage
      title={t("My Jaap")}
      compact
      night={night}
      right={
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Choose your mala")}
            onPress={() => router.push("/jaap/mala")}
            style={({ pressed }) => [
              u.material,
              night && u.materialNight,
              { transform: [{ scale: pressed ? 0.96 : 1 }] },
            ]}
          >
            <Bead material={p.material} size={25} />
            <TextR style={[u.materialText, { color: ink }]}>
              {t(materialNames[p.material])}
            </TextR>
            <ChevronDown
              size={14}
              color={night ? "#D6BA83" : C.saffron}
              strokeWidth={2}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Settings")}
            onPress={() => router.push("/jaap/preferences")}
            style={({ pressed }) => [
              u.settingsButton,
              night && u.settingsButtonNight,
              { transform: [{ scale: pressed ? 0.94 : 1 }] },
            ]}
          >
            <Settings2
              size={18}
              color={night ? "#D6BA83" : C.saffron}
              strokeWidth={2}
            />
          </Pressable>
        </View>
      }
    >
      <StatusBar style={night ? "light" : "dark"} />
      {p.keepAwake && !disabled && foreground && <Awake />}

      {/* 3D Tactile Sanctuary Card */}
      <View style={[u.sanctuary, night && u.sanctuaryNight]}>
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
            size={250}
            color={night ? "#D9BE87" : "#C09D62"}
            opacity={0.08}
            style={u.backgroundMark}
          />
        )}
        {p.background === "diya" && (
          <Flame
            pointerEvents="none"
            size={250}
            color={night ? "#D9BE87" : "#C09D62"}
            opacity={0.08}
            style={u.backgroundMark}
          />
        )}

        {/* Top Mantra Section */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Choose your mantra")}
          onPress={() => router.push("/jaap/mantras")}
          style={u.mantra}
        >
          <TextR style={[u.eyebrow, { color: night ? "#D7BC87" : C.saffron }]}>
            {t("YOUR MANTRA")}
          </TextR>
          <TextR serif style={[u.mantraText, { color: ink }]}>
            {mantra.text}
          </TextR>
          {!!mantra.transliteration && (
            <TextR style={[u.transliteration, { color: muted }]}>
              {mantra.transliteration}
            </TextR>
          )}
        </Pressable>

        {/* Mala Bead Visual & Counter (Structure 100% Preserved) */}
        <MalaCounter
          material={p.material}
          total={session?.total ?? 0}
          disabled={disabled}
          paused={paused}
          onPausedAttempt={handlePausedAttempt}
          onCount={count}
          onThreshold={threshold}
          size={strandSize}
          night={night}
        />

        {/* Practice State Indicator */}
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
              navigatingToPracticeRef.current = true;
              void jaap.begin().then((value) => {
                if (value) {
                  threshold();
                  router.push("/jaap/practice?start=1");
                }
              });
            }
          }}
          style={u.practiceState}
        >
          <View style={[u.stateBadge, paused && u.stateBadgePaused]}>
            {paused ? (
              <Pause size={12} color={night ? "#D6BA83" : C.primary} />
            ) : (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "#3E9E54",
                }}
              />
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
              <View style={[u.resumeHintPill, night && u.resumeHintPillNight]}>
                <TextR
                  style={[u.resumeHintText, night && u.resumeHintTextNight]}
                >
                  {t("Tap to resume")}
                </TextR>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      {/* 3D Tactile Controls Row */}
      <View style={u.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Reset")}
          disabled={!session?.total || jaap.busy || !!jaap.error}
          accessibilityState={{
            disabled: !session?.total || jaap.busy || !!jaap.error,
          }}
          onPress={() => {
            confirmAction(
              t("Reset this mala?"),
              t("Your current count will return to zero. Earned points stay yours."),
              t("Reset"),
              () => {
                void jaap.reset().then((value) => {
                  if (value) setMessage(t("Count reset to zero."));
                });
              },
            );
          }}
          style={({ pressed }) => [
            u.undo,
            night && u.undoNight,
            {
              opacity: !session?.total || jaap.busy ? 0.4 : pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <RotateCcw color={ink} size={20} strokeWidth={2} />
          <TextR style={[u.undoText, { color: ink }]}>{t("Reset")}</TextR>
        </Pressable>

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
                navigatingToPracticeRef.current = true;
                void jaap.begin().then((value) => {
                  if (value) {
                    threshold();
                    router.push("/jaap/practice?start=1");
                  }
                });
              }
            }}
            style={({ pressed }) => [
              u.primary,
              night && u.primaryNight,
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
              style={[u.primaryText, { color: night ? "#15271F" : C.white }]}
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

      {!!message && (
        <Pressable
          onPress={() => {
            if (paused) {
              navigatingToPracticeRef.current = true;
              void jaap.begin().then((value) => {
                if (value) {
                  threshold();
                  router.push("/jaap/practice?start=1");
                }
              });
            }
          }}
          style={[u.feedbackBanner, night && u.feedbackBannerNight]}
        >
          <TextR
            accessibilityLiveRegion="polite"
            style={[u.feedback, { color: night ? "#FFE2B0" : "#8A4200" }]}
          >
            {message}
          </TextR>
        </Pressable>
      )}

      {/* 3D Tactile Daily Goal Card */}
      <View style={[u.daily, night && u.dailyNight]}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <TextR style={{ color: ink, fontSize: 14 }}>
            <TextR style={{ color: ink, fontWeight: "700", fontSize: 20 }}>
              {formatNumber(todayCount)}
            </TextR>{" "}
            {t("jaap today")}
          </TextR>
          <TextR style={{ color: muted, fontSize: 13, fontWeight: "500" }}>
            {t("{count} malas today", {
              count: formatNumber(Math.floor(todayCount / 108)),
            })}
          </TextR>
        </View>

        {/* 3D Progress Bar Track */}
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={t("Daily mala target")}
          accessibilityValue={{
            now: Math.min(target.count, target.target),
            min: 0,
            max: target.target,
          }}
          style={[u.progressTrack, night && u.progressTrackNight]}
        >
          <View
            style={[
              u.progressFill,
              night && u.progressFillNight,
              { width: `${Math.min(1, target.count / target.target) * 100}%` },
            ]}
          />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {reachedTarget && (
            <View style={u.checkBadge}>
              <Check size={12} color={C.white} strokeWidth={2.5} />
            </View>
          )}
          <TextR
            style={{
              color: reachedTarget ? (night ? "#B4CA9E" : C.greenDark) : muted,
              fontSize: 12.5,
              fontWeight: reachedTarget ? "600" : "400",
            }}
          >
            {t(
              reachedTarget
                ? "Your daily intention is complete"
                : "Daily intention: {count} jaap",
              { count: formatNumber(target.target) },
            )}
          </TextR>
        </View>
      </View>

      {/* Modal for Completion & Bonus */}
      <Modal
        visible={goal || !!summary}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setGoal(false);
          setSummary(null);
        }}
      >
        <View style={u.scrim}>
          <View
            style={[
              j.card,
              {
                maxWidth: 440,
                width: "100%",
                alignSelf: "center",
                alignItems: "center",
                paddingVertical: 26,
              },
            ]}
          >
            <Bead material={p.material} size={60} />
            <TextR
              serif
              style={{
                fontSize: 26,
                textAlign: "center",
                color: C.ink,
                marginTop: 8,
              }}
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
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: "#E7F7ED",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                }}
              >
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
                router.replace("/");
              }}
            />
          </View>
        </View>
      </Modal>
    </JaapPage>
  );
}

const u = StyleSheet.create({
  material: {
    minHeight: 44,
    paddingHorizontal: 12,
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
  materialNight: {
    backgroundColor: "#24362A",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderTopColor: "rgba(255, 255, 255, 0.25)",
    borderBottomColor: "#122018",
    borderBottomWidth: 2.5,
    shadowColor: "#000000",
  },
  materialText: {
    fontSize: 13,
    fontWeight: "700",
  },
  sanctuary: {
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
    paddingTop: 16,
    paddingBottom: 16,
    gap: 2,
  },
  sanctuaryNight: {
    backgroundColor: "#1E3429",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    borderBottomColor: "#101D16",
    shadowColor: "#000000",
  },
  backgroundMark: {
    position: "absolute",
    alignSelf: "center",
    top: 90,
  },
  mantra: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 6,
    gap: 4,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  mantraText: {
    fontSize: 26,
    lineHeight: 36,
    textAlign: "center",
    fontWeight: "700",
  },
  transliteration: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  fullScreenPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(254, 236, 220, 0.85)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(140, 64, 16, 0.18)",
    borderBottomWidth: 2,
    marginBottom: 4,
    shadowColor: "#8C4010",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fullScreenPillNight: {
    backgroundColor: "rgba(36, 56, 44, 0.9)",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderTopColor: "rgba(255, 255, 255, 0.25)",
    borderBottomColor: "#101C15",
  },
  fullScreenText: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  practiceState: {
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 4,
    paddingTop: 8,
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
  controls: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 4,
  },
  undo: {
    width: 64,
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
  undoNight: {
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
  primary: {
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
  primaryNight: {
    backgroundColor: "#E5C07B",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(100, 70, 20, 0.4)",
    shadowColor: "#E5C07B",
  },
  primaryText: {
    fontSize: 16.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  feedback: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
  },
  feedbackBanner: {
    marginTop: 6,
    marginHorizontal: 12,
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
  daily: {
    backgroundColor: "rgba(255, 248, 242, 0.94)",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(215, 185, 170, 0.65)",
    borderBottomWidth: 2.5,
    padding: 16,
    gap: 10,
    shadowColor: "#8C4010",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginTop: 2,
  },
  dailyNight: {
    backgroundColor: "#1E3429",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    borderBottomColor: "#101C15",
    shadowColor: "#000000",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#EDE2D2",
    overflow: "hidden",
  },
  progressTrackNight: {
    backgroundColor: "#2A4234",
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: C.saffron,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.5)",
  },
  progressFillNight: {
    backgroundColor: "#DFC08A",
  },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  finish: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  intention: {
    backgroundColor: "rgba(255, 248, 242, 0.94)",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(215, 185, 170, 0.6)",
    borderBottomWidth: 2.5,
    padding: 16,
    gap: 6,
    shadowColor: "#8C4010",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  intentionNight: {
    backgroundColor: "#1E3429",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    borderBottomColor: "#101C15",
    shadowColor: "#000000",
  },
  intentionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  intentionTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(229, 107, 39, 0.1)",
  },
  intentionTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.primary,
  },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(215, 150, 100, 0.25)",
    borderBottomWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8C4010",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  settingsButtonNight: {
    backgroundColor: "#24362A",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderTopColor: "rgba(255, 255, 255, 0.25)",
    borderBottomColor: "#122018",
    shadowColor: "#000000",
  },
  scrim: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(30, 20, 12, 0.6)",
    padding: 24,
  },
});
