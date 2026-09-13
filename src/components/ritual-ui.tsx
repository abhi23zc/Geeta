import React, { ReactNode } from 'react';
import {
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Link, usePathname } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import {
  Bell,
  User,
  Flame,
  BookOpen,
  Leaf,
  Sun,
  Moon,
  ChevronLeft,
} from 'lucide-react-native';
import { C, R } from '@/constants/ritual-theme';

import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export const MORNING_RITUAL_LOGO = require('@/assets/images/morning-ritual-logo.png');

export function DawnMeshBackdrop({ night = false }: { night?: boolean }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="650" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <Defs>
          <RadialGradient
            id="dawnSunburst"
            cx="50%"
            cy="-10%"
            r="120%"
            fx="50%"
            fy="-10%"
          >
            {night ? [
              <Stop key="n1" offset="0%" stopColor="#252754" stopOpacity="0.75" />,
              <Stop key="n2" offset="45%" stopColor="#1C1D3E" stopOpacity="0.4" />,
              <Stop key="n3" offset="85%" stopColor="#171833" stopOpacity="0.1" />,
              <Stop key="n4" offset="100%" stopColor={C.night} stopOpacity="0" />,
            ] : [
              <Stop key="d1" offset="0%" stopColor="#FDE3B8" stopOpacity="0.6" />,
              <Stop key="d2" offset="30%" stopColor="#FDCBA5" stopOpacity="0.32" />,
              <Stop key="d3" offset="65%" stopColor="#FEEADC" stopOpacity="0.12" />,
              <Stop key="d4" offset="100%" stopColor={C.surface} stopOpacity="0" />,
            ]}
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="650" fill="url(#dawnSunburst)" />
      </Svg>
    </View>
  );
}

