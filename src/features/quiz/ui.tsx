import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '@/constants/ritual-theme';
import { useQuiz } from './provider';
import { confirmAction } from './actions';
import { useLanguage } from '@/i18n/provider';
import { quizHinglishCopy } from '@/i18n/quiz-copy';

export function useCopy() {
  const { language } = useLanguage();
  return React.useCallback((en: string, hi: string) => language === 'en' ? en : language === 'hi' ? hi : quizHinglishCopy(en), [language]);
}
export function Copy({ children, title = false, small = false }: { children: React.ReactNode; title?: boolean; small?: boolean }) {
  const { progress } = useQuiz();
  const scale = { standard: 1, large: 1.15, extra: 1.3 }[progress?.settings.textSize ?? 'standard'];
  const size = (title ? 27 : small ? 17 : 21) * scale;
  return <Text accessibilityRole={title ? 'header' : undefined} style={{ color: C.ink, fontSize: size, lineHeight: size * 1.5, fontWeight: title ? '700' : '400' }}>{children}</Text>;
}
export function Button({ label, onPress, selected = false, disabled = false, primary = false, readOnly = false, radio = false }: { label: string; onPress: () => void; selected?: boolean; disabled?: boolean; primary?: boolean; readOnly?: boolean; radio?: boolean }) {
  return <Pressable accessibilityRole={radio ? 'radio' : 'button'} accessibilityState={{ disabled: disabled || readOnly, selected, ...(radio ? { checked: selected } : {}) }} disabled={disabled || readOnly} onPress={onPress} style={({ pressed }) => [styles.button, (selected || primary) && styles.selected, ((disabled && !readOnly) || pressed) && { opacity: 0.6 }]}><Copy>{label}{selected ? ' ✓' : ''}</Copy></Pressable>;
}
export function Panel({ children }: React.PropsWithChildren) { return <View style={styles.panel}>{children}</View>; }
export function QuizScreen({ title, children, onBack, scroll = true }: React.PropsWithChildren<{ title: string; onBack?: () => void; scroll?: boolean }>) {
  const { text: translateText } = useLanguage();
  const router = useRouter(), t = useCopy();
  const { busy, error, bank, progress, retry, reset } = useQuiz();
  const content = <View style={[styles.content, !scroll && { flex: 1 }]}>
    <Button label={t('‹ Back', '‹ वापस')} onPress={onBack ?? (() => router.canGoBack() ? router.back() : router.replace('/'))} disabled={busy} />
    <Copy title>{title}</Copy>
    {error && <Panel><Text accessibilityRole="alert" style={styles.error}>{t('Quiz could not be loaded or saved. Your existing data is preserved. ', 'क्विज़ लोड या सेव नहीं हो सकी। आपका पुराना डेटा सुरक्षित है। ')}{translateText(error)}</Text>{!progress && <><Button label={t('Retry', 'फिर प्रयास करें')} onPress={retry} /><Button label={t('Reset quiz data', 'क्विज़ डेटा रीसेट करें')} onPress={() => router.push('/quiz/settings')} /></>}</Panel>}
    {busy && <ActivityIndicator color={C.primary} accessibilityLabel={t('Saving or loading', 'सेव या लोड हो रहा है')} />}
    {bank && progress ? children : !error ? <Copy>{t('Preparing your questions…', 'आपके प्रश्न तैयार हो रहे हैं…')}</Copy> : title === t('Settings', 'सेटिंग्स') ? <Button label={t('Reset quiz data only', 'केवल क्विज़ डेटा रीसेट करें')} onPress={() => confirmAction(t('Reset quiz?', 'क्विज़ रीसेट करें?'), t('Remove existing quiz progress?', 'पुरानी क्विज़ प्रगति हटाएं?'), t('Reset', 'रीसेट'), () => { void reset(); })} /> : null}
  </View>;
  return <SafeAreaView style={styles.safe}>{scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}</SafeAreaView>;
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas }, scroll: { flexGrow: 1, paddingBottom: 24 },
  content: { padding: 18, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' },
  panel: { backgroundColor: '#FFF1E5', borderWidth: 1, borderColor: '#D7BCA5', borderRadius: 22, padding: 18, gap: 12 },
  button: { minHeight: 56, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#B89D88', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12, justifyContent: 'center' },
  selected: { backgroundColor: '#FFE2BB', borderColor: C.primary, borderWidth: 2 }, error: { color: '#8B2014', fontSize: 18, lineHeight: 27 },
  input: { fontSize: 21, lineHeight: 31, minHeight: 56, borderWidth: 1, borderColor: '#B89D88', backgroundColor: 'white', color: C.ink, borderRadius: 12, padding: 12 },
});
