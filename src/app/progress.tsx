import { Screen, TextR } from "@/components/ritual-ui";
import { SacredLotusCoin } from "@/components/sacred-lotus-coin";
import { C } from "@/constants/ritual-theme";
import { DailyGoalCard } from "@/features/progress/daily-goal-card";
import { LedgerList } from "@/features/progress/ledger-list";
import { MilestoneRoadmap } from "@/features/progress/milestone-roadmap";
import { useProgress } from "@/features/progress/provider";
import { SadhanaCalendar } from "@/features/progress/sadhana-calendar";
import { useGrowthFocusTarget } from "@/features/progress/tree/focus-target";
import { GrowthCard } from "@/features/progress/tree/growth-card";
import { useLanguage } from "@/i18n/provider";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Award,
  ChevronDown,
  ChevronUp,
  Flame,
  HelpCircle,
  Trophy
} from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

export default function ProgressScreen() {
  const growthFocus = useRef<View>(null);
  useGrowthFocusTarget(growthFocus);
  const router = useRouter();
  const { t, formatNumber } = useLanguage();

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
      <View style={[s.container, { paddingBottom: 32 }]}>
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

          <View ref={growthFocus} accessible accessibilityRole="header">
            <TextR style={s.screenTitle}>
              {t("Progress")} · {t("Daily goal")}
            </TextR>
          </View>

          <View style={{ width: 44 }} />
        </View>

        <GrowthCard
          screen="progress"
          cycle={p.tree.cycle}
          streak={p.tree.level}
          completed={Boolean(p.days[today]?.rewarded)}
          count={
            (p.days[today]?.ritual ? 1 : 0) + (p.days[today]?.quiz ? 1 : 0)
          }
        />

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

          <View style={s.balanceRow}>
            <View style={s.balanceLeftGroup}>
              <SacredLotusCoin size={46} />
              <View style={s.balanceText}>
                <TextR style={s.heroSubtitle}>{t("Points")}</TextR>
                <TextR serif style={s.heroBalance}>
                  {formatNumber(p.balance)}
                </TextR>
              </View>
            </View>

            {/* Balanced Right Level Status Badge */}
            <View style={s.statusBadgeRight}>
              {/* <Sparkles size={13} color="#92400E" /> */}
              <TextR style={s.statusBadgeRightText}>
                {t("Level {count} of 30", {
                  count: formatNumber(p.tree.level),
                })}
              </TextR>
            </View>
          </View>

          <View style={s.heroContent}>
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
                  style={[s.metricIconCircle, { backgroundColor: "#FEF3C7" }]}
                >
                  <Trophy size={14} color="#B45309" />
                </View>
                <TextR style={s.metricValue}>{formatNumber(p.best)}d</TextR>
                <TextR style={s.metricLabel}>{t("Best streak")}</TextR>
              </View>

              <View style={s.metricDivider} />

              <View style={s.metricItem3D}>
                <View
                  style={[s.metricIconCircle, { backgroundColor: "#FDE68A" }]}
                >
                  <Award size={14} color="#92400E" />
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

        {__DEV__ && (
          <Pressable
            accessibilityRole="button"
            style={{ minHeight: 48, justifyContent: "center" }}
            onPress={() => router.push("./dev/tree-preview")}
          >
            <TextR style={{ color: C.saffron }}>
              Preview tree growth · Development
            </TextR>
          </Pressable>
        )}

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
                  "Each incomplete day lowers your tree by one level and resets the streak. Complete both practices to grow again. Partial days keep earned points.",
                )}
              </TextR>
              <TextR style={s.ruleBullet}>
                •{" "}
                {t(
                  "Reach level 7 for +40 and level 30 for +100, once per tree. A completed tree starts a new seed the next day.",
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
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 13,
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
    letterSpacing: -0.2,
  },
  heroCard3D: {
    backgroundColor: "#FFFDF9",
    borderRadius: 24,
    padding: 18,
    alignItems: "center",
    borderWidth: 1.2,
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(140, 64, 16, 0.16)",
    borderLeftColor: "rgba(255, 255, 255, 0.95)",
    borderRightColor: "rgba(217, 119, 6, 0.15)",
    borderBottomWidth: 2,
    shadowColor: "#8C4010",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 12,
    overflow: "hidden",
    position: "relative",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  balanceLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  balanceText: {
    gap: 1,
  },
  heroSubtitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#8C5E0D",
  },
  heroBalance: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#3E2000",
  },
  statusBadgeRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.2,
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(217, 119, 6, 0.25)",
    borderLeftColor: "rgba(255, 255, 255, 0.9)",
    borderRightColor: "rgba(217, 119, 6, 0.15)",
    shadowColor: "#8C5E0D",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statusBadgeRightText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#92400E",
  },
  heroContent: {
    alignItems: "center",
    width: "100%",
  },
  metricsRow3D: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    backgroundColor: "rgba(255, 246, 235, 0.85)",
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderWidth: 1.2,
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(140, 64, 16, 0.14)",
    borderLeftColor: "rgba(255, 255, 255, 0.9)",
    borderRightColor: "rgba(217, 119, 6, 0.12)",
    borderBottomWidth: 2,
  },
  metricItem3D: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  metricIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#2A1808",
  },
  metricLabel: {
    fontSize: 11.5,
    color: "#7A583E",
    fontWeight: "700",
    textAlign: "center",
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(140, 64, 16, 0.12)",
    alignSelf: "center",
  },
  rulesCard3D: {
    backgroundColor: "rgba(255, 252, 248, 0.95)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    borderColor: "rgba(222, 192, 180, 0.4)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(140, 64, 16, 0.12)",
    borderBottomWidth: 2,
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
