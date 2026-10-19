import { useRouter } from 'expo-router';
import { useMusicCatalog, useMusicPlayer } from '@/state/music-player-store';
import type { MusicDestination } from '../../../shared/music-presentation';

export function useMusicDestination() {
  const router = useRouter();
  const catalog = useMusicCatalog();
  const player = useMusicPlayer(false);
  return async (target: MusicDestination) => {
    if (target.type === 'library') { router.push('/library'); return; }
    if (target.type === 'category') { router.push({ pathname: '/library', params: { category: target.id } }); return; }
    if (target.type === 'playlist') {
      const playlist = catalog.playlists.find(p => p.id === target.id);
      if (!playlist) return;
      if (target.play) { await player.playPlaylist(playlist); player.openFullPlayer(); }
      else router.push(`/playlist/${target.id}` as never);
      return;
    }
    const track = catalog.tracks.find(t => t.id === target.id);
    if (!track || !catalog.enabled || track.availability !== 'available') return;
    if (target.play) await player.activateTrack(track);
    else if (player.currentTrack?.id !== track.id) { const entryId = `open-${Date.now()}`; await player.adapter.replaceQueue([{ entryId, track }], entryId, false); }
    player.openFullPlayer();
  };
}
