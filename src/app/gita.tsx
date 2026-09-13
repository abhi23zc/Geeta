import React, { useState } from 'react';
import {
  Image,
  Pressable,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  Activity,
  BookOpen,
  Bookmark,
  CheckCircle2,
  Flame,
  Flower2,
  Leaf,
  Pause,
  Play,
  Share2,
  Sparkles,
} from 'lucide-react-native';

import { Header, Screen, TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { Interactive3DCard } from '@/components/interactive-3d-card';
import { SacredLotusBadge } from '@/components/sacred-lotus-badge';
import { AudioSpectrumVisualizer } from '@/components/audio-spectrum-visualizer';
import { MindsetCelebrationModal } from '@/components/mindset-celebration-modal';

const SUTRA_IMAGE_URL =
  'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=800&auto=format&fit=crop';

export default function Gita() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeMode, setActiveMode] = useState<'read' | 'listen' | 'breathe'>('listen');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isCelebrationVisible, setIsCelebrationVisible] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'Today’s Gita - Chapter 2 · Shloka 47',
        message:
          'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन — Focus on your actions today. You have a duty to perform your work, but you are not entitled to the fruits of action.',
      });
    } catch (e) {
      // Ignore
    }
  };

  return (
    <Screen>
      <Header eyebrow="GITA" />

      {/* Sacred Pre-Dawn Sub-Header & Chapter Indicator */}
      <View style={s.topHeaderSection}>
        <View style={s.chapterBadge}>
          <Flame size={16} color={C.saffron} fill={C.saffron} />
          <TextR style={s.chapterText}>CHAPTER 2 · SHLOKA 47</TextR>
        </View>
        <TextR style={s.topSubtitle}>
          Morning contemplation on selfless, centered dedication
        </TextR>
      </View>

      {/* Interactive Action Trio (Read, Listen, Breathe) */}
      <View style={s.actionTrioRow}>
        {/* Deep Read Tile */}
        <Pressable
          onPress={() => setActiveMode('read')}
          style={[
            s.actionTile,
            activeMode === 'read' ? s.actionTileActive : s.actionTileInactive,
          ]}
        >
          <View
            style={[
              s.actionIconCircle,
              activeMode === 'read'
                ? s.actionIconCircleActive
                : s.actionIconCircleInactive,
            ]}
          >
            <BookOpen
              size={24}
              color={activeMode === 'read' ? C.white : C.ink}
            />
          </View>
          <TextR
            style={[
              s.actionTitle,
              activeMode === 'read' && s.actionTextActive,
            ]}
          >
            Deep Read
          </TextR>
          <TextR
            style={[
              s.actionSub,
              activeMode === 'read' && s.actionSubActive,
            ]}
          >
            Word-by-word
          </TextR>
        </Pressable>

        {/* Listen Recitation Tile */}
        <Pressable
          onPress={() => {
            setActiveMode('listen');
            setIsPlaying(!isPlaying);
          }}
          style={[
            s.actionTile,
            activeMode === 'listen' ? s.actionTileActive : s.actionTileInactive,
          ]}
        >
          <View
            style={[
              s.actionIconCircle,
              activeMode === 'listen'
                ? s.actionIconCircleActive
                : s.actionIconCircleInactive,
            ]}
          >
            <Activity
              size={24}
              color={activeMode === 'listen' ? C.white : C.primary}
            />
          </View>
          <TextR
            style={[
              s.actionTitle,
              activeMode === 'listen' && s.actionTextActive,
            ]}
          >
            Recitation
          </TextR>
          <TextR
            style={[
              s.actionSub,
              activeMode === 'listen' && s.actionSubActive,
            ]}
          >
            1:24 min flute
          </TextR>
        </Pressable>

        {/* Calm Pranayama Tile */}
        <Pressable
          onPress={() => {
            setActiveMode('breathe');
            router.push('/breathe');
          }}
          style={[
            s.actionTile,
            activeMode === 'breathe' ? s.actionTileActive : s.actionTileInactive,
          ]}
        >
          <View
            style={[
              s.actionIconCircle,
              activeMode === 'breathe'
                ? s.actionIconCircleActive
                : s.actionIconCircleInactive,
            ]}
          >
            <Leaf
              size={24}
              color={activeMode === 'breathe' ? C.white : C.greenDark}
            />
          </View>
          <TextR
            style={[
              s.actionTitle,
              activeMode === 'breathe' && s.actionTextActive,
            ]}
          >
            Breathe
          </TextR>
          <TextR
            style={[
              s.actionSub,
              activeMode === 'breathe' && s.actionSubActive,
            ]}
          >
            3 min calm
          </TextR>
        </Pressable>
      </View>

      {/* Sacred Shloka Focus Card with 3D Parallax Tilt */}
      <Interactive3DCard style={{ marginBottom: 22, alignItems: 'center' }}>
        {/* Sacred Mandala 3D Ornament Badge */}
        <View style={{ marginBottom: 16 }}>
          <SacredLotusBadge size={54} />
        </View>

        {/* Sanskrit Original with Dynamic Karaokē Word Highlighting */}
        <TextR serif style={s.devanagariText}>
          {isPlaying ? (
            <>
              <TextR serif style={{ color: C.saffron, fontWeight: '800', textShadowColor: 'rgba(229, 107, 39, 0.4)', textShadowRadius: 8 }}>
                कर्मण्येवाधिकारस्ते{' '}
              </TextR>
              <TextR serif style={{ color: C.goldDark, fontWeight: '700' }}>
                मा फलेषु{' '}
              </TextR>
              <TextR serif style={{ color: '#231A11' }}>
                कदाचन।{'\n'}
              </TextR>
              <TextR serif style={{ color: '#231A11' }}>
                मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥
              </TextR>
            </>
          ) : (
            `कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥`
          )}
        </TextR>

        {/* Transliteration */}
        <TextR serif style={s.transliterationText}>
          “karmaṇy-evādhikāras te mā phaleṣu kadācana |{'\n'}
          mā karma-phala-hetur bhūr mā te saṅgo ’stvakarmaṇi ||”
        </TextR>

        {/* Subtle Golden Line Divider */}
        <View style={s.goldenDivider} />

        {/* Core Essence (Meaning) */}
        <View style={s.meaningBox}>
          <View style={s.meaningKickerRow}>
            <View style={s.meaningDot} />
            <TextR style={s.meaningKicker}>DAILY MEANING</TextR>
          </View>
          <TextR style={s.meaningBody}>
            Focus on your actions today. You have a duty to perform your work,
            but you are not entitled to the fruits of action. Never consider
            yourself the cause of results, nor be attached to inaction.
          </TextR>
        </View>

        {/* Key Daily Takeaway 3D Beveled Pill Button */}
        <View style={s.mindsetContainer}>
          <Pressable
            onPress={() => setIsCelebrationVisible(true)}
            style={({ pressed }) => [
              { width: '100%' },
              pressed && { transform: [{ scale: 0.96 }], opacity: 0.92 },
            ]}
          >
            <View style={s.mindsetChip}>
              <CheckCircle2 size={19} color={C.white} fill="#1B5E20" />
              <TextR style={s.mindsetText}>
                Mindset: Detached Excellence & Inner Peace
              </TextR>
            </View>
          </Pressable>
        </View>
      </Interactive3DCard>

      {/* Interactive Audio Recitation Player Pod with Spectrum Visualizer */}
      <View style={s.audioPlayerPod}>
        <View style={s.audioHeaderRow}>
          <View style={s.audioLeftGroup}>
            <Pressable
              onPress={() => setIsPlaying(!isPlaying)}
              style={s.playPauseBtn}
            >
              {isPlaying ? (
                <Pause size={22} color={C.white} fill={C.white} />
              ) : (
                <Play size={22} color={C.white} fill={C.white} />
              )}
            </Pressable>
            <View>
              <TextR style={s.audioTitle}>Ch. 2 · Shloka 47 Dhwani</TextR>
              <TextR style={s.audioSub}>Bansuri & Vedic Chant</TextR>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <AudioSpectrumVisualizer isPlaying={isPlaying} barCount={12} height={20} />
            <TextR style={s.audioTimer}>{isPlaying ? '0:32 / 1:24' : '0:00 / 1:24'}</TextR>
          </View>
        </View>

        {/* Audio Scrubber Bar */}
        <View style={s.audioScrubberTrack}>
          <View
            style={[
              s.audioScrubberFill,
              { width: isPlaying ? '38%' : '14%' },
            ]}
          />
        </View>
      </View>

      {/* Reflection & Brass Utilities Strip */}
      <View style={s.reflectionStrip}>
        <View style={s.reflectionTitleGroup}>
          <Sparkles size={19} color={C.goldDark} />
          <TextR style={s.reflectionTitle}>Today’s Sandhya Vimarsh</TextR>
        </View>

        <View style={s.brassActionsGroup}>
          <Pressable onPress={handleShare} style={s.brassBtn}>
            <Share2 size={19} color="#271900" />
          </Pressable>
          <Pressable
            onPress={() => setIsBookmarked(!isBookmarked)}
            style={s.brassBtn}
          >
            <Bookmark
              size={19}
              color="#271900"
              fill={isBookmarked ? '#271900' : 'transparent'}
            />
          </Pressable>
        </View>
      </View>

      {/* Daily Practice Guidance Card (Morning Sutra) */}
      <View style={s.sutraCard}>
        <View style={s.sutraImageWrap}>
          <Image source={{ uri: SUTRA_IMAGE_URL }} style={s.sutraImage} />
        </View>
        <View style={s.sutraContent}>
          <TextR style={s.sutraKicker}>MORNING SUTRA</TextR>
          <TextR style={s.sutraTitle} numberOfLines={2}>
            Offer every action with zero dread of failure.
          </TextR>
          <TextR style={s.sutraSub}>
            Recommended: Read after deep breathing
          </TextR>
        </View>
      </View>

      {/* Sankalpa Mindset Celebration Modal */}
      <MindsetCelebrationModal
        visible={isCelebrationVisible}
        onClose={() => setIsCelebrationVisible(false)}
      />

    </Screen>
  );
}

