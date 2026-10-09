import { useLanguage } from '@/i18n/provider';
import { Link, useFocusEffect } from 'expo-router';
import { Alert, AppState, Pressable, View } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Screen, TextR } from '@/components/ritual-ui';
import { useContent } from '@/state/content-store';
import { StorageRecoveryNotice } from '@/components/storage-recovery-notice';
import { createSavedReplay } from '@/services/saved-replay';
import { useGitaProgress } from '@/state/gita-store';
import { prepareSavedReplay, removeSavedTeaching } from '@/services/content-cache';
export default function SavedTeachings() {
  const { t: translate, text: translateText } = useLanguage();
  const { snapshot } = useContent(), progress = useGitaProgress();
  const { bookmarks, toggleBookmark } = progress;
  const saved = snapshot.saved.filter(v => bookmarks.has(v.id));
  const player = useAudioPlayer(null);
  const playback = useAudioPlayerStatus(player);
  const [completionMs, setCompletionMs] = useState(0);
  useEffect(() => { if (completionMs && playback.playing && playback.currentTime * 1000 >= completionMs) { try { player.pause(); } catch {} } }, [completionMs, playback.currentTime, playback.playing, player]);
  const focused = useRef(false), alive = useRef(true);
  const [busy, setBusy] = useState(false);
  const copy = useRef({ translate, translateText });
  useEffect(() => { copy.current = { translate, translateText }; }, [translate, translateText]);
  const controller = useRef<ReturnType<typeof createSavedReplay<Awaited<ReturnType<typeof prepareSavedReplay>>>> | null>(null);
  useEffect(() => {
    alive.current = true;
    const instance = createSavedReplay({
      prepare: prepareSavedReplay,
      eligible: () => alive.current && focused.current && AppState.currentState === 'active',
      play: ready => { setCompletionMs(ready.practice.narration!.completionMs); player.replace(ready.practice.narration!.audioSource); player.play(); },
      pause: () => { try { player.pause(); } catch {} },
      busy: value => { if (alive.current) setBusy(value); },
      error: error => Alert.alert(copy.current.translate('Replay unavailable'), copy.current.translateText(String(error))),
    });
    controller.current = instance;
    const listener = AppState.addEventListener('change', state => { if (state !== 'active') instance.invalidate(); });
    return () => { alive.current = false; listener.remove(); instance.dispose(); controller.current = null; };
  }, [player]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; controller.current?.invalidate(); };
  }, []));
  return <Screen><Link href="/"><TextR>{translate("← Home")}</TextR></Link><TextR style={{ fontSize: 28, marginVertical: 20 }}>{translate("Saved teachings")}</TextR><StorageRecoveryNotice store={progress} />
    {!saved.length ? <TextR>{translate("Bookmark a teaching to keep its text available offline.")}</TextR> : null}
    {saved.map(v => <View key={v.id} style={{ paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
      <TextR>{v.referenceLabel ?? translate('chapterVerse', { chapter: v.chapter, verse: v.verse })}</TextR><TextR serif style={{ marginVertical: 12 }}>{v.sanskrit}</TextR><TextR>{v.transliteration}</TextR><TextR style={{ marginVertical: 12 }}>{v.meaning}</TextR><TextR>{v.takeaway}</TextR><TextR>{v.context}</TextR>
      {v.words.map((w, i) => <TextR key={i}>{w.sanskrit} — {w.meaning}</TextR>)}
      <TextR>{translate("Expired recordings download again when you choose replay.")}</TextR>
      <Pressable disabled={busy || !progress.ready} onPress={() => { void controller.current?.replay(v.id); }} style={{ paddingVertical: 12 }}><TextR>{busy ? translate("Preparing recording…") : translate("Replay recording")}</TextR></Pressable>
      <Pressable accessibilityRole="button" onPress={() => controller.current?.invalidate()} style={{ minHeight: 48, justifyContent: 'center' }}><TextR>{translate("Pause")}</TextR></Pressable>
      <Pressable disabled={!progress.ready} onPress={() => { controller.current?.invalidate(); toggleBookmark(v.id); void removeSavedTeaching(v.id).catch(error => Alert.alert(translate("Could not remove saved text"), translateText(String(error)))); }} style={{ paddingVertical: 12 }}><TextR>{translate("Remove bookmark")}</TextR></Pressable>
    </View>)}
  </Screen>;
}
