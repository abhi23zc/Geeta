import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
  Circle,
} from 'react-native-svg';

interface Sacred3DTextureProps {
  tintColor?: string;
  intensity?: number;
  showMandalaWatermark?: boolean;
}

export function Sacred3DTexture({
  tintColor = '#FEE4C3',
  intensity = 0.5,
  showMandalaWatermark = true,
}: Sacred3DTextureProps) {
  const gradientId = React.useId().replace(/:/g, '');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          {/* Overhead Divine Sunbeam / Ambient Diya Light */}
          <RadialGradient
            id={`sunbeam-${gradientId}`}
            cx="28%"
            cy="12%"
            r="85%"
          >
            <Stop offset="0%" stopColor={tintColor} stopOpacity={0.55 * intensity} />
            <Stop offset="45%" stopColor="#FFF4E5" stopOpacity={0.25 * intensity} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>

          {/* Organic Parchment Base Gradient */}
          <LinearGradient
            id={`parchment-${gradientId}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.95} />
            <Stop offset="50%" stopColor="#FFFBF5" stopOpacity={0.92} />
            <Stop offset="100%" stopColor="#FFF5EA" stopOpacity={0.88} />
          </LinearGradient>
        </Defs>

        {/* Parchment Base */}
        <Rect width="100%" height="100%" fill={`url(#parchment-${gradientId})`} />

        {/* Sunbeam Light */}
        <Rect width="100%" height="100%" fill={`url(#sunbeam-${gradientId})`} />

        {/* Delicate Concentric Sacred Aura Watermark */}
        {showMandalaWatermark && (
          <>
            <Circle
              cx="90%"
              cy="25%"
              r="60"
              fill="none"
              stroke="#D4863A"
              strokeWidth="0.8"
              strokeOpacity="0.06"
              strokeDasharray="4 4"
            />
            <Circle
              cx="90%"
              cy="25%"
              r="90"
              fill="none"
              stroke="#D4863A"
              strokeWidth="0.8"
              strokeOpacity="0.05"
            />
            <Circle
              cx="90%"
              cy="25%"
              r="120"
              fill="none"
              stroke="#D4863A"
              strokeWidth="0.6"
              strokeOpacity="0.04"
              strokeDasharray="6 4"
            />
          </>
        )}
      </Svg>
    </View>
  );
}
