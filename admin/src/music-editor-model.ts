import { migrateMusicRelease, mediaUsage, type MusicReleaseV2, type MusicSection } from '../../shared/music-presentation';
import { MUSIC_SEED } from '../../shared/music-seed';
export const editorSeed = () => migrateMusicRelease(structuredClone(MUSIC_SEED));
export function moveItem<T>(values: T[], from: number, to: number): T[] { if (from < 0 || from >= values.length || to < 0 || to >= values.length) return values; const next = [...values]; const [value] = next.splice(from, 1); next.splice(to, 0, value); return next; }
export function newSection(type: MusicSection['type'], id: string): MusicSection {
  const base = { id, visible: true, title: { en: ({ featured: 'Featured recording', categories: 'Browse categories', tracks: 'Listen and discover', playlists: 'Selected playlists', banner: 'A moment of peace' })[type] }, subtitle: { en: '' }, theme: 'gita' as const };
  if (type === 'featured' || type === 'banner') return { ...base, type, layout: 'hero', target: { type: 'library' }, button: { en: 'Explore' } };
  if (type === 'categories') return { ...base, type, layout: 'chips', ids: [] };
  return { ...base, type, layout: type === 'tracks' ? 'list' : 'cards', ids: [] };
}
export function categoryUsage(page: MusicReleaseV2, id: string) {
  return [...page.tracks.filter(t => t.category === id).map(t => t.metadata.en.title), ...page.presentation.sections.filter(s => ('categoryId' in s && s.categoryId === id) || ('ids' in s && s.type === 'categories' && s.ids.includes(id)) || ('target' in s && s.target.type === 'category' && s.target.id === id)).map(s => s.title.en || s.type), ...(page.presentation.home.target.type === 'category' && page.presentation.home.target.id === id ? ['Home music card'] : [])];
}
export function removeImage(page: MusicReleaseV2, id: string) { if (mediaUsage(page, id).length) throw Error('Replace this artwork everywhere it is used before removing it.'); return { ...page, media: page.media.filter(m => m.id !== id) }; }
export function changeSummary(before: MusicReleaseV2 | null, next: MusicReleaseV2): string[] {
  if (!before) return ['First music page publication'];
  const changes: string[] = [];
  for (const [key, label] of [['presentation', 'Library and Home appearance'], ['categories', 'Categories'], ['tracks', 'Recordings'], ['playlists', 'Playlists'], ['media', 'Artwork'], ['enabled', 'Music availability']] as const) if (JSON.stringify(before[key]) !== JSON.stringify(next[key])) changes.push(label);
  return changes.length ? changes : ['No content changes'];
}
/** Serializes draft writes so a slow older request cannot replace newer edits. */
export class DraftQueue {
  private pending: Promise<void> = Promise.resolve();
  enqueue(save: () => Promise<void>) { const next = this.pending.then(save, save); this.pending = next.catch(() => undefined); return next; }
  flush() { return this.pending; }
}
export function removeCatalogItem(page: MusicReleaseV2, type: 'track' | 'playlist', id: string): MusicReleaseV2 {
  const next = structuredClone(page);
  if (type === 'track') { next.tracks = next.tracks.filter(t => t.id !== id); next.playlists = next.playlists.map(p => ({ ...p, trackIds: p.trackIds.filter(key => key !== id) })); }
  else next.playlists = next.playlists.filter(p => p.id !== id);
  next.presentation.sections = next.presentation.sections.filter(s => !('target' in s && s.type === 'featured' && s.target.type === type && s.target.id === id)).map(s => {
    if ('target' in s && s.target.type === type && s.target.id === id) return { ...s, target: { type: 'library' } };
    if ('ids' in s && s.type === (type === 'track' ? 'tracks' : 'playlists')) return { ...s, ids: s.ids.filter(key => key !== id) };
    return s;
  });
  if (next.presentation.home.target.type === type && next.presentation.home.target.id === id) next.presentation.home.target = { type: 'library' };
  return next;
}
