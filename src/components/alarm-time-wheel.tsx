import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { C } from '@/constants/ritual-theme';
import { nearestWheelIndex, wrapIndex } from '@/services/alarm-time-picker';

const CYCLES = 5;

export function AlarmTimeWheel({
  data,
  value,
  label,
  onDelta,
  onMoving,
  small,
}: {
  data: number[];
  value: number;
  label: string;
  onDelta(delta: number): void;
  onMoving(moving: boolean): void;
  small: boolean;
}) {
  const { fontScale } = useWindowDimensions();
  const rowHeight = Math.round((small ? 52 : 58) * Math.max(1, fontScale));
  const columnWidth = small ? 76 : 88;
  const containerHeight = rowHeight * 3;

  const initialIndex = data.length * 2 + Math.max(0, data.indexOf(value));
  const currentIndexRef = useRef(initialIndex);
  const reportedRef = useRef(value);
  const isMovingRef = useRef(false);
  const lastHapticTime = useRef(0);

  // Shared values for Reanimated on UI thread
  const translateY = useSharedValue(-(initialIndex - 1) * rowHeight);
  const startY = useSharedValue(0);
  const lastHapticIndex = useSharedValue(initialIndex);

  const rows = useMemo(
    () => Array.from({ length: data.length * CYCLES }, (_, i) => data[i % data.length]),
    [data]
  );

  const triggerHaptic = useCallback(() => {
    const now = Date.now();
    if (now - lastHapticTime.current >= 45) {
      lastHapticTime.current = now;
      void Haptics.selectionAsync().catch(() => undefined);
    }
  }, []);

  const handleMovingStart = useCallback(() => {
    if (!isMovingRef.current) {
      isMovingRef.current = true;
      onMoving(true);
    }
  }, [onMoving]);

  const handleSettled = useCallback(
    (finalIndex: number) => {
      isMovingRef.current = false;
      const valIndex = wrapIndex(finalIndex, data.length);
      const nextVal = data[valIndex];
      const delta = finalIndex - currentIndexRef.current;

      // Silently re-center to Cycle 2 buffer
      const centeredIndex = data.length * 2 + valIndex;
      currentIndexRef.current = centeredIndex;
      reportedRef.current = nextVal;
      translateY.value = -(centeredIndex - 1) * rowHeight;

      if (delta !== 0) {
        onDelta(delta);
      }
      onMoving(false);
    },
    [data, onDelta, onMoving, rowHeight, translateY]
  );

  const adjust = useCallback(
    (delta: number) => {
      cancelAnimation(translateY);
      handleMovingStart();
      void Haptics.selectionAsync().catch(() => undefined);

      const targetIndex = currentIndexRef.current + delta;
      const snapY = -(targetIndex - 1) * rowHeight;

      translateY.value = withSpring(
        snapY,
        {
          damping: 24,
          stiffness: 180,
          mass: 0.6,
        },
        (finished) => {
          if (finished) {
            runOnJS(handleSettled)(targetIndex);
          }
        }
      );
    },
    [handleMovingStart, handleSettled, rowHeight, translateY]
  );

  // External updates to `value` (e.g. minute rollover rolls hour, or reset)
  useEffect(() => {
    if (isMovingRef.current || value === reportedRef.current) return;
    const target = nearestWheelIndex(currentIndexRef.current, data.indexOf(value), data.length);
    currentIndexRef.current = target;
    reportedRef.current = value;
    translateY.value = withSpring(-(target - 1) * rowHeight, {
      damping: 24,
      stiffness: 170,
      mass: 0.6,
    });
  }, [value, data, rowHeight, translateY]);

  useEffect(() => {
    translateY.value = -(currentIndexRef.current - 1) * rowHeight;
  }, [rowHeight, translateY]);

  // Gestures for 120 FPS ultra smooth native interaction
  const panGesture = Gesture.Pan()
    .activeOffsetY([-6, 6])
    .onStart(() => {
      'worklet';
      cancelAnimation(translateY);
      startY.value = translateY.value;
      runOnJS(handleMovingStart)();
    })
    .onUpdate((e) => {
      'worklet';
      translateY.value = startY.value + e.translationY;

      // Haptic tick when passing each notch
      const visualIndex = Math.round(1 - translateY.value / rowHeight);
      if (visualIndex !== lastHapticIndex.value) {
        lastHapticIndex.value = visualIndex;
        runOnJS(triggerHaptic)();
      }
    })
    .onEnd((e) => {
      'worklet';
      const v = e.velocityY;
      // Natural momentum glide proportional to fling velocity
      const clampedVelocity = Math.max(-3500, Math.min(3500, v));
      const momentumDistance = clampedVelocity * 0.16;
      const rawTargetY = translateY.value + momentumDistance;
      const targetIndex = Math.round(1 - rawTargetY / rowHeight);
      const snapY = -(targetIndex - 1) * rowHeight;

      translateY.value = withSpring(
        snapY,
        {
          damping: 22,
          stiffness: 140,
          mass: 0.6,
          velocity: clampedVelocity,
        },
        (finished) => {
          if (finished) {
            runOnJS(handleSettled)(targetIndex);
          }
        }
      );
    });

  const tapGesture = Gesture.Tap().onEnd((e) => {
    'worklet';
    if (e.y < rowHeight) {
      runOnJS(adjust)(-1);
    } else if (e.y > rowHeight * 2) {
      runOnJS(adjust)(1);
    }
  });

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View
      style={[styles.column, { width: columnWidth, height: containerHeight }]}
      accessible
      focusable
      tabIndex={0}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: String(value).padStart(2, '0') }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') adjust(1);
        if (event.nativeEvent.actionName === 'decrement') adjust(-1);
      }}
      {...{
        onKeyDown: (event: {
          key?: string;
          nativeEvent?: { key?: string };
          preventDefault?: () => void;
        }) => {
          const key = event.nativeEvent?.key ?? event.key;
          if (key === 'ArrowUp' || key === 'ArrowDown') {
            event.preventDefault?.();
            adjust(key === 'ArrowDown' ? 1 : -1);
          }
        },
      }}
    >
      <GestureDetector gesture={composedGesture}>
        <View style={StyleSheet.absoluteFill}>
          {/* Base strip: numbers outside the lens are soft and muted */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: 0,
                right: 0,
              },
              containerAnimatedStyle,
            ]}
          >
            {rows.map((item, i) => (
              <View
                key={i}
                style={{
                  height: rowHeight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={[
                    styles.fadedNumber,
                    { fontSize: small ? 38 : 44, lineHeight: rowHeight },
                  ]}
                >
                  {String(item).padStart(2, '0')}
                </Text>
              </View>
            ))}
          </Animated.View>

          {/* Center lens with clip mask: numbers inside appear deep and crisp */}
          <View
            pointerEvents="none"
            style={[
              styles.lens,
              {
                top: rowHeight,
                height: rowHeight,
              },
            ]}
          >
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  left: -2,
                  right: -2,
                  top: -rowHeight,
                },
                containerAnimatedStyle,
              ]}
            >
              {rows.map((item, i) => (
                <View
                  key={i}
                  style={{
                    height: rowHeight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={[
                      styles.selectedNumber,
                      { fontSize: small ? 40 : 46, lineHeight: rowHeight },
                    ]}
                  >
                    {String(item).padStart(2, '0')}
                  </Text>
                </View>
              ))}
            </Animated.View>
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    overflow: 'hidden',
    position: 'relative',
  },
  lens: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: 16,
    backgroundColor: 'rgba(235,120,60,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(216,144,64,0.22)',
    overflow: 'hidden',
  },
  fadedNumber: {
    color: 'rgba(56, 32, 16, 0.32)',
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  selectedNumber: {
    color: C.ink,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
});
