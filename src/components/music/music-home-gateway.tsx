import React from 'react';
import { Music, Sparkles, Wind, Activity, Sun } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMusicCatalog } from '@/state/music-player-store';
import { useLanguage } from '@/i18n/provider';
import { TextR } from '@/components/ritual-ui';
import { MusicArtwork } from './music-artwork';
import { useMusicDestination } from './use-music-destination';
import { localized } from '../../../shared/music-presentation';
import { C } from '@/constants/ritual-theme';
export function MusicHomeGateway() {
  const { page, tracks, playlists, enabled } = useMusicCatalog();
  const { language, text: t } = useLanguage();
  const go = useMusicDestination();
  const home = page.presentation.home;
  if (!home.visible) return null;
  const target = home.target;
  const unavailable = target.type === 'track' ? !enabled || tracks.find(track => track.id === target.id)?.availability !== 'available' : target.type === 'playlist' && target.play ? !enabled || !playlists.find(p => p.id === target.id)?.trackIds.some(id => tracks.find(track => track.id === id)?.availability === 'available') : false;
  const Icon = { gita: Music, mantra: Sparkles, raga: Music, flute: Wind, pranayama: Activity, soundscape: Sun }[home.theme];
  const image = page.media.find(m => m.id === home.imageId);
  return <Pressable disabled={unavailable} accessibilityState={{ disabled: unavailable }} accessibilityRole="button" accessibilityLabel={`${localized(home.title, language)}. ${localized(home.button, language)}`} onPress={() => { void go(home.target).catch(() => undefined); }} style={({ pressed }) => [styles.card, unavailable && { opacity: .6 }, pressed && { opacity: .8 }]}>
    <View style={styles.iconCircle}>{image ? <MusicArtwork uri={image.thumbnail} category={home.theme} style={styles.art} alt={localized(image.alt, language)} /> : <Icon size={24} color={C.saffron} />}</View>
    <View style={{ flex: 1, minWidth: 0 }}><TextR style={styles.eyebrow}>{localized(home.eyebrow, language)}</TextR><TextR style={styles.title}>{localized(home.title, language)}</TextR><TextR style={styles.subtitle}>{localized(home.subtitle, language)}</TextR>{unavailable && <TextR style={styles.button}>{t('Coming soon')}</TextR>}</View>
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: 'rgba(254, 236, 220, 0.85)', borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4, marginBottom: 20, borderWidth: 1.5, borderColor: 'rgba(244, 185, 66, 0.4)', borderTopColor: '#FFFFFF', shadowColor: C.saffron, shadowOpacity: .1, shadowRadius: 16, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  iconCircle: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(244, 185, 66, 0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.95)', shadowColor: C.saffron, shadowOpacity: .2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4, flexShrink: 0 },
  art: { width: '100%', height: '100%', borderRadius: 29 }, eyebrow: { fontSize: 11, color: C.saffron, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }, title: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 1 }, subtitle: { fontSize: 13, lineHeight: 19, color: C.muted, marginTop: 2, fontWeight: '500' }, button: { color: C.saffron, fontSize: 12, fontWeight: '700' },
});
