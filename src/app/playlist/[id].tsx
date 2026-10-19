import { MusicArtwork } from '@/components/music/music-artwork';
import { useLanguage } from '@/i18n/provider';
import React, { useMemo } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Clock,
  Heart,
  Pause,
  Play,
  Shuffle,
  Flame,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, TextR, DawnMeshBackdrop, useDockHeight } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useMusicPlayer, useMusicCatalog } from '@/state/music-player-store';
import type { MusicTrack } from '@/types/music';
import { AudioSpectrumVisualizer } from '@/components/audio-spectrum-visualizer';

function formatTrackDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export default function PlaylistDetailScreen() {
  const router = useRouter();
  const { text: translateText } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();

  const catalog = useMusicCatalog();
  const playlist = useMemo(
    () => catalog.playlists.find((p) => p.id === id),
    [id, catalog.playlists],
  );

  const playlistTracks = useMemo(() => {
    if (!playlist) return [];
    return playlist.trackIds
      .map((tid) => catalog.tracks.find((t) => t.id === tid))
      .filter((t): t is MusicTrack => Boolean(t));
  }, [playlist, catalog.tracks]);

  const totalDurationMs = useMemo(
    () =>
      playlistTracks.reduce(
        (acc, t) =>
          acc + (t.availability === 'available' ? t.durationMs : 0),
        0,
      ),
    [playlistTracks],
  );

  const {
    currentTrack,
    isPlaying,
    activateTrack,
    playPlaylist,
    openFullPlayer,
    toggleFavorite,
    isFavorite,
  } = useMusicPlayer(false);

  const insets = useSafeAreaInsets();
  const dockHeight = useDockHeight();

  if (!playlist) {
    return (
      <Screen>
        <DawnMeshBackdrop />
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
        >
          <ChevronLeft size={24} color={C.ink} />
          <TextR style={{ color: C.ink, fontWeight: '700' }}>
            {translateText("Back to Library")}
          </TextR>
        </Pressable>
        <View style={styles.notFoundWrap}>
          <TextR serif style={styles.notFoundTitle}>
            {translateText("Playlist Not Found")}
          </TextR>
        </View>
      </Screen>
    );
  }

  const handleTrackPress = (track: MusicTrack, index: number) => {
    if (track.availability !== 'available') return;
    void activateTrack(track, playlistTracks, index).then(openFullPlayer).catch(() => undefined);
  };

  const handlePlayAll = () => {
    if (playlistTracks.length > 0) {
      void playPlaylist(playlist, 0);
    }
  };

  const handleShufflePlay = () => {
    if (playlistTracks.length > 0) {
      void playPlaylist(playlist, 0, true);
    }
  };

  const hasPlayable = playlistTracks.some((t) => t.availability === 'available');

  const bottomClearance = Math.max(
    dockHeight + insets.bottom + (currentTrack ? 88 : 20) + 24,
    180,
  );

  return (
    <Screen scroll={false} contentStyle={{ paddingHorizontal: 12 }}>
      <DawnMeshBackdrop />

      <FlatList
        data={playlistTracks}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomClearance }]}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* Top Back Row */}
            <Pressable
              onPress={() => router.back()}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel={translateText("Back to library")}
              hitSlop={12}
            >
              <ChevronLeft size={22} color={C.ink} strokeWidth={2.4} />
              <TextR style={styles.backBtnText}>
                {translateText("Sacred Library")}
              </TextR>
            </Pressable>

            {/* Playlist Hero Artwork Card */}
            <View style={styles.bannerWrap}>
              <MusicArtwork
                uri={playlist.coverImage ? String(playlist.coverImage) : undefined}
                category={
                  playlist.id.includes('flute')
                    ? 'flute'
                    : playlist.id.includes('pranayama')
                    ? 'pranayama'
                    : playlist.id.includes('mantra')
                    ? 'mantra'
                    : playlist.id.includes('gita')
                    ? 'gita'
                    : 'soundscape'
                }
                style={styles.bannerImg}
                iconSize={56}
              />
              <View style={styles.bannerOverlayGrad} />
              <View style={styles.bannerBadgePill}>
                <Flame size={11} color={C.gold} fill={C.gold} />
                <TextR style={styles.bannerBadgeText}>
                  {playlist.isCurated
                    ? translateText("CURATED SACRED RITUAL")
                    : translateText("PLAYLIST")}
                </TextR>
              </View>
            </View>

            {/* Playlist Title & Description */}
            <View style={styles.metaWrap}>
              <TextR serif style={styles.titleText}>
                {playlist.title}
              </TextR>

              {!!playlist.description && (
                <TextR style={styles.descText}>
                  {playlist.description}
                </TextR>
              )}

              <View style={styles.statsRow}>
                <Clock size={12} color={C.primary} />
                <TextR style={styles.statsText}>
                  {playlistTracks.filter(t => t.availability === 'available').length} {translateText('available')} · {playlistTracks.filter(t => t.availability !== 'available').length} {translateText('Coming soon')} ·{' '}
                  {translateText('Listening duration')}:{' '}
                  {totalDurationMs ? formatTrackDuration(totalDurationMs) : '—'}
                </TextR>
              </View>
            </View>

            {/* Action Buttons: Play All & Shuffle */}
            <View style={styles.actionsRow}>
              <Pressable
                disabled={!hasPlayable}
                accessibilityState={{ disabled: !hasPlayable }}
                onPress={handlePlayAll}
                style={({ pressed }) => [
                  styles.playAllBtn,
                  pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
                  !hasPlayable && { opacity: 0.5 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={translateText("Play all tracks")}
              >
                <Play
                  size={18}
                  color="#FFFFFF"
                  fill="#FFFFFF"
                  style={{ marginLeft: 2 }}
                />
                <TextR style={styles.playAllText}>
                  {translateText("Play All")}
                </TextR>
              </Pressable>

              <Pressable
                disabled={!hasPlayable}
                accessibilityState={{ disabled: !hasPlayable }}
                onPress={handleShufflePlay}
                style={({ pressed }) => [
                  styles.shuffleBtn,
                  pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
                  !hasPlayable && { opacity: 0.5 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={translateText("Shuffle tracks")}
              >
                <Shuffle size={17} color={C.primary} strokeWidth={2.2} />
                <TextR style={styles.shuffleText}>
                  {translateText("Shuffle")}
                </TextR>
              </Pressable>
            </View>

            <View style={styles.sectionHeaderRow}>
              <TextR serif style={styles.sectionHeaderTitle}>
                {translateText("Included Chants")}
              </TextR>
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const isCurrent = currentTrack?.id === item.id;
          const isFav = isFavorite(item.id);
          const isPlayable = item.availability === 'available';

          return (
            <View style={styles.trackCardWrap}>
              <Pressable
                disabled={!isPlayable}
                accessibilityState={{ disabled: !isPlayable }}
                onPress={() => handleTrackPress(item, index)}
                style={({ pressed }) => [
                  styles.trackCard,
                  isCurrent && styles.trackCardActive,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                  !isPlayable && { opacity: 0.75 },
                ]}
              >
                {/* Number / Live Icon */}
                <View style={styles.indexCol}>
                  {isCurrent ? (
                    isPlaying ? (
                      <AudioSpectrumVisualizer
                        isPlaying
                        barCount={3}
                        height={12}
                      />
                    ) : (
                      <Pause size={13} color={C.saffron} fill={C.saffron} />
                    )
                  ) : (
                    <TextR style={styles.indexText}>{index + 1}</TextR>
                  )}
                </View>

                {/* Thumbnail */}
                <View style={styles.thumbWrap}>
                  <MusicArtwork
                    uri={item.artworkUrl}
                    category={item.categoryTheme ?? item.category}
                    style={styles.thumb}
                    iconSize={18}
                  />
                </View>

                {/* Title & Narration */}
                <View style={styles.infoCol}>
                  <TextR
                    style={[
                      styles.trackTitle,
                      isCurrent && { color: C.saffron, fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </TextR>
                  <TextR style={styles.trackArtist} numberOfLines={1}>
                    {item.subtitle ||
                      item.artist ||
                      (isPlayable
                        ? translateText('Sacred Audio')
                        : translateText('Preview'))}
                  </TextR>
                </View>

                {/* Favorite & Duration */}
                <View style={styles.actionCol}>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleFavorite(item.id);
                    }}
                    hitSlop={10}
                    style={{ padding: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={translateText(
                      isFav ? 'Remove from favorites' : 'Add to favorites',
                    )}
                  >
                    <Heart
                      size={17}
                      color={isFav ? C.saffron : '#B8A495'}
                      fill={isFav ? C.saffron : 'transparent'}
                    />
                  </Pressable>

                  <TextR style={styles.durationText}>
                    {isPlayable
                      ? formatTrackDuration(item.durationMs)
                      : translateText('Coming soon')}
                  </TextR>
                </View>
              </Pressable>
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 150,
  },
  headerContainer: {
    paddingHorizontal: 0,
    paddingTop: 6,
    marginBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    fontSize: 14,
    color: C.ink,
    fontWeight: '700',
  },
  bannerWrap: {
    width: '100%',
    height: 190,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 150, 100, 0.25)',
    borderBottomWidth: 2,
    shadowColor: '#8C4010',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    backgroundColor: '#FFF2E0',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
  },
  bannerOverlayGrad: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 12, 10, 0.25)',
  },
  bannerBadgePill: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(30, 20, 15, 0.72)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 0.8,
    borderColor: 'rgba(244, 185, 66, 0.4)',
  },
  bannerBadgeText: {
    color: '#FFF9F5',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  metaWrap: {
    marginTop: 16,
    gap: 6,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '700',
    color: C.ink,
    lineHeight: 30,
  },
  descText: {
    fontSize: 13.5,
    color: C.muted,
    lineHeight: 19,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statsText: {
    fontSize: 12,
    color: C.primary,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    marginBottom: 16,
  },
  playAllBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.saffron,
    paddingVertical: 13,
    borderRadius: 999,
    shadowColor: C.saffron,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  playAllText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFCF8',
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 150, 100, 0.25)',
    borderBottomWidth: 2,
    shadowColor: '#8C4010',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  shuffleText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: C.primary,
  },
  sectionHeaderRow: {
    marginTop: 8,
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.ink,
  },
  trackCardWrap: {
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFCF8',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 150, 100, 0.22)',
    borderBottomWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
    shadowColor: '#8C4010',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  trackCardActive: {
    backgroundColor: '#FFF9F2',
    borderColor: 'rgba(229, 107, 39, 0.45)',
    borderBottomColor: C.saffron,
  },
  indexCol: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: 13,
    color: C.mutedSoft,
    fontWeight: '700',
  },
  thumbWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(244, 185, 66, 0.3)',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
  },
  trackArtist: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  actionCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  durationText: {
    fontSize: 11,
    color: C.mutedSoft,
    fontWeight: '600',
  },
  notFoundWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  notFoundTitle: {
    fontSize: 18,
    color: C.ink,
  },
});
