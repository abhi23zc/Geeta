import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import {
  Play,
  Pause,
  SkipForward,
} from 'lucide-react-native';

import { useMusicPlayer } from '@/state/music-player-store';
import { useLanguage } from '@/i18n/provider';
import { C, SHADOWS } from '@/constants/ritual-theme';
import { TextR, useDockHeight } from '@/components/ritual-ui';
import { MusicArtwork } from './music-artwork';
import { AudioSpectrumVisualizer } from '@/components/audio-spectrum-visualizer';

const TAB_ROUTES = new Set([
  '/',
  '/index',
  '/today',
  '/library',
  '/quiz',
  '/quiz/index',
  '/progress',
]);

export function MiniPlayer({ night = false }: { night?: boolean }) {
  const p = useMusicPlayer();
  const insets = useSafeAreaInsets();
  const dock = useDockHeight();
  const path = usePathname();
  const { language } = useLanguage();

  if (
    !p.currentTrack ||
    path.startsWith('/alarm') ||
    ['/gita', '/breathe', '/saved'].includes(path)
  ) {
    return null;
  }

  const tr = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const progressRatio =
    p.durationMs > 0 ? Math.min(100, (p.positionMs / p.durationMs) * 100) : 0;

  return (
    <View
      style={[
        styles.containerWrap,
        {
          bottom:
            Math.max(insets.bottom + 10, 16) +
            (TAB_ROUTES.has(path) ? dock + 6 : 0),
        },
      ]}
    >
      <View style={[styles.card, night ? styles.cardNight : styles.cardDay]}>
        {/* Top Glowing Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressRatio}%` },
              night && styles.progressBarFillNight,
            ]}
          />
        </View>

        <View style={styles.contentRow}>
          {/* Animated Vinyl Disc Artwork */}
          <Pressable
            onPress={p.openFullPlayer}
            accessibilityRole="button"
            accessibilityLabel={tr('Open music player', 'संगीत प्लेयर खोलें')}
            style={styles.discTouchable}
          >
            <View
              style={[
                styles.discOuterRing,
                night ? styles.discOuterRingNight : styles.discOuterRingDay,
                p.isPlaying && styles.discOuterRingPlaying,
              ]}
            >
              <MusicArtwork
                uri={p.currentTrack.artworkThumbnail ?? p.currentTrack.artworkUrl}
                category={p.currentTrack.categoryTheme ?? p.currentTrack.category}
                style={styles.discArtwork}
                iconSize={18}
              />
              <View style={styles.centerSpindle} />
            </View>
          </Pressable>

          {/* Track Info (clickable to open full player) */}
          <Pressable
            style={styles.infoCol}
            onPress={p.openFullPlayer}
            accessibilityRole="button"
            accessibilityLabel={tr('Open music player', 'संगीत प्लेयर खोलें')}
          >
            <TextR
              numberOfLines={1}
              style={[
                styles.title,
                night ? styles.textNight : styles.textDay,
              ]}
            >
              {p.currentTrack.title}
            </TextR>

            <View style={styles.subtitleRow}>
              {p.isPlaying ? (
                <View style={styles.visualizerWrap}>
                  <AudioSpectrumVisualizer isPlaying barCount={3} height={10} />
                </View>
              ) : null}

              <TextR
                numberOfLines={1}
                style={[
                  styles.artist,
                  night ? styles.subtextNight : styles.subtextDay,
                ]}
              >
                {p.error
                  ? tr('Playback failed · Retry', 'ऑडियो विफल · फिर प्रयास करें')
                  : p.isLoading
                  ? tr('Loading…', 'लोड हो रहा है…')
                  : p.currentTrack.subtitle ||
                    p.currentTrack.artist ||
                    tr('Sacred Audio', 'पवित्र संगीत')}
              </TextR>
            </View>
          </Pressable>

          {/* Player Actions */}
          <View style={styles.actionsRow}>
            {/* 3D Tactile Play/Pause Pill Button */}
            <Pressable
              style={({ pressed }) => [
                styles.playBtn,
                night ? styles.playBtnNight : styles.playBtnDay,
                pressed && { transform: [{ scale: 0.94 }], opacity: 0.9 },
              ]}
              onPress={p.togglePlayPause}
              accessibilityRole="button"
              accessibilityLabel={p.isPlaying ? tr('Pause', 'रोकें') : tr('Play', 'चलाएँ')}
            >
              {p.isPlaying ? (
                <Pause size={18} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Play
                  size={18}
                  color="#FFFFFF"
                  fill="#FFFFFF"
                  style={{ marginLeft: 2 }}
                />
              )}
            </Pressable>

            {/* Next Track Button */}
            <Pressable
              style={({ pressed }) => [
                styles.nextBtn,
                pressed && { opacity: 0.6 },
              ]}
              onPress={() => void p.nextTrack()}
              accessibilityRole="button"
              accessibilityLabel={tr('Next track', 'अगला ट्रैक')}
              hitSlop={8}
            >
              <SkipForward
                size={20}
                color={night ? '#F4B942' : C.primary}
                strokeWidth={2.2}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  containerWrap: {
    position: 'absolute',
    left: 10,
    right: 10,
    zIndex: 99,
  },
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    ...SHADOWS.tactile3D,
  },
  cardDay: {
    backgroundColor: 'rgba(255, 251, 246, 0.97)',
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 150, 100, 0.25)',
    shadowColor: '#8C4010',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardNight: {
    backgroundColor: 'rgba(20, 24, 46, 0.97)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomColor: 'rgba(0, 0, 0, 0.6)',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  progressBarTrack: {
    height: 3.5,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: C.saffron,
    borderRadius: 2,
  },
  progressBarFillNight: {
    backgroundColor: '#F4B942',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
  },
  discTouchable: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  discOuterRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: C.saffron,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  discOuterRingDay: {
    borderColor: 'rgba(229, 107, 39, 0.35)',
    backgroundColor: '#FFF2E0',
  },
  discOuterRingNight: {
    borderColor: 'rgba(244, 185, 66, 0.45)',
    backgroundColor: '#12162A',
  },
  discOuterRingPlaying: {
    borderColor: C.saffron,
  },
  discArtwork: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  centerSpindle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFF9F5',
    borderWidth: 1.5,
    borderColor: '#C79D58',
    zIndex: 10,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2.5,
    gap: 6,
  },
  artist: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  visualizerWrap: {
    justifyContent: 'center',
  },
  textDay: {
    color: C.ink,
  },
  textNight: {
    color: '#FFF9F5',
  },
  subtextDay: {
    color: C.muted,
  },
  subtextNight: {
    color: '#9BA3C0',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  playBtnDay: {
    backgroundColor: C.saffron,
    shadowColor: C.saffron,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  playBtnNight: {
    backgroundColor: '#F4B942',
    shadowColor: '#F4B942',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  nextBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },
});
