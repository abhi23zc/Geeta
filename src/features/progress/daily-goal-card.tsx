import { TextR } from "@/components/ritual-ui";
import { C } from "@/constants/ritual-theme";
import { useLanguage } from "@/i18n/provider";
import { useRouter } from "expo-router";
import {
  Award,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Flame,
  Flower2,
  RefreshCw,
  Sun,
  X,
} from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { activityPoints, pointsEntryLabel } from "./model";
import { useProgress } from "./provider";

interface DailyGoalCardProps {
  link?: boolean;
  onStartRitual?: () => void;
  onStartQuiz?: () => void;
}

export function DailyGoalCard({
  link = true,
  onStartRitual,
  onStartQuiz,
}: DailyGoalCardProps) {
  const { t, formatNumber } = useLanguage();
  const router = useRouter();

  const {
    progress: p,
    today,
    error,
    alarmAvailable,
    clockWarning,
    refresh,
    notice,
    dismissNotice,
  } = useProgress();

  const d = p?.days[today];
  const ritualDone = Boolean(d?.ritual);
  const quizDone = Boolean(d?.quiz);
  const isCompletedToday = Boolean(d?.rewarded);

  const completedCount = (ritualDone ? 1 : 0) + (quizDone ? 1 : 0);
  const quizEarned = p ? activityPoints(p, today, 'quiz') : 0;
  const ritualEarned = p ? activityPoints(p, today, 'ritual') : 0;
  const earnedToday = quizEarned + ritualEarned;

  if (!p) {
    return (
      <View style={s.cardContainer}>
        <View style={s.headerRow}>
          <View style={s.headerTitleGroup}>
            <View style={s.goalIconCircle}>
              <Flame size={18} color={C.saffron} fill={C.saffron} />
            </View>
            <TextR accessibilityRole="header" style={s.cardTitle}>
              {t("Daily goal")}
            </TextR>
          </View>
        </View>
        <TextR
          accessibilityRole={error ? "alert" : undefined}
          style={s.loadingText}
        >
          {t(
            error
              ? "Progress could not be saved. Your data has not been reset."
              : "Loading",
          )}
        </TextR>
        {error && (
          <Pressable
            accessibilityRole="button"
            style={s.retryButton}
            onPress={() => {
              void refresh();
            }}
          >
            <RefreshCw size={14} color={C.saffron} />
            <TextR style={s.retryText}>{t("Retry")}</TextR>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={s.cardContainer}>
      {/* ── 3D Textured Background Surface ───────────────────────────────── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="goalCardGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFDF9" stopOpacity="0.99" />
              <Stop offset="45%" stopColor="#FFF7EC" stopOpacity="0.97" />
              <Stop offset="100%" stopColor="#FFF0E0" stopOpacity="0.95" />
            </LinearGradient>
            <LinearGradient id="topGlowRim" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#F4B942" stopOpacity="0.85" />
              <Stop offset="50%" stopColor="#FFF8E1" stopOpacity="1" />
              <Stop offset="100%" stopColor="#E56B27" stopOpacity="0.85" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" rx={24} fill="url(#goalCardGrad)" />
        </Svg>
      </View>

      {/* Top 3D Golden Specular Rim */}
      <View style={s.topSpecularLine} pointerEvents="none" />

      {/* ── 1. Header: Goal Title & 3D Sacred Points Coin ──────────────────── */}
      <View style={s.headerRow}>
        <View style={s.headerTitleGroup}>
          <View style={s.goalIconCircle}>
            <Flame
              size={18}
              color={C.saffron}
              fill={p.current > 0 ? C.saffron : "none"}
            />
          </View>
          <View style={s.headerTextWrap}>
            <View style={s.headerKickerRow}>
              <TextR style={s.cardKicker}>
                {t("Daily goal").toUpperCase()}
              </TextR>
              {p.current > 0 && (
                <View style={s.streakPillSmall}>
                  <TextR style={s.streakPillSmallText}>🔥 {p.current}d</TextR>
                </View>
              )}
            </View>
            <TextR style={s.streakSubtitle}>
              {p.current > 0
                ? t("streakDays", { count: p.current })
                : t("Begin your streak")}
            </TextR>
          </View>
        </View>

        {/* 3D Sacred Lotus Points Coin Badge (only shown on Home screen where link=true; on Progress screen the hero card already shows balance) */}
        {link ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t("Points")}: ${formatNumber(p.balance)}`}
            accessibilityHint={t("Progress")}
            onPress={() => router.push("/progress")}
            style={({ pressed }) => [
              s.pointsPill3D,
              pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
            ]}
          >
            {/* Mini 3D Coin Graphic */}
            <View style={s.coinMedallion}>
              <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <Defs>
                  <LinearGradient id="coinGradMini" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#FFF8E1" />
                    <Stop offset="40%" stopColor="#F4B942" />
                    <Stop offset="100%" stopColor="#8C5E0D" />
                  </LinearGradient>
                  <RadialGradient id="coinCenterMini" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor="#FFFDE7" />
                    <Stop offset="100%" stopColor="#FF9100" />
                  </RadialGradient>
                </Defs>
                <Rect
                  x="2"
                  y="2"
                  width="20"
                  height="20"
                  rx="10"
                  fill="url(#coinGradMini)"
                />
                <Rect
                  x="5"
                  y="5"
                  width="14"
                  height="14"
                  rx="7"
                  fill="url(#coinCenterMini)"
                />
                <Rect
                  x="4"
                  y="4"
                  width="16"
                  height="16"
                  rx="8"
                  stroke="#FFE082"
                  strokeWidth="0.8"
                  opacity="0.8"
                />
              </Svg>
              <TextR style={s.coinCenterLotus}>🪷</TextR>
            </View>

            <View style={s.pointsContent}>
              <TextR style={s.pointsBalanceNumber}>
                {formatNumber(p.balance)}
              </TextR>
              <TextR style={s.pointsUnitText}>{t("Points")}</TextR>
            </View>
            <ChevronRight
              size={14}
              color="#8C5E0D"
              style={{ marginLeft: -2 }}
            />
          </Pressable>
        ) : (
          <View style={s.rewardBadgePill}>
            <Flower2 size={13} color={C.saffron} />
            <TextR style={s.rewardBadgeText}>
              {t("{count} points earned today", {
                count: formatNumber(earnedToday),
              })}
            </TextR>
          </View>
        )}
      </View>

      {/* ── 2. Stepped Progress Meter ──────────────────────────────────────── */}
      <View style={s.stepperSection}>
        <View style={s.stepperHeader}>
          <View style={s.stepperLabelGroup}>
            <View
              style={[
                s.stepperDot,
                completedCount === 2 && s.stepperDotComplete,
              ]}
            />
            <TextR style={s.stepperStatusText}>
              {completedCount === 2
                ? t("Both activities complete—daily streak advanced.")
                : `${completedCount} / 2 ${t("Complete")}`}
            </TextR>
          </View>
          {link &&
            (completedCount < 2 ? (
              <View style={s.rewardBadgePill}>
                <Flower2 size={12} color={C.saffron} />
                <TextR style={s.rewardBadgeText}>
                  {t("{count} points earned today", {
                    count: formatNumber(earnedToday),
                  })}
                </TextR>
              </View>
            ) : (
              <View style={s.rewardCompletePill}>
                <Check size={11} color={C.greenDark} strokeWidth={2.8} />
                <TextR style={s.rewardCompleteText}>
                  {t("{count} points earned today", {
                    count: formatNumber(earnedToday),
                  })}
                </TextR>
              </View>
            ))}
        </View>

        {/* 2-Segmented Stepper Track */}
        <View style={s.stepperTrack}>
          <View
            style={[
              s.stepperSegment,
              ritualDone && s.stepperSegmentActive,
              { marginRight: 6 },
            ]}
          >
            {ritualDone && <View style={s.segmentShine} />}
          </View>
          <View style={[s.stepperSegment, quizDone && s.stepperSegmentActive]}>
            {quizDone && <View style={s.segmentShine} />}
          </View>
        </View>
      </View>

      {/* ── 3. 3D Tactile Task 1: Awakening Ritual ─────────────────────────── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t("Alarm-led ritual")}: ${ritualDone ? t("Complete") : t("Start ritual")}. ${ritualEarned ? t("10 points earned today") : t("Ritual: +10 points once daily")}`}
        onPress={() => {
          if (onStartRitual) onStartRitual();
          else router.push("/today");
        }}
        style={({ pressed }) => [
          s.taskTile3D,
          ritualDone ? s.taskTileCompleted : s.taskTilePending,
          pressed && s.taskTilePressed,
        ]}
      >
        <View style={s.taskLeft}>
          <View
            style={[
              s.taskIconCircle3D,
              ritualDone ? s.taskIconCircleComplete : s.taskIconCirclePending,
            ]}
          >
            {ritualDone ? (
              <Check size={18} color={C.greenDark} strokeWidth={2.8} />
            ) : (
              <Sun size={18} color={C.saffron} />
            )}
          </View>
          <View style={s.taskTextGroup}>
            <TextR style={s.taskTitle}>{t("Alarm-led ritual")}</TextR>
            <TextR style={s.taskSub}>
              {ritualEarned
                ? t("10 points earned today")
                : t("Ritual: +10 points once daily")}
            </TextR>
          </View>
        </View>

        <View style={s.taskRight}>
          {ritualDone ? (
            <View style={s.statusPillDone3D}>
              <Check size={13} color={C.greenDark} strokeWidth={2.8} />
              <TextR style={s.statusPillDoneText}>{t("Complete")}</TextR>
            </View>
          ) : (
            <View style={s.actionPillPrimary3D}>
              <Sun size={12} color={C.white} />
              <TextR style={s.actionPillPrimaryText}>
                {t("Start ritual")} →
              </TextR>
            </View>
          )}
        </View>
      </Pressable>

      {/* ── 4. 3D Tactile Task 2: Daily Gita Quiz ──────────────────────────── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t("Quiz round")}: ${quizDone ? t("Complete") : t("Play quiz")}. ${quizEarned ? t("10 points earned today") : t("Quiz: +10 points once daily")}`}
        onPress={() => {
          if (onStartQuiz) onStartQuiz();
          else router.push("/quiz");
        }}
        style={({ pressed }) => [
          s.taskTile3D,
          quizDone ? s.taskTileCompleted : s.taskTilePending,
          pressed && s.taskTilePressed,
        ]}
      >
        <View style={s.taskLeft}>
          <View
            style={[
              s.taskIconCircle3D,
              quizDone ? s.taskIconCircleComplete : s.taskIconCirclePending,
            ]}
          >
            {quizDone ? (
              <Check size={18} color={C.greenDark} strokeWidth={2.8} />
            ) : (
              <BookOpen size={18} color={C.saffron} />
            )}
          </View>
          <View style={s.taskTextGroup}>
            <TextR style={s.taskTitle}>{t("Quiz round")}</TextR>
            <TextR style={s.taskSub}>
              {quizEarned
                ? t("10 points earned today")
                : t("Quiz: +10 points once daily")}
            </TextR>
          </View>
        </View>

        <View style={s.taskRight}>
          {quizDone ? (
            <View style={s.statusPillDone3D}>
              <Check size={13} color={C.greenDark} strokeWidth={2.8} />
              <TextR style={s.statusPillDoneText}>{t("Complete")}</TextR>
            </View>
          ) : (
            <View style={s.actionPillPrimary3D}>
              <BookOpen size={13} color={C.white} />
              <TextR style={s.actionPillPrimaryText}>{t("Play quiz")} →</TextR>
            </View>
          )}
        </View>
      </Pressable>

      {/* ── 5. Unlocked / Completed Celebration Plaque ─────────────────────── */}
      {isCompletedToday && (
        <View style={s.celebrationPlaque}>
          <View style={s.celebrationLotusWrap}>
            <Flower2 size={16} color="#7A4D00" />
          </View>
          <TextR style={s.celebrationText}>
            {t("Both activities complete—daily streak advanced.")}
          </TextR>
        </View>
      )}

      {/* ── 6. First-Time Enrolment Guidance ──────────────────────────────── */}
      {!p.activated && !isCompletedToday && (
        <View style={s.guidanceCard}>
          <TextR style={s.guidanceText}>
            {t(
              "Each activity earns 10 points once daily. Complete both to start your streak. After that, only days with neither activity deduct up to 10 points. Partial days keep points but break the streak.",
            )}
          </TextR>
        </View>
      )}

      {/* ── 7. System Warnings & Notices ──────────────────────────────────── */}
      {!alarmAvailable && (
        <View style={s.systemNoticePill}>
          <TextR style={s.warningText}>
            {t(
              "Quiz points are available. Ritual points and the combined streak require native alarm support.",
            )}
          </TextR>
        </View>
      )}

      {clockWarning && (
        <View style={s.alertBanner3D}>
          <Clock size={15} color="#93000A" />
          <TextR accessibilityRole="alert" style={s.alertText}>
            {t(
              "Your clock is behind your saved progress. Correct it to continue tracking.",
            )}
          </TextR>
        </View>
      )}

      {error && (
        <View style={s.alertBanner3D}>
          <TextR accessibilityRole="alert" style={s.alertText}>
            {t("Progress could not be saved. Your data has not been reset.")}
          </TextR>
          <Pressable
            accessibilityRole="button"
            style={s.retryButton}
            onPress={() => {
              void refresh();
            }}
          >
            <TextR style={s.retryText}>{t("Retry")}</TextR>
          </Pressable>
        </View>
      )}

      {/* ── 8. Devotional Ledger Notices ──────────────────────────────────── */}
      {notice.length > 0 && (
        <View accessibilityLiveRegion="polite" style={s.noticeContainer3D}>
          {notice.map((e) => (
            <View key={e.id} style={s.noticeRow}>
              <Award size={16} color={C.saffron} />
              <TextR style={s.noticeText}>
                {t(pointsEntryLabel(e))}: {e.amount > 0 ? "+" : ""}
                {formatNumber(e.amount)} ·{" "}
                {e.kind === "milestone"
                  ? t("daysCount", { count: e.milestone! })
                  : t("daysCount", { count: e.days })}
              </TextR>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            style={s.dismissNoticeBtn}
            onPress={dismissNotice}
          >
            <X size={14} color={C.ink} />
            <TextR style={s.dismissNoticeText}>{t("Close")}</TextR>
          </Pressable>
        </View>
      )}

      {/* ── 9. Link to Full Progress Screen ───────────────────────────────── */}
      {link && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Progress")}
          onPress={() => router.push("/progress")}
          style={({ pressed }) => [
            s.linkButton3D,
            pressed && { opacity: 0.82 },
          ]}
        >
          <TextR style={s.linkButtonText}>{t("View full progress")}</TextR>
          <View style={s.linkChevronCircle}>
            <ChevronRight size={14} color={C.saffron} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FFFDF9",
    borderRadius: 26,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(140, 64, 16, 0.22)",
    borderBottomWidth: 3.5,
    marginBottom: 16,
    shadowColor: "#8C4010",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
    gap: 14,
    position: "relative",
    overflow: "hidden",
  },
  topSpecularLine: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: "rgba(244, 185, 66, 0.65)",
    borderRadius: 1,
  },
  headerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexGrow: 1,
    flexBasis: 180,
  },
  goalIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF2E0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "rgba(229, 107, 39, 0.35)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(140, 64, 16, 0.25)",
    shadowColor: C.saffron,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerKickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardKicker: {
    fontSize: 12,
    letterSpacing: 1.1,
    fontWeight: "800",
    color: C.saffron,
  },
  streakPillSmall: {
    backgroundColor: "rgba(229, 107, 39, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
  streakPillSmallText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: C.saffron,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.ink,
    letterSpacing: -0.2,
  },
  streakSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.ink,
    marginTop: 1,
  },
  pointsPill3D: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 248, 230, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(244, 185, 66, 0.7)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(140, 94, 13, 0.35)",
    shadowColor: "#8C5E0D",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  coinMedallion: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  coinCenterLotus: {
    position: "absolute",
    fontSize: 10,
  },
  pointsContent: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  pointsBalanceNumber: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#633D00",
  },
  pointsUnitText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8C5E0D",
  },
  stepperSection: {
    gap: 6,
  },
  stepperHeader: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 6,
  },
  stepperLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  stepperDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.saffron,
  },
  stepperDotComplete: {
    backgroundColor: C.greenDark,
  },
  stepperStatusText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
    color: C.ink,
  },
  rewardBadgePill: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(229, 107, 39, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(229, 107, 39, 0.25)",
  },
  rewardBadgeText: {
    flexShrink: 1,
    fontSize: 11.5,
    fontWeight: "800",
    color: C.saffron,
  },
  rewardCompletePill: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(94, 158, 104, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(94, 158, 104, 0.35)",
  },
  rewardCompleteText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: C.greenDark,
  },
  stepperTrack: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  stepperSegment: {
    flex: 1,
    backgroundColor: "rgba(222, 192, 180, 0.35)",
    borderRadius: 4,
    overflow: "hidden",
  },
  stepperSegmentActive: {
    backgroundColor: C.saffron,
  },
  segmentShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  taskTile3D: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    shadowColor: "#8C4010",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  taskTileCompleted: {
    backgroundColor: "rgba(238, 250, 242, 0.85)",
    borderBottomColor: "rgba(42, 92, 51, 0.22)",
    borderBottomWidth: 2.5,
  },
  taskTilePending: {
    backgroundColor: "rgba(255, 245, 235, 0.75)",
    borderBottomColor: "rgba(140, 64, 16, 0.16)",
    borderBottomWidth: 2.5,
  },
  taskTilePressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  taskLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  taskIconCircle3D: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderTopColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  taskIconCircleComplete: {
    backgroundColor: "#D1F2DD",
    borderColor: "rgba(94, 158, 104, 0.4)",
    borderBottomColor: "rgba(42, 92, 51, 0.3)",
    borderBottomWidth: 2,
  },
  taskIconCirclePending: {
    backgroundColor: "#FFF0DE",
    borderColor: "rgba(229, 107, 39, 0.3)",
    borderBottomColor: "rgba(140, 64, 16, 0.2)",
    borderBottomWidth: 2,
  },
  taskTextGroup: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#241407",
  },
  taskSub: {
    fontSize: 13,
    color: "#7A583E",
    marginTop: 2,
    fontWeight: "500",
  },
  taskRight: {
    marginLeft: 8,
  },
  statusPillDone3D: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D8F4E2",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(94, 158, 104, 0.5)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(42, 92, 51, 0.3)",
    borderBottomWidth: 2,
  },
  statusPillDoneText: {
    fontSize: 13,
    fontWeight: "800",
    color: C.greenDark,
  },
  actionPillPending3D: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(254, 194, 74, 0.22)",
    borderWidth: 1.2,
    borderColor: "rgba(244, 185, 66, 0.6)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(140, 94, 13, 0.3)",
    borderBottomWidth: 2,
  },
  actionPillPendingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8C5E0D",
  },
  actionPillPrimary3D: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: C.saffron,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    borderTopColor: "#FFE082",
    borderBottomColor: "#A8470C",
    borderBottomWidth: 2.2,
    shadowColor: C.saffron,
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  actionPillPrimaryText: {
    fontSize: 12,
    fontWeight: "800",
    color: C.white,
  },
  celebrationPlaque: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 248, 220, 0.95)",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "#F4B942",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(140, 94, 13, 0.35)",
    borderBottomWidth: 2,
  },
  celebrationLotusWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFE8A3",
    alignItems: "center",
    justifyContent: "center",
  },
  celebrationText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6E4300",
    flex: 1,
  },
  guidanceCard: {
    backgroundColor: "rgba(254, 236, 220, 0.45)",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(222, 192, 180, 0.3)",
  },
  guidanceText: {
    fontSize: 12,
    lineHeight: 18,
    color: C.muted,
    fontStyle: "italic",
  },
  systemNoticePill: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "rgba(254, 236, 220, 0.4)",
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
    color: C.muted,
  },
  alertBanner3D: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFDAD6",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(186, 26, 26, 0.2)",
  },
  alertText: {
    fontSize: 12.5,
    color: "#93000A",
    flex: 1,
    fontWeight: "600",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.white,
  },
  retryText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.saffron,
  },
  noticeContainer3D: {
    backgroundColor: "#FFF8F2",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "rgba(229, 107, 39, 0.25)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(140, 64, 16, 0.15)",
    borderBottomWidth: 2,
    gap: 8,
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.ink,
    flex: 1,
  },
  dismissNoticeBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  dismissNoticeText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.ink,
  },
  linkButton3D: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(140, 64, 16, 0.08)",
  },
  linkButtonText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: C.saffron,
  },
  linkChevronCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(229, 107, 39, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 13,
    color: C.muted,
  },
});
