import { AruMascot } from "@/components/aru-mascot";
import { TextR } from "@/components/ritual-ui";
import { C } from "@/constants/ritual-theme";
import { releaseStartupSplash } from "@/features/onboarding/startup-splash";
import { useLanguage } from "@/i18n/provider";
import { useAlarmPresentation } from "@/navigation/alarm-presentation";
import { getAlarmStartupState } from "@/services/alarm";
import { Sun } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Easing,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  shouldSkipSplash,
  type SplashPolicyParams,
} from "./animated-splash-policy";
export { shouldSkipSplash, type SplashPolicyParams };

let splashSessionShown = false;

/** Exported for testing to allow simulating multiple cold launches */
export function resetSessionSplashForTesting() {
  splashSessionShown = false;
}

export interface AnimatedSplashScreenProps {
  duration?: number;
  onFinish?: () => void;
}

/**
 * AnimatedSplashScreen — Seamless, high-performance in-app startup animation
 * featuring the Aru streak celebration mascot, glowing golden aura, and smooth
 * fade-out transition. Automatically yields immediately to active alarms.
 */
export function AnimatedSplashScreen({
  duration = 2200,
  onFinish,
}: AnimatedSplashScreenProps) {
  const alarm = useAlarmPresentation();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  // If an alarm is ringing or preparing, bypass animated splash immediately to never block wake
  const shouldSkip = shouldSkipSplash({
    alarmActive: alarm.active,
    alarmLoading: alarm.loading,
    startupAlarmActive: getAlarmStartupState().active,
    sessionShown: splashSessionShown,
  });

  const [mounted, setMounted] = useState(!shouldSkip);
  const [fadeAnim] = useState(() => new Animated.Value(1));
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [textAnim] = useState(() => new Animated.Value(0));
  const dismissed = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    splashSessionShown = true;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.04,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMounted(false);
      onFinish?.();
    });
  }, [fadeAnim, scaleAnim, onFinish]);

  // Release native OS splash screen as soon as this component lays out
  const handleLayout = useCallback(() => {
    releaseStartupSplash();
  }, []);

  useEffect(() => {
    if (shouldSkip) {
      releaseStartupSplash();
      return;
    }

    // Smooth entrance of text elements
    Animated.timing(textAnim, {
      toValue: 1,
      duration: 520,
      delay: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      if (AppState.currentState === "active") {
        dismiss();
      }
    }, duration);

    // Handle backgrounding during splash
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && !dismissed.current) {
        setTimeout(dismiss, 250);
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [shouldSkip, duration, dismiss, textAnim]);

  if (!mounted || shouldSkip) {
    return null;
  }

  const isCompact = height < 740;
  const mascotSize = Math.min(
    270,
    Math.max(185, Math.round(height * (isCompact ? 0.25 : 0.3))),
  );

  return (
    <Animated.View
      onLayout={handleLayout}
      accessibilityRole="none"
      accessibilityViewIsModal
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 24),
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Continue")}
        style={styles.touchArea}
        onPress={dismiss}
      >
        <View style={styles.centerContent}>
          {/* Aru Mascot Stage with Celebration Sparkles & Sunburst Aura */}
          <View style={[styles.mascotStage, { height: mascotSize + 24 }]}>
            <AruMascot
              clip="streak_celebration"
              size={mascotSize}
              glow="day"
              animated
              interactive={false}
            />
          </View>

          {/* Devotional Branding */}
          <Animated.View
            style={[
              styles.brandingGroup,
              {
                opacity: textAnim,
                transform: [
                  {
                    translateY: textAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.kickerPill}>
              <Sun size={12} color={C.saffron} />
              <TextR style={styles.kickerText}>{t("Wake with purpose")}</TextR>
              {/* <Sparkles size={11} color={C.goldDark} /> */}
            </View>

            <TextR serif accessibilityRole="header" style={styles.appName}>
              GEETA
            </TextR>

            <TextR style={styles.tagline}>
              {t("A calmer morning, a little wisdom every day.")}
            </TextR>
          </Animated.View>
        </View>

        {/* Discreet Tap to Begin Hint */}
        <Animated.View
          style={[
            styles.footerHint,
            {
              opacity: textAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.7],
              }),
            },
          ]}
        >
          <TextR style={styles.hintText}>{t("Tap anywhere to begin")}</TextR>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF9F5",
    zIndex: 99999,
    justifyContent: "center",
    alignItems: "center",
  },
  touchArea: {
    flex: 1,
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  centerContent: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  mascotStage: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  brandingGroup: {
    alignItems: "center",
    gap: 8,
    width: "100%",
    maxWidth: 380,
  },
  kickerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(229, 107, 39, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(229, 107, 39, 0.2)",
  },
  kickerText: {
    fontSize: 11,
    fontWeight: "800",
    color: C.primary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  appName: {
    fontSize: 34,
    fontWeight: "800",
    color: "#2C221A",
    letterSpacing: 3,
    marginTop: 2,
  },
  tagline: {
    fontSize: 14,
    lineHeight: 20,
    color: "#7A6658",
    textAlign: "center",
    fontWeight: "500",
    maxWidth: 290,
  },
  footerHint: {
    paddingVertical: 12,
    alignItems: "center",
  },
  hintText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#998070",
    letterSpacing: 0.3,
  },
});
