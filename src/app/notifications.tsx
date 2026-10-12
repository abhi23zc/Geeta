import React, { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { hydrateOwnerNotifications, onOwnerStatus, ownerStatus, setOwnerEnabled, configureOwnerChannels } from '@/services/owner-notifications';
import { notificationScheduleChanged } from '@/services/engagement-notifications';
import { useLanguage } from '@/i18n/provider';

export default function NotificationSettings() {
  const [status, update] = useState(ownerStatus), [busy, setBusy] = useState(false), [permission, setPermission] = useState(false);
  const { language } = useLanguage();
  const copy = (en: string, hi: string, hinglish: string) => language === 'hi' ? hi : language === 'hinglish' ? hinglish : en;
  useEffect(() => { const unsubscribe = onOwnerStatus(() => update(ownerStatus())); void hydrateOwnerNotifications().catch(() => undefined); const refresh = () => { if (Platform.OS !== 'web') void Notifications.getPermissionsAsync().then(p => setPermission(p.granted)); }; refresh(); const foreground = AppState.addEventListener('change', state => { if (state === 'active') refresh(); }); return () => { unsubscribe(); foreground.remove(); };  }, []);
  async function toggle(enabled: boolean) { setBusy(true); try { await setOwnerEnabled(enabled); } catch { Alert.alert(copy('Could not save. Please retry.', 'सेव नहीं हुआ। फिर प्रयास करें।', 'Save nahi hua. Phir try karein.')); } finally { setBusy(false); } }
  return <ScrollView style={{ flex: 1, backgroundColor: '#FFF9F5' }} contentContainerStyle={{ padding: 24, paddingTop: 60, gap: 22 }}>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ minHeight: 48 }}><Text>{copy('← Back', '← वापस', '← Wapas')}</Text></Pressable>
    <Text style={{ fontSize: 28, fontWeight: '700' }}>{copy('Notification settings', 'सूचना सेटिंग्स', 'Notification settings')}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ fontSize: 18 }}>{copy('Owner announcements', 'ऐप के संचालक की सूचनाएँ', 'App owner ke announcements')}</Text><Switch accessibilityLabel={copy('Owner announcements', 'संचालक की सूचनाएँ', 'Owner announcements')} disabled={busy || Platform.OS !== 'android'} value={status.enabled} onValueChange={v => { void toggle(v); }} /></View>
    <Text>{copy('Receive messages from the owner of Geeta. Your personal reminders and alarm settings are separate.', 'गीता के संचालक के संदेश पाएँ। आपके निजी रिमाइंडर और अलार्म सेटिंग्स अलग हैं।', 'Geeta ke owner ke messages paayein. Personal reminders aur alarm settings alag hain.')}</Text>
    <Text style={{ fontSize: 18 }}>{copy('Your app user code', 'आपका ऐप यूज़र कोड', 'Aapka app user code')}: {status.code ?? '…'}</Text>
    <Pressable accessibilityRole="button" disabled={!status.code} style={{ minHeight: 48 }} onPress={() => { if (status.code) void Clipboard.setStringAsync(status.code); }}><Text>{copy('Copy code', 'कोड कॉपी करें', 'Code copy karein')}</Text></Pressable>
    <Text>{copy('Share this code with the owner to receive selected messages. Reinstalling or clearing app storage may create a new code.', 'चुने हुए संदेश पाने के लिए संचालक को यह कोड दें। ऐप फिर इंस्टॉल करने या स्टोरेज हटाने से नया कोड बन सकता है।', 'Selected messages ke liye owner ko yeh code dein. Reinstall ya storage clear karne se naya code ban sakta hai.')}</Text>
    {Platform.OS !== 'android' ? <Text>{copy('Owner push announcements are available on Android.', 'ये सूचनाएँ Android पर उपलब्ध हैं।', 'Owner announcements Android par available hain.')}</Text> : !permission && <Pressable accessibilityRole="button" style={{ minHeight: 48 }} onPress={() => { void configureOwnerChannels().then(() => Notifications.requestPermissionsAsync()).then(p => { setPermission(p.granted); notificationScheduleChanged(); if (!p.granted) return Linking.openSettings(); }); }}><Text>{copy('Allow notifications', 'सूचनाओं की अनुमति दें', 'Notifications allow karein')}</Text></Pressable>}
    {status.pending && <Text>{copy('Update queued. It will sync when connected.', 'अपडेट कनेक्शन मिलने पर भेजा जाएगा।', 'Update queued hai. Connection milne par sync hoga.')}</Text>}
    {status.error && <Text accessibilityRole="alert">{status.error}</Text>}
  </ScrollView>;
}