const s = StyleSheet.create({
  topHeaderSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  chapterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(254, 236, 220, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: C.gold,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 8,
  },
  chapterText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  topSubtitle: {
    fontSize: 15.5,
    lineHeight: 23,
    color: '#423227',
    textAlign: 'center',
    maxWidth: 310,
    fontWeight: '600',
  },
  shlokaCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 26,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    alignItems: 'center',
    marginBottom: 22,
    shadowColor: '#8C4010',
    shadowOpacity: 0.09,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  ornamentCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(254, 236, 220, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  devanagariText: {
    fontSize: 25,
    lineHeight: 40,
    textAlign: 'center',
    color: '#231A11',
    fontWeight: '600',
    marginBottom: 14,
  },
  transliterationText: {
    fontSize: 16,
    lineHeight: 26,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#3D2E24',
    maxWidth: 320,
    fontWeight: '500',
  },
  goldenDivider: {
    width: 64,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(244, 185, 66, 0.4)',
    marginVertical: 18,
  },
  meaningBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 245, 237, 0.85)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 18,
  },
  meaningKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  meaningDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.primary,
  },
  meaningKicker: {
    fontSize: 12.5,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 1.2,
  },
  meaningBody: {
    fontSize: 15.5,
    lineHeight: 25,
    color: '#231A11',
    fontWeight: '500',
  },
  mindsetContainer: {
    width: '100%',
    alignItems: 'center',
  },
  mindsetChip: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4E9F5B',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 999,
    gap: 8,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.65)',
    borderBottomWidth: 3,
    borderBottomColor: '#25582D',
    shadowColor: C.green,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  mindsetText: {
    fontSize: 15,
    fontWeight: '800',
    color: C.white,
  },
  actionTrioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  actionTile: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  actionTileInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: C.saffron,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  actionTileActive: {
    backgroundColor: C.saffron,
    borderColor: C.saffron,
    shadowColor: C.saffron,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionIconCircleInactive: {
    backgroundColor: 'rgba(254, 236, 220, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  actionIconCircleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  actionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
  },
  actionTextActive: {
    color: C.white,
  },
  actionSub: {
    fontSize: 12.5,
    color: '#574438',
    marginTop: 3,
    textAlign: 'center',
    fontWeight: '600',
  },
  actionSubActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  audioPlayerPod: {
    backgroundColor: 'rgba(254, 236, 220, 0.88)',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    marginBottom: 22,
    shadowColor: C.saffron,
    shadowOpacity: 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  audioHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  audioLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playPauseBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.saffron,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  audioTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: C.ink,
  },
  audioSub: {
    fontSize: 13,
    color: '#3D2E24',
    marginTop: 2,
    fontWeight: '500',
  },
  audioTimer: {
    fontSize: 13.5,
    fontWeight: '800',
    color: C.goldDark,
  },
  audioScrubberTrack: {
    width: '100%',
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(242, 223, 209, 0.9)',
    marginTop: 14,
    overflow: 'hidden',
  },
  audioScrubberFill: {
    height: '100%',
    borderRadius: 3.5,
    backgroundColor: C.saffron,
  },
  reflectionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  reflectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reflectionTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: C.ink,
  },
  brassActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brassBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.goldDark,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  sutraCard: {
    backgroundColor: 'rgba(255, 245, 237, 0.88)',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: C.saffron,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  sutraImageWrap: {
    width: 66,
    height: 66,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sutraImage: {
    width: '100%',
    height: '100%',
  },
  sutraContent: {
    flex: 1,
  },
  sutraKicker: {
    fontSize: 12.5,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sutraTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: C.ink,
    marginTop: 2,
    lineHeight: 22,
  },
  sutraSub: {
    fontSize: 13,
    color: '#3D2E24',
    marginTop: 3,
    fontWeight: '500',
  },
});
