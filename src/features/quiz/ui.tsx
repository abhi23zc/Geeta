import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import {
  ChevronLeft,
  AlertCircle,
  Check,
  X,
  Flame,
} from 'lucide-react-native';
import { C } from '@/constants/ritual-theme';
import { useQuiz } from './provider';
import { confirmAction } from './actions';
import { useLanguage } from '@/i18n/provider';
import { quizHinglishCopy } from '@/i18n/quiz-copy';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function useCopy() {
  const { language } = useLanguage();
  return useCallback(
    (en: string, hi: string) =>
      language === 'en' ? en : language === 'hi' ? hi : quizHinglishCopy(en),
    [language]
  );
}

export function useQuizTextScale(): number {
  const { progress } = useQuiz();
  const size = progress?.settings.textSize ?? 'standard';
  switch (size) {
    case 'large':
      return 1.18;
    case 'extra':
      return 1.35;
    default:
      return 1.0;
  }
}

export function Copy({
  children,
  title = false,
  small = false,
  serif = false,
  style,
  color,
}: {
  children: React.ReactNode;
  title?: boolean;
  small?: boolean;
  serif?: boolean;
  style?: StyleProp<TextStyle>;
  color?: string;
}) {
  const scale = useQuizTextScale();
  const flat = StyleSheet.flatten(style) || {};
  const baseSize = flat.fontSize ?? (title ? 20 : small ? 13 : 16);
  const size = Math.round(baseSize * scale);
  const baseLineHeight = flat.lineHeight ?? Math.round(baseSize * (title ? 1.35 : 1.45));
  const lineHeight = Math.round(baseLineHeight * scale);

  return (
    <Text
      accessibilityRole={title ? 'header' : undefined}
      style={[
        styles.textBase,
        {
          fontWeight: title ? '800' : small ? '500' : '600',
          color: color ?? (title ? C.ink : small ? C.muted : C.inkSoft),
          fontFamily: serif && Platform.OS === 'ios' ? 'Georgia' : serif ? 'serif' : undefined,
        },
        style,
        {
          fontSize: size,
          lineHeight,
        },
      ]}
    >
      {children}
    </Text>
  );
}

export function Panel({
  children,
  style,
  glow = false,
  gold = false,
  emerald = false,
}: React.PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
  gold?: boolean;
  emerald?: boolean;
}>) {
  return (
    <View
      style={[
        styles.panel,
        gold && styles.panelGold,
        emerald && styles.panelEmerald,
        glow && styles.panelGlow,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  selected = false,
  disabled = false,
  primary = false,
  readOnly = false,
  radio = false,
  variant = 'default',
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  primary?: boolean;
  readOnly?: boolean;
  radio?: boolean;
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'danger';
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useQuizTextScale();
  const pressed = useSharedValue(0);
  const reduced = useReducedMotion();

  const isPrimary = primary || variant === 'primary';
  const isOutline = variant === 'outline';
  const isDanger = variant === 'danger';

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: reduced ? 1 : 1 - pressed.value * 0.02 },
      { translateY: reduced ? 0 : pressed.value * 1.5 },
    ],
  }));

  return (
    <AnimatedPressable
      accessibilityRole={radio ? 'radio' : 'button'}
      accessibilityState={{
        disabled: disabled || readOnly,
        selected,
        ...(radio ? { checked: selected } : {}),
      }}
      disabled={disabled || readOnly}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 80 });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: 120 });
      }}
      style={[
        styles.button,
        isPrimary && styles.buttonPrimary,
        selected && !isPrimary && styles.buttonSelected,
        isOutline && styles.buttonOutline,
        isDanger && styles.buttonDanger,
        ((disabled && !readOnly) || (disabled && isPrimary)) && { opacity: 0.55 },
        animStyle,
        style,
      ]}
    >
      <View style={styles.buttonContentRow}>
        {icon && <View style={styles.buttonIconWrap}>{icon}</View>}
        <Text
          style={[
            styles.buttonText,
            isPrimary && styles.buttonTextPrimary,
            selected && !isPrimary && styles.buttonTextSelected,
            isOutline && styles.buttonTextOutline,
            isDanger && styles.buttonTextDanger,
            {
              fontSize: Math.round(15 * scale),
            },
          ]}
        >
          {label}
          {selected && !radio ? '  ✓' : ''}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

