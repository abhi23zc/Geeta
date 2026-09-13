import { Link } from "expo-router";
import {
  AlarmClock,
  Check,
  CheckCircle2,
  Heart,
  Moon,
  Music,
  PenLine,
  Sparkles,
  SunMedium,
  Timer,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";

import { Header, Screen, TextR } from "@/components/ritual-ui";
import { Interactive3DCard } from "@/components/interactive-3d-card";
import { C } from "@/constants/ritual-theme";
import { Task, useRitual } from "@/state/ritual-store";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const NIGHT_TEMPLE_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCBM-a_USNYgwfogwljPSzQLIKdcDNkUICdu9RAKLzyv3Aa5SQeaiok00CnOst5mTCXfCvdHBcKY7_lKfuxWDKJ8q_1bFjBzCGx8nUz984x7rEGZmf5fobbcJKXzEDAVScc0gEySJDyeF0eYN660d56aEoS-g_a_bsDEK0NzMwUbYrwJmqOCUi81OPz3s5gitqPCbD8_XzOJrFTKIcB3XqW8Q1ZWjlSan0KbOvvixaCmkjHCpc_nNFXWQ";

const reviewCopy: Record<string, string> = {
  proposal: "Completed with focus",
  walk: "5,420 steps under moonlight",
  read: "Carried forward to dawn",
};

function CelestialMoonIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Defs>
        <LinearGradient id="moonGoldGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#FFE598" />
          <Stop offset="50%" stopColor="#F4B942" />
          <Stop offset="100%" stopColor="#FF9E44" />
        </LinearGradient>
      </Defs>
      {/* Golden Crescent Moon */}
      <Path
        d="M22.5 5C15.6 5 10 10.6 10 17.5C10 24.4 15.6 30 22.5 30C26.8 30 30.6 27.8 32.8 24.4C27.2 24.4 22.6 19.8 22.6 14.2C22.6 10.4 24.7 7.1 27.8 5.4C26.1 5.1 24.3 5 22.5 5Z"
        fill="url(#moonGoldGrad)"
      />
      {/* Inner Drop Detail */}
      <Path
        d="M22.8 15.5C22.8 15.5 24.5 17.8 24.5 19C24.5 19.9 23.7 20.7 22.8 20.7C21.9 20.7 21.1 19.9 21.1 19C21.1 17.8 22.8 15.5 22.8 15.5Z"
        fill="#FF9E44"
      />
      {/* Star Spark Detail */}
      <Path d="M29.5 7.5L30 9L31.5 9.5L30 10L29.5 11.5L29 10L27.5 9.5L29 9L29.5 7.5Z" fill="#FFE598" />
      <Path d="M12.5 9L12.8 10L13.8 10.3L12.8 10.6L12.5 11.6L12.2 10.6L11.2 10.3L12.2 10L12.5 9Z" fill="#F4B942" opacity="0.8" />
    </Svg>
  );
}

