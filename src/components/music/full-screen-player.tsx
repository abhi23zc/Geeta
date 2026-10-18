import { useMotionEnvironment } from '@/hooks/use-motion-environment';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookOpen,
  ChevronDown,
  Clock,
  Download,
  Gauge,
  Heart,
  ListMusic,
  Moon,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Flame,
  Check,
  Music,
  Trash2,
  Wifi,
  X,
} from 'lucide-react-native';
import { useMusicPlayer } from '@/state/music-player-store';
import { useLanguage } from '@/i18n/provider';
import { TextR, DawnMeshBackdrop } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { MusicArtwork } from './music-artwork';
import {
  downloadTrack,
  readMusicDownloads,
  removeDownloadedTrack,
  clearMusicCache,
  setMusicWifiOnly,
  getMusicWifiOnly,
  subscribeMusicDownloads,
} from '@/services/music-downloads';
import type { SleepTimerOption } from '@/types/music';

const time = (ms: number) =>
  `${Math.floor(Math.max(0, ms) / 60000)}:${String(
    Math.floor(Math.max(0, ms) / 1000) % 60,
  ).padStart(2, '0')}`;

export function FullScreenPlayer() {
  const p = useMusicPlayer();
  return p.isFullPlayerVisible && p.currentTrack ? (
    <PlayerBody key={`${p.currentTrack.id}-${p.currentTrack.revision}`} />
  ) : null;
}

