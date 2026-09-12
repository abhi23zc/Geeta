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

import { Header, Screen, TextR } from "@/components/ritual-ui";
import { C } from "@/constants/ritual-theme";
import { Task, useRitual } from "@/state/ritual-store";

const NIGHT_TEMPLE_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCBM-a_USNYgwfogwljPSzQLIKdcDNkUICdu9RAKLzyv3Aa5SQeaiok00CnOst5mTCXfCvdHBcKY7_lKfuxWDKJ8q_1bFjBzCGx8nUz984x7rEGZmf5fobbcJKXzEDAVScc0gEySJDyeF0eYN660d56aEoS-g_a_bsDEK0NzMwUbYrwJmqOCUi81OPz3s5gitqPCbD8_XzOJrFTKIcB3XqW8Q1ZWjlSan0KbOvvixaCmkjHCpc_nNFXWQ";

const reviewCopy: Record<string, string> = {
  proposal: "Completed with focus",
  walk: "5,420 steps under moonlight",
  read: "Carried forward to dawn",
};

export default function Night() {
  const { tasks, reflection, setReflection, alarmTime, alarmTone } =
    useRitual();
  const [journal, setJournal] = useState(
    "Practiced remaining calm during the client review. Felt grounded.",
  );
  const [mindState, setMindState] = useState("Grounded");
  const [completed, setCompleted] = useState(false);

  const reviewTasks = useMemo(() => {
    const preferred = ["proposal", "walk", "read"]
      .map((id) => tasks.find((task) => task.id === id))
      .filter(Boolean) as Task[];

    return preferred.length ? preferred : tasks.slice(0, 3);
  }, [tasks]);

  return (
    <Screen>
      <Header eyebrow="Night" />

      <View style={s.heroCard}>
        <View style={s.heroGlow} />
        <View style={s.heroTop}>
          <View style={s.heroCopy}>
            <View style={s.sandhiChip}>
              <View style={s.goldDot} />
              <TextR style={s.sandhiText}>SANDHYA SANDHI</TextR>
            </View>
            <TextR style={s.heroTitle}>Night Reflection</TextR>
            <TextR style={s.heroSubtitle}>
              Close your day in stillness & gratitude
            </TextR>
          </View>
          <View style={s.moonBadge}>
            <Moon size={34} color={C.gold} fill={C.gold} />
            <View style={s.starDot} />
          </View>
        </View>

        <View style={s.templeCard}>
          <Image source={{ uri: NIGHT_TEMPLE_URL }} style={s.templeImage} />
          <View style={s.templeOverlay} />
          <View style={s.templeFooter}>
            <View style={s.templeLabel}>
              <Moon size={14} color={C.gold} />
              <TextR style={s.templeKicker}>Pradosha Kala</TextR>
            </View>
            <TextR serif style={s.templeMood}>
              Shanti & Visrama
            </TextR>
          </View>
        </View>
      </View>

      <SectionTitle
        icon={<View style={s.sectionDot} />}
        title="Daily Mindful Review"
        badge="3 of 4 Done"
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
          />
        ))}
      </View>

      <SectionTitle
        icon={<Heart size={21} color={C.goldDark} />}
        title="Memory of Quiet Joy"
      />
      <View style={s.joyCard}>
        <View style={s.lotusGlow} />
        <View style={s.joyTop}>
          <TextR style={s.promptKicker}>TODAY'S SACRED PROMPT</TextR>
          <View style={s.kritajnataChip}>
            <TextR style={s.kritajnataText}>Kritajnata</TextR>
          </View>
        </View>
        <TextR serif style={s.joyPrompt}>
          “What brought you quiet joy today?”
        </TextR>
        <TextInput
          value={reflection}
          onChangeText={setReflection}
          multiline
          textAlignVertical="top"
          placeholder="Write one quiet joy from your day..."
          placeholderTextColor={C.mutedSoft}
          style={s.reflectionInput}
        />
      </View>

      <SectionTitle
        icon={<PenLine size={21} color={C.primary} />}
        title="Evening Journal Note"
        helper="Mindful Check-in"
      />
      <View style={s.journalCard}>
        <View style={s.journalInputWrap}>
          <TextInput
            value={journal}
            onChangeText={setJournal}
            multiline
            textAlignVertical="top"
            placeholder="Write any lingering thoughts before sleep..."
            placeholderTextColor={C.mutedSoft}
            style={s.journalInput}
          />
          <View style={s.savedRow}>
            <Sparkles size={13} color={C.mutedSoft} />
            <TextR style={s.savedText}>Saved locally</TextR>
          </View>
        </View>
        <View style={s.mindRow}>
          <TextR style={s.mindLabel}>Mind State:</TextR>
          {["Serene", "Grounded", "Grateful"].map((state) => (
            <Pressable
              key={state}
              onPress={() => setMindState(state)}
              style={[s.mindPill, mindState === state && s.mindPillActive]}
            >
              <TextR
                style={[
                  s.mindPillText,
                  mindState === state && s.mindPillTextActive,
                ]}
              >
                {state}
              </TextR>
            </Pressable>
          ))}
        </View>
      </View>

      <SectionTitle
        icon={<AlarmClock size={21} color={C.goldDark} />}
        title="Dawn Preparation"
      />
      <View style={s.dawnCard}>
        <View style={s.dawnTop}>
          <View>
            <TextR style={s.promptKicker}>TOMORROW'S WAKE-UP</TextR>
            <View style={s.timeRow}>
              <TextR serif style={s.timeText}>
                {alarmTime}
              </TextR>
              <TextR style={s.amText}>AM</TextR>
            </View>
            <View style={s.toneRow}>
              <Music size={16} color={C.goldDark} />
              <TextR style={s.toneText}>{alarmTone}</TextR>
            </View>
          </View>
          <View style={s.alarmSwitch}>
            <View style={s.alarmKnob}>
              <SunMedium size={15} color={C.primary} />
            </View>
          </View>
        </View>

        <Link href="/alarm/setup" asChild>
          <Pressable
            style={({ pressed }) => [s.adjustBtn, pressed && s.pressed]}
          >
            <Timer size={16} color={C.inkSoft} />
            <TextR style={s.adjustText}>Adjust Time</TextR>
          </Pressable>
        </Link>

        <View style={s.targetPill}>
          <View style={s.greenDot} />
          <TextR style={s.targetText}>Brahma Muhurta Target</TextR>
        </View>

        <View style={s.intentionBox}>
          <Sparkles size={19} color={C.primary} />
          <TextR style={s.intentionText}>
            Intention: Wake early for 20-min mindful breathwork and Surya
            namaskar.
          </TextR>
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
        <Moon size={22} color={C.white} fill={C.white} />
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
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  helper?: string;
}) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionTitleRow}>
        {icon}
        <TextR style={s.sectionTitle}>{title}</TextR>
      </View>
      {badge ? (
        <View style={s.sectionBadge}>
          <TextR style={s.sectionBadgeText}>{badge}</TextR>
        </View>
      ) : helper ? (
        <TextR style={s.sectionHelper}>{helper}</TextR>
      ) : null}
    </View>
  );
}

