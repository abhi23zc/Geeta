import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Bookmark, Check, Sparkles } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { AruMascot } from "@/components/aru-mascot";
import { Screen, TextR } from "@/components/ritual-ui";
import { C } from "@/constants/ritual-theme";
import { getDailyGitaVerse, getGitaVerse } from "@/data/gita-verses";
import { useGitaProgress } from "@/state/gita-store";

export default function DeepRead() {
  const params = useLocalSearchParams<{ id?: string }>();
  const verse = getGitaVerse(params.id) ?? getDailyGitaVerse();
  const { bookmarks, toggleBookmark } = useGitaProgress();
  const bookmarked = bookmarks.has(verse.id);

  return (
    <Screen contentContainerStyle={s.screenContent}>
      <View style={s.header}>
        <Pressable accessibilityLabel="Back to today’s verse" onPress={() => router.back()} style={s.iconButton}>
          <ArrowLeft size={23} color={C.ink} />
        </Pressable>
        <View style={s.headerCopy}>
          <TextR style={s.eyebrow}>DEEP READ</TextR>
          <TextR style={s.headerTitle}>Chapter {verse.chapter} · Shloka {verse.verse}</TextR>
        </View>
        <Pressable accessibilityLabel={bookmarked ? "Remove bookmark" : "Bookmark verse"} onPress={() => toggleBookmark(verse.id)} style={s.iconButton}>
          <Bookmark size={21} color={C.ink} fill={bookmarked ? C.gold : "transparent"} />
        </Pressable>
      </View>

      <View style={s.heroCard}>
        <AruMascot clip="gita_reading" size={150} loop muted glow="day" interactive={false} />
        <TextR serif style={s.sanskrit}>{verse.sanskrit}</TextR>
        <TextR serif style={s.transliteration}>{verse.transliteration}</TextR>
      </View>

      <Section label="PLAIN MEANING">
        <TextR style={s.body}>{verse.meaning}</TextR>
      </Section>

      <Section label="WORD BY WORD">
        <View style={s.wordList}>
          {verse.words.map((word) => (
            <View key={word.sanskrit} style={s.wordRow}>
              <TextR serif style={s.wordSanskrit}>{word.sanskrit}</TextR>
              <View style={s.wordLine} />
              <TextR style={s.wordMeaning}>{word.meaning}</TextR>
            </View>
          ))}
        </View>
      </Section>

      <Section label="CONTEXT">
        <TextR style={s.body}>{verse.context}</TextR>
      </Section>

      <View style={s.practiceCard}>
        <Sparkles size={20} color={C.goldDark} />
        <View style={s.practiceCopy}>
          <TextR style={s.practiceLabel}>TODAY’S PRACTICE</TextR>
          <TextR style={s.practiceText}>{verse.takeaway}</TextR>
        </View>
      </View>

      <Pressable onPress={() => router.back()} style={({ pressed }) => [s.doneButton, pressed && s.pressed]}>
        <Check size={19} color={C.white} strokeWidth={3} />
        <TextR style={s.doneText}>Return to reflection</TextR>
      </Pressable>
    </Screen>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <TextR style={s.sectionLabel}>{label}</TextR>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  screenContent: { paddingBottom: 42 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.94)", borderWidth: 1, borderColor: C.white },
  headerCopy: { flex: 1, alignItems: "center" },
  eyebrow: { color: C.saffron, fontSize: 10.5, fontWeight: "900", letterSpacing: 1.7 },
  headerTitle: { color: C.ink, fontSize: 16, fontWeight: "800", marginTop: 3 },
  heroCard: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.96)", borderRadius: 26, padding: 22, borderWidth: 1.5, borderColor: C.white, marginBottom: 16 },
  sanskrit: { color: C.ink, fontSize: 22, lineHeight: 36, fontWeight: "600", textAlign: "center", marginTop: 2 },
  transliteration: { color: C.inkSoft, fontSize: 14, lineHeight: 22, fontStyle: "italic", textAlign: "center", marginTop: 14 },
  section: { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.white },
  sectionLabel: { color: C.primary, fontSize: 11.5, fontWeight: "900", letterSpacing: 1.2, marginBottom: 10 },
  body: { color: C.ink, fontSize: 15, lineHeight: 24 },
  wordList: { gap: 11 },
  wordRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  wordSanskrit: { color: C.ink, fontSize: 17, fontWeight: "700" },
  wordLine: { flex: 1, height: 1, backgroundColor: "#EAD8CA" },
  wordMeaning: { color: C.inkSoft, fontSize: 13.5, maxWidth: "48%", textAlign: "right" },
  practiceCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 20, padding: 18, backgroundColor: "#FFF0DA", marginBottom: 18 },
  practiceCopy: { flex: 1 },
  practiceLabel: { color: C.goldDark, fontSize: 11, fontWeight: "900", letterSpacing: 1.1 },
  practiceText: { color: C.ink, fontSize: 16, lineHeight: 23, fontWeight: "700", marginTop: 5 },
  doneButton: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 17, backgroundColor: C.saffron },
  doneText: { color: C.white, fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
});