export function OptionTile({
  index,
  label,
  selected,
  answered,
  isCorrect,
  isUserChoice,
  disabled,
  onPress,
}: {
  index: number;
  label: string;
  selected: boolean;
  answered: boolean;
  isCorrect?: boolean;
  isUserChoice?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const scale = useQuizTextScale();
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const letter = letters[index % letters.length];
  const pressed = useSharedValue(0);
  const reduced = useReducedMotion();

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduced ? 1 : 1 - pressed.value * 0.015 }],
  }));

  const isSelected = !answered && selected;

  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 80 });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: 120 });
      }}
      style={[
        styles.optionTile,
        isSelected && styles.optionTileSelected,
        answered && isCorrect && styles.optionTileCorrect,
        answered && isUserChoice && !isCorrect && styles.optionTileWrong,
        answered && !isCorrect && !isUserChoice && styles.optionTileDimmed,
        animStyle,
      ]}
    >
      <View
        style={[
          styles.optionLetter,
          isSelected && styles.optionLetterSelected,
          answered && isCorrect && styles.optionLetterCorrect,
          answered && isUserChoice && !isCorrect && styles.optionLetterWrong,
        ]}
      >
        {answered && isCorrect ? (
          <Check size={16} color="#FFFFFF" strokeWidth={3} />
        ) : answered && isUserChoice ? (
          <X size={16} color="#FFFFFF" strokeWidth={3} />
        ) : (
          <Text style={[styles.optionLetterText, { fontSize: Math.round(14 * Math.min(scale, 1.15)) }]}>
            {letter}
          </Text>
        )}
      </View>
      <Text
        style={[
          styles.optionText,
          isSelected && styles.optionTextSelected,
          answered && isCorrect && styles.optionTextCorrect,
          answered && isUserChoice && !isCorrect && styles.optionTextWrong,
          {
            fontSize: Math.round(15 * scale),
            lineHeight: Math.round(21 * scale),
          },
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export function QuizProgressBar({
  current,
  total,
  streak = 0,
}: {
  current: number;
  total: number;
  streak?: number;
}) {
  const progressPercent = Math.min(Math.max((current / Math.max(total, 1)) * 100, 0), 100);

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>
      <View style={styles.progressMetaRow}>
        <Text style={styles.progressStepText}>
          {current} / {total}
        </Text>
        {streak > 1 && (
          <View style={styles.streakBadge}>
            <Flame size={12} color={C.saffron} />
            <Text style={styles.streakBadgeText}>{streak}x Combo</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function QuizScreen({
  title,
  subtitle,
  children,
  onBack,
  scroll = true,
  showBack = true,
  leftElement,
  rightElement,
}: React.PropsWithChildren<{
  title: string;
  subtitle?: string;
  onBack?: () => void;
  scroll?: boolean;
  showBack?: boolean;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}>) {
  const { text: translateText } = useLanguage();
  const router = useRouter();
  const t = useCopy();
  const { busy, error, bank, progress, retry, reset } = useQuiz();

  const handleBack = useCallback(() => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [onBack, router]);

  const content = (
    <View style={[styles.content, !scroll && { flex: 1 }]}>
      {/* Top Header Bar */}
      <View style={styles.headerRow}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Back', 'वापस')}
            onPress={handleBack}
            disabled={busy}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.75, transform: [{ scale: 0.94 }] }]}
          >
            <ChevronLeft size={22} color={C.ink} />
          </Pressable>
        ) : leftElement ? (
          <View style={styles.headerLeftWrap}>{leftElement}</View>
        ) : (
          <View style={{ width: 40 }} />
        )}

        <View style={styles.headerTitleWrap}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {title}
          </Text>
          {subtitle && (
            <Text numberOfLines={1} style={styles.headerSubtitle}>
              {subtitle}
            </Text>
          )}
        </View>

        {rightElement ? <View style={styles.headerRightWrap}>{rightElement}</View> : <View style={{ width: 40 }} />}
      </View>

      {error && (
        <Panel style={styles.errorPanel}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={20} color="#BA1A1A" />
            <Text accessibilityRole="alert" style={styles.errorText}>
              {t('Quiz could not be loaded or saved.', 'क्विज़ लोड या सेव नहीं हो सकी।')}{' '}
              {translateText(error)}
            </Text>
          </View>
          {!progress && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <Button primary label={t('Retry', 'फिर प्रयास करें')} onPress={retry} />
              <Button label={t('Reset data', 'डेटा रीसेट')} onPress={() => router.push('/quiz/settings')} />
            </View>
          )}
        </Panel>
      )}

      {busy && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={C.saffron} />
        </View>
      )}

      {bank && progress ? (
        children
      ) : !error ? (
        <View style={styles.initialLoading}>
          <ActivityIndicator size="large" color={C.saffron} />
          <Copy style={{ marginTop: 12 }}>{t('Preparing your sacred questions…', 'आपके प्रश्न तैयार हो रहे हैं…')}</Copy>
        </View>
      ) : title === t('Settings', 'सेटिंग्स') ? (
        <Button
          label={t('Reset quiz data only', 'केवल क्विज़ डेटा रीसेट करें')}
          onPress={() =>
            confirmAction(
              t('Reset quiz?', 'क्विज़ रीसेट करें?'),
              t('Remove existing quiz progress?', 'पुरानी क्विज़ प्रगति हटाएं?'),
              t('Reset', 'रीसेट'),
              () => {
                void reset();
              }
            )
          }
        />
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.canvas,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 120, // Generous padding so content never gets covered by the bottom tab bar
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 12,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  textBase: {
    color: C.ink,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 2,
  },
  headerLeftWrap: {
    minWidth: 40,
    alignItems: 'flex-start',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(225, 205, 190, 0.8)',
    shadowColor: '#5C2B0B',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: C.muted,
    marginTop: 1,
  },
  headerRightWrap: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  panel: {
    backgroundColor: 'rgba(255, 252, 248, 0.96)',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomColor: 'rgba(190, 140, 110, 0.35)',
    borderBottomWidth: 3,
    borderRadius: 22,
    padding: 16,
    gap: 10,
    shadowColor: '#5C2B0B',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  panelGold: {
    backgroundColor: 'rgba(255, 249, 235, 0.98)',
    borderColor: 'rgba(244, 185, 66, 0.45)',
    borderBottomColor: 'rgba(210, 150, 40, 0.55)',
  },
  panelEmerald: {
    backgroundColor: 'rgba(240, 253, 244, 0.98)',
    borderColor: 'rgba(94, 158, 104, 0.35)',
    borderBottomColor: 'rgba(42, 92, 51, 0.5)',
  },
  panelGlow: {
    shadowColor: C.saffron,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 5,
  },
  button: {
    minHeight: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(225, 205, 190, 0.9)',
    borderBottomColor: 'rgba(180, 135, 105, 0.45)',
    borderBottomWidth: 3,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    shadowColor: '#5C2B0B',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  buttonPrimary: {
    backgroundColor: C.saffron,
    borderColor: '#F88448',
    borderBottomColor: '#BA501A',
    borderBottomWidth: 3.5,
    shadowColor: '#BA501A',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonSelected: {
    backgroundColor: 'rgba(255, 244, 230, 0.98)',
    borderColor: C.saffron,
    borderWidth: 2,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(180, 140, 115, 0.4)',
    borderBottomWidth: 1.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonDanger: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderBottomColor: '#BA1A1A',
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonIconWrap: {
    marginRight: 2,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
    textAlign: 'center',
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  buttonTextSelected: {
    color: C.primary,
    fontWeight: '800',
  },
  buttonTextOutline: {
    color: C.muted,
    fontWeight: '600',
  },
  buttonTextDanger: {
    color: '#BA1A1A',
    fontWeight: '700',
  },
  optionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderWidth: 1.5,
    borderColor: 'rgba(225, 205, 190, 0.85)',
    borderBottomColor: 'rgba(185, 140, 110, 0.35)',
    borderBottomWidth: 3,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#5C2B0B',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  optionTileSelected: {
    backgroundColor: '#FFF6EC',
    borderColor: C.saffron,
    borderBottomColor: '#BA501A',
    borderWidth: 2,
  },
  optionTileCorrect: {
    backgroundColor: '#EDFAF0',
    borderColor: '#34A853',
    borderBottomColor: '#2A5C33',
    borderWidth: 2,
  },
  optionTileWrong: {
    backgroundColor: '#FDF2F0',
    borderColor: '#EA4335',
    borderBottomColor: '#900',
    borderWidth: 2,
  },
  optionTileDimmed: {
    opacity: 0.5,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(242, 223, 209, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterSelected: {
    backgroundColor: C.saffron,
  },
  optionLetterCorrect: {
    backgroundColor: '#34A853',
  },
  optionLetterWrong: {
    backgroundColor: '#EA4335',
  },
  optionLetterText: {
    fontSize: 14,
    fontWeight: '800',
    color: C.ink,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    color: C.ink,
  },
  optionTextSelected: {
    color: C.primary,
    fontWeight: '700',
  },
  optionTextCorrect: {
    color: '#1B5E20',
    fontWeight: '700',
  },
  optionTextWrong: {
    color: '#900',
    fontWeight: '700',
  },
  progressContainer: {
    gap: 6,
    marginVertical: 4,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(235, 215, 200, 0.6)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: C.saffron,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStepText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 237, 215, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 107, 39, 0.35)',
  },
  streakBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.primary,
  },
  errorPanel: {
    backgroundColor: '#FDF2F2',
    borderColor: '#F8B4B4',
  },
  errorText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  loadingWrap: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  initialLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    lineHeight: 22,
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(215, 188, 165, 0.8)',
    backgroundColor: '#FFFFFF',
    color: C.ink,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontWeight: '600',
  },
});
