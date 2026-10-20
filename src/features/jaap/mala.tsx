import React, { memo, useCallback } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Path } from 'react-native-svg';
import { ArrowDown } from 'lucide-react-native';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useLanguage } from '@/i18n/provider';
import { useMotionEnvironment } from '@/hooks/use-motion-environment';
import { beadPosition, MATERIALS, type MalaMaterial } from './model';
import { validPull } from './gesture';

const atlas = require('../../../assets/jaap/mala-materials.png');
const SPACING = 68;
const noop = () => undefined;
export const materialNames = {
  rudraksha: 'Rudraksha', tulsi: 'Tulsi', sandalwood: 'Sandalwood', crystal: 'Crystal',
} as const;
const threads: Record<MalaMaterial, string> = {
  rudraksha: '#986C43', tulsi: '#B19B76', sandalwood: '#AB7841', crystal: '#B5A487',
};

/** Crop the existing atlas in the renderer, with transparent breathing room around each bead. */
export const Bead = memo(function Bead({ material, size = 40, kind = 0 }: {
  material: MalaMaterial; size?: number; kind?: number;
}) {
  const column = MATERIALS.indexOf(material);
  const cell = size / .84;
  const centerOffset = [.075, .03, -.02, -.075][column];
  return (
    <View pointerEvents="none" style={{ width: size, height: size, overflow: 'hidden' }}>
      <Image source={atlas} resizeMode="stretch" style={{
        position: 'absolute', width: cell * 4, height: cell * 3,
        left: -column * cell - (cell - size) / 2 - cell * centerOffset,
        top: -kind * cell - (cell - size) / 2,
      }} />
    </View>
  );
});

/** A material sample: beads large enough for grain, grooves and facets to remain visible. */
export function MalaPreview({ material, size = 116 }: { material: MalaMaterial; size?: number }) {
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Path d={`M ${size * .04} ${size * .59} Q ${size * .50} ${size * .25} ${size * .96} ${size * .59}`}
          stroke={threads[material]} strokeWidth={1.5} fill="none" />
      </Svg>
      {[-1, 0, 1].map(index => {
        const beadSize = size * (index === 0 ? .52 : .40);
        return <View key={index} style={{
          position: 'absolute', left: size / 2 + index * size * .29 - beadSize / 2,
          top: size * (index === 0 ? .38 : .55) - beadSize / 2,
          transform: [{ rotate: `${index * 18}deg` }],
        }}><Bead material={material} size={beadSize} /></View>;
      })}
    </View>
  );
}

const StrandBead = memo(function StrandBead({ material, index, travel, width, height }: {
  material: MalaMaterial; index: number; travel: SharedValue<number>; width: number; height: number;
}) {
  const size = 88;
  const style = useAnimatedStyle(() => {
    const y = height * .49 + index * SPACING + travel.value;
    const x = width * .51 + Math.sin((y / height - .5) * Math.PI) * 12;
    const prominence = Math.max(0, 1 - Math.abs(y - height * .49) / (height * .75));
    return {
      transform: [{ translateX: x - size / 2 }, { translateY: y - size / 2 }, { scale: .86 + prominence * .16 }],
    };
  });
  return <Animated.View pointerEvents="none" style={[s.strandBead, style]}><Bead material={material} size={size} /></Animated.View>;
});

