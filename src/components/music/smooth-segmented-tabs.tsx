import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useDecorativeMotion } from '@/hooks/use-motion-environment';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ size?: number; color?: string; fill?: string; strokeWidth?: number }>;
  badgeCount?: number;
}

interface SmoothSegmentedTabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onSelectTab: (tabId: T) => void;
}

interface TabMeasurement {
  x: number;
  width: number;
}

export function SmoothSegmentedTabs<T extends string = string>({
  tabs,
  activeTab,
  onSelectTab,
}: SmoothSegmentedTabsProps<T>) {
  const motion = useDecorativeMotion();
  const measurements = useRef<Record<string, TabMeasurement>>({});
  const [ready, setReady] = useState(false);

  const pillX = useSharedValue(0);
  const pillWidth = useSharedValue(0);
  const pillOpacity = useSharedValue(0);

  const updatePill = useCallback(
    (tabId: string, animated = true) => {
      const m = measurements.current[tabId];
      if (!m) return;

      if (animated && motion) {
        pillX.value = withSpring(m.x, { damping: 20, stiffness: 220, mass: 0.8 });
        pillWidth.value = withSpring(m.width, { damping: 20, stiffness: 220, mass: 0.8 });
        pillOpacity.value = withSpring(1, { damping: 20, stiffness: 220 });
      } else {
        pillX.value = m.x;
        pillWidth.value = m.width;
        pillOpacity.value = 1;
      }
    },
    [motion, pillOpacity, pillWidth, pillX]
  );

  const handleTabLayout = (tabId: string, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    measurements.current[tabId] = { x, width };

    if (tabId === activeTab) {
      updatePill(tabId, ready);
      setReady(true);
    }
  };

  useEffect(() => {
    if (measurements.current[activeTab]) {
      updatePill(activeTab, true);
    }
  }, [activeTab, updatePill]);

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    width: pillWidth.value,
    opacity: pillOpacity.value,
  }));

  const handleTabPress = (tabId: T) => {
    if (tabId === activeTab) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onSelectTab(tabId);
  };

  return (
    <View style={styles.container}>
      {/* 3D Animated Sliding Indicator Pill */}
      <Animated.View
        pointerEvents="none"
        style={[styles.slidingPill, pillAnimatedStyle]}
      />

      {/* Tab Buttons */}
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;

        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onLayout={(e) => handleTabLayout(tab.id, e)}
            onPress={() => handleTabPress(tab.id)}
            style={styles.tabButton}
          >
            {Icon && (
              <Icon
                size={15}
                color={isActive ? '#FFFFFF' : C.muted}
                fill={tab.id === 'favorites' && isActive ? '#FFFFFF' : 'transparent'}
                strokeWidth={2.2}
              />
            )}
            <TextR
              style={[
                styles.tabLabel,
                isActive && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </TextR>

            {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
              <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                <TextR style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                  {tab.badgeCount}
                </TextR>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 999,
    padding: 2,
    marginBottom: 18,
    position: 'relative',
  },
  slidingPill: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    borderRadius: 999,
    backgroundColor: C.saffron,
    borderWidth: 1.4,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderTopWidth: 1.8,
    borderTopColor: 'rgba(255, 255, 255, 0.65)',
    borderBottomWidth: 2.5,
    borderBottomColor: 'rgba(135, 45, 8, 0.45)',
    shadowColor: '#A8470C',
    shadowOpacity: 0.38,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3.5 },
    elevation: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9.5,
    paddingHorizontal: 8,
    borderRadius: 999,
    zIndex: 2,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#68564A',
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabBadge: {
    backgroundColor: 'rgba(229, 107, 39, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 1,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  tabBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: C.primary,
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
});