export default function Night() {
  const { tasks, toggleTask, reflection, setReflection, alarmTime, alarmTone } =
    useRitual();
  const [journal, setJournal] = useState(
    "Practiced remaining calm during the client review. Felt grounded.",
  );
  const [mindState, setMindState] = useState("Grounded");
  const [completed, setCompleted] = useState(false);
  const [alarmOn, setAlarmOn] = useState(true);

  const reviewTasks = useMemo(() => {
    const preferred = ["proposal", "walk", "read"]
      .map((id) => tasks.find((task) => task.id === id))
      .filter(Boolean) as Task[];

    return preferred.length ? preferred : tasks.slice(0, 3);
  }, [tasks]);

  const completedCount = reviewTasks.filter((t) => t.done).length;

  return (
    <Screen night>
      <Header title="Morning Ritual" eyebrow="NIGHT EDITION" night />

      {/* Atmospheric Celestial Night Mood Header Card */}
      <View style={{ marginBottom: 24 }}>
        <Interactive3DCard night maxTiltDeg={8} style={s.heroCard3D}>
          <View style={s.heroTop}>
            <View style={s.heroCopy}>
              <View style={s.sandhiChip}>
                <View style={s.goldDotPulse} />
                <TextR style={s.sandhiText}>SANDHYA & NIDRA</TextR>
              </View>
              <TextR style={s.heroTitle}>Night Reflection</TextR>
              <TextR style={s.heroSubtitle}>
                Close your day in stillness &{"\n"}gratitude
              </TextR>
            </View>
            <View style={s.moonBadgeWrapper}>
              <View style={s.moonGlowHalo} pointerEvents="none">
                <Svg width={100} height={100} viewBox="0 0 100 100">
                  <Defs>
                    <RadialGradient id="moonAuraGrad" cx="50%" cy="50%" r="50%">
                      <Stop offset="0%" stopColor="#F4B942" stopOpacity="0.55" />
                      <Stop offset="50%" stopColor="#FF9E44" stopOpacity="0.25" />
                      <Stop offset="100%" stopColor="#F4B942" stopOpacity="0" />
                    </RadialGradient>
                  </Defs>
                  <Rect width={100} height={100} fill="url(#moonAuraGrad)" />
                </Svg>
              </View>
              <View style={s.moonBadgeContainer}>
                <CelestialMoonIcon size={34} />
              </View>
            </View>
          </View>

          <View style={s.templeCard}>
            <Image source={{ uri: NIGHT_TEMPLE_URL }} style={s.templeImage} />
            <View style={s.templeOverlay} />
            <View style={s.templeFooter}>
              <View style={s.templeLabel}>
                <Moon size={14} color="#FF9E44" fill="#FF9E44" />
                <TextR style={s.templeKicker}>Pradosha Kala</TextR>
              </View>
              <TextR serif style={s.templeMood}>
                Shanti & Visrama
              </TextR>
            </View>
          </View>
        </Interactive3DCard>
      </View>

      {/* SECTION 1: Daily Mindful Task Review */}
      <View style={{ marginBottom: 24 }}>
        <SectionTitle
          icon={<View style={s.sectionDot} />}
          title="Daily Mindful Review"
          badge={`${completedCount} of ${reviewTasks.length} Done`}
          night
        />
        <View style={s.reviewCard}>
          {reviewTasks.map((task, index) => (
            <ReviewRow
              key={task.id}
              task={task}
              carried={
                task.id === "read" ||
                (!task.done && index === reviewTasks.length - 1)
              }
              onToggle={() => toggleTask(task.id)}
            />
          ))}
        </View>
      </View>

      {/* SECTION 2: Quiet Joy & Gratitude Memory */}
      <View style={{ marginBottom: 24 }}>
        <SectionTitle
          icon={<Heart size={20} color="#FF9E44" fill="#FF9E44" />}
          title="Memory of Quiet Joy"
          night
        />
        <View style={s.joyCard}>
          <View style={s.joyTop}>
            <TextR style={s.promptKicker}>TODAY'S SACRED PROMPT</TextR>
            <View style={s.kritajnataChip}>
              <TextR style={s.kritajnataText}>Kritajnata</TextR>
            </View>
          </View>
          <TextR serif style={s.joyPrompt}>
            “What brought you quiet joy today?”
          </TextR>
          <View style={s.joyInputWrap}>
            <TextInput
              value={reflection}
              onChangeText={setReflection}
              multiline
              textAlignVertical="top"
              placeholder="Write one quiet joy from your day..."
              placeholderTextColor="#9BA3C0"
              style={s.reflectionInput}
            />
          </View>
        </View>
      </View>

      {/* SECTION 3: Short Evening Journal Note */}
      <View style={{ marginBottom: 24 }}>
        <SectionTitle
          icon={<PenLine size={20} color="#F4B942" />}
          title="Evening Journal Note"
          helper="Mindful Check-in"
          night
        />
        <View style={s.journalCard}>
          <View style={s.journalInputWrap}>
            <TextInput
              value={journal}
              onChangeText={setJournal}
              multiline
              textAlignVertical="top"
              placeholder="Write any lingering thoughts before sleep..."
              placeholderTextColor="#9BA3C0"
              style={s.journalInput}
            />
            <View style={s.savedRow}>
              <Sparkles size={13} color="#F4B942" />
              <TextR style={s.savedText}>Saved locally</TextR>
            </View>
          </View>
          <View style={s.mindRow}>
            <TextR style={s.mindLabel}>Mind State:</TextR>
            {[
              { label: "🕊️ Serene", id: "Serene" },
              { label: "🪷 Grounded", id: "Grounded" },
              { label: "🙏 Grateful", id: "Grateful" },
            ].map((st) => (
              <Pressable
                key={st.id}
                onPress={() => setMindState(st.id)}
                style={[s.mindPill, mindState === st.id && s.mindPillActive]}
              >
                <TextR
                  style={[
                    s.mindPillText,
                    mindState === st.id && s.mindPillTextActive,
                  ]}
                >
                  {st.label}
                </TextR>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* SECTION 4: Plan Tomorrow & Alarm Setup */}
      <View style={{ marginBottom: 28 }}>
        <SectionTitle
          icon={<AlarmClock size={20} color="#F4B942" />}
          title="Dawn Preparation"
          night
        />
        <View style={s.dawnCard}>
          <View style={s.dawnTop}>
            <View style={{ flex: 1 }}>
              <TextR style={s.promptKicker}>TOMORROW'S WAKE-UP</TextR>
              <View style={s.timeRow}>
                <TextR serif style={s.timeText}>
                  {alarmTime}
                </TextR>
                <TextR style={s.amText}>AM</TextR>
              </View>
              <View style={s.toneRow}>
                <Music size={15} color="#FF9E44" />
                <TextR style={s.toneText}>{alarmTone}</TextR>
              </View>
            </View>
            <Pressable
              onPress={() => setAlarmOn((v) => !v)}
              style={[s.alarmSwitch, !alarmOn && s.alarmSwitchOff]}
            >
              <View style={[s.alarmKnob, !alarmOn && s.alarmKnobOff]}>
                <SunMedium size={14} color="#FF9E44" />
              </View>
            </Pressable>
          </View>

          <View style={s.dawnActionRow}>
            <Link href="/alarm/setup" asChild>
              <Pressable
                style={({ pressed }) => [s.adjustBtn, pressed && s.pressed]}
              >
                <Timer size={16} color="#7D86A9" />
                <TextR style={s.adjustText}>Adjust Time</TextR>
              </Pressable>
            </Link>

            <View style={s.targetPill}>
              <View style={s.greenDot} />
              <TextR style={s.targetText}>Brahma Muhurta Target</TextR>
            </View>
          </View>

          <View style={s.intentionBox}>
            <Sparkles size={18} color="#FF9E44" />
            <TextR style={s.intentionText}>
              Intention: Wake early for 20-min mindful breathwork and Surya
              namaskar.
            </TextR>
          </View>
        </View>
      </View>

      <Pressable
        onPress={() => setCompleted((value) => !value)}
        style={({ pressed }) => [
          s.completeBtn,
          completed && s.completeDone,
          pressed && s.pressed,
        ]}
      >
        <Moon size={20} color="#F4B942" fill="#F4B942" />
        <TextR style={s.completeText}>
          {completed
            ? "Resting peacefully... Subha Ratri"
            : "Complete Reflection & Sleep Well"}
        </TextR>
      </Pressable>
      <TextR style={s.footerBlessing}>
        May your night be peaceful and your morning luminous
      </TextR>
    </Screen>
  );
}

function SectionTitle({
  icon,
  title,
  badge,
  helper,
  night = false,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  helper?: string;
  night?: boolean;
}) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionTitleRow}>
        {icon}
        <TextR style={[s.sectionTitle, night && { color: C.canvas }]}>
          {title}
        </TextR>
      </View>
      {badge ? (
        <View style={[s.sectionBadge, night && s.sectionBadgeNight]}>
          <TextR style={[s.sectionBadgeText, night && { color: C.gold }]}>
            {badge}
          </TextR>
        </View>
      ) : helper ? (
        <TextR style={[s.sectionHelper, night && { color: "#A3A5CF" }]}>
          {helper}
        </TextR>
      ) : null}
    </View>
  );
}

