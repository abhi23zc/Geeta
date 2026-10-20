import { AruMascot } from "@/components/aru-mascot";
import { TreeGrowthOnboardingStage } from "@/components/onboarding/tree-growth-stage";
import { Screen, TextR } from "@/components/ritual-ui";
import { SacredLotusCoin } from "@/components/sacred-lotus-coin";
import { C, R } from "@/constants/ritual-theme";
import { OnboardingButton } from "@/features/onboarding/button";
import {
  needsIntroduction,
  nextIntroductionStep,
  type OnboardingStep,
} from "@/features/onboarding/model";
import { OnboardingPermissions } from "@/features/onboarding/permissions";
import { StartupRecovery, useOnboarding } from "@/features/onboarding/provider";
import { confirmAction } from "@/features/quiz/actions";
import { LanguagePicker } from "@/i18n/language-picker";
import { useLanguage } from "@/i18n/provider";
import { useAlarmPresentation } from "@/navigation/alarm-presentation";
import {
  getAlarmCapabilityStatus,
  isNativeAlarmAvailable,
} from "@/services/alarm";
import {
  CommonActions,
  useIsFocused,
  useNavigation,
} from "expo-router/react-navigation";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Flame,
  Globe,
  Lock,
  Share2,
  Sprout,
  Sun,
  TreePine,
  Wind,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  BackHandler,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  accessDeadline,
  permissionPageIds,
} from "@/features/onboarding/permission-model";

const ACTIVE_ONBOARDING_STEPS = [
  "welcome",
  "language",
  "ritual",
  "practice",
  "permissions",
] as const;

