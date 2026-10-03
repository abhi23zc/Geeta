import { Link } from 'expo-router';
import { Alert, Pressable, Switch, View } from 'react-native';
import { Screen, TextR } from '@/components/ritual-ui';
import { useContent } from '@/state/content-store';
import { clearContentDownloads, setWifiOnly } from '@/services/content-cache';
import { dateWindow, MB } from '../../shared/content';
import { localDateKey } from '@/data/gita-verses';
export default function Downloads() {
  const { snapshot: s, refresh } = useContent();
  return <Screen>
    <Link href="/"><TextR>← Home</TextR></Link>
    <TextR style={{ fontSize: 28, marginVertical: 20 }}>Offline downloads</TextR>
    {!s.configured ? <TextR>Content delivery has not been configured. The bundled offline practice remains available.</TextR> : null}
    {dateWindow(localDateKey()).map(date => <TextR key={date} style={{ marginVertical: 8 }}>{date} · {s.days[date]?.narration ? 'Ready offline' : 'Not downloaded'}</TextR>)}
    <TextR>{(s.bytes / MB).toFixed(1)} MB · Daily audio budget: 150 MB</TextR>
    <TextR>Last refresh: {s.lastSync ? new Date(s.lastSync).toLocaleString() : 'Not yet'}</TextR>
    <TextR>{s.progress}</TextR>
    {s.error ? <TextR accessibilityLiveRegion="polite" style={{ color: '#A23020', marginVertical: 12 }}>{s.error}</TextR> : null}
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }}><TextR>Download on Wi-Fi only</TextR><Switch accessibilityLabel="Download on Wi-Fi only" value={s.wifiOnly} onValueChange={value => { void setWifiOnly(value).catch(error => Alert.alert('Preference could not be saved', String(error))); }} /></View>
    <Pressable disabled={s.syncing} onPress={() => { void refresh().catch(error => Alert.alert('Refresh failed', String(error))); }} style={{ padding: 16 }}><TextR>{s.syncing ? 'Downloading…' : 'Refresh downloads'}</TextR></Pressable>
    <Pressable onPress={() => Alert.alert('Clear daily downloads?', 'Saved teaching text, personal history, and the installed alarm sound will be kept.', [{ text: 'Cancel' }, { text: 'Clear', style: 'destructive', onPress: () => { void clearContentDownloads().catch(error => Alert.alert('Could not clear downloads', String(error))); } }])} style={{ padding: 16 }}><TextR>Clear daily downloads</TextR></Pressable>
  </Screen>;
}
