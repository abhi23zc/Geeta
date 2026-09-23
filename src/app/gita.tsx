import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { router } from "expo-router";
import { Activity, BookOpen, Bookmark, Check, Flame, Leaf, Pause, Play, Share2, Sparkles } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, Share, StyleSheet, TextInput, View } from "react-native";

import { AudioSpectrumVisualizer } from "@/components/audio-spectrum-visualizer";
import { AruMascot } from "@/components/aru-mascot";
import { MindsetCelebrationModal } from "@/components/mindset-celebration-modal";
import { MovingChakra } from "@/components/moving-chakra";
import { Header, Screen, TextR } from "@/components/ritual-ui";
import { C } from "@/constants/ritual-theme";
import { getDailyGitaVerse } from "@/data/gita-verses";
import { useLocalDateKey } from "@/hooks/use-local-date-key";
import { useGitaProgress } from "@/state/gita-store";

type Mode = "read" | "listen" | "breathe";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export default function Gita() {
  const { ready } = useGitaProgress();
  const today = useLocalDateKey();
  if (!ready) {
    return (
      <Screen>
        <Header eyebrow="GITA" />
        <View style={s.loading}>
          <MovingChakra size={28} color={C.saffron} />
          <TextR style={s.loadingText}>Preparing today’s contemplation…</TextR>
        </View>
      </Screen>
    );
  }
  return <GitaContent key={today} today={today} />;
}

