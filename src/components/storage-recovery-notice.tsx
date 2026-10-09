import { Alert, Platform, Pressable, View } from 'react-native';
import { useLanguage } from '@/i18n/provider';
import { TextR } from './ritual-ui';

type Recoverable = {
  loading: boolean; loadError: string | null; saveError: boolean; corrupt: boolean;
  retryLoad(): Promise<void>; retrySave(): Promise<void>; recover(): Promise<void>;
};
export function StorageRecoveryNotice({ store }: { store: Recoverable }) {
  const { t, text } = useLanguage();
  if (!store.loadError && !store.saveError) return null;
  const recover = () => {
    const title = t('Recover saved data?');
    const message = t('The original record will be backed up before recovery. Valid entries will be restored; unreadable entries may be unavailable.');
    if (Platform.OS === 'web') { if (window.confirm(`${title}\n\n${message}`)) void store.recover(); }
    else Alert.alert(title, message, [{ text: t('Cancel'), style: 'cancel' }, { text: t('Recover saved data'), onPress: () => { void store.recover(); } }]);
  };
  return <View style={{ padding: 12, gap: 8 }}>
    <TextR accessibilityRole="alert">{text(store.loadError ?? 'Changes could not be saved. Please retry.')}</TextR>
    <Pressable accessibilityRole="button" disabled={store.loading} onPress={() => { void (store.loadError ? store.retryLoad() : store.retrySave()); }} style={{ minHeight: 48, justifyContent: 'center' }}>
      <TextR>{t('Try again')}</TextR>
    </Pressable>
    {store.corrupt && <Pressable accessibilityRole="button" disabled={store.loading} onPress={recover} style={{ minHeight: 48, justifyContent: 'center' }}><TextR>{t('Recover saved data')}</TextR></Pressable>}
  </View>;
}
