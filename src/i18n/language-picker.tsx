import { Pressable, Text, View } from 'react-native';
import { LANGUAGES, LANGUAGE_NAMES } from './model';
import { useLanguage } from './provider';

export function LanguagePicker() {
  const { language, setLanguage, busy, error, nativeSyncError, t } = useLanguage();
  return <View style={{ gap: 12 }} accessibilityRole="radiogroup" accessibilityLabel={t('App language')}>
    {LANGUAGES.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={LANGUAGE_NAMES[value]} accessibilityState={{ checked: language === value, disabled: busy }} disabled={busy} onPress={() => { void setLanguage(value); }} style={{ minHeight: 56, justifyContent: 'center', padding: 16, borderWidth: language === value ? 2 : 1, borderColor: '#A25421', backgroundColor: language === value ? '#FFE2BB' : '#FFFFFF', borderRadius: 16 }}>
      <Text style={{ color: '#2C1E16', fontSize: 21, lineHeight: 32 }}>{LANGUAGE_NAMES[value]}{language === value ? ' ✓' : ''}</Text>
    </Pressable>)}
    {error && <Text accessibilityRole="alert" style={{ fontSize: 18, lineHeight: 27, color: '#8B2014' }}>{t('Language could not be saved. Please try again.')}</Text>}
    {nativeSyncError && <><Text accessibilityRole="alert" style={{ fontSize: 18, lineHeight: 27, color: '#8B2014' }}>{t('App language saved. Alarm language could not sync. Please retry.')}</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => { void setLanguage(language); }} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ fontSize: 18 }}>{t('Retry')}</Text></Pressable></>}
  </View>;
}