export function DiyaGraphic({
  size = 48,
  color = C.saffron,
  flameColor = C.gold,
  animated = true,
  showAura = false,
}: {
  size?: number;
  color?: string;
  flameColor?: string;
  animated?: boolean;
  showAura?: boolean;
}) {
  const flameScaleY = useSharedValue(1);
  const flameTranslateY = useSharedValue(0);
  const flameRotate = useSharedValue(0);
  const flameOpacity = useSharedValue(0.95);
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);

  React.useEffect(() => {
    if (!animated) return;

    flameScaleY.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 700, easing: Easing.sin }),
        withTiming(0.94, { duration: 600, easing: Easing.sin }),
        withTiming(1.08, { duration: 800, easing: Easing.sin })
      ),
      -1,
      true
    );

    flameTranslateY.value = withRepeat(
      withSequence(
        withTiming(-1.5, { duration: 650, easing: Easing.ease }),
        withTiming(0.8, { duration: 750, easing: Easing.ease })
      ),
      -1,
      true
    );

    flameRotate.value = withRepeat(
      withSequence(
        withTiming(2.5, { duration: 800, easing: Easing.ease }),
        withTiming(-2.5, { duration: 900, easing: Easing.ease })
      ),
      -1,
      true
    );

    flameOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 500 }),
        withTiming(0.88, { duration: 650 })
      ),
      -1,
      true
    );

    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [animated]);

  const animatedFlameStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: animated ? flameTranslateY.value : 0 },
      { scaleY: animated ? flameScaleY.value : 1 },
      { rotate: animated ? `${flameRotate.value}deg` : '0deg' },
    ],
    opacity: animated ? flameOpacity.value : 1,
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: animated ? glowScale.value : 1 }],
    opacity: animated ? glowOpacity.value : 0.4,
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {/* Dynamic Flickering Radial Light Halo */}
      {showAura && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: size * 1.6,
              height: size * 1.6,
              borderRadius: (size * 1.6) / 2,
              backgroundColor: 'rgba(255, 179, 0, 0.35)',
              shadowColor: '#FF6D00',
              shadowRadius: size * 0.5,
              shadowOpacity: 0.9,
              elevation: 6,
            },
            animatedGlowStyle,
          ]}
        />
      )}

      <View style={{ position: 'relative', width: size, height: size }}>
        {/* Layer 1: Realistic Clay / Brass Oil Lamp Base */}
        <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ position: 'absolute', top: 0, left: 0 }}>
          <Defs>
            {/* Clay Bowl Metallic Gradient */}
            <LinearGradient id="diyaBowlGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FF7043" />
              <Stop offset="40%" stopColor="#D84315" />
              <Stop offset="100%" stopColor="#5D4037" />
            </LinearGradient>

            {/* Brass Lip Highlight */}
            <LinearGradient id="diyaRimGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#FFE082" />
              <Stop offset="50%" stopColor="#FFB74D" />
              <Stop offset="100%" stopColor="#FF8F00" />
            </LinearGradient>

            {/* Ghee Oil Surface Reflection */}
            <LinearGradient id="oilSurfaceGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFE082" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#FF8F00" stopOpacity="0.7" />
            </LinearGradient>
          </Defs>

          {/* Lamp Pedestal Stand */}
          <Path d="M18 39L16 43H32L30 39H18Z" fill="#4E342E" />
          <Path d="M19 40L17.5 42.5H30.5L29 40H19Z" fill="#3E2723" />

          {/* Lamp Outer Bowl Shell */}
          <Path
            d="M8 25C8 33.8366 15.1634 40.5 24 40.5C32.8366 40.5 40 33.8366 40 25H8Z"
            fill="url(#diyaBowlGrad)"
          />

          {/* Glowing Oil Surface Rim */}
          <Path
            d="M8 25C8 26.5 15.1634 27.8 24 27.8C32.8366 27.8 40 26.5 40 25C40 23.5 32.8366 22.2 24 22.2C15.1634 22.2 8 23.5 8 25Z"
            fill="url(#oilSurfaceGrad)"
          />

          {/* Top Lip Golden Brass Edge */}
          <Path
            d="M7.5 24.5C7.5 25.2 14.88 26.2 24 26.2C33.12 26.2 40.5 25.2 40.5 24.5C40.5 23.8 33.12 22.8 24 22.8C14.88 22.8 7.5 23.8 7.5 24.5Z"
            stroke="url(#diyaRimGrad)"
            strokeWidth="1.2"
          />

          {/* Cotton Wick Base */}
          <Path d="M23.2 24.5L24 20L24.8 24.5Z" fill="#212121" />
        </Svg>

        {/* Layer 2: Reanimated Realistic Glowing Multi-Core Flame */}
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: size, height: size }, animatedFlameStyle]}>
          <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
            <Defs>
              {/* Outer Amber Flame Gradient */}
              <LinearGradient id="flameOuterGrad" x1="0.5" y1="0" x2="0.5" y2="1">
                <Stop offset="0%" stopColor="#FF9100" />
                <Stop offset="60%" stopColor="#FF3D00" />
                <Stop offset="100%" stopColor="#D50000" stopOpacity="0.8" />
              </LinearGradient>

              {/* Inner Golden Flame Gradient */}
              <LinearGradient id="flameInnerGrad" x1="0.5" y1="0" x2="0.5" y2="1">
                <Stop offset="0%" stopColor="#FFEA00" />
                <Stop offset="70%" stopColor="#FFC400" />
                <Stop offset="100%" stopColor="#FF9100" />
              </LinearGradient>
            </Defs>

            {/* 1. Outer Amber Flame Halo */}
            <Path
              d="M24 5C24 5 29.5 13.5 29.5 18.5C29.5 21.5376 27.0376 24 24 24C20.9624 24 18.5 21.5376 18.5 18.5C18.5 13.5 24 5 24 5Z"
              fill="url(#flameOuterGrad)"
            />

            {/* 2. Fiery Golden Core */}
            <Path
              d="M24 8.5C24 8.5 28 15 28 19C28 21.2091 26.2091 23 24 23C21.7909 23 20 21.2091 20 19C20 15 24 8.5 24 8.5Z"
              fill="url(#flameInnerGrad)"
            />

            {/* 3. White-Hot Intense Inner Core */}
            <Path
              d="M24 12C24 12 26 16.5 26 19.2C26 20.3046 25.1046 21.2 24 21.2C22.8954 21.2 22 20.3046 22 19.2C22 16.5 24 12 24 12Z"
              fill="#FFFDE7"
            />

            {/* 4. Pure White Center Spark */}
            <Path
              d="M24 15C24 15 25.2 18 25.2 19.6C25.2 20.2627 24.6627 20.8 24 20.8C23.3373 20.8 22.8 20.2627 22.8 19.6C22.8 18 24 15 24 15Z"
              fill="#FFFFFF"
            />

            {/* 5. Indigo Wick Ember Base */}
            <Path
              d="M24 21.2C24.8 21.2 25.3 21.7 25.3 22.3C25.3 23 24.7 23.5 24 23.5C23.3 23.5 22.7 23 22.7 22.3C22.7 21.7 23.2 21.2 24 21.2Z"
              fill="#304FFE"
              opacity="0.85"
            />
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