function GitaContent({ today }: { today: string }) {
  const [year, month, day] = today.split("-").map(Number);
  const verse = getDailyGitaVerse(new Date(year, month - 1, day));
  const progressState = useGitaProgress();
  const savedReflection = progressState.getReflection(today);
  const [reflection, setReflection] = useState(savedReflection?.text ?? "");
  const [activeMode, setActiveMode] = useState<Mode>("read");
  const [showCelebration, setShowCelebration] = useState(false);
  const player = useAudioPlayer(verse.audioSource, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const hasAudio = Boolean(verse.audioSource);
  const isPlaying = hasAudio && status.playing;
  const playbackProgress = status.duration > 0 ? status.currentTime / status.duration : 0;
  const isCompleted = progressState.completedDates.has(today);
  const breathingComplete = progressState.breathingCompletedDates.has(today);

  const handleShare = async () => {
    await Share.share({
      title: `Today’s Gita · ${verse.chapter}.${verse.verse}`,
      message: `${verse.sanskrit}\n\n${verse.meaning}\n\nToday’s practice: ${verse.takeaway}`,
    }).catch(() => undefined);
  };

  const togglePlayback = () => {
    setActiveMode("listen");
    if (!hasAudio) return;
    if (status.playing) player.pause();
    else {
      if (status.didJustFinish) player.seekTo(0).catch(() => undefined);
      player.play();
    }
  };

  const finishReflection = () => {
    if (!progressState.completeReflection(today, verse.id, reflection)) {
      Alert.alert("Write one thought", "A short sentence is enough to complete today’s reflection.");
      return;
    }
    setShowCelebration(true);
  };

  return (
    <Screen contentContainerStyle={s.screenContent}>
      <Header eyebrow="GITA" />
      <View style={s.topHeaderSection}>
        <View style={s.chapterBadge}>
          <MovingChakra size={17} color={C.saffron} />
          <TextR style={s.chapterText}>CHAPTER {verse.chapter} · SHLOKA {verse.verse}</TextR>
        </View>
        <TextR style={s.topSubtitle}>{verse.theme}</TextR>
        <View style={s.progressRow}>
          <View style={[s.progressChip, isCompleted && s.progressChipDone]}>
            {isCompleted ? <Check size={13} color={C.white} strokeWidth={3} /> : <Sparkles size={13} color={C.goldDark} />}
            <TextR style={[s.progressChipText, isCompleted && s.progressChipTextDone]}>
              {isCompleted ? "Today complete" : "Daily reflection"}
            </TextR>
          </View>
          <View style={s.streakChip}>
            <Flame size={13} color={C.saffron} fill={C.saffron} />
            <TextR style={s.streakText}>{progressState.streak} day streak</TextR>
          </View>
        </View>
      </View>

      <View style={s.actionTrioRow}>
        <ModeTile title="Deep Read" subtitle="Word by word" active={activeMode === "read"}
          icon={<BookOpen size={23} color={activeMode === "read" ? C.white : C.ink} />}
          onPress={() => { setActiveMode("read"); router.push({ pathname: "/gita/deep-read", params: { id: verse.id } }); }} />
        <ModeTile title="Recitation" subtitle={hasAudio ? (isPlaying ? "Playing" : "Listen") : "Awaiting audio"}
          active={activeMode === "listen"} icon={<Activity size={23} color={activeMode === "listen" ? C.white : C.primary} />}
          onPress={togglePlayback} />
        <ModeTile title="Breathe" subtitle={breathingComplete ? "Complete" : "3 min calm"}
          active={activeMode === "breathe"} icon={<Leaf size={23} color={activeMode === "breathe" ? C.white : C.greenDark} />}
          onPress={() => { setActiveMode("breathe"); router.push({ pathname: "/breathe", params: { returnTo: "gita" } }); }} />
      </View>

      <View style={s.shlokaCard}>
        <AruMascot clip="gita_reading" size={172} loop muted glow="day" interactive={false} />
        <TextR serif style={s.devanagariText}>{verse.sanskrit}</TextR>
        <TextR serif style={s.transliterationText}>“{verse.transliteration}”</TextR>
        <View style={s.goldenDivider} />
        <View style={s.meaningBox}>
          <View style={s.kickerRow}><View style={s.meaningDot} /><TextR style={s.kicker}>DAILY MEANING</TextR></View>
          <TextR style={s.meaningBody}>{verse.meaning}</TextR>
        </View>
        <View style={s.takeawayChip}><Sparkles size={17} color="#FFF6DF" /><TextR style={s.takeawayText}>{verse.takeaway}</TextR></View>
      </View>

      <View style={s.audioCard}>
        <View style={s.audioHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel={isPlaying ? "Pause recitation" : "Play recitation"}
            disabled={!hasAudio} onPress={togglePlayback}
            style={({ pressed }) => [s.playButton, !hasAudio && s.playButtonDisabled, pressed && hasAudio && s.pressed]}>
            {isPlaying ? <Pause size={21} color={C.white} fill={C.white} /> : <Play size={21} color={C.white} fill={C.white} />}
          </Pressable>
          <View style={s.audioCopy}>
            <TextR style={s.audioTitle}>Sacred recitation</TextR>
            <TextR style={s.audioSub}>{hasAudio ? (status.isBuffering ? "Preparing audio…" : `Chapter ${verse.chapter} · Shloka ${verse.verse}`) : "Reviewed recording will be added before release"}</TextR>
          </View>
          {hasAudio ? <View style={s.audioMeta}><AudioSpectrumVisualizer isPlaying={isPlaying} barCount={7} height={17} /><TextR style={s.audioTimer}>{formatTime(status.currentTime)} / {formatTime(status.duration)}</TextR></View> : null}
        </View>
        <View style={s.audioTrack}><View style={[s.audioFill, { width: `${Math.max(0, Math.min(100, playbackProgress * 100))}%` }]} /></View>
      </View>

      <View style={s.reflectionCard}>
        <View style={s.reflectionHeader}>
          <View style={s.kickerRow}><Sparkles size={17} color={C.goldDark} /><TextR style={s.reflectionKicker}>TODAY’S REFLECTION</TextR></View>
          <View style={s.utilityRow}>
            <Pressable accessibilityLabel="Share today’s verse" onPress={handleShare} style={s.utilityButton}><Share2 size={18} color={C.ink} /></Pressable>
            <Pressable accessibilityLabel={progressState.bookmarks.has(verse.id) ? "Remove bookmark" : "Bookmark verse"} onPress={() => progressState.toggleBookmark(verse.id)} style={s.utilityButton}>
              <Bookmark size={18} color={C.ink} fill={progressState.bookmarks.has(verse.id) ? C.gold : "transparent"} />
            </Pressable>
          </View>
        </View>
        <TextR serif style={s.prompt}>{verse.reflectionPrompt}</TextR>
        <TextInput accessibilityLabel="Your reflection" value={reflection} onChangeText={setReflection}
          onBlur={() => progressState.saveReflection(today, verse.id, reflection)} placeholder="Write one honest thought…"
          placeholderTextColor="#9A8173" multiline textAlignVertical="top" maxLength={600} style={s.reflectionInput} />
        <View style={s.reflectionFooter}>
          <TextR style={s.savedHint}>{reflection.length}/600 · Saved locally when you leave or complete</TextR>
          <Pressable accessibilityRole="button" onPress={finishReflection}
            style={({ pressed }) => [s.completeButton, isCompleted && s.completeButtonDone, pressed && s.pressed]}>
            <Check size={18} color={C.white} strokeWidth={3} /><TextR style={s.completeText}>{isCompleted ? "Completed" : "Complete reflection"}</TextR>
          </Pressable>
        </View>
      </View>
      <MindsetCelebrationModal visible={showCelebration} onClose={() => setShowCelebration(false)} />
    </Screen>
  );
}

function ModeTile({ title, subtitle, icon, active, onPress }: { title: string; subtitle: string; icon: React.ReactNode; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress}
    style={({ pressed }) => [s.actionTile, active ? s.actionTileActive : s.actionTileIdle, pressed && s.pressed]}>
    <View style={[s.actionIcon, active ? s.actionIconActive : s.actionIconIdle]}>{icon}</View>
    <TextR style={[s.actionTitle, active && s.actionTextActive]}>{title}</TextR>
    <TextR style={[s.actionSub, active && s.actionSubActive]} numberOfLines={1}>{subtitle}</TextR>
  </Pressable>;
}

const s = StyleSheet.create({
  screenContent: { paddingBottom: 130 },
  loading: { minHeight: 420, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { color: C.muted, fontSize: 15 },
  topHeaderSection: { alignItems: "center", marginTop: 4, marginBottom: 18 },
  chapterBadge: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: "rgba(229,107,39,0.08)", borderWidth: 1, borderColor: "rgba(229,107,39,0.2)" },
  chapterText: { color: "#B8450A", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  topSubtitle: { color: "#423227", fontSize: 15, fontWeight: "600", textAlign: "center", marginTop: 8 },
  progressRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  progressChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, height: 29, borderRadius: 15, backgroundColor: "#FFF4E7" },
  progressChipDone: { backgroundColor: C.green }, progressChipText: { fontSize: 11.5, fontWeight: "700", color: C.goldDark }, progressChipTextDone: { color: C.white },
  streakChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, height: 29, borderRadius: 15, backgroundColor: C.white }, streakText: { fontSize: 11.5, fontWeight: "700", color: C.inkSoft },
  actionTrioRow: { flexDirection: "row", gap: 9, marginBottom: 18 },
  actionTile: { flex: 1, minHeight: 104, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, borderRadius: 20, borderWidth: 1.5 },
  actionTileIdle: { backgroundColor: "rgba(255,255,255,0.94)", borderColor: "#FFFFFF", borderBottomColor: "rgba(216,144,64,0.28)", elevation: 2 },
  actionTileActive: { backgroundColor: C.saffron, borderColor: C.saffron, borderTopColor: "rgba(255,255,255,0.45)", elevation: 4 },
  actionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", marginBottom: 7 }, actionIconIdle: { backgroundColor: "#FCECDF" }, actionIconActive: { backgroundColor: "rgba(255,255,255,0.22)" },
  actionTitle: { fontSize: 13.5, fontWeight: "800", textAlign: "center" }, actionSub: { fontSize: 10.5, fontWeight: "600", color: C.inkSoft, marginTop: 2, textAlign: "center" }, actionTextActive: { color: C.white }, actionSubActive: { color: "#FFF7F1" },
  shlokaCard: { alignItems: "center", padding: 22, marginBottom: 18, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1.5, borderColor: "#FFFFFF", elevation: 3, shadowColor: "#8C4010", shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 7 } },
  devanagariText: { color: "#231A11", fontSize: 22, lineHeight: 35, fontWeight: "600", textAlign: "center", marginTop: 2, marginBottom: 12 }, transliterationText: { color: "#4A382D", fontSize: 14, lineHeight: 22, fontStyle: "italic", textAlign: "center" },
  goldenDivider: { width: 62, height: 3, borderRadius: 2, backgroundColor: "rgba(244,185,66,0.46)", marginVertical: 15 },
  meaningBox: { width: "100%", padding: 15, borderRadius: 17, backgroundColor: "#FFF6EF", marginBottom: 14 }, kickerRow: { flexDirection: "row", alignItems: "center", gap: 7 }, meaningDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary }, kicker: { color: C.primary, fontSize: 11.5, fontWeight: "800", letterSpacing: 1.1 }, meaningBody: { color: C.ink, fontSize: 14.5, lineHeight: 22, marginTop: 7 },
  takeawayChip: { width: "100%", minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 16, backgroundColor: C.green }, takeawayText: { flex: 1, color: C.white, fontSize: 14, lineHeight: 19, fontWeight: "700", textAlign: "center" },
  audioCard: { padding: 16, marginBottom: 18, borderRadius: 21, backgroundColor: "#FDEDE1", borderWidth: 1, borderColor: "#FFFFFF" }, audioHeader: { flexDirection: "row", alignItems: "center" },
  playButton: { width: 45, height: 45, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: C.saffron }, playButtonDisabled: { backgroundColor: "#C8A996" }, audioCopy: { flex: 1, marginHorizontal: 11 }, audioTitle: { fontSize: 14.5, fontWeight: "800" }, audioSub: { fontSize: 11.5, lineHeight: 16, color: C.inkSoft, marginTop: 2 }, audioMeta: { alignItems: "flex-end", gap: 3 }, audioTimer: { color: C.goldDark, fontSize: 11.5, fontWeight: "700" },
  audioTrack: { height: 5, borderRadius: 3, overflow: "hidden", backgroundColor: "#E6CFBE", marginTop: 13 }, audioFill: { height: "100%", borderRadius: 3, backgroundColor: C.saffron },
  reflectionCard: { padding: 18, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1.5, borderColor: C.white, elevation: 2 }, reflectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, reflectionKicker: { color: C.goldDark, fontSize: 11.5, fontWeight: "800", letterSpacing: 1.1 }, utilityRow: { flexDirection: "row", gap: 8 }, utilityButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#F8E5CF" },
  prompt: { color: C.ink, fontSize: 19, lineHeight: 27, marginTop: 16, marginBottom: 13 }, reflectionInput: { minHeight: 116, borderRadius: 17, borderWidth: 1, borderColor: "#EAD8CA", backgroundColor: "#FFF9F4", padding: 14, color: C.ink, fontSize: 15, lineHeight: 22 }, reflectionFooter: { marginTop: 12, gap: 11 }, savedHint: { color: C.muted, fontSize: 11.5 },
  completeButton: { minHeight: 49, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18, borderRadius: 16, backgroundColor: C.saffron }, completeButtonDone: { backgroundColor: C.green }, completeText: { color: C.white, fontSize: 14.5, fontWeight: "800" }, pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
});
