import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Pressable, ScrollView, View } from 'react-native';
import { useIsFocused, useNavigation } from 'expo-router/react-navigation';
import { ArrowLeft } from 'lucide-react-native';
import { Screen, TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useLanguage } from '@/i18n/provider';
import { OnboardingPermissions } from '@/features/onboarding/permissions';
import { useAlarmPresentation } from '@/navigation/alarm-presentation';
import { getAlarmPresentationState } from '@/services/alarm';
import { replaceAppRoute } from '@/navigation/route-actions';

export default function AlarmHelpScreen() {
  const { t, formatNumber } = useLanguage();
  const navigation = useNavigation();
  const focused = useIsFocused();
  const alarm = useAlarmPresentation();
  const backAction = useRef<(() => void) | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [progress, setProgress] = useState({ position: 1, total: 1 });
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [progress.position]);
  const finish = useCallback(() => {
    if (!navigation.isFocused() || AppState.currentState !== 'active' || getAlarmPresentationState().active) return;
    if (navigation.canGoBack()) navigation.goBack();
    else replaceAppRoute(navigation, '/alarm/setup');
  }, [navigation]);
  const registerBack = useCallback((action: (() => void) | null) => { backAction.current = action; }, []);
  const onProgress = useCallback((position: number, total: number) => {
    setProgress(previous => previous.position === position && previous.total === total ? previous : { position, total });
  }, []);
  const back = useCallback(() => {
    if (!navigation.isFocused() || AppState.currentState !== 'active' || getAlarmPresentationState().active) return;
    if (backAction.current) backAction.current();
    else finish();
  }, [navigation, finish]);
  useEffect(() => {
    if (!focused || alarm.active) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => listener.remove();
  }, [focused, alarm.active, back]);
  if (alarm.active) return null;
  return <Screen
    fullScreenBackground
    scrollRef={scrollRef}
    contentContainerStyle={{ paddingBottom: 0 }}
    contentStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 }}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Go back')} onPress={back} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
        <ArrowLeft size={24} color={C.ink} />
      </Pressable>
      <View style={{ flex: 1, gap: 4 }}>
        <TextR accessibilityRole="header" style={{ fontSize: 22, fontWeight: '800' }}>{t('Alarm help')}</TextR>
        <TextR accessibilityLiveRegion="polite" style={{ color: C.muted }}>{t('Step {current} of {total}', { current: formatNumber(progress.position), total: formatNumber(progress.total) })}</TextR>
      </View>
    </View>
    <OnboardingPermissions onProgress={onProgress} registerBack={registerBack} onFinish={finish} />
  </Screen>;
}
