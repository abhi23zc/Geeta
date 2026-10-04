import { useLanguage } from '@/i18n/provider';
import { Link } from 'expo-router';
import { Alert, Pressable, Switch, View } from 'react-native';
import { Screen, TextR } from '@/components/ritual-ui';
import { useContent } from '@/state/content-store';
import { clearContentDownloads, setWifiOnly } from '@/services/content-cache';
import { dateWindow, MB } from '../../shared/content';
import { localDateKey } from '@/data/gita-verses';
export default function Downloads() {
  const { formatDate, t: translate, text: translateText } = useLanguage();
  const { snapshot: s, refresh } = useContent();
  return <Screen>
    <Link href="/"><TextR>{translate("← Home")}</TextR></Link>
    <TextR style={{ fontSize: 28, marginVertical: 20 }}>{translate("Offline downloads")}</TextR>
    {!s.configured ? <TextR>{translate("Content delivery has not been configured. The bundled offline practice remains available.")}</TextR> : null}
    {dateWindow(localDateKey()).map(date => <TextR key={date} style={{ marginVertical: 8 }}>{date} · {s.days[date]?.narration ? translate("Ready offline") : translate("Not downloaded")}</TextR>)}
    <TextR>{(s.bytes / MB).toFixed(1)}  {translate("MB · Daily audio budget: 150 MB")}</TextR>
    <TextR>{translate("Last refresh:")} {s.lastSync ? formatDate(new Date(s.lastSync), { dateStyle: 'medium', timeStyle: 'short' }) : translate("Not yet")}</TextR>
    <TextR>{translateText(s.progress)}</TextR>
    {s.error ? <TextR accessibilityLiveRegion="polite" style={{ color: '#A23020', marginVertical: 12 }}>{translateText(s.error)}</TextR> : null}
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }}><TextR>{translate("Download on Wi-Fi only")}</TextR><Switch accessibilityLabel={translate("Download on Wi-Fi only")} value={s.wifiOnly} onValueChange={value => { void setWifiOnly(value).catch(error => Alert.alert(translate("Preference could not be saved"), translateText(String(error)))); }} /></View>
    <Pressable disabled={s.syncing} onPress={() => { void refresh().catch(error => Alert.alert(translate("Refresh failed"), translateText(String(error)))); }} style={{ padding: 16 }}><TextR>{s.syncing ? translate("Downloading…") : translate("Refresh downloads")}</TextR></Pressable>
    <Pressable onPress={() => Alert.alert(translate("Clear daily downloads?"), translate("Saved teaching text, personal history, and the installed alarm sound will be kept."), [{ text: translate("Cancel") }, { text: translate("Clear"), style: 'destructive', onPress: () => { void clearContentDownloads().catch(error => Alert.alert(translate("Could not clear downloads"), translateText(String(error)))); } }])} style={{ padding: 16 }}><TextR>{translate("Clear daily downloads")}</TextR></Pressable>
  </Screen>;
}