function ReviewRow({
  task,
  carried,
  onToggle,
}: {
  task: Task;
  carried: boolean;
  onToggle?: () => void;
}) {
  const done = task.done && !carried;
  const pressVal = useSharedValue(0);
  const checkScale = useSharedValue(1);

  const handlePress = () => {
    checkScale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );
    if (onToggle) onToggle();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: withSpring(pressVal.value ? 2 : 0, { damping: 14, stiffness: 240 }) },
      { scale: withSpring(pressVal.value ? 0.985 : 1, { damping: 14, stiffness: 240 }) },
    ],
  }));

  const animatedCheckStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => {
        pressVal.value = 1;
      }}
      onPressOut={() => {
        pressVal.value = 0;
      }}
      style={[s.reviewRow, carried && s.reviewRowCarry, animatedStyle]}
    >
      <View style={s.reviewLeft}>
        <Animated.View
          style={[
            s.reviewIcon,
            done ? s.reviewIconDone : s.reviewIconCarry,
            animatedCheckStyle,
          ]}
        >
          {done ? (
            <Check size={14} color="#2DD4BF" strokeWidth={3.5} />
          ) : (
            <TextR style={s.syncText}>↻</TextR>
          )}
        </Animated.View>
        <View style={{ flex: 1 }}>
          <TextR
            style={[s.reviewTitle, done && s.reviewTitleDone]}
            numberOfLines={1}
          >
            {task.id === "read" ? "Read 10 pages of Upanishads" : task.title}
          </TextR>
          <TextR
            style={[s.reviewSub, carried && s.reviewSubCarry]}
            numberOfLines={1}
          >
            {reviewCopy[task.id] ??
              (done ? "Completed with focus" : "Carried forward to dawn ↻")}
          </TextR>
        </View>
      </View>
      {carried ? (
        <View style={s.tomorrowPill}>
          <TextR style={s.tomorrowText}>Tomorrow</TextR>
        </View>
      ) : (
        <CheckCircle2 size={20} color={done ? "#2DD4BF" : "#7D86A9"} fill={done ? "rgba(45, 212, 191, 0.15)" : "transparent"} />
      )}
    </AnimatedPressable>
  );
}

