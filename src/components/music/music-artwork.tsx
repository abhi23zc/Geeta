import React, { useState } from 'react';
import { Image } from 'expo-image';
import {
  StyleProp,
  StyleSheet,
  View,
  type ImageStyle,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Circle,
  Stop,
} from 'react-native-svg';
import {
  Activity,
  BookOpen,
  Disc,
  Flower2,
  Music,
  Sun,
  Wind,
} from 'lucide-react-native';
import type { MusicCategory } from '@/types/music';

interface MusicArtworkProps {
  uri?: string;
  category?: MusicCategory | string;
  style?: StyleProp<ImageStyle>;
  iconSize?: number;
  alt?: string;
}

const CATEGORY_THEMES: Record<
  string,
  {
    gradient: [string, string, string];
    icon: typeof Music;
    iconColor: string;
    auraColor: string;
  }
> = {
  gita: {
    gradient: ['#6E2E0D', '#A8470C', '#D96E20'],
    icon: BookOpen,
    iconColor: '#FFE29A',
    auraColor: 'rgba(255, 226, 154, 0.35)',
  },
  mantra: {
    gradient: ['#7A320A', '#B84E12', '#E56B27'],
    icon: Flower2,
    iconColor: '#FFD670',
    auraColor: 'rgba(255, 214, 112, 0.35)',
  },
  raga: {
    gradient: ['#68183B', '#962A5A', '#C44677'],
    icon: Music,
    iconColor: '#FFE2ED',
    auraColor: 'rgba(255, 226, 237, 0.3)',
  },
  flute: {
    gradient: ['#1A4D2E', '#2A7547', '#3FA365'],
    icon: Wind,
    iconColor: '#C2EAD0',
    auraColor: 'rgba(194, 234, 208, 0.3)',
  },
  pranayama: {
    gradient: ['#144D5A', '#1F7083', '#3296AD'],
    icon: Activity,
    iconColor: '#A8EBF5',
    auraColor: 'rgba(168, 235, 245, 0.3)',
  },
  soundscape: {
    gradient: ['#5E360B', '#945817', '#C87F28'],
    icon: Sun,
    iconColor: '#FFE6A8',
    auraColor: 'rgba(255, 230, 168, 0.35)',
  },
  default: {
    gradient: ['#6E2E0D', '#A8470C', '#E56B27'],
    icon: Disc,
    iconColor: '#FFE29A',
    auraColor: 'rgba(255, 226, 154, 0.35)',
  },
};

export function MusicArtwork({
  uri,
  category = 'default',
  style,
  iconSize,
  alt,
}: MusicArtworkProps) {
  const [failed, setFailed] = useState<string | null>(null);

  if (uri && failed !== uri) {
    return (
      <Image
        source={{ uri }}
        style={style}
        onError={() => setFailed(uri)}
        accessibilityLabel={alt}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={uri}
      />
    );
  }

  const theme = CATEGORY_THEMES[category] || CATEGORY_THEMES.default;
  const IconComp = theme.icon;
  const resolvedIconSize = iconSize ?? 24;

  return (
    <View style={[styles.fallbackContainer, style]}>
      {/* Decorative SVG gradient backdrop */}
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="artGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={theme.gradient[0]} />
            <Stop offset="50%" stopColor={theme.gradient[1]} />
            <Stop offset="100%" stopColor={theme.gradient[2]} />
          </LinearGradient>
          <RadialGradient id="artAura" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={theme.auraColor} />
            <Stop offset="100%" stopColor="transparent" />
          </RadialGradient>
        </Defs>
        <Rect width="100" height="100" fill="url(#artGrad)" />
        <Circle cx="50" cy="50" r="46" fill="url(#artAura)" />
        <Circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <Circle
          cx="50"
          cy="50"
          r="30"
          fill="none"
          stroke="rgba(244, 185, 66, 0.2)"
          strokeWidth="1"
        />
      </Svg>

      <View style={styles.centerIconWrap}>
        <IconComp size={resolvedIconSize} color={theme.iconColor} strokeWidth={2} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: '#2A170B',
  },
  centerIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});
