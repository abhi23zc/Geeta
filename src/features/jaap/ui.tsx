import React, { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useLanguage } from '@/i18n/provider';
import { useJaap } from './provider';

export function JaapButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
  style,
  icon,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        j.button,
        secondary ? j.secondary : j.primary,
        {
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {icon}
      <TextR style={[j.buttonText, secondary ? j.secondaryButtonText : j.primaryButtonText]}>
        {label}
      </TextR>
    </Pressable>
  );
}

export function JaapPage({
  title,
  subtitle,
  children,
  right,
  night = false,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
  night?: boolean;
  compact?: boolean;
}) {
  const router = useRouter(),
    { t } = useLanguage(),
    jaap = useJaap();

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: night ? '#15271F' : C.canvas }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[j.page, compact && { gap: 12 }]}>
        <View style={j.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Back')}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={({ pressed }) => [
              j.back,
              night && j.backNight,
              { transform: [{ scale: pressed ? 0.94 : 1 }] },
            ]}
          >
            <ArrowLeft color={night ? '#FFF3DE' : C.ink} size={20} strokeWidth={2} />
          </Pressable>
          {right}
        </View>
        <TextR serif accessibilityRole="header" style={[j.title, compact && { fontSize: 28 }, night && { color: '#FFF3DE' }]}>
          {title}
        </TextR>
        {!!subtitle && <TextR style={[j.subtitle, night && { color: '#C9C9B4' }]}>{subtitle}</TextR>}
        {!!jaap.error && (
          <View style={j.error}>
            <TextR accessibilityRole="alert" style={{ color: '#8C2B0B', fontWeight: '600' }}>
              {t('Your practice could not be saved. Your saved data is safe.')}
            </TextR>
            <TextR style={j.small}>{jaap.error}</TextR>
            <JaapButton label={t('Retry')} secondary onPress={() => void jaap.retry()} />
          </View>
        )}
        {!jaap.ready && !jaap.error ? (
          <ActivityIndicator color={C.saffron} accessibilityLabel={t('Loading')} style={{ marginTop: 32 }} />
        ) : (
          children
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function JaapRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [j.row, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <TextR style={j.rowTitle}>{label}</TextR>
        {!!value && <TextR style={j.small}>{value}</TextR>}
      </View>
      <ChevronRight size={18} color={C.saffron} strokeWidth={2} />
    </Pressable>
  );
}

export const j = StyleSheet.create({
  page: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    gap: 16,
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 4,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 150, 100, 0.25)',
    borderBottomWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8C4010',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  backNight: {
    backgroundColor: '#24362A',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
    borderBottomColor: '#122018',
    borderBottomWidth: 2,
    shadowColor: '#000000',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14.5,
    lineHeight: 22,
    color: C.muted,
    marginTop: -8,
  },
  small: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: C.inkSoft,
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: 'rgba(255, 248, 242, 0.94)',
    borderRadius: 24,
    padding: 20,
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 185, 170, 0.7)',
    borderBottomWidth: 3,
    shadowColor: C.shadow3D,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    backgroundColor: 'rgba(255, 248, 242, 0.94)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 185, 170, 0.6)',
    borderBottomWidth: 2.5,
    shadowColor: '#8C4010',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.ink,
  },
  button: {
    minHeight: 54,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  primary: {
    backgroundColor: C.saffron,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.5)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(140, 64, 16, 0.35)',
    shadowColor: C.saffron,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryButtonText: {
    color: C.white,
  },
  secondary: {
    backgroundColor: 'rgba(254, 236, 220, 0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: 'rgba(140, 64, 16, 0.16)',
    shadowColor: '#8C4010',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  secondaryButtonText: {
    color: C.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(222, 192, 180, 0.65)',
    borderTopColor: 'rgba(200, 170, 160, 0.55)',
    borderBottomColor: '#FFFFFF',
    borderBottomWidth: 2,
    backgroundColor: '#FFFFFF',
    padding: 14,
    fontSize: 16,
    color: C.ink,
    shadowColor: '#8C4010',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  error: {
    padding: 16,
    gap: 10,
    backgroundColor: '#FFF0E8',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(229, 107, 39, 0.3)',
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.15)',
    borderBottomWidth: 2,
    backgroundColor: 'rgba(254, 236, 220, 0.9)',
    shadowColor: '#8C4010',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
  stat: {
    fontSize: 26,
    fontWeight: '700',
    color: C.ink,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    color: C.saffron,
    textTransform: 'uppercase',
  },
  center: {
    textAlign: 'center',
  },
});