export default function OnboardingScreen() {
  const { record, update, error, busy, retry, recover, takeDeferred } =
    useOnboarding();
  const {
    t,
    busy: languageBusy,
    error: languageError,
    formatNumber,
  } = useLanguage();
  const navigation = useNavigation();
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const alarm = useAlarmPresentation();

  const eligible = useCallback(
    () =>
      navigation.isFocused() &&
      AppState.currentState === "active" &&
      !alarm.active,
    [navigation, alarm.active],
  );

  const permissionBack = useRef<(() => void) | null>(null);
  const [permissionProgress, setPermissionProgress] = useState({
    position: 1,
    total: 1,
  });
  const registerBack = useCallback((action: (() => void) | null) => {
    permissionBack.current = action;
  }, []);
  const onPermissionProgress = useCallback(
    (position: number, total: number) => {
      setPermissionProgress((previous) =>
        previous.position === position && previous.total === total
          ? previous
          : { position, total },
      );
    },
    [],
  );
  useEffect(() => {
    let alive = true;
    if (isNativeAlarmAvailable)
      void accessDeadline(getAlarmCapabilityStatus())
        .then((status) => {
          if (alive)
            setPermissionProgress((previous) => ({
              ...previous,
              total: permissionPageIds(status).length,
            }));
        })
        .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const step: OnboardingStep = record?.step ?? "welcome";

  // Resume older records that stopped on the removed alarm introduction.
  useEffect(() => {
    if (step === "alarm" && !busy && eligible())
      void update((value) => ({ ...value, step: "permissions" }));
  }, [step, busy, eligible, update]);

  // If a device reaches or reloads into legacy 'ready' step, immediately complete and transition to Home
  useEffect(() => {
    if (step === "ready" && eligible()) {
      void update((value) => ({
        ...value,
        completed: true,
        replaying: false,
      }));
    }
  }, [step, eligible, update]);

  useEffect(() => {
    if (!record || needsIntroduction(record) || alarm.active || !focused)
      return;
    const pending = takeDeferred();
    const name = pending?.route.replace(/^\//, "") || "index";
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name, params: pending?.params }],
      }),
    );
  }, [record, alarm.active, focused, navigation, takeDeferred]);

  const back = useCallback(() => {
    if (!record || busy || !eligible()) return;
    if (record.step === "permissions") {
      permissionBack.current?.();
      return;
    }
    const currentIdx = ACTIVE_ONBOARDING_STEPS.indexOf(
      record.step as (typeof ACTIVE_ONBOARDING_STEPS)[number],
    );
    const previous =
      ACTIVE_ONBOARDING_STEPS[
        Math.max(
          0,
          (currentIdx >= 0 ? currentIdx : ACTIVE_ONBOARDING_STEPS.length - 1) -
            1,
        )
      ];
    void update((value) => ({
      ...value,
      step: previous,
    }));
  }, [record, busy, eligible, update]);

  useEffect(() => {
    if (!focused || alarm.active || !record || !needsIntroduction(record))
      return;
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      back();
      return true;
    });
    return () => listener.remove();
  }, [focused, alarm.active, record, back]);

  const advance = () => {
    if (eligible()) {
      void update((value) => ({
        ...value,
        step: nextIntroductionStep(value.step),
      }));
    }
  };

  if (!record) {
    return (
      <StartupRecovery
        error={error}
        retry={retry}
        recover={() =>
          confirmAction(
            t("Restart introduction"),
            t(
              "Only introduction setup will restart. Your original introduction record will be backed up; app progress and alarm settings will be preserved.",
            ),
            t("Restart introduction"),
            () => {
              void recover();
            },
          )
        }
      />
    );
  }

  if (alarm.active || !needsIntroduction(record) || step === "alarm")
    return null;

  const blocked = busy || languageBusy;
  const currentStepIndex = ACTIVE_ONBOARDING_STEPS.indexOf(
    step as (typeof ACTIVE_ONBOARDING_STEPS)[number],
  );
  const position =
    (currentStepIndex >= 0
      ? currentStepIndex
      : ACTIVE_ONBOARDING_STEPS.length - 1) +
    (step === "permissions" ? permissionProgress.position : 1);
  const progressSteps = [
    ...ACTIVE_ONBOARDING_STEPS.slice(0, -1),
    ...Array.from(
      { length: permissionProgress.total },
      (_, index) => `permission-${index}`,
    ),
  ];
  const isCompact = height < 740;
  const isTall = height >= 820;

  // Responsive stage sizing adapted gracefully to screen height
  const mascotSize = Math.min(
    200,
    Math.max(130, Math.round(height * (isCompact ? 0.16 : isTall ? 0.20 : 0.18))),
  );

  return (
    <Screen
      contentContainerStyle={[
        s.screenScroll,
        {
          paddingBottom: Math.max(insets.bottom + 12, 20),
        },
      ]}
    >
      <View
        style={[
          s.pageContainer,
          {
            minHeight: Math.max(
              480,
              height - insets.top - insets.bottom - (isCompact ? 20 : 36),
            ),
          },
        ]}
      >
        {/* ── 1. Top Header Navigation Bar ──────────────────────────────── */}
        <View style={s.header}>
          {step === "welcome" ? (
            <View style={s.backPlaceholder} accessible={false} />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Go back")}
              accessibilityState={{ disabled: blocked }}
              disabled={blocked}
              onPress={back}
              style={({ pressed }) => [s.backBtn, pressed && s.backBtnPressed]}
            >
              <ArrowLeft size={20} color={C.ink} strokeWidth={2.4} />
            </Pressable>
          )}

          {/* Stepped Progress Segment Bar */}
          <View style={s.progressRow}>
            {progressSteps.map((sKey, idx) => {
              const isActive = idx === position - 1;
              const isDone = idx < position - 1;
              return (
                <View
                  key={sKey}
                  style={[
                    s.progressSegment,
                    isDone && s.progressSegmentDone,
                    isActive && s.progressSegmentActive,
                  ]}
                />
              );
            })}
          </View>

          <View style={s.stepPill}>
            <TextR accessibilityLiveRegion="polite" style={s.step}>
              {step === "permissions"
                ? t("Alarm setup")
                : t("Step {current} of {total}", {
                    current: formatNumber(position),
                    total: formatNumber(progressSteps.length),
                  })}
            </TextR>
          </View>
        </View>

        {/* ── 2. Middle Immersive Hero Section ──────────────────────────── */}
        <View style={s.middleHeroSection}>
          {/* Animated Mascot Stage with Radiant Sunburst Aura */}
          {step !== "permissions" && (
            <View
              style={[
                s.mascotStage,
                step === "practice"
                  ? { minHeight: 135, justifyContent: "center" }
                  : { height: mascotSize + 16 },
              ]}
            >
              {step === "welcome" && (
                <AruMascot
                  clip="streak_celebration"
                  size={mascotSize}
                  glow="day"
                />
              )}
              {step === "language" && (
                <AruMascot
                  clip="teaching_guidance"
                  size={Math.round(mascotSize * 0.88)}
                  glow="day"
                />
              )}
              {step === "ritual" && (
                <AruMascot
                  clip="breathing_loop"
                  size={Math.round(mascotSize * 0.95)}
                  glow="day"
                />
              )}
              {step === "practice" && <TreeGrowthOnboardingStage />}
            </View>
          )}

          {/* ── Step 1: Welcome (Meet Aru) ──────────────────────────────── */}
          {step === "welcome" && (
            <View style={s.stepBody}>
              <View style={s.titleGroup}>
                <View style={s.kickerPill}>
                  <Sun size={13} color={C.primary} />
                  <TextR style={s.kickerText}>{t("Wake with purpose")}</TextR>
                </View>
                <TextR serif accessibilityRole="header" style={s.title}>
                  {t("Meet Aru")}
                </TextR>
                <TextR style={s.lead}>
                  {t("A calmer morning, a little wisdom every day.")}
                </TextR>
              </View>

              {/* 3 Full-Width Sacred Feature Cards */}
              <View style={s.sacredCardsGroup}>
                <View style={s.featureCard}>
                  <View
                    style={[
                      s.featureIconCircle,
                      { backgroundColor: "#FFEDD5" },
                    ]}
                  >
                    <Sun size={20} color={C.primary} />
                  </View>
                  <View style={s.featureCopy}>
                    <TextR style={s.featureHeading}>
                      {t("Your morning ritual")}
                    </TextR>
                    <TextR style={s.featureSub}>
                      {t("Wake gently, breathe, and contemplate.")}
                    </TextR>
                  </View>
                </View>

                <View style={s.featureCard}>
                  <View
                    style={[
                      s.featureIconCircle,
                      { backgroundColor: "#DCFCE7" },
                    ]}
                  >
                    <TreePine size={20} color={C.greenDark} />
                  </View>
                  <View style={s.featureCopy}>
                    <TextR style={s.featureHeading}>
                      {t("Grow habits, plant a tree")}
                    </TextR>
                    <TextR style={s.featureSub}>
                      {t("30-day streak plants a real tree in your name")}
                    </TextR>
                  </View>
                </View>

                <View style={s.featureCard}>
                  <View
                    style={[
                      s.featureIconCircle,
                      { backgroundColor: "#FEF3C7" },
                    ]}
                  >
                    <Lock size={18} color="#854D0E" />
                  </View>
                  <View style={s.featureCopy}>
                    <TextR style={s.featureHeading}>100% Private & Free</TextR>
                    <TextR style={s.featureSub}>
                      No account or personal details needed
                    </TextR>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ── Step 2: Language Selection ──────────────────────────────── */}
          {step === "language" && (
            <View style={s.stepBody}>
              <View style={s.titleGroup}>
                <View style={s.kickerPill}>
                  <Globe size={13} color={C.primary} />
                  <TextR style={s.kickerText}>SACRED TONGUE</TextR>
                </View>
                <TextR serif accessibilityRole="header" style={s.title}>
                  {t("Choose your language")}
                </TextR>
                <TextR style={s.lead}>
                  {t("You can change this later from Home.")}
                </TextR>
              </View>

              <LanguagePicker />
            </View>
          )}

          {/* ── Step 3: Morning Ritual ──────────────────────────────────── */}
          {step === "ritual" && (
            <View style={s.stepBody}>
              <View style={s.titleGroup}>
                <View style={s.kickerPill}>
                  <Flame size={13} color={C.saffron} />
                  <TextR style={s.kickerText}>MORNING SADHANA</TextR>
                </View>
                <TextR serif accessibilityRole="header" style={s.title}>
                  {t("Your morning ritual")}
                </TextR>
                <TextR style={s.lead}>
                  {t("Wake gently, breathe, and contemplate.")}
                </TextR>
              </View>

              {/* 3-Step Journey Pathway */}
              <View style={s.sacredContainer}>
                <View style={s.pathwayRow}>
                  <View
                    style={[s.pathwayIconWrap, { backgroundColor: "#FFEDD5" }]}
                  >
                    <Bell size={20} color={C.primary} />
                  </View>
                  <View style={s.pathwayInfo}>
                    <TextR style={s.pathwayHeader}>
                      1. {t("Set up your morning alarm")}
                    </TextR>
                    <TextR style={s.pathwaySub}>
                      Wake gently with flute & sacred chants
                    </TextR>
                  </View>
                </View>

                <View style={s.pathwayConnector} />

                <View style={s.pathwayRow}>
                  <View
                    style={[s.pathwayIconWrap, { backgroundColor: "#DCFCE7" }]}
                  >
                    <Wind size={20} color={C.greenDark} />
                  </View>
                  <View style={s.pathwayInfo}>
                    <TextR style={s.pathwayHeader}>2. 4-4-6 Pranayama</TextR>
                    <TextR style={s.pathwaySub}>
                      Guided breathwork to center the mind
                    </TextR>
                  </View>
                </View>

                <View style={s.pathwayConnector} />

                <View style={s.pathwayRow}>
                  <View
                    style={[s.pathwayIconWrap, { backgroundColor: "#FEF3C7" }]}
                  >
                    <BookOpen size={20} color="#854D0E" />
                  </View>
                  <View style={s.pathwayInfo}>
                    <TextR style={s.pathwayHeader}>3. Daily Gita Wisdom</TextR>
                    <TextR style={s.pathwaySub}>
                      Meaningful verse narration & reflection
                    </TextR>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ── Step 4: Practice & Gamified Tree ────────────────────────── */}
          {step === "practice" && (
            <View style={s.stepBody}>
              <View style={s.titleGroup}>
                <View style={s.kickerPill}>
                  <Sprout size={13} color={C.greenDark} />
                  <TextR style={s.kickerText}>
                    {t("EARTH SEVA · 30 DAYS")}
                  </TextR>
                </View>
                <TextR serif accessibilityRole="header" style={s.title}>
                  {t("Grow your habit, plant a real tree")}
                </TextR>
                <TextR style={s.lead}>
                  {t(
                    "Practice for 30 days. Aarambh will plant a real tree in your name for the environment — with details you can share.",
                  )}
                </TextR>
              </View>

              {/* Sacred Tree & Real Seva Feature Card */}
              <View style={s.sacredContainer}>
                {/* 1. Real Tree Planted in Your Name */}
                <View style={s.rewardsFeatureRow}>
                  <View
                    style={[
                      s.featureIconCircle,
                      { backgroundColor: "#DCFCE7" },
                    ]}
                  >
                    <TreePine size={20} color={C.greenDark} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <TextR style={s.featureHeading}>
                      {t("Real tree planted in your name")}
                    </TextR>
                    <TextR style={s.featureSub}>
                      {t(
                        "After 30 days, Aarambh plants a living tree dedicated to you for the environment.",
                      )}
                    </TextR>
                  </View>
                </View>

                <View style={s.cardDivider} />

                {/* 2. Shareable Tree Details & Certificate */}
                <View style={s.rewardsFeatureRow}>
                  <View
                    style={[
                      s.featureIconCircle,
                      { backgroundColor: "#FFEDD5" },
                    ]}
                  >
                    <Share2 size={18} color={C.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <TextR style={s.featureHeading}>
                      {t("Shareable tree details & certificate")}
                    </TextR>
                    <TextR style={s.featureSub}>
                      {t(
                        "Get verified tree details, species, and a certificate you can proudly share.",
                      )}
                    </TextR>
                  </View>
                </View>

                <View style={s.cardDivider} />

                {/* 3. Lotus Points */}
                <View style={s.rewardsFeatureRow}>
                  <SacredLotusCoin size={38} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <TextR style={s.featureHeading}>
                      {t("+20 Lotus Points / Day")}
                    </TextR>
                    <TextR style={s.featureSub}>
                      {t(
                        "Permanent rewards (+10 ritual, +10 quiz). They stay yours forever!",
                      )}
                    </TextR>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ── Step 6: System Permissions ──────────────────────────────── */}
          {step === "permissions" && (
            <OnboardingPermissions
              onProgress={onPermissionProgress}
              registerBack={registerBack}
            />
          )}

          {/* Error Alert */}
          {error && (
            <View style={s.errorAlert}>
              <TextR accessibilityRole="alert" style={s.error}>
                {t("Introduction could not be saved. Please retry.")}
              </TextR>
            </View>
          )}
        </View>

        {/* ── 3. Bottom Pinned Action Bar (Full Width & Elevated) ─────── */}
        <View style={s.bottomActionBar}>
          {step === "welcome" && (
            <OnboardingButton
              label={t("Get started")}
              disabled={blocked}
              onPress={advance}
            />
          )}

          {step === "language" && (
            <OnboardingButton
              label={t("Continue")}
              disabled={blocked || Boolean(languageError)}
              onPress={advance}
            />
          )}

          {step === "ritual" && (
            <OnboardingButton
              label={t("Continue")}
              disabled={blocked}
              onPress={advance}
            />
          )}

          {step === "practice" && (
            <OnboardingButton
              label={t("Continue")}
              disabled={blocked}
              onPress={advance}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  screenScroll: {
    flexGrow: 1,
  },
  pageContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    justifyContent: "space-between",
    width: "100%",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(140, 64, 16, 0.16)",
    borderBottomWidth: 2,
    shadowColor: C.saffron,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  backPlaceholder: {
    width: 44,
    height: 44,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  progressSegment: {
    height: 6,
    flex: 1,
    maxWidth: 28,
    borderRadius: 3,
    backgroundColor: "rgba(222, 192, 180, 0.35)",
  },
  progressSegmentDone: {
    backgroundColor: C.saffron,
  },
  progressSegmentActive: {
    backgroundColor: C.saffron,
    shadowColor: C.saffron,
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  stepPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(254, 236, 220, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  step: {
    fontSize: 12,
    fontWeight: "700",
    color: C.muted,
  },
  middleHeroSection: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingVertical: 10,
  },
  mascotStage: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBody: {
    width: "100%",
    gap: 16,
    alignItems: "center",
  },
  titleGroup: {
    alignItems: "center",
    gap: 8,
    width: "100%",
    paddingHorizontal: 10,
  },
  kickerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5.5,
    paddingVertical: 4.5,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: "rgba(229, 107, 39, 0.12)",
    marginBottom: 2,
  },
  kickerText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: C.primary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "800",
    color: C.ink,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  lead: {
    fontSize: 14,
    lineHeight: 20.5,
    fontWeight: "500",
    color: C.inkSoft,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: C.inkSoft,
    textAlign: "center",
    fontWeight: "500",
  },
  sacredCardsGroup: {
    width: "100%",
    gap: 9,
  },
  featureCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255, 252, 248, 0.96)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(140, 64, 16, 0.12)",
    borderBottomWidth: 2,
    shadowColor: "#8C4010",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  featureIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureCopy: {
    flex: 1,
    gap: 2,
  },
  featureHeading: {
    fontSize: 14.5,
    fontWeight: "800",
    color: C.ink,
  },
  featureSub: {
    fontSize: 12.5,
    lineHeight: 17,
    color: C.muted,
    fontWeight: "500",
  },
  sacredContainer: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255, 252, 248, 0.96)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#F4B942",
    borderTopWidth: 2,
    borderBottomColor: "rgba(140, 64, 16, 0.14)",
    borderBottomWidth: 2.5,
    shadowColor: C.saffron,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    gap: 12,
  },
  pathwayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pathwayIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pathwayInfo: {
    flex: 1,
    gap: 2,
  },
  pathwayHeader: {
    fontSize: 14.5,
    fontWeight: "800",
    color: C.ink,
  },
  pathwaySub: {
    fontSize: 12.5,
    lineHeight: 17,
    color: C.muted,
  },
  pathwayConnector: {
    width: 2,
    height: 10,
    backgroundColor: "rgba(140, 64, 16, 0.2)",
    marginLeft: 17,
  },
  rewardsFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    paddingVertical: 2,
  },
  rewardsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  rewardPointsTitle: {
    fontSize: 17.5,
    fontWeight: "800",
    color: C.primary,
  },
  rewardPointsSub: {
    fontSize: 13,
    lineHeight: 18,
    color: C.muted,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(140, 64, 16, 0.08)",
    width: "100%",
  },
  milestoneChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  milestoneChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(254, 236, 220, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
    flex: 1,
    justifyContent: "center",
  },
  milestoneChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.primary,
  },
  celebrateIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.greenDark,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    borderWidth: 3.5,
    borderColor: "#FFFFFF",
    shadowColor: C.greenDark,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  statusSummaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255, 252, 248, 0.96)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#8C4010",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    width: "100%",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  statusSummaryText: {
    fontSize: 14.5,
    lineHeight: 22,
    color: C.inkSoft,
    flex: 1,
    fontWeight: "600",
  },
  bottomActionBar: {
    width: "100%",
    paddingTop: 12,
  },
  errorAlert: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FDE8E8",
    borderWidth: 1,
    borderColor: "#F8B4B4",
    width: "100%",
  },
  error: {
    color: "#9D2525",
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: "center",
    fontWeight: "600",
  },
});