function PlayerBody() {
  const motion = useMotionEnvironment();
  const p = useMusicPlayer();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const tr = (en: string, hi: string) => (language === 'hi' ? hi : en);

  const [tab, setTab] = useState<'art' | 'lyrics' | 'queue'>('art');
  const [sheet, setSheet] = useState<'speed' | 'timer' | 'downloads' | null>(null);
  const [barWidth, setBarWidth] = useState(1);
  const [drag, setDrag] = useState<number | null>(null);
  const [follow, setFollow] = useState(true);
  const [message, setMessage] = useState('');
  const [wifi, setWifi] = useState(true);
  const [downloads, setDownloads] = useState<Awaited<ReturnType<typeof readMusicDownloads>>>([]);

  const scroll = useRef<ScrollView>(null);
  const lyricY = useRef<Record<number, number>>({});

  const track = p.currentTrack;
  const activeLyric =
    track?.lyrics?.findIndex(
      (l) => p.positionMs >= l.startMs && p.positionMs < l.endMs,
    ) ?? -1;

  useEffect(() => {
    if (follow && tab === 'lyrics' && activeLyric >= 0) {
      scroll.current?.scrollTo({
        y: Math.max(0, (lyricY.current[activeLyric] ?? 0) - 50),
        animated: true,
      });
    }
  }, [activeLyric, follow, tab]);

  useEffect(() => {
    if (sheet !== 'downloads' || Platform.OS === 'web') return;
    const load = () => {
      void readMusicDownloads()
        .then((rows) => {
          setDownloads(rows);
          setWifi(getMusicWifiOnly());
        })
        .catch((e) => setMessage(String(e)));
    };
    load();
    return subscribeMusicDownloads(load);
  }, [sheet]);

  if (!p.isFullPlayerVisible || !track) return null;

  const seek = (x: number) =>
    Math.round(Math.min(1, Math.max(0, x / barWidth)) * p.durationMs);

  const run = (fn: () => Promise<unknown>) => {
    void fn().catch((e) => setMessage(String(e)));
  };

  const isFav = p.isFavorite(track.id);
  const artSize = Math.min(width - 64, 280);
  const currentPos = drag ?? p.positionMs;
  const progressRatio =
    p.durationMs > 0 ? Math.min(100, (currentPos / p.durationMs) * 100) : 0;

  return (
    <Modal
      visible
      animationType={
        motion.reduced || !motion.motionReady ? 'none' : 'slide'
      }
      onRequestClose={() => (sheet ? setSheet(null) : p.closeFullPlayer())}
    >
      <View
        style={[
          styles.root,
          {
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {/* Background Dawn Mesh Gradient */}
        <DawnMeshBackdrop />

        {/* Ambient Warm Aura Orbs */}
        <View style={styles.ambientAuraTop} pointerEvents="none" />
        <View style={styles.ambientAuraBottom} pointerEvents="none" />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { maxWidth: Math.min(width, 540) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Navigation Bar */}
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('Close player', 'प्लेयर बंद करें')}
              onPress={p.closeFullPlayer}
              hitSlop={12}
              style={({ pressed }) => [
                styles.circleIconBtn,
                pressed && { opacity: 0.75, transform: [{ scale: 0.95 }] },
              ]}
            >
              <ChevronDown size={22} color={C.ink} strokeWidth={2.4} />
            </Pressable>

            <View style={styles.topHeaderPill}>
              <Flame size={12} color={C.saffron} fill={C.saffron} />
              <TextR style={styles.topHeaderPillText}>
                {tr('SACRED AUDIO', 'पवित्र संगीत')}
              </TextR>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isFav
                  ? tr('Remove favorite', 'पसंदीदा हटाएँ')
                  : tr('Add favorite', 'पसंदीदा बनाएँ')
              }
              onPress={() => p.toggleFavorite(track.id)}
              hitSlop={12}
              style={({ pressed }) => [
                styles.circleIconBtn,
                isFav && styles.circleIconBtnActive,
                pressed && { opacity: 0.75, transform: [{ scale: 0.95 }] },
              ]}
            >
              <Heart
                size={20}
                color={isFav ? C.saffron : C.ink}
                fill={isFav ? C.saffron : 'transparent'}
                strokeWidth={2.2}
              />
            </Pressable>
          </View>

          {/* Segmented Mode Tab Bar (Art / Lyrics / Queue) */}
          <View style={styles.segmentedWrap}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === 'art' }}
              onPress={() => setTab('art')}
              style={[
                styles.segmentedItem,
                tab === 'art' && styles.segmentedItemActive,
              ]}
            >
              <Music
                size={13}
                color={tab === 'art' ? C.primary : C.muted}
              />
              <TextR
                style={[
                  styles.segmentedText,
                  tab === 'art' && styles.segmentedTextActive,
                ]}
              >
                {tr('Sacred Art', 'चित्र')}
              </TextR>
            </Pressable>

            {!!track.lyrics?.length && (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === 'lyrics' }}
                onPress={() => setTab('lyrics')}
                style={[
                  styles.segmentedItem,
                  tab === 'lyrics' && styles.segmentedItemActive,
                ]}
              >
                <BookOpen
                  size={13}
                  color={tab === 'lyrics' ? C.primary : C.muted}
                />
                <TextR
                  style={[
                    styles.segmentedText,
                    tab === 'lyrics' && styles.segmentedTextActive,
                  ]}
                >
                  {tr('Shlokas & Meaning', 'श्लोक व अर्थ')}
                </TextR>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === 'queue' }}
              onPress={() => setTab('queue')}
              style={[
                styles.segmentedItem,
                tab === 'queue' && styles.segmentedItemActive,
              ]}
            >
              <ListMusic
                size={13}
                color={tab === 'queue' ? C.primary : C.muted}
              />
              <TextR
                style={[
                  styles.segmentedText,
                  tab === 'queue' && styles.segmentedTextActive,
                ]}
              >
                {tr('Queue', 'सूची')} ({p.queue.length})
              </TextR>
            </Pressable>
          </View>

          {/* Tab 1: Sacred Medallion Art */}
          {tab === 'art' && (
            <View style={styles.medallionSection}>
              {/* Outer Golden Aura Glow */}
              <View
                style={[
                  styles.medallionHalo,
                  { width: artSize + 24, height: artSize + 24, borderRadius: (artSize + 24) / 2 },
                  p.isPlaying && styles.medallionHaloPlaying,
                ]}
                pointerEvents="none"
              />
              <View
                style={[
                  styles.medallionOuter,
                  { width: artSize, height: artSize, borderRadius: artSize / 2 },
                  p.isPlaying && styles.medallionOuterPlaying,
                ]}
              >
                <MusicArtwork
                  uri={track.artworkUrl}
                  category={track.categoryTheme ?? track.category}
                  style={styles.medallionArtwork}
                  iconSize={64}
                />
              </View>
            </View>
          )}

          {/* Tab 2: Synchronized Shlokas & Meaning */}
          {tab === 'lyrics' && (
            <View style={styles.lyricsCardWrap}>
              <ScrollView
                ref={scroll}
                style={styles.lyricsScroll}
                onScrollBeginDrag={() => setFollow(false)}
                showsVerticalScrollIndicator={false}
              >
                {track.lyrics?.map((l, i) => {
                  const isActive = i === activeLyric;
                  return (
                    <Pressable
                      key={`${l.startMs}-${i}`}
                      onLayout={(e) => {
                        lyricY.current[i] = e.nativeEvent.layout.y;
                      }}
                      onPress={() => run(() => p.seekTo(l.startMs))}
                      accessibilityRole="button"
                      accessibilityLabel={`${tr('Seek to', 'यहाँ जाएँ')} ${time(
                        l.startMs,
                      )}`}
                      style={[
                        styles.lyricVerseBox,
                        isActive && styles.lyricVerseBoxActive,
                      ]}
                    >
                      <TextR style={[styles.sanskritText, isActive && styles.sanskritTextActive]}>
                        {l.sanskrit}
                      </TextR>
                      {!!l.transliteration && (
                        <TextR style={styles.translitText}>
                          {l.transliteration}
                        </TextR>
                      )}
                      <TextR style={[styles.translationText, isActive && styles.translationTextActive]}>
                        {l.translation}
                      </TextR>
                    </Pressable>
                  );
                })}
              </ScrollView>
              {!follow && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setFollow(true)}
                  style={styles.followPill}
                >
                  <BookOpen size={12} color="#FFFFFF" />
                  <TextR style={styles.followPillText}>
                    {tr('Follow shlokas', 'बोल के साथ चलें')}
                  </TextR>
                </Pressable>
              )}
            </View>
          )}

          {/* Tab 3: Playlist Queue */}
          {tab === 'queue' && (
            <View style={styles.queueContainer}>
              {p.queue.map((t, i) => {
                const isCurrentInQueue = i === p.queueIndex;
                const isAvail = t.availability === 'available';
                return (
                  <Pressable
                    key={`${t.id}-${i}`}
                    onPress={() => run(() => p.playTrack(t, p.queue, i))}
                    disabled={!isAvail}
                    accessibilityRole="button"
                    style={[
                      styles.queueRow,
                      isCurrentInQueue && styles.queueRowActive,
                      !isAvail && { opacity: 0.5 },
                    ]}
                  >
                    <View style={styles.queueIndexCircle}>
                      {isCurrentInQueue && p.isPlaying ? (
                        <Play size={11} color={C.primary} fill={C.primary} />
                      ) : (
                        <TextR style={styles.queueIndexText}>{i + 1}</TextR>
                      )}
                    </View>

                    <View style={styles.queueInfoCol}>
                      <TextR
                        style={[
                          styles.queueTrackTitle,
                          isCurrentInQueue && { color: C.primary, fontWeight: '800' },
                        ]}
                        numberOfLines={1}
                      >
                        {t.title}
                      </TextR>
                      <TextR style={styles.queueTrackArtist} numberOfLines={1}>
                        {t.subtitle || t.artist || (isAvail ? tr('Available', 'उपलब्ध') : tr('Coming soon', 'शीघ्र आ रहा है'))}
                      </TextR>
                    </View>

                    <TextR style={styles.queueTrackDuration}>
                      {isAvail ? time(t.durationMs) : tr('Preview', 'पूर्वावलोकन')}
                    </TextR>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Track Titles & Metadata */}
          <View style={styles.trackDetailsCol}>
            <TextR serif style={styles.trackTitle}>
              {track.title}
            </TextR>
            <TextR style={styles.trackArtist}>
              {track.subtitle || track.artist || (track.raga ? `${track.raga} · ` : '') + tr('Daily Meditation', 'दैनिक ध्यान')}
            </TextR>
          </View>

          {/* Loading or Error Banners */}
          {(p.isLoading || p.isBuffering) && (
            <View style={styles.loadingBanner}>
              <ActivityIndicator color={C.saffron} size="small" />
              <TextR style={styles.loadingBannerText}>
                {tr('Connecting divine audio…', 'ऑडियो लोड हो रहा है…')}
              </TextR>
            </View>
          )}

          {p.error && (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <TextR style={styles.errorText}>{p.error}</TextR>
              <Pressable
                onPress={() => run(p.retry)}
                style={styles.retryBtn}
                accessibilityRole="button"
              >
                <TextR style={styles.retryBtnText}>{tr('Retry', 'फिर प्रयास करें')}</TextR>
              </Pressable>
            </View>
          )}

          {/* Interactive Scrub Bar */}
          <View style={styles.scrubberSection}>
            <View
              onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
              style={styles.scrubTrack}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={tr('Playback position', 'चलने का स्थान')}
              accessibilityValue={{
                min: 0,
                max: Math.round(p.durationMs / 1000),
                now: Math.round(p.positionMs / 1000),
                text: `${time(p.positionMs)} / ${time(p.durationMs)}`,
              }}
              accessibilityActions={[
                { name: 'increment', label: tr('Forward 15 seconds', '15 सेकंड आगे') },
                { name: 'decrement', label: tr('Back 15 seconds', '15 सेकंड पीछे') },
              ]}
              onAccessibilityAction={(e) =>
                run(() =>
                  p.seekTo(
                    p.positionMs +
                      (e.nativeEvent.actionName === 'increment' ? 15000 : -15000),
                  ),
                )
              }
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) => setDrag(seek(e.nativeEvent.locationX))}
              onResponderMove={(e) => setDrag(seek(e.nativeEvent.locationX))}
              onResponderRelease={(e) => {
                run(() => p.seekTo(seek(e.nativeEvent.locationX)));
                setDrag(null);
              }}
              onResponderTerminate={() => setDrag(null)}
            >
              {/* Scrub Track Rail */}
              <View style={styles.scrubRail}>
                <View
                  style={[
                    styles.scrubFill,
                    { width: `${progressRatio}%` },
                  ]}
                />
              </View>

              {/* Illuminated Thumb */}
              <View
                style={[
                  styles.scrubThumb,
                  { left: `${Math.max(0, Math.min(97, progressRatio))}%` },
                ]}
              />
            </View>

            <View style={styles.timeRow}>
              <TextR style={styles.timeText}>{time(currentPos)}</TextR>
              <TextR style={styles.timeText}>{time(p.durationMs)}</TextR>
            </View>
          </View>

          {/* Main Devotional Transport Controls */}
          <View style={styles.transportRow}>
            {/* Shuffle */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('Shuffle', 'फेरबदल')}
              accessibilityState={{ selected: p.shuffle }}
              onPress={p.toggleShuffle}
              style={({ pressed }) => [
                styles.transportAuxBtn,
                p.shuffle && styles.transportAuxBtnActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Shuffle
                size={20}
                color={p.shuffle ? C.primary : C.muted}
                strokeWidth={2.2}
              />
            </Pressable>

            {/* Previous */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('Previous', 'पिछला')}
              onPress={() => run(p.prevTrack)}
              style={({ pressed }) => [
                styles.transportSkipBtn,
                pressed && { opacity: 0.8, transform: [{ scale: 0.94 }] },
              ]}
            >
              <SkipBack size={24} color={C.ink} strokeWidth={2.4} />
            </Pressable>

            {/* Grand Circular 3D Saffron Play/Pause Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                p.isPlaying ? tr('Pause', 'रोकें') : tr('Play', 'चलाएँ')
              }
              onPress={p.togglePlayPause}
              style={({ pressed }) => [
                styles.mainPlayBtn,
                pressed && { transform: [{ scale: 0.94 }], opacity: 0.92 },
              ]}
            >
              {p.isPlaying ? (
                <Pause size={30} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Play
                  size={30}
                  color="#FFFFFF"
                  fill="#FFFFFF"
                  style={{ marginLeft: 3 }}
                />
              )}
            </Pressable>

            {/* Next */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('Next', 'अगला')}
              onPress={() => run(p.nextTrack)}
              style={({ pressed }) => [
                styles.transportSkipBtn,
                pressed && { opacity: 0.8, transform: [{ scale: 0.94 }] },
              ]}
            >
              <SkipForward size={24} color={C.ink} strokeWidth={2.4} />
            </Pressable>

            {/* Repeat */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${tr('Repeat', 'दोहराएँ')}: ${tr(
                p.repeatMode,
                { off: 'बंद', all: 'सभी', one: 'एक' }[p.repeatMode],
              )}`}
              onPress={p.cycleRepeatMode}
              style={({ pressed }) => [
                styles.transportAuxBtn,
                p.repeatMode !== 'off' && styles.transportAuxBtnActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              {p.repeatMode === 'one' ? (
                <Repeat1 size={20} color={C.primary} strokeWidth={2.2} />
              ) : (
                <Repeat
                  size={20}
                  color={p.repeatMode !== 'off' ? C.primary : C.muted}
                  strokeWidth={2.2}
                />
              )}
            </Pressable>
          </View>

          {/* Secondary Utilities Bar (Speed / Timer / Downloads) */}
          <View style={styles.utilitiesRow}>
            {/* Speed Pill */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('Playback speed', 'चलाने की गति')}
              onPress={() => setSheet('speed')}
              style={({ pressed }) => [
                styles.utilityPill,
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Gauge size={14} color={C.primary} strokeWidth={2.2} />
              <TextR style={styles.utilityPillText}>
                {p.playbackRate}×
              </TextR>
            </Pressable>

            {/* Sleep Timer Pill */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('Sleep timer', 'स्लीप टाइमर')}
              onPress={() => setSheet('timer')}
              style={({ pressed }) => [
                styles.utilityPill,
                !!p.sleepTimer && styles.utilityPillActive,
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Moon
                size={14}
                color={p.sleepTimer ? C.primary : C.primary}
                strokeWidth={2.2}
              />
              <TextR
                style={[
                  styles.utilityPillText,
                  !!p.sleepTimer && { color: C.primary, fontWeight: '800' },
                ]}
              >
                {p.sleepTimer === 'end-of-track'
                  ? tr('End of track', 'ट्रैक अंत')
                  : p.sleepRemainingMs !== null
                  ? time(p.sleepRemainingMs)
                  : tr('Sleep timer', 'स्लीप टाइमर')}
              </TextR>
            </Pressable>

            {/* Offline Downloads Pill */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('Music downloads', 'संगीत डाउनलोड')}
              onPress={() => setSheet('downloads')}
              style={({ pressed }) => [
                styles.utilityPill,
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Download size={14} color={C.primary} strokeWidth={2.2} />
              <TextR style={styles.utilityPillText}>
                {tr('Downloads', 'डाउनलोड')}
              </TextR>
            </Pressable>
          </View>

          {!!message && (
            <View style={styles.alertNotice} accessibilityRole="alert">
              <TextR style={styles.alertNoticeText}>{message}</TextR>
            </View>
          )}
        </ScrollView>

        {/* Modal Sheet for Speed / Sleep Timer / Downloads */}
        <Modal
          visible={sheet !== null}
          transparent
          animationType={motion.reduced || !motion.motionReady ? 'none' : 'fade'}
          onRequestClose={() => setSheet(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              {/* Sheet Drag Handle */}
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeaderRow}>
                <TextR serif style={styles.sheetTitle}>
                  {sheet === 'speed'
                    ? tr('Playback Speed', 'चलाने की गति')
                    : sheet === 'timer'
                    ? tr('Sleep Timer', 'स्लीप टाइमर')
                    : tr('Offline Downloads', 'ऑफ़लाइन डाउनलोड')}
                </TextR>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tr('Close options', 'विकल्प बंद करें')}
                  onPress={() => setSheet(null)}
                  hitSlop={10}
                  style={styles.sheetCloseBtn}
                >
                  <X size={18} color={C.ink} strokeWidth={2.4} />
                </Pressable>
              </View>

              {/* Speed Options */}
              {sheet === 'speed' && (
                <View style={styles.optionsList}>
                  {[0.75, 1, 1.25, 1.5, 2].map((rate) => {
                    const isSelected = p.playbackRate === rate;
                    return (
                      <Pressable
                        key={rate}
                        onPress={() => {
                          p.setPlaybackRate(rate);
                          setSheet(null);
                        }}
                        style={[
                          styles.optionItem,
                          isSelected && styles.optionItemActive,
                        ]}
                      >
                        <TextR
                          style={[
                            styles.optionItemText,
                            isSelected && styles.optionItemTextActive,
                          ]}
                        >
                          {rate}×
                        </TextR>
                        {isSelected && (
                          <Check size={16} color={C.saffron} strokeWidth={2.4} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Sleep Timer Options */}
              {sheet === 'timer' && (
                <View style={styles.optionsList}>
                  {(
                    [
                      null,
                      5,
                      10,
                      15,
                      30,
                      45,
                      60,
                      'end-of-track',
                    ] as SleepTimerOption[]
                  ).map((opt) => {
                    const isSelected = p.sleepTimer === opt;
                    const label =
                      opt === null
                        ? tr('Off', 'बंद')
                        : opt === 'end-of-track'
                        ? tr('End of track', 'ट्रैक के अंत में')
                        : `${opt} ${tr('minutes', 'मिनट')}`;

                    return (
                      <Pressable
                        key={String(opt)}
                        onPress={() => {
                          p.setSleepTimer(opt);
                          setSheet(null);
                        }}
                        style={[
                          styles.optionItem,
                          isSelected && styles.optionItemActive,
                        ]}
                      >
                        <TextR
                          style={[
                            styles.optionItemText,
                            isSelected && styles.optionItemTextActive,
                          ]}
                        >
                          {label}
                        </TextR>
                        {isSelected && (
                          <Clock size={16} color={C.saffron} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Offline Downloads */}
              {sheet === 'downloads' && (
                <ScrollView style={{ maxHeight: 340 }}>
                  {Platform.OS === 'web' ? (
                    <TextR style={styles.downloadsNote}>
                      {tr(
                        'Music downloads are available in the mobile app.',
                        'संगीत डाउनलोड मोबाइल ऐप में उपलब्ध हैं।',
                      )}
                    </TextR>
                  ) : (
                    <View style={styles.downloadsBody}>
                      <View style={styles.wifiRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Wifi size={18} color={C.ink} />
                          <TextR style={styles.wifiLabel}>
                            {tr('Wi-Fi only', 'केवल वाई-फ़ाई')}
                          </TextR>
                        </View>
                        <Switch
                          accessibilityLabel={tr('Wi-Fi only', 'केवल वाई-फ़ाई')}
                          value={wifi}
                          onValueChange={(v) => {
                            setWifi(v);
                            run(() => setMusicWifiOnly(v));
                          }}
                          thumbColor={wifi ? C.saffron : '#C4CBDD'}
                          trackColor={{ false: 'rgba(140, 64, 16, 0.15)', true: 'rgba(229, 107, 39, 0.35)' }}
                        />
                      </View>

                      <TextR style={styles.storageText}>
                        {Math.round(
                          downloads.reduce((n, r) => n + r.bytes, 0) / 1048576,
                        )}{' '}
                        / 1024 MB {tr('used', 'प्रयुक्त')}
                      </TextR>

                      <Pressable
                        disabled={!track.asset}
                        onPress={() =>
                          run(() =>
                            downloadTrack(track, (r) =>
                              setMessage(`${Math.round(r * 100)}%`),
                            ),
                          )
                        }
                        style={[
                          styles.downloadActionBtn,
                          !track.asset && { opacity: 0.5 },
                        ]}
                      >
                        <Download size={16} color="#FFFFFF" strokeWidth={2.2} />
                        <TextR style={styles.downloadActionBtnText}>
                          {track.asset
                            ? tr('Download this track', 'इस ट्रैक को डाउनलोड करें')
                            : tr('Included with app', 'ऐप में शामिल')}
                        </TextR>
                      </Pressable>

                      {downloads.map((r) => (
                        <View key={r.hash} style={styles.downloadItemRow}>
                          <View style={{ flex: 1 }}>
                            <TextR style={styles.downloadItemName}>{r.track}</TextR>
                            <TextR style={styles.downloadItemStatus}>
                              {tr(r.status, {
                                queued: 'कतार में',
                                downloading: 'डाउनलोड हो रहा है',
                                verifying: 'जाँच हो रही है',
                                ready: 'तैयार',
                                cancelled: 'रद्द',
                                failed: 'विफल',
                                paused: 'रुका हुआ',
                              }[r.status])}
                            </TextR>
                          </View>
                          <Pressable
                            onPress={() => run(() => removeDownloadedTrack(r.track))}
                            style={styles.deleteDownloadBtn}
                          >
                            <Trash2 size={16} color="#D32F2F" />
                          </Pressable>
                        </View>
                      ))}

                      {downloads.length > 0 && (
                        <Pressable
                          onPress={() => run(clearMusicCache)}
                          style={styles.clearDownloadsBtn}
                        >
                          <TextR style={styles.clearDownloadsText}>
                            {tr('Clear all music downloads', 'संगीत डाउनलोड साफ़ करें')}
                          </TextR>
                        </Pressable>
                      )}
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.canvas,
  },
  ambientAuraTop: {
    position: 'absolute',
    top: -60,
    alignSelf: 'center',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(244, 185, 66, 0.18)',
  },
  ambientAuraBottom: {
    position: 'absolute',
    bottom: -60,
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(229, 107, 39, 0.14)',
  },
  scrollContent: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 8,
  },
  circleIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 150, 100, 0.25)',
    borderBottomWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8C4010',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  circleIconBtnActive: {
    backgroundColor: '#FFF4EB',
    borderColor: 'rgba(229, 107, 39, 0.4)',
    borderBottomColor: C.saffron,
  },
  topHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(254, 236, 220, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: 'rgba(244, 185, 66, 0.4)',
    shadowColor: '#8C4010',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  topHeaderPillText: {
    fontSize: 11,
    color: C.primary,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  segmentedWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(254, 236, 220, 0.75)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  segmentedItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8.5,
    borderRadius: 12,
  },
  segmentedItemActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#8C4010',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentedText: {
    fontSize: 12.5,
    color: C.muted,
    fontWeight: '600',
  },
  segmentedTextActive: {
    color: C.primary,
    fontWeight: '800',
  },
  medallionSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
    position: 'relative',
  },
  medallionHalo: {
    position: 'absolute',
    backgroundColor: 'rgba(244, 185, 66, 0.22)',
    shadowColor: C.gold,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 4,
  },
  medallionHaloPlaying: {
    backgroundColor: 'rgba(229, 107, 39, 0.25)',
    shadowColor: C.saffron,
    shadowOpacity: 0.6,
  },
  medallionOuter: {
    overflow: 'hidden',
    borderWidth: 3.5,
    borderColor: 'rgba(244, 185, 66, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8C4010',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    backgroundColor: '#FFF2E0',
  },
  medallionOuterPlaying: {
    borderColor: C.gold,
    shadowColor: C.saffron,
    shadowOpacity: 0.35,
  },
  medallionArtwork: {
    width: '100%',
    height: '100%',
  },
  lyricsCardWrap: {
    height: 290,
    backgroundColor: 'rgba(255, 248, 242, 0.92)',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 150, 100, 0.25)',
    borderBottomWidth: 2,
    shadowColor: '#8C4010',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 12,
    position: 'relative',
  },
  lyricsScroll: {
    flex: 1,
  },
  lyricVerseBox: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    gap: 4,
  },
  lyricVerseBoxActive: {
    backgroundColor: 'rgba(244, 185, 66, 0.16)',
    borderWidth: 1.2,
    borderColor: 'rgba(244, 185, 66, 0.45)',
  },
  sanskritText: {
    fontSize: 16.5,
    color: C.ink,
    fontWeight: '700',
    lineHeight: 24,
  },
  sanskritTextActive: {
    color: C.primary,
  },
  translitText: {
    fontSize: 12.5,
    color: C.muted,
    fontStyle: 'italic',
  },
  translationText: {
    fontSize: 13,
    color: C.inkSoft,
    lineHeight: 18.5,
  },
  translationTextActive: {
    color: C.ink,
    fontWeight: '700',
  },
  followPill: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.saffron,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: C.saffron,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
  },
  followPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  queueContainer: {
    maxHeight: 290,
    marginBottom: 12,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#FFFCF8',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 150, 100, 0.22)',
    borderBottomWidth: 2,
    shadowColor: '#8C4010',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 12,
  },
  queueRowActive: {
    backgroundColor: '#FFF9F2',
    borderColor: 'rgba(229, 107, 39, 0.45)',
    borderBottomColor: C.saffron,
  },
  queueIndexCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(229, 107, 39, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueIndexText: {
    fontSize: 11.5,
    color: C.primary,
    fontWeight: '800',
  },
  queueInfoCol: {
    flex: 1,
  },
  queueTrackTitle: {
    fontSize: 14,
    color: C.ink,
    fontWeight: '600',
  },
  queueTrackArtist: {
    fontSize: 11.5,
    color: C.muted,
    marginTop: 2,
  },
  queueTrackDuration: {
    fontSize: 11.5,
    color: C.mutedSoft,
    fontWeight: '600',
  },
  trackDetailsCol: {
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 12,
  },
  trackTitle: {
    fontSize: 23,
    color: C.ink,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  trackArtist: {
    fontSize: 13.5,
    color: C.muted,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 6,
  },
  loadingBannerText: {
    color: C.primary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    borderRadius: 12,
    padding: 10,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.25)',
  },
  errorText: {
    color: '#C62828',
    fontSize: 12,
    flex: 1,
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: C.primary,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  scrubberSection: {
    marginTop: 8,
    marginBottom: 4,
  },
  scrubTrack: {
    height: 32,
    justifyContent: 'center',
    position: 'relative',
  },
  scrubRail: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(140, 64, 16, 0.12)',
    overflow: 'hidden',
  },
  scrubFill: {
    height: '100%',
    backgroundColor: C.saffron,
    borderRadius: 3,
  },
  scrubThumb: {
    position: 'absolute',
    top: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: C.saffron,
    shadowColor: C.saffron,
    shadowOpacity: 0.5,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    marginLeft: -8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -2,
  },
  timeText: {
    fontSize: 12,
    color: C.mutedSoft,
    fontWeight: '600',
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginVertical: 12,
  },
  transportAuxBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transportAuxBtnActive: {
    backgroundColor: 'rgba(229, 107, 39, 0.12)',
  },
  transportSkipBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFCF8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 150, 100, 0.25)',
    borderBottomWidth: 2,
    shadowColor: '#8C4010',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  mainPlayBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: C.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.45)',
    shadowColor: C.saffron,
    shadowOpacity: 0.38,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  utilitiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 6,
  },
  utilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFCF8',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 150, 100, 0.22)',
    borderBottomWidth: 2,
    shadowColor: '#8C4010',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  utilityPillActive: {
    backgroundColor: '#FFF7EF',
    borderColor: 'rgba(229, 107, 39, 0.45)',
    borderBottomColor: C.saffron,
  },
  utilityPillText: {
    fontSize: 12,
    color: C.inkSoft,
    fontWeight: '700',
  },
  alertNotice: {
    marginTop: 12,
    backgroundColor: 'rgba(254, 236, 220, 0.85)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 185, 66, 0.4)',
  },
  alertNoticeText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(44, 34, 26, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFDFB',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 38,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#8C4010',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  sheetHandle: {
    width: 42,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(140, 64, 16, 0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 19,
    color: C.ink,
    fontWeight: '700',
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(140, 64, 16, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#FBF5EE',
    borderWidth: 1,
    borderColor: 'rgba(222, 192, 180, 0.45)',
  },
  optionItemActive: {
    backgroundColor: '#FFF3E8',
    borderColor: C.saffron,
  },
  optionItemText: {
    fontSize: 14.5,
    color: C.ink,
    fontWeight: '600',
  },
  optionItemTextActive: {
    color: C.primary,
    fontWeight: '800',
  },
  downloadsNote: {
    color: C.muted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  downloadsBody: {
    gap: 12,
  },
  wifiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  wifiLabel: {
    color: C.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  storageText: {
    color: C.muted,
    fontSize: 12,
  },
  downloadActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.saffron,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: C.saffron,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  downloadActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  downloadItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FBF5EE',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(222, 192, 180, 0.45)',
  },
  downloadItemName: {
    color: C.ink,
    fontSize: 13.5,
    fontWeight: '600',
  },
  downloadItemStatus: {
    color: C.muted,
    fontSize: 11,
    marginTop: 2,
  },
  deleteDownloadBtn: {
    padding: 8,
  },
  clearDownloadsBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 8,
  },
  clearDownloadsText: {
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: '700',
  },
});
