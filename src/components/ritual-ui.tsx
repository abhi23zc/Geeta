import React, { ReactNode } from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Link, usePathname } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
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

export function DiyaGraphic({
  size = 48,
  color = C.saffron,
  flameColor = C.gold,
}: {
  size?: number;
  color?: string;
  flameColor?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path d="M10 26C10 33.732 16.268 40 24 40C31.732 40 38 33.732 38 26H10Z" fill={color} />
      <Path d="M19 40L17 43H31L29 40H19Z" fill={color} />
      <Path d="M24 8C24 8 28 15 28 19C28 21.2091 26.2091 23 24 23C21.7909 23 20 21.2091 20 19C20 15 24 8 24 8Z" fill={flameColor} />
      <Path d="M24 13C24 13 26 17 26 19.5C26 20.6046 25.1046 21.5 24 21.5C22.8954 21.5 22 20.6046 22 19.5C22 17 24 13 24 13Z" fill="#FFFDF7" />
    </Svg>
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
}: {
  children: ReactNode;
  night?: boolean;
  scroll?: boolean;
}) {
  const content = (
    <View style={[styles.content, night && { backgroundColor: C.night }]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, night && { backgroundColor: C.night }]}
      edges={['top']}
    >
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
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
  night = false,
  back = false,
}: {
  eyebrow: string;
  night?: boolean;
  back?: boolean;
}) {
  const color = night ? C.canvas : C.ink;
  const eyebrowColor = night ? C.gold : C.saffron;

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
          <View style={[styles.diyaContainer, night && { backgroundColor: C.nightCard }]}>
            <DiyaGraphic size={26} color={C.saffron} flameColor={C.gold} />
          </View>
        )}
        <View>
          <TextR style={[styles.brandTitle, { color }]}>Morning Ritual</TextR>
          <TextR style={[styles.eyebrow, { color: eyebrowColor }]}>{eyebrow}</TextR>
        </View>
      </View>
      <View style={styles.headerActions}>
        <Pressable style={[styles.actionBtn, night && { backgroundColor: C.nightCard }]}>
          <Bell size={22} color={night ? '#D6D1D0' : C.inkSoft} />
        </Pressable>
        <View style={[styles.avatar, { backgroundColor: C.primary }]}>
          <User size={18} color={C.white} />
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

export function TabBar({ night = false }: { night?: boolean }) {
  const path = usePathname();
  const inset = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tab,
        {
          paddingBottom: Math.max(inset.bottom, 12),
          backgroundColor: night ? 'rgba(35, 36, 74, 0.95)' : 'rgba(255, 251, 246, 0.92)',
          borderTopColor: night ? 'rgba(60, 61, 104, 0.6)' : 'rgba(255, 255, 255, 0.9)',
        },
      ]}
    >
      {tabs.map((t) => {
        const active = path === t.href;
        const IconComp = t.IconComponent;
        const activeColor = C.saffron;
        const inactiveColor = night ? '#D6D1D0' : C.muted;

        return (
          <Link key={t.href} href={t.href as any} asChild>
            <Pressable accessibilityRole="tab" style={styles.tabItem}>
              <IconComp
                size={24}
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
                {t.label}
              </TextR>
              {active && <View style={styles.activeDot} />}
            </Pressable>
          </Link>
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
    paddingBottom: 115,
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
  tab: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.9)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    shadowColor: C.saffron,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  tabItem: {
    width: 64,
    alignItems: 'center',
    minHeight: 56,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.gold,
    marginTop: 3,
    shadowColor: C.gold,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 2,
  },
});
