import { useLanguage } from '@/i18n/provider';
import { Link, useFocusEffect } from 'expo-router';
import { Alert, AppState, Pressable, View } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Screen, TextR } from '@/components/ritual-ui';
import { useContent } from '@/state/content-store';
import { useGitaProgress } from '@/state/gita-store';
import { prepareSavedReplay, removeSavedTeaching } from '@/services/content-cache';
export default function SavedTeachings() {
  const { t: translate, text: translateText } = useLanguage();
  const { snapshot } = useContent(), { bookmarks, toggleBookmark } = useGitaProgress();
  const saved = snapshot.saved.filter(v => bookmarks.has(v.id));
  const player = useAudioPlayer(null), release = useRef<(() => void) | null>(null);
  const playback = useAudioPlayerStatus(player);
  const [completionMs, setCompletionMs] = useState(0);
  useEffect(() => { if (completionMs && playback.playing && playback.currentTime * 1000 >= completionMs) { try { player.pause(); } catch {} } }, [completionMs, playback.currentTime, playback.playing, player]);
  const mounted = useRef(true);
  useFocusEffect(useCallback(() => { mounted.current = true; return () => { mounted.current = false; try { player.pause(); } catch {} release.current?.(); release.current = null; }; }, [player]));
  const [busy, setBusy] = useState(false);
  useEffect(() => { mounted.current = true; const listener = AppState.addEventListener('change', state => { if (state !== 'active') { try { player.pause(); } catch {} } }); return () => { mounted.current = false; listener.remove(); release.current?.(); }; }, [player]);
  const replay = async (id: string) => {
    setBusy(true);
    try {
      const ready = await prepareSavedReplay(id);
      if (!mounted.current) { ready.release(); return; }
      player.pause(); release.current?.(); release.current = ready.release;
      setCompletionMs(ready.practice.narration!.completionMs);
      player.replace(ready.practice.narration!.audioSource); player.play();
    } catch (error) { Alert.alert(translate("Replay unavailable"), translateText(String(error))); }
    finally { if (mounted.current) setBusy(false); }
  };
  return <Screen><Link href="/"><TextR>{translate("← Home")}</TextR></Link><TextR style={{ fontSize: 28, marginVertical: 20 }}>{translate("Saved teachings")}</TextR>
    {!saved.length ? <TextR>{translate("Bookmark a teaching to keep its text available offline.")}</TextR> : null}
    {saved.map(v => <View key={v.id} style={{ paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
      <TextR>{v.referenceLabel ?? translate('chapterVerse', { chapter: v.chapter, verse: v.verse })}</TextR><TextR serif style={{ marginVertical: 12 }}>{v.sanskrit}</TextR><TextR>{v.transliteration}</TextR><TextR style={{ marginVertical: 12 }}>{v.meaning}</TextR><TextR>{v.takeaway}</TextR><TextR>{v.context}</TextR>
      {v.words.map((w, i) => <TextR key={i}>{w.sanskrit} — {w.meaning}</TextR>)}
      <TextR>{translate("Expired recordings download again when you choose replay.")}</TextR>
      <Pressable disabled={busy} onPress={() => { void replay(v.id); }} style={{ paddingVertical: 12 }}><TextR>{busy ? translate("Preparing recording…") : translate("Replay recording")}</TextR></Pressable>
      <Pressable accessibilityRole="button" onPress={() => player.pause()} style={{ minHeight: 48, justifyContent: 'center' }}><TextR>{translate("Pause")}</TextR></Pressable>
      <Pressable onPress={() => { toggleBookmark(v.id); void removeSavedTeaching(v.id).catch(error => Alert.alert(translate("Could not remove saved text"), translateText(String(error)))); }} style={{ paddingVertical: 12 }}><TextR>{translate("Remove bookmark")}</TextR></Pressable>
    </View>)}
  </Screen>;
}