export function MalaCounter({ material, total, disabled, onCount, onThreshold = noop, size = 320, night = false }: {
  material: MalaMaterial; total: number; disabled: boolean;
  onCount: () => Promise<boolean>; onThreshold?: () => void; size?: number; night?: boolean;
}) {
  const { t, formatNumber } = useLanguage();
  const { reduced } = useMotionEnvironment();
  const bead = beadPosition(total);
  const height = Math.min(290, Math.max(210, size * .84));
  const strandWidth = size * .57;
  const travel = useSharedValue(0), peak = useSharedValue(0);
  const invalid = useSharedValue(false), released = useSharedValue(false), armed = useSharedValue(false);
  const ink = night ? '#FFF0D9' : C.ink;
  const muted = night ? '#C7C9B7' : C.muted;

  const commit = useCallback(async () => {
    if (disabled) return;
    const saved = await onCount();
    if (!saved) {
      travel.set(withTiming(0, { duration: reduced ? 0 : 140 }));
      return;
    }
    if (reduced) { travel.set(0); return; }
    // At exactly one spacing the repeated strand is identical to its resting position.
    travel.set(withTiming(SPACING, { duration: 180, easing: Easing.out(Easing.cubic) }, complete => {
      if (complete) travel.set(0);
    }));
  }, [disabled, onCount, reduced, travel]);

  const drag = Gesture.Pan().enabled(!disabled).minDistance(8).maxPointers(1)
    .onBegin(() => {
      cancelAnimation(travel); travel.set(0);
      peak.value = 0; invalid.value = false; released.value = false; armed.value = false;
    })
    .onTouchesDown(event => { if (event.allTouches.length > 1) invalid.value = true; })
    .onUpdate(event => {
      peak.value = Math.max(peak.value, event.translationY);
      if (event.translationY < peak.value - 12 || Math.abs(event.translationX) > 28 || event.translationY < -8 || event.numberOfPointers !== 1) invalid.value = true;
      travel.set(reduced ? 0 : Math.min(58, Math.max(0, event.translationY) * .72));
      if (!armed.value && !invalid.value && event.translationY >= 40) {
        armed.value = true; scheduleOnRN(onThreshold);
      }
    })
    .onEnd(event => {
      // Release events may report zero pointers; multitouch is latched while touching.
      if (validPull(event.translationX, event.translationY, peak.value, 1, invalid.value)) {
        released.value = true; scheduleOnRN(commit);
      }
    })
    .onFinalize(() => {
      if (!released.value) travel.set(reduced ? 0 : withSpring(0, { damping: 20, stiffness: 220, overshootClamping: true }));
    });
  const tap = Gesture.Tap().enabled(!disabled).maxDistance(9)
    .onBegin(() => { invalid.value = false; })
    .onTouchesDown(event => { if (event.allTouches.length > 1) invalid.value = true; })
    .onEnd((_event, success) => { if (success && !invalid.value) scheduleOnRN(commit); });

  return (
    <View style={{ width: size, alignSelf: 'center' }}>
      <View style={{ height, flexDirection: 'row' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Count one jaap')}
          accessibilityHint={t('One touch for each complete chant.')}
          accessibilityValue={{ now: bead, min: 0, max: 108, text: `${formatNumber(bead)} / ${formatNumber(108)}` }}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => { void commit(); }}
          style={[s.countArea, { width: size * .43 }]}
        >
          <TextR style={[s.overline, { color: night ? '#D7BC87' : C.saffron }]}>{t('THIS MALA')}</TextR>
          <TextR
            serif
            style={{
              fontSize: Math.min(68, size * .21),
              lineHeight: Math.min(82, size * .255),
              color: ink,
              fontVariant: ['tabular-nums'],
              fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia',
              fontWeight: '700',
            }}
          >
            {formatNumber(bead)}
          </TextR>
          <TextR style={{ fontSize: 16, color: muted, fontWeight: '500' }}>{t('of {count}', { count: formatNumber(108) })}</TextR>
          <View style={[s.beadDivider, { backgroundColor: night ? '#8E7952' : '#DEBFA0' }]} />
          <TextR style={{ fontSize: 13, color: muted, lineHeight: 20 }}>{t('One bead.\nOne moment.')}</TextR>
        </Pressable>
        <GestureDetector gesture={Gesture.Exclusive(drag, tap)} touchAction="none">
          <Animated.View accessible accessibilityRole="button" accessibilityLabel={t('Pull down or tap the beads')}
            accessibilityState={{ disabled }} accessibilityActions={[{ name: 'activate', label: t('Count one jaap') }]}
            onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'activate' && !disabled) void commit(); }}
            style={{ width: strandWidth, height, overflow: 'hidden' }}>
            <Svg width={strandWidth} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Path d={`M ${strandWidth * .51 - 12} -40 C ${strandWidth * .51 - 15} ${height * .25} ${strandWidth * .51 + 15} ${height * .75} ${strandWidth * .51 + 12} ${height + 40}`}
                fill="none" stroke={threads[material]} strokeWidth={2.2} />
            </Svg>
            {/* 3D Tactile Target Medallion Guide */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 108,
                height: 108,
                left: strandWidth * .51 - 54,
                top: height * .49 - 54,
                borderRadius: 54,
                borderWidth: 1.5,
                borderColor: night ? 'rgba(210, 181, 122, 0.45)' : 'rgba(229, 107, 39, 0.28)',
                borderTopColor: night ? '#FFE5B4' : '#FFFFFF',
                borderBottomColor: night ? 'rgba(0,0,0,0.3)' : 'rgba(140, 64, 16, 0.22)',
                borderBottomWidth: 2.5,
                backgroundColor: night ? 'rgba(210, 181, 122, 0.08)' : 'rgba(244, 185, 66, 0.09)',
                shadowColor: C.shadow3D,
                shadowOpacity: 0.12,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: 2,
              }}
            />
            {[-3, -2, -1, 0, 1, 2, 3].map(index => <StrandBead key={index} material={material} index={index}
              travel={travel} width={strandWidth} height={height} />)}
            <View pointerEvents="none" style={{ position: 'absolute', right: 3, top: height * .49 - 11 }}>
              <ArrowDown size={20} strokeWidth={1.8} color={night ? '#D6BA83' : C.saffron} />
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  strandBead: { position: 'absolute', left: 0, top: 0 },
  countArea: { alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 14, paddingVertical: 12 },
  overline: { fontSize: 10.5, fontWeight: '800', letterSpacing: 2, marginBottom: 3 },
  beadDivider: {
    width: 28,
    height: 2,
    borderRadius: 1,
    marginVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.7)',
  },
});
