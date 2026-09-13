import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { BookOpen, Activity, Leaf } from 'lucide-react-native';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';

export type ModeType = 'read' | 'listen' | 'breathe';

interface ModeSegmentedControlProps {
  activeMode: ModeType;
  onChangeMode: (mode: ModeType) => void;
  night?: boolean;
}

const MODES: { id: ModeType; label: string; icon: any }[] = [
  { id: 'read', label: 'Deep Read', icon: BookOpen },
  { id: 'listen', label: 'Recitation', icon: Activity },
  { id: 'breathe', label: 'Breathe', icon: Leaf },
];

export function ModeSegmentedControl({
  activeMode,
  onChangeMode,
  night = false,
}: ModeSegmentedControlProps) {
  const activeIndex = MODES.findIndex((m) => m.id === activeMode);
  const indicatorPosition = useSharedValue(activeIndex);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    indicatorPosition.value = withSpring(activeIndex, {
      damping: 15,
      stiffness: 190,
    });
  }, [activeIndex]);

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const itemWidth = containerWidth ? (containerWidth - 10) / 3 : 0;

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    return {
      width: itemWidth,
      transform: [{ translateX: indicatorPosition.value * itemWidth }],
    };
  });

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.containerTrack,
        night && styles.containerTrackNight,
      ]}
    >
      {/* Animated Sliding Active Background Pill */}
      {itemWidth > 0 && (
        <Animated.View
          style={[
            styles.activePill,
            night && styles.activePillNight,
            animatedIndicatorStyle,
          ]}
        />
      )}

      {MODES.map((modeItem) => {
        const isActive = activeMode === modeItem.id;
        const IconComponent = modeItem.icon;
        const activeColor = C.white;
        const inactiveColor = night ? '#A3A5CF' : '#574438';

        return (
          <Pressable
            key={modeItem.id}
            onPress={() => onChangeMode(modeItem.id)}
            style={({ pressed }) => [
              styles.segmentBtn,
              pressed && { opacity: 0.88 },
            ]}
          >
            <IconComponent
              size={18}
              color={isActive ? activeColor : inactiveColor}
            />
            <TextR
              style={[
                styles.segmentLabel,
                { color: isActive ? activeColor : inactiveColor },
                isActive && { fontWeight: '800' },
              ]}
            >
              {modeItem.label}
            </TextR>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  containerTrack: {
    height: 50,
    width: '100%',
    backgroundColor: 'rgba(254, 236, 220, 0.88)',
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(180, 125, 95, 0.35)',
    shadowColor: C.saffron,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 18,
    position: 'relative',
  },
  containerTrackNight: {
    backgroundColor: 'rgba(23, 24, 51, 0.88)',
    borderColor: '#3C3D68',
    borderTopColor: '#5C5E98',
  },
  activePill: {
    position: 'absolute',
    left: 5,
    top: 4,
    bottom: 4,
    backgroundColor: C.saffron,
    borderRadius: 20,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.45)',
    borderBottomWidth: 2,
    borderBottomColor: '#A8470C',
    shadowColor: C.saffron,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  activePillNight: {
    backgroundColor: C.saffron,
    borderBottomColor: '#8C3200',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: '100%',
    zIndex: 5,
  },
  segmentLabel: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
