import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Screen, TextR } from '@/components/ritual-ui';
import { LanguagePicker } from '@/i18n/language-picker';
import { useLanguage } from '@/i18n/provider';

export default function LanguageScreen() {
  const router = useRouter(), { t } = useLanguage();
  return <Screen><View style={{ padding: 20, gap: 24 }}>
    <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={{ minHeight: 48, justifyContent: 'center' }}><TextR>{t('Back to Home')}</TextR></Pressable>
    <TextR accessibilityRole="header" style={{ fontSize: 28, lineHeight: 42 }}>{t('Choose your language')}</TextR>
    <LanguagePicker />
    <TextR style={{ fontSize: 18, lineHeight: 28 }}>{t('Recordings and published teachings stay in their available language.')}</TextR>
  </View></Screen>;
}