function ReviewRow({ task, carried }: { task: Task; carried: boolean }) {
  const done = task.done && !carried;

  return (
    <View style={[s.reviewRow, carried && s.reviewRowCarry]}>
      <View style={s.reviewLeft}>
        <View
          style={[s.reviewIcon, done ? s.reviewIconDone : s.reviewIconCarry]}
        >
          {done ? (
            <Check size={16} color={C.white} strokeWidth={3} />
          ) : (
            <TextR style={s.syncText}>↻</TextR>
          )}
        </View>
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
              (done ? "Completed with care" : "Carried forward to dawn")}
          </TextR>
        </View>
      </View>
      {carried ? (
        <View style={s.tomorrowPill}>
          <TextR style={s.tomorrowText}>Tomorrow</TextR>
        </View>
      ) : (
        <CheckCircle2 size={20} color={C.greenDark} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  heroCard: {
    borderRadius: 34,
    padding: 24,
    backgroundColor: "#403326",
    shadowColor: "#21180F",
    shadowOpacity: 0.24,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
    overflow: "hidden",
    marginBottom: 30,
  },
  heroGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -54,
    top: -58,
    backgroundColor: "rgba(254, 194, 74, 0.15)",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  heroCopy: {
    flex: 1,
  },
  sandhiChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 249, 245, 0.15)",
    marginBottom: 11,
  },
  goldDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.gold,
  },
  sandhiText: {
    color: "#FFDEA7",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.9,
  },
  heroTitle: {
    color: C.white,
    fontSize: 30,
    lineHeight: 37,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: "#FFF1E8",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 5,
  },
  moonBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255, 222, 167, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  starDot: {
    position: "absolute",
    top: 19,
    right: 19,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFB694",
  },
  templeCard: {
    height: 118,
    borderRadius: 26,
    overflow: "hidden",
    marginTop: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  templeImage: {
    width: "100%",
    height: "100%",
    opacity: 0.78,
  },
  templeOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(64, 51, 38, 0.28)",
  },
  templeFooter: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 13,
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
    color: "#FEC24A",
    fontSize: 13,
    fontWeight: "800",
  },
  templeMood: {
    color: "#f9e8e0ff",
    fontSize: 16,
    fontStyle: "italic",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flex: 1,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.goldDark,
  },
  sectionTitle: {
    fontSize: 23,
    lineHeight: 30,
    fontWeight: "800",
    color: C.ink,
  },
  sectionBadge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: C.sand,
  },
  sectionBadgeText: {
    fontSize: 14,
    fontWeight: "800",
    color: C.primary,
  },
  sectionHelper: {
    fontSize: 12,
    letterSpacing: 1.1,
    color: C.inkSoft,
  },
  reviewCard: {
    borderRadius: 26,
    backgroundColor: C.white,
    padding: 14,
    shadowColor: "#8C4010",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
    marginBottom: 28,
  },
  reviewRow: {
    minHeight: 64,
    borderRadius: 4,
    backgroundColor: C.surfaceLow,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  reviewRowCarry: {
    backgroundColor: C.surfaceHigh,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewIconDone: {
    backgroundColor: C.green,
  },
  reviewIconCarry: {
    backgroundColor: C.gold,
  },
  reviewTitle: {
    fontSize: 16,
    color: C.ink,
  },
  reviewTitleDone: {
    color: C.muted,
    textDecorationLine: "line-through",
  },
  reviewSub: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: C.greenDark,
    marginTop: 2,
  },
  reviewSubCarry: {
    color: C.goldDark,
  },
  syncText: {
    color: "#271900",
    fontSize: 16,
    fontWeight: "900",
  },
  tomorrowPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#FFDEA7",
  },
  tomorrowText: {
    fontSize: 11,
    fontWeight: "800",
    color: C.ink,
  },
  joyCard: {
    borderRadius: 30,
    backgroundColor: C.surfaceLow,
    padding: 22,
    overflow: "hidden",
    marginBottom: 28,
  },
  lotusGlow: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    right: -32,
    bottom: -30,
    backgroundColor: "rgba(231, 111, 46, 0.12)",
  },
  joyTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  promptKicker: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
    color: C.ink,
  },
  kritajnataChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: C.sand,
  },
  kritajnataText: {
    fontSize: 11,
    fontWeight: "800",
    color: C.primary,
  },
  joyPrompt: {
    fontSize: 24,
    lineHeight: 35,
    fontStyle: "italic",
    color: C.ink,
    marginTop: 16,
    marginBottom: 12,
  },
  reflectionInput: {
    minHeight: 114,
    borderRadius: 0,
    backgroundColor: C.white,
    color: C.ink,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  journalCard: {
    borderRadius: 28,
    backgroundColor: C.white,
    padding: 16,
    shadowColor: "#8C4010",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
    marginBottom: 28,
  },
  journalInputWrap: {
    backgroundColor: C.surfaceLow,
    minHeight: 112,
    padding: 14,
    marginBottom: 14,
  },
  journalInput: {
    minHeight: 78,
    color: C.ink,
    fontSize: 16,
    lineHeight: 24,
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
    color: C.mutedSoft,
  },
  mindRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  mindLabel: {
    fontSize: 12,
    letterSpacing: 1,
    color: C.inkSoft,
  },
  mindPill: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.surfaceContainer,
  },
  mindPillActive: {
    backgroundColor: "#FFDEA7",
  },
  mindPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: C.inkSoft,
  },
  mindPillTextActive: {
    color: C.ink,
  },
  dawnCard: {
    borderRadius: 28,
    backgroundColor: C.white,
    padding: 20,
    shadowColor: "#8C4010",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 32,
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
    fontSize: 44,
    lineHeight: 52,
    color: C.primary,
    fontWeight: "300",
  },
  amText: {
    fontSize: 22,
    color: C.inkSoft,
  },
  toneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  toneText: {
    flexShrink: 1,
    fontSize: 13,
    color: C.inkSoft,
  },
  alarmSwitch: {
    width: 58,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.saffron,
    padding: 4,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  alarmKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  adjustBtn: {
    height: 34,
    borderRadius: 999,
    backgroundColor: C.surfaceContainer,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  adjustText: {
    fontSize: 14,
    fontWeight: "800",
    color: C.ink,
  },
  targetPill: {
    height: 34,
    borderRadius: 999,
    backgroundColor: C.surfaceLow,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.greenDark,
  },
  targetText: {
    fontSize: 12,
    fontWeight: "800",
    color: C.ink,
  },
  intentionBox: {
    backgroundColor: "rgba(255, 219, 204, 0.45)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  intentionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: C.inkSoft,
  },
  completeBtn: {
    height: 58,
    borderRadius: 999,
    backgroundColor: C.saffron,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: C.saffron,
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  completeDone: {
    backgroundColor: C.green,
  },
  completeText: {
    color: C.white,
    fontSize: 16,
    fontWeight: "800",
  },
  footerBlessing: {
    textAlign: "center",
    fontSize: 12,
    letterSpacing: 1,
    color: C.inkSoft,
    marginTop: 14,
    marginBottom: 20,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
