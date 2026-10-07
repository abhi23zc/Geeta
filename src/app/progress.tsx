import { Screen, TextR, useDockHeight } from "@/components/ritual-ui";
import { SacredLotusCoin } from "@/components/sacred-lotus-coin";
import { C } from "@/constants/ritual-theme";
import { DailyGoalCard } from "@/features/progress/daily-goal-card";
import { LedgerList } from "@/features/progress/ledger-list";
import { MilestoneRoadmap } from "@/features/progress/milestone-roadmap";
import { useProgress } from "@/features/progress/provider";
import { SadhanaCalendar } from "@/features/progress/sadhana-calendar";
import { useLanguage } from "@/i18n/provider";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Award,
  ChevronDown,
  ChevronUp,
  Flame,
  HelpCircle,
  Trophy,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

export default function ProgressScreen() {
  const router = useRouter();
  const { t, formatNumber } = useLanguage();
  const dockHeight = useDockHeight();

  const { progress: p, today } = useProgress();
  const [rulesOpen, setRulesOpen] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  if (!p) {
    return (
      <Screen>
        <View style={s.container}>
          <Pressable
            accessibilityRole="button"
            style={s.backButton}
            onPress={handleBack}
          >
            <ArrowLeft size={18} color={C.ink} />
            <TextR style={s.backButtonText}>{t("Back to Home")}</TextR>
          </Pressable>
          <DailyGoalCard link={false} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View
        style={[s.container, { paddingBottom: Math.max(dockHeight + 24, 56) }]}
      >
        {/* ── 1. Top Bar with Back Button ──────────────────────────────────── */}
        <View style={s.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Back to Home")}
            style={({ pressed }) => [s.backButton, pressed && { opacity: 0.8 }]}
            onPress={handleBack}
          >
            <ArrowLeft size={18} color={C.ink} />
            <TextR style={s.backButtonText}>{t("Home")}</TextR>
          </Pressable>

          <TextR accessibilityRole="header" style={s.screenTitle}>
            {t("Progress")} · {t("Daily goal")}
          </TextR>

          <View style={{ width: 44 }} />
        </View>

        {/* ── 2. Hero Sacred Lotus Points & 3D Stats Card ───────────────────── */}
        <View style={s.heroCard3D}>
          {/* Background Radial Glow */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="heroGrad3D" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#FFFDF9" />
                  <Stop offset="45%" stopColor="#FFF8EE" />
                  <Stop offset="100%" stopColor="#FFF0DC" />
                </LinearGradient>
                <RadialGradient id="heroCoinGlow" cx="50%" cy="30%" r="60%">
                  <Stop offset="0%" stopColor="#FFE5A3" stopOpacity="0.5" />
                  <Stop offset="100%" stopColor="#FFFDF9" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect
                width="100%"
                height="100%"
                rx={26}
                fill="url(#heroGrad3D)"
              />
              <Rect
                width="100%"
                height="100%"
                rx={26}
                fill="url(#heroCoinGlow)"
              />
            </Svg>
          </View>

          <View style={s.heroCoinStage}>
            <SacredLotusCoin size={76} />
          </View>

          <View style={s.heroContent}>
            <TextR style={s.heroSubtitle}>{t("Points")}</TextR>
            <TextR serif style={s.heroBalance}>
              {formatNumber(p.balance)}
            </TextR>

            {/* 3 Metrics 3D Relief Container */}
            <View style={s.metricsRow3D}>
              <View style={s.metricItem3D}>
                <View
                  style={[s.metricIconCircle, { backgroundColor: "#FFEAD9" }]}
                >
                  <Flame
                    size={14}
                    color={C.saffron}
                    fill={p.current > 0 ? C.saffron : "none"}
                  />
                </View>
                <TextR style={s.metricValue}>{formatNumber(p.current)}d</TextR>
                <TextR style={s.metricLabel}>{t("Current streak")}</TextR>
              </View>

              <View style={s.metricDivider} />

              <View style={s.metricItem3D}>
                <View
                  style={[s.metricIconCircle, { backgroundColor: "#FFF0CF" }]}
                >
                  <Trophy size={14} color={C.goldDark} />
                </View>
                <TextR style={s.metricValue}>{formatNumber(p.best)}d</TextR>
                <TextR style={s.metricLabel}>{t("Best streak")}</TextR>
              </View>

              <View style={s.metricDivider} />

              <View style={s.metricItem3D}>
                <View
                  style={[s.metricIconCircle, { backgroundColor: "#D6F5E1" }]}
                >
                  <Award size={14} color={C.greenDark} />
                </View>
                <TextR style={s.metricValue}>{formatNumber(p.total)}d</TextR>
                <TextR style={s.metricLabel}>{t("Completed days")}</TextR>
              </View>
            </View>
          </View>
        </View>

        {/* ── 3. Today's Goal Action Card ───────────────────────────────────── */}
        <DailyGoalCard link={false} />

        {/* ── 4. Milestone Roadmap (7d & 30d Tapasya) ───────────────────────── */}
        <MilestoneRoadmap progress={p} />

        {/* ── 5. Monthly Sadhana Calendar & Heatmap ─────────────────────────── */}
        <SadhanaCalendar progress={p} today={today} />

        {/* ── 6. Points Ledger Timeline ─────────────────────────────────────── */}
        <LedgerList entries={p.ledger ?? []} />

        {/* ── 7. Sadhana Rules & Wisdom Accordion ───────────────────────────── */}
        <View style={s.rulesCard3D}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRulesOpen((o) => !o)}
            style={s.rulesHeader}
          >
            <View style={s.rulesTitleGroup}>
              <View style={s.rulesIconWrap}>
                <HelpCircle size={16} color={C.saffron} />
              </View>
              <TextR style={s.rulesTitle}>
                {t("Daily goal")} · {t("Progress")}
              </TextR>
            </View>
            {rulesOpen ? (
              <ChevronUp size={18} color={C.ink} />
            ) : (
              <ChevronDown size={18} color={C.ink} />
            )}
          </Pressable>

          {rulesOpen && (
            <View style={s.rulesBody}>
              <TextR style={s.ruleBullet}>
                • {t("Quiz: +10 points once daily")} ·{" "}
                {t("Ritual: +10 points once daily")}
              </TextR>

              <TextR style={s.ruleBullet}>
                •{" "}
                {t(
                  "A real alarm, full breathing session and Gita completion are required on the same day. Manual practices and test alarms do not count.",
                )}
              </TextR>
              <TextR style={s.ruleBullet}>
                •{" "}
                {t(
                  "Every calendar day counts, even unscheduled alarm days. Set a daily alarm to maintain your streak.",
                )}
              </TextR>
              <TextR style={s.ruleBullet}>
                •{" "}
                {t(
                  "First 7-day streak: +40. First 30-day streak: +100. Each bonus is earned once.",
                )}
              </TextR>
              <TextR style={s.ruleBullet}>
                •{" "}
                {t(
                  "At zero, missed days still break your streak but cannot reduce points further.",
                )}
              </TextR>
              <TextR style={s.timezoneNote}>
                {t("Progress timezone")}: {p.timezone}
              </TextR>
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 16,
    paddingTop: 8,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#FFF2E2",
    borderWidth: 1,
    borderColor: "rgba(229, 107, 39, 0.25)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(140, 64, 16, 0.15)",
    borderBottomWidth: 2,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.ink,
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.ink,
  },
  heroCard3D: {
    backgroundColor: "#FFFDF9",
    borderRadius: 26,
    padding: 20,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(140, 64, 16, 0.2)",
    borderBottomWidth: 3.5,
    shadowColor: "#8C4010",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
    gap: 10,
    overflow: "hidden",
    position: "relative",
  },
  heroCoinStage: {
    marginTop: 4,
    marginBottom: 2,
  },
  heroContent: {
    alignItems: "center",
    width: "100%",
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: "#8C5E0D",
  },
  heroBalance: {
    fontSize: 40,
    fontWeight: "800",
    color: "#3E2000",
    marginTop: 1,
    marginBottom: 14,
  },
  metricsRow3D: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    backgroundColor: "rgba(254, 240, 226, 0.7)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(222, 192, 180, 0.45)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(140, 64, 16, 0.15)",
    borderBottomWidth: 2,
  },
  metricItem3D: {
    alignItems: "center",
    gap: 3,
    flex: 1,
  },
  metricIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2A1808",
  },
  metricLabel: {
    fontSize: 12,
    color: "#7A583E",
    fontWeight: "700",
    textAlign: "center",
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(140, 64, 16, 0.12)",
  },
  rulesCard3D: {
    backgroundColor: "rgba(255, 252, 248, 0.95)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    borderColor: "rgba(222, 192, 180, 0.4)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(140, 64, 16, 0.12)",
    borderBottomWidth: 2.5,
    gap: 10,
  },
  rulesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rulesTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rulesIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFE8D1",
    alignItems: "center",
    justifyContent: "center",
  },
  rulesTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: C.ink,
  },
  rulesBody: {
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(140, 64, 16, 0.08)",
  },
  ruleBullet: {
    fontSize: 12.5,
    lineHeight: 19,
    color: C.muted,
  },
  timezoneNote: {
    fontSize: 11.5,
    color: C.saffron,
    fontWeight: "700",
    marginTop: 4,
  },
});
