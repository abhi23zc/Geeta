import React, { useCallback, useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';
import { TreePine } from 'lucide-react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useLanguage } from '@/i18n/provider';

const TREE_30_POSTER = require('@/assets/tree-streak/day-30.jpg');
const TREE_30_VIDEO = require('@/assets/tree-streak/day-30.mp4');

export function TreeGrowthOnboardingStage() {
  const { t } = useLanguage();
  const { width, height } = useWindowDimensions();

  const player = useVideoPlayer(TREE_30_VIDEO, (p) => {
    p.muted = true;
    p.loop = true;
    p.staysActiveInBackground = false;
    p.audioMixingMode = 'mixWithOthers';
  });

  useEffect(() => {
    try {
      player.play();
    } catch {}
  }, [player]);

  const handleReplay = useCallback(() => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    try {
      player.currentTime = 0;
      player.play();
    } catch {}
  }, [player]);

  const maxH = Math.round(height * (height < 740 ? 0.20 : 0.23));
  const stageWidth = Math.min(width - 48, Math.round(maxH * (16 / 9)), 290);
  const stageHeight = Math.round(stageWidth * (9 / 16));

  return (
    <View style={s.stageOuter}>
      {/* Radiant Dawn Ambient Aura matching Screen's Sunburst */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 320 200">
          <Defs>
            <RadialGradient id="treeDawnAura" cx="50%" cy="45%" r="55%">
              <Stop offset="0%" stopColor="#FDE3B8" stopOpacity="0.65" />
              <Stop offset="45%" stopColor="#FDCBA5" stopOpacity="0.35" />
              <Stop offset="80%" stopColor="#FEEADC" stopOpacity="0.12" />
              <Stop offset="100%" stopColor="#FFF9F5" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="160" cy="100" r="100" fill="url(#treeDawnAura)" />
        </Svg>
      </View>

      {/* Borderless, Seamless Video Container */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('Replay 30-day tree growth animation')}
        onPress={handleReplay}
        style={[s.videoCard, { width: stageWidth, height: stageHeight }]}
      >
        <Image
          source={TREE_30_POSTER}
          contentFit="contain"
          style={StyleSheet.absoluteFill}
        />

        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls={false}
          fullscreenOptions={{ enable: false }}
          allowsPictureInPicture={false}
          playsInline
          accessible={false}
        />

        {/* Seamless Blend Vignette & Background Color Harmonization */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              {/* Warm Dawn Tone Overlay to match screen hue */}
              <LinearGradient id="screenDawnTint" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#FDE3B8" stopOpacity="0.15" />
                <Stop offset="50%" stopColor="#FDCBA5" stopOpacity="0.10" />
                <Stop offset="100%" stopColor="#FEEADC" stopOpacity="0.16" />
              </LinearGradient>

              {/* Edge Feathering: dissolves video boundary directly into screen background */}
              <RadialGradient
                id="screenEdgeFeather"
                cx="50%"
                cy="50%"
                rx="50%"
                ry="50%"
                fx="50%"
                fy="50%"
              >
                <Stop offset="0%" stopColor="#FFF9F5" stopOpacity="0" />
                <Stop offset="52%" stopColor="#FFF9F5" stopOpacity="0" />
                <Stop offset="72%" stopColor="#FFF7F0" stopOpacity="0.4" />
                <Stop offset="88%" stopColor="#FFF5ED" stopOpacity="0.82" />
                <Stop offset="100%" stopColor="#FFF4EA" stopOpacity="1" />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#screenDawnTint)" />
            <Rect width="100%" height="100%" fill="url(#screenEdgeFeather)" />
          </Svg>
        </View>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  stageOuter: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    position: 'relative',
  },
  videoCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    position: 'absolute',
    bottom: 6,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    backgroundColor: 'rgba(255, 253, 248, 0.92)',
    paddingVertical: 3.5,
    paddingHorizontal: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(244, 185, 66, 0.35)',
    shadowColor: '#8C4010',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#854D0E',
    letterSpacing: 0.2,
  },
});
