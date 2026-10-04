import { Alert, Platform } from 'react-native';
import { translate } from '@/i18n/translations';

export function confirmAction(title: string, message: string, confirm: string, action: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) action();
  } else Alert.alert(title, message, [{ text: translate('Cancel'), style: 'cancel' }, { text: confirm, style: 'destructive', onPress: action }]);
}
