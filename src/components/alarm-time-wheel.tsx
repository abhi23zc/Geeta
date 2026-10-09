import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, ScrollView, Platform, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { C } from '@/constants/ritual-theme';
import { nearestWheelIndex, wrapIndex } from '@/services/alarm-time-picker';

const CYCLES = 5;
/** Recenter only after settling, so crossing a boundary never interrupts a gesture. */
export function AlarmTimeWheel({ data, value, label, onDelta, onMoving, small }: {
  data: number[]; value: number; label: string; onDelta(delta: number): void;
  onMoving(moving: boolean): void; small: boolean;
}) {
  const { fontScale } = useWindowDimensions();
  const rowHeight = Math.round((small ? 52 : 58) * Math.max(1, fontScale));
  const initialIndex = data.length * 2 + Math.max(0, data.indexOf(value));
  const list = useRef<ScrollView>(null);
  const [initialOffset] = useState(() => ({ x: 0, y: initialIndex * rowHeight }));
  const [offset] = useState(() => new Animated.Value(initialIndex * rowHeight));
  const index = useRef(initialIndex);
  const actualOffset = useRef(initialIndex * rowHeight);
  const reported = useRef(value);
  const moving = useRef(false);
  const momentum = useRef(false);
  const externalAnimation = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHaptic = useRef(0);
  const [settled, setSettled] = useState(0);
  const rows = useMemo(() => Array.from({ length: data.length * CYCLES }, (_, i) => data[i % data.length]), [data]);
  const clearTimer = useCallback(() => { if (timer.current) clearTimeout(timer.current); timer.current = null; }, []);
  const scrollTo = useCallback((target: number, animated: boolean) => {
    list.current?.scrollTo({ y: target * rowHeight, animated });
  }, [rowHeight]);
  const report = useCallback((y: number) => {
    actualOffset.current = y;
    if (!moving.current) return;
    const next = Math.max(0, Math.min(rows.length - 1, Math.round(y / rowHeight)));
    const delta = next - index.current;
    if (!delta) return;
    index.current = next;
    reported.current = data[wrapIndex(next, data.length)];
    onDelta(delta);
    const now = Date.now();
    if (now - lastHaptic.current >= 65) {
      lastHaptic.current = now;
      void Haptics.selectionAsync().catch(() => undefined);
    }
  }, [data, rows.length, rowHeight, onDelta]);
  const scrollHandler = useMemo(() => {
    // Animated.event registers this listener; it reads gesture refs only on scroll.
    // eslint-disable-next-line react-hooks/refs
    return Animated.event([{ nativeEvent: { contentOffset: { y: offset } } }], {
      useNativeDriver: Platform.OS !== 'web',
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => report(event.nativeEvent.contentOffset.y),
    });
  }, [offset, report]);
  const finish = useCallback(() => {
    externalAnimation.current = false;
    if (!moving.current) return;
    clearTimer();
    report(actualOffset.current);
    moving.current = false;
    momentum.current = false;
    // Same visible value, central copy. No time delta or second haptic is emitted.
    const centered = data.length * 2 + wrapIndex(index.current, data.length);
    index.current = centered;
    actualOffset.current = centered * rowHeight;
    scrollTo(centered, false);
    onMoving(false);
    setSettled(count => count + 1);
  }, [clearTimer, data.length, onMoving, report, rowHeight, scrollTo]);
  useEffect(() => {
    if (moving.current || value === reported.current) return;
    const target = nearestWheelIndex(index.current, data.indexOf(value), data.length);
    index.current = target;
    reported.current = value;
    actualOffset.current = target * rowHeight;
    externalAnimation.current = true;
    scrollTo(target, true);
  }, [value, data, rowHeight, scrollTo, settled]);
  useEffect(() => () => { clearTimer(); }, [clearTimer]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => { if (state !== 'active') finish(); });
    return () => listener.remove();
  }, [finish]);
  useEffect(() => {
    actualOffset.current = index.current * rowHeight;
    offset.setValue(actualOffset.current);
    scrollTo(index.current, false);
  }, [rowHeight, offset, scrollTo]);
  const begin = () => {
    clearTimer();
    // A gesture can interrupt an external hour-rollover animation.
    if (externalAnimation.current) {
      scrollTo(index.current, false);
      actualOffset.current = index.current * rowHeight;
      externalAnimation.current = false;
    }
    moving.current = true;
    momentum.current = false;
    onMoving(true);
  };
  const adjust = (delta: number) => {
    clearTimer();
    moving.current = false;
    onDelta(delta);
    void Haptics.selectionAsync().catch(() => undefined);
    onMoving(false);
  };
  return <View style={[styles.column, { width: small ? 76 : 88, height: rowHeight * 3 }]}
    accessible focusable tabIndex={0} accessibilityRole="adjustable" accessibilityLabel={label}
    accessibilityValue={{ text: String(value).padStart(2, '0') }}
    accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
    onAccessibilityAction={event => {
      if (event.nativeEvent.actionName === 'increment') adjust(1);
      if (event.nativeEvent.actionName === 'decrement') adjust(-1);
    }}
    {...{ onKeyDown: (event: { key?: string; nativeEvent?: { key?: string }; preventDefault?: () => void }) => {
      const key = event.nativeEvent?.key ?? event.key;
      if (key === 'ArrowUp' || key === 'ArrowDown') { event.preventDefault?.(); adjust(key === 'ArrowDown' ? 1 : -1); }
    } }}>
    <View pointerEvents="none" style={[styles.lens, { top: rowHeight, height: rowHeight }]} />
    {/* These finite wheel copies can render together without a VirtualizedList
        nested inside the screen's vertical ScrollView. */}
    <Animated.ScrollView
      ref={list}
      contentOffset={initialOffset}
      showsVerticalScrollIndicator={false} nestedScrollEnabled
      snapToInterval={rowHeight} snapToAlignment="start" decelerationRate="fast"
      bounces={false} overScrollMode="never" scrollEventThrottle={16}
      accessible={false} importantForAccessibility="no-hide-descendants"
      onScroll={scrollHandler}
      onScrollBeginDrag={begin}
      onScrollEndDrag={() => { clearTimer(); timer.current = setTimeout(() => { if (!momentum.current) finish(); }, 120); }}
      onMomentumScrollBegin={() => { clearTimer(); momentum.current = true; }}
      onMomentumScrollEnd={finish}
    >
      <View style={{ height: rowHeight }} />
      {rows.map((item, i) => {
        const inputRange = [(i - 1) * rowHeight, i * rowHeight, (i + 1) * rowHeight];
        return <Animated.View key={i} style={{ height: rowHeight, alignItems: 'center', justifyContent: 'center',
          opacity: offset.interpolate({ inputRange, outputRange: [0.28, 1, 0.28], extrapolate: 'clamp' }),
          transform: [{ scale: offset.interpolate({ inputRange, outputRange: [0.62, 1, 0.62], extrapolate: 'clamp' }) }],
        }}>
          <Animated.Text onPress={() => {
            begin(); scrollTo(i, true);
            timer.current = setTimeout(finish, 350);
          }} style={[styles.number, { fontSize: small ? 40 : 46, lineHeight: rowHeight }]}>
            {String(item).padStart(2, '0')}
          </Animated.Text>
        </Animated.View>;
      })}
      <View style={{ height: rowHeight }} />
    </Animated.ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  column: { overflow: 'hidden', position: 'relative' },
  lens: { position: 'absolute', left: 2, right: 2, borderRadius: 16, backgroundColor: 'rgba(235,120,60,0.08)', borderWidth: 1, borderColor: 'rgba(216,144,64,0.2)' },
  number: { color: C.ink, fontWeight: '300', fontVariant: ['tabular-nums'], letterSpacing: -1 },
});