export function TextR({
  children,
  style,
  serif = false,
  ...rest
}: any) {
  return (
    <Text
      {...rest}
      style={[
        {
          color: C.ink,
          fontFamily: serif ? 'Georgia' : undefined,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Screen({
  children,
  night = false,
  scroll = true,
  contentStyle,
  contentContainerStyle,
}: {
  children: ReactNode;
  night?: boolean;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const nightBg = '#0B0D19';
  const content = (
    <View style={[styles.content, night && { backgroundColor: nightBg }, contentStyle]}>
      <DawnMeshBackdrop night={night} />
      {children}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, night && { backgroundColor: nightBg }]}
      edges={['top']}
    >
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: 100 }, contentContainerStyle]}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function Header({
  eyebrow,
  title,
  night = false,
  back = false,
}: {
  eyebrow: string;
  title?: string;
  night?: boolean;
  back?: boolean;
}) {
  const color = night ? '#F1F3F9' : C.ink;
  const eyebrowColor = night ? '#F4B942' : C.saffron;

  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        {back ? (
          <Link href="/" asChild>
            <Pressable style={styles.backBtn}>
              <ChevronLeft size={28} color={color} />
            </Pressable>
          </Link>
        ) : (
          <Image source={MORNING_RITUAL_LOGO} style={styles.logoMarkOnly} />
        )}
        <View>
          <TextR style={[styles.brandTitle, { color }]}>{title ?? 'Morning Ritual'}</TextR>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
            {night && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F4B942' }} />}
            <TextR style={[styles.eyebrow, { color: eyebrowColor }]}>{eyebrow}</TextR>
          </View>
        </View>
      </View>
      <View style={styles.headerActions}>
        <Pressable style={[styles.actionBtn, night && { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
          <Bell size={20} color={night ? '#7D86A9' : C.inkSoft} />
        </Pressable>
        <View style={[styles.avatar, { backgroundColor: '#E76F2E' }]}>
          <User size={18} color="#0B0D19" strokeWidth={2.5} />
        </View>
      </View>
    </View>
  );
}

const tabs = [
  { href: '/', label: 'Home', IconComponent: Flame },
  { href: '/gita', label: 'Gita', IconComponent: BookOpen },
  { href: '/breathe', label: 'Breathe', IconComponent: Leaf },
  { href: '/today', label: 'Today', IconComponent: Sun },
  { href: '/night', label: 'Night', IconComponent: Moon },
];

import { useRouter } from 'expo-router';

function AnimatedTabItem({
  tab,
  active,
  night,
  onPress,
}: {
  tab: { href: string; label: string; IconComponent: any };
  active: boolean;
  night: boolean;
  onPress: () => void;
}) {
  const IconComp = tab.IconComponent;
  const activeColor = night ? '#F4B942' : C.saffron;
  const inactiveColor = night ? '#7D86A9' : C.muted;
  const scale = useSharedValue(active ? 1.05 : 1);

  React.useEffect(() => {
    scale.value = withSpring(active ? 1.08 : 1, { damping: 14, stiffness: 180 });
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabItem,
        active && (night ? styles.tabItemActiveNight : styles.tabItemActive),
        pressed && { opacity: 0.88 },
      ]}
    >
      <Animated.View style={[{ alignItems: 'center' }, animatedStyle]}>
        <IconComp
          size={22}
          color={active ? activeColor : inactiveColor}
        />
        <TextR
          style={[
            styles.tabLabel,
            {
              color: active ? activeColor : inactiveColor,
              fontWeight: active ? '800' : '600',
            },
          ]}
        >
          {tab.label}
        </TextR>
        {active && <View style={[styles.activeDot, night && { backgroundColor: '#F4B942' }]} />}
      </Animated.View>
    </Pressable>
  );
}

export function TabBar({ night }: { night?: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const inset = useSafeAreaInsets();
  const isNight = night ?? path === '/night';
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (keyboardVisible) return null;

  return (
    <View
      style={[
        styles.floatingTabDock,
        {
          bottom: Math.max(inset.bottom + 8, 18),
          backgroundColor: isNight ? '#0B0D19' : 'rgba(255, 246, 238, 0.95)',
          borderColor: isNight ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
          borderBottomColor: isNight ? 'rgba(255, 255, 255, 0.04)' : 'rgba(180, 125, 95, 0.4)',
        },
      ]}
    >
      {tabs.map((t) => {
        const active = path === t.href;
        return (
          <AnimatedTabItem
            key={t.href}
            tab={t}
            active={active}
            night={isNight}
            onPress={() => router.push(t.href as any)}
          />
        );
      })}
    </View>
  );
}

export function Card({
  children,
  style,
  night = false,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  night?: boolean;
}) {
  return (
    <View
      style={[
        styles.card,
        night && { backgroundColor: C.nightCard, borderColor: '#3C3D68' },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function PillButton({
  label,
  onPress,
  secondary = false,
  icon,
}: {
  label: string;
  onPress?: () => void;
  secondary?: boolean;
  icon?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
      ]}
    >
      <TextR style={[styles.buttonText, secondary && { color: C.ink }]}>
        {icon ? `${icon}  ${label}` : label}
      </TextR>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.surface,
  },
  scroll: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    backgroundColor: C.surface,
    paddingHorizontal: 20,
    paddingBottom: 20,
    position: 'relative',
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diyaContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    shadowColor: C.saffron,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    overflow: 'hidden',
  },
  logoMarkOnly: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  logoMark: {
    width: 38,
    height: 38,
    aspectRatio: 1,
    resizeMode: 'contain',
  },
  brandTitle: {
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 25,
    color: C.ink,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: C.saffron,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  card: {
    backgroundColor: 'rgba(255, 248, 242, 0.88)',
    borderRadius: R.card,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderTopColor: '#FFFFFF',
    shadowColor: '#8C4010',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  button: {
    height: 54,
    borderRadius: R.pill,
    backgroundColor: C.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: C.saffron,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  secondary: {
    backgroundColor: 'rgba(254, 236, 220, 0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowOpacity: 0.05,
  },
  buttonText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
  },
  floatingTabDock: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(180, 125, 95, 0.4)',
    borderBottomWidth: 3,
    shadowColor: '#5C2B0B',
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
    zIndex: 100,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 20,
    position: 'relative',
  },
  tabItemActive: {
    backgroundColor: 'rgba(254, 236, 220, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  tabItemActiveNight: {
    backgroundColor: 'rgba(35, 36, 74, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(60, 61, 104, 0.8)',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: C.saffron,
    marginTop: 2,
    shadowColor: C.saffron,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
});
