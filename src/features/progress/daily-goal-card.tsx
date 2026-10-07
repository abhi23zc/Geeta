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
  Sparkles,
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
import { GrowthCard } from "./tree/growth-card";

interface DailyGoalCardProps {
  showTree?: boolean;
  link?: boolean;
  onStartRitual?: () => void;
  onStartQuiz?: () => void;
}

export function DailyGoalCard({
  link = true,
  showTree = false,
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
  const quizEarned = p ? activityPoints(p, today, "quiz") : 0;
  const ritualEarned = p ? activityPoints(p, today, "ritual") : 0;
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
      {/* ── Soft Sunlit Ambience (Seamless zero-bleed at bottom) ───────────── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="goalCardAmbience" cx="25%" cy="12%" r="85%">
              <Stop offset="0%" stopColor="#FEE4C3" stopOpacity="0.35" />
              <Stop offset="55%" stopColor="#FFF2DE" stopOpacity="0.12" />
              <Stop offset="100%" stopColor="#FFF8F2" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#goalCardAmbience)" />
        </Svg>
      </View>

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

      {showTree && <GrowthCard compact screen="home" cycle={p.tree.cycle} streak={p.tree.level} completed={isCompletedToday} count={completedCount} />}

      {/* ── 2. Stepped Progress Meter ──────────────────────────────────────── */}
      <View style={s.stepperSection}>
        <View style={s.stepperHeader}>
          <View style={s.stepperLabelGroup}>
            <View style={s.stepperDot} />
            <TextR style={s.stepperStatusText}>
              {`${completedCount} / 2 ${t("Complete")}`}
            </TextR>
          </View>
        </View>

        {/* 2-Segmented Stepper Track */}
        <View style={s.stepperTrack}>
          <View
            style={[
              s.stepperSegment,
              ritualDone && s.stepperSegmentActive,
              { marginRight: 8 },
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
        accessibilityLabel={`${t("Alarm-led ritual")}: ${ritualDone ? t("Completed") : t("Start ritual")}. ${ritualEarned ? t("10 points earned today") : t("Ritual: +10 points once daily")}`}
        onPress={() => {
          if (onStartRitual) {
            onStartRitual();
          } else if (ritualDone) {
            router.push("/gita");
          } else {
            router.push("/alarm/setup");
          }
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
            <Sun size={18} color={C.saffron} />
          </View>
          <View style={s.taskTextGroup}>
            <TextR style={s.taskTitle}>{t("Alarm-led ritual")}</TextR>
            <TextR style={s.taskSub}>
              {ritualDone
                ? t("10 points earned today")
                : t("Rise with morning chants")}
            </TextR>
          </View>
        </View>

        <View style={s.taskRight}>
          {ritualDone ? (
            <View style={s.statusPillDone3D}>
              <Check size={13} color="#8C5E0D" strokeWidth={2.8} />
              <TextR style={s.statusPillDoneText}>{t("Completed")}</TextR>
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
        accessibilityLabel={`${t("Quiz round")}: ${quizDone ? t("Completed") : t("Play quiz")}. ${quizEarned ? t("10 points earned today") : t("Quiz: +10 points once daily")}`}
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
            <BookOpen size={18} color={C.saffron} />
          </View>
          <View style={s.taskTextGroup}>
            <TextR style={s.taskTitle}>{t("Quiz round")}</TextR>
            <TextR style={s.taskSub}>
              {quizDone
                ? t("10 points earned today")
                : t("5 quick wisdom questions")}
            </TextR>
          </View>
        </View>

        <View style={s.taskRight}>
          {quizDone ? (
            <View style={s.statusPillDone3D}>
              <Check size={13} color="#8C5E0D" strokeWidth={2.8} />
              <TextR style={s.statusPillDoneText}>{t("Completed")}</TextR>
            </View>
          ) : (
            <View style={s.actionPillPrimary3D}>
              <Sparkles size={12} color={C.white} />
              <TextR style={s.actionPillPrimaryText}>{t("Play quiz")} →</TextR>
            </View>
          )}
        </View>
      </Pressable>

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
          <View style={s.noticeRow}>
            <Award size={14} color={C.saffron} />
            <TextR style={s.noticeText}>
              {notice
                .map(
                  (e) =>
                    `${t(pointsEntryLabel(e))}: ${e.amount > 0 ? "+" : ""}${formatNumber(e.amount)}`,
                )
                .join(" · ")}
            </TextR>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Close")}
            style={s.dismissNoticeBtn}
            onPress={dismissNotice}
          >
            <X size={13} color={C.muted} />
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
    backgroundColor: "rgba(255, 248, 242, 0.94)",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(140, 64, 16, 0.18)",
    borderBottomWidth: 3.5,
    marginBottom: 14,
    shadowColor: C.saffron,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    gap: 10,
    position: "relative",
    overflow: "hidden",
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
    flex: 1,
    minWidth: 140,
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
    flexShrink: 0,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
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
    gap: 8,
  },
  stepperHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepperLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  stepperDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.saffron,
  },
  stepperDotComplete: {
    backgroundColor: C.saffron,
  },
  stepperStatusText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.ink,
  },
  stepperStatusTextComplete: {
    color: C.ink,
    fontWeight: "700",
  },
  rewardBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(254, 236, 220, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(229, 107, 39, 0.28)",
  },
  rewardBadgeText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: C.saffron,
  },
  rewardCompletePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(244, 185, 66, 0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(244, 185, 66, 0.4)",
  },
  rewardCompleteText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8C5E0D",
  },
  stepperTrack: {
    flexDirection: "row",
    height: 8,
    alignItems: "center",
  },
  stepperSegment: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(222, 192, 180, 0.45)",
    borderRadius: 999,
    overflow: "hidden",
  },
  stepperSegmentActive: {
    backgroundColor: C.saffron,
  },
  stepperSegmentComplete: {
    backgroundColor: C.saffron,
  },
  segmentShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  taskTile3D: {
    flexDirection: "row",
    flexWrap: "wrap",
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
    backgroundColor: "rgba(255, 250, 244, 0.96)",
    borderColor: "rgba(244, 185, 66, 0.32)",
    borderBottomColor: "rgba(229, 107, 39, 0.22)",
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
    flexBasis: 150,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
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
    flexShrink: 0,
  },
  taskIconCircleComplete: {
    backgroundColor: "#FFF2DC",
    borderColor: "rgba(244, 185, 66, 0.55)",
    borderBottomColor: "rgba(180, 115, 20, 0.3)",
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
    minWidth: 0,
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
    minHeight: 48,
    justifyContent: "center",
    marginLeft: 8,
    flexShrink: 0,
  },
  statusPillDone3D: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF4E3",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(244, 185, 66, 0.65)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(180, 115, 20, 0.35)",
    borderBottomWidth: 2,
  },
  statusPillDoneText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#8C5E0D",
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
    backgroundColor: "rgba(255, 248, 240, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(229, 107, 39, 0.2)",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  noticeText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.ink,
    flex: 1,
  },
  dismissNoticeBtn: {
    padding: 4,
  },
  dismissNoticeText: {
    fontSize: 11,
    fontWeight: "600",
    color: C.ink,
  },
  linkButton3D: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 2,
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