const s = StyleSheet.create({
  heroCard3D: {},
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  heroCopy: {
    flex: 1,
    paddingRight: 4,
  },
  sandhiChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(244, 185, 66, 0.35)",
    marginBottom: 14,
  },
  goldDotPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF9E44",
    shadowColor: "#FF9E44",
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 2,
  },
  sandhiText: {
    color: "#F4B942",
    fontSize: 10.5,
    fontWeight: "600",
    letterSpacing: 1.8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    color: "#9BA3C0",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  moonBadgeWrapper: {
    position: "relative",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  moonGlowHalo: {
    position: "absolute",
    width: 100,
    height: 100,
    top: -20,
    left: -20,
    alignItems: "center",
    justifyContent: "center",
  },
  moonBadgeContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1E2342",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.16)",
    shadowColor: "#F4B942",
    shadowOpacity: 0.65,
    shadowRadius: 18,
    elevation: 8,
  },
  templeCard: {
    height: 128,
    borderRadius: 22,
    overflow: "hidden",
    marginTop: 24,
    backgroundColor: "#0A0C18",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  templeImage: {
    width: "100%",
    height: "100%",
    opacity: 0.85,
  },
  templeOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(10, 13, 26, 0.35)",
  },
  templeFooter: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  templeLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  templeKicker: {
    color: "#FF9E44",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.6,
  },
  templeMood: {
    color: "rgba(241, 243, 249, 0.95)",
    fontSize: 15,
    fontStyle: "italic",
    letterSpacing: 0.3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF9E44",
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
    color: "#F1F3F9",
    letterSpacing: -0.2,
  },
  sectionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.sand,
  },
  sectionBadgeNight: {
    backgroundColor: "rgba(244, 185, 66, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 185, 66, 0.3)",
  },
  sectionBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F4B942",
  },
  sectionHelper: {
    fontSize: 11,
    letterSpacing: 1.1,
    color: "#7D86A9",
  },
  reviewCard: {
    borderRadius: 20,
    backgroundColor: "rgba(20, 24, 46, 0.9)",
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    shadowColor: "#000000",
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  reviewRow: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  reviewRowCarry: {
    backgroundColor: "rgba(255, 158, 68, 0.06)",
    borderColor: "rgba(255, 158, 68, 0.2)",
    marginBottom: 0,
  },
  reviewLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reviewIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewIconDone: {
    backgroundColor: "rgba(45, 212, 191, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.5)",
  },
  reviewIconCarry: {
    backgroundColor: "rgba(255, 158, 68, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 158, 68, 0.4)",
  },
  reviewTitle: {
    fontSize: 14.5,
    fontWeight: "400",
    color: "#F1F3F9",
  },
  reviewTitleDone: {
    color: "rgba(241, 243, 249, 0.7)",
    textDecorationLine: "line-through",
  },
  reviewSub: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: "#2DD4BF",
    marginTop: 2,
  },
  reviewSubCarry: {
    color: "#F4B942",
  },
  syncText: {
    color: "#F4B942",
    fontSize: 14,
    fontWeight: "900",
  },
  tomorrowPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255, 158, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 158, 68, 0.3)",
  },
  tomorrowText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#F4B942",
  },
  joyCard: {
    borderRadius: 20,
    backgroundColor: "rgba(22, 28, 56, 0.9)",
    padding: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 158, 68, 0.25)",
    shadowColor: "#000000",
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 4,
  },
  joyTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  promptKicker: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.6,
    color: "#7D86A9",
  },
  kritajnataChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255, 158, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 158, 68, 0.3)",
  },
  kritajnataText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#FF9E44",
  },
  joyPrompt: {
    fontSize: 21,
    lineHeight: 32,
    fontStyle: "italic",
    color: "#F1F3F9",
    marginTop: 12,
    marginBottom: 12,
  },
  joyInputWrap: {
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(244, 185, 66, 0.2)",
  },
  reflectionInput: {
    minHeight: 70,
    color: "rgba(241, 243, 249, 0.9)",
    fontSize: 14.5,
    lineHeight: 23,
  },
  journalCard: {
    borderRadius: 20,
    backgroundColor: "rgba(20, 24, 46, 0.9)",
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    shadowColor: "#000000",
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 4,
  },
  journalInputWrap: {
    backgroundColor: "#0E1122",
    borderRadius: 16,
    minHeight: 100,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  journalInput: {
    minHeight: 68,
    color: "#F1F3F9",
    fontSize: 14.5,
    lineHeight: 23,
  },
  savedRow: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  savedText: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: "#7D86A9",
  },
  mindRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mindLabel: {
    fontSize: 11,
    letterSpacing: 1,
    color: "#7D86A9",
  },
  mindPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  mindPillActive: {
    backgroundColor: "rgba(255, 158, 68, 0.2)",
    borderColor: "rgba(255, 158, 68, 0.5)",
  },
  mindPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9BA3C0",
  },
  mindPillTextActive: {
    color: "#F4B942",
    fontWeight: "600",
  },
  dawnCard: {
    borderRadius: 20,
    backgroundColor: "rgba(20, 24, 46, 0.9)",
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    shadowColor: "#000000",
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 4,
  },
  dawnTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginTop: 4,
  },
  timeText: {
    fontSize: 46,
    lineHeight: 52,
    color: "#F4B942",
    fontWeight: "300",
  },
  amText: {
    fontSize: 20,
    color: "#7D86A9",
    fontWeight: "500",
  },
  toneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  toneText: {
    flexShrink: 1,
    fontSize: 13,
    color: "#9BA3C0",
  },
  alarmSwitch: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E76F2E",
    padding: 4,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  alarmSwitchOff: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "flex-start",
  },
  alarmKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0B0D19",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 158, 68, 0.4)",
  },
  alarmKnobOff: {
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  dawnActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  adjustBtn: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.09)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  adjustText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F1F3F9",
  },
  targetPill: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(45, 212, 191, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.3)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2DD4BF",
  },
  targetText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2DD4BF",
  },
  intentionBox: {
    backgroundColor: "rgba(231, 111, 46, 0.15)",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(231, 111, 46, 0.3)",
  },
  intentionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(241, 243, 249, 0.9)",
  },
  completeBtn: {
    height: 56,
    borderRadius: 999,
    backgroundColor: "#E76F2E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "rgba(217, 101, 37, 0.45)",
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 158, 68, 0.3)",
  },
  completeDone: {
    backgroundColor: "#2DD4BF",
    borderColor: "#5EEAD4",
  },
  completeText: {
    color: "#F1F3F9",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  footerBlessing: {
    textAlign: "center",
    fontSize: 11,
    letterSpacing: 1.2,
    color: "rgba(125, 134, 169, 0.9)",
    marginTop: 14,
    marginBottom: 40,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
});
