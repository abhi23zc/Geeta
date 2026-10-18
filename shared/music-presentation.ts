import { parseMusicRelease, type CatalogTrack, type MusicRelease, type MusicText } from './music';

export const MUSIC_THEMES = ['gita', 'mantra', 'raga', 'flute', 'pranayama', 'soundscape'] as const;
export type MusicTheme = typeof MUSIC_THEMES[number];
export type Localized = { en: string; hi?: string };
export type MusicImage = { id: string; name: string; alt: Localized; width: number; height: number; thumbnail: string; square: string; banner: string; original: string };
export type MusicCategoryRecord = { id: string; name: Localized; description: Localized; theme: MusicTheme; icon: MusicTheme; imageId?: string; visible: boolean; archived: boolean };
export type MusicDestination = { type: 'library' } | { type: 'track' | 'playlist' | 'category'; id: string; play?: boolean };
type SectionBase = { id: string; visible: boolean; title: Localized; subtitle: Localized; theme: MusicTheme; imageId?: string };
export type MusicSection = SectionBase & (
  | { type: 'featured'; layout: 'hero'; target: MusicDestination; button: Localized }
  | { type: 'categories'; layout: 'chips' | 'cards'; ids: string[] }
  | { type: 'playlists'; layout: 'cards' | 'list'; ids: string[] }
  | { type: 'tracks'; layout: 'cards' | 'list'; ids: string[]; categoryId?: string }
  | { type: 'banner'; layout: 'hero'; target: MusicDestination; button: Localized }
);
export type MusicPresentation = {
  header: { visible: boolean; title: Localized; subtitle: Localized; icon: MusicTheme };
  search: { visible: boolean; placeholder: Localized };
  tabs: { explore: Localized; favorites: Localized; recent: Localized; showFavorites: boolean; showRecent: boolean };
  results: { all: Localized; favorites: Localized; recent: Localized; empty: Localized };
  sections: MusicSection[];
  home: { visible: boolean; title: Localized; subtitle: Localized; eyebrow: Localized; button: Localized; theme: MusicTheme; imageId?: string; target: MusicDestination };
};
export type MusicReleaseV2 = Omit<MusicRelease, 'schemaVersion' | 'tracks' | 'playlists'> & {
  schemaVersion: 2;
  tracks: (Omit<CatalogTrack, 'category'> & { category: string; imageId?: string })[];
  playlists: (MusicRelease['playlists'][number] & { description?: Localized; imageId?: string })[];
  categories: MusicCategoryRecord[];
  media: MusicImage[];
  presentation: MusicPresentation;
};
export const localized = (value: Localized, language: string) => language === 'hi' && value.hi?.trim() ? value.hi : value.en;
export const words = (en: string, hi?: string): Localized => ({ en, ...(hi ? { hi } : {}) });
const names = ['Bhagavad Gita', 'Vedic Mantras', 'Morning Ragas', 'Sacred Flute', 'Pranayama & Breath', 'Sacred Atmospheres'];
const hindi = ['श्रीमद्भगवद्गीता', 'वैदिक मंत्र', 'प्रातःकालीन राग', 'दिव्य बांसुरी', 'प्राणायाम संगीत', 'पवित्र ध्वनि'];
export function migrateMusicRelease(value: MusicRelease): MusicReleaseV2 {
  const first = value.tracks.find(t => t.availability === 'available') ?? value.tracks[0];
  return {
    ...value, schemaVersion: 2,
    categories: MUSIC_THEMES.map((id, i) => ({ id, name: words(names[i], hindi[i]), description: words(''), theme: id, icon: id, visible: true, archived: false })),
    media: [],
    presentation: {
      header: { visible: true, title: words('Sacred Library', 'पवित्र संग्रह'), subtitle: words('SACRED AUDIO & CHANTS', 'पवित्र संगीत और मंत्र'), icon: 'gita' },
      search: { visible: true, placeholder: words('Search morning ragas, chants, ambient ghats…', 'राग, मंत्र और संगीत खोजें…') },
      tabs: { explore: words('Explore', 'खोजें'), favorites: words('Favorites', 'पसंदीदा'), recent: words('Recent', 'हाल ही में'), showFavorites: true, showRecent: true },
      results: { all: words('All Sacred Tracks', 'सभी पवित्र संगीत'), favorites: words('Favorite Chants', 'पसंदीदा मंत्र'), recent: words('Recently Listened', 'हाल ही में सुने'), empty: words('No recordings found', 'कोई रिकॉर्डिंग नहीं मिली') },
      sections: [
        ...(first ? [{ id: 'featured', type: 'featured' as const, layout: 'hero' as const, visible: true, title: words('DAILY DIVINE MEDITATION', 'दैनिक दिव्य ध्यान'), subtitle: words(''), theme: 'gita' as const, target: { type: 'track' as const, id: first.id, play: true }, button: words('Listen Now', 'अभी सुनें') }] : []),
        { id: 'categories', type: 'categories', layout: 'chips', visible: true, title: words('Sacred Categories', 'पवित्र श्रेणियाँ'), subtitle: words(''), theme: 'gita', ids: [] },
        { id: 'playlists', type: 'playlists', layout: 'cards', visible: true, title: words('Curated Morning Rituals', 'चुने हुए प्रातः अनुष्ठान'), subtitle: words(''), theme: 'gita', ids: value.playlists.map(p => p.id) },
        { id: 'tracks', type: 'tracks', layout: 'list', visible: true, title: words('All Sacred Tracks', 'सभी पवित्र संगीत'), subtitle: words(''), theme: 'gita', ids: [] },
      ],
      home: { visible: true, title: words('Vedic Ragas & Shlokas', 'वैदिक राग और श्लोक'), subtitle: words('Listen to morning ragas, sacred flute, and chanted Gita verses.', 'प्रातः राग, पवित्र बांसुरी और गीता के श्लोक सुनें।'), eyebrow: words('SACRED MUSIC & CHANTS', 'पवित्र संगीत और मंत्र'), button: words('Open Library', 'संग्रह खोलें'), theme: 'gita', target: { type: 'library' } },
    },
  };
}

const record = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('Expected an object'); return v as Record<string, unknown>; };
const id = (v: unknown) => { if (typeof v !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(v)) throw Error('Invalid identifier'); return v; };
const string = (v: unknown, max = 500) => { if (typeof v !== 'string' || v.length > max) throw Error('Text is too long or missing'); return v; };
const bool = (v: unknown) => { if (typeof v !== 'boolean') throw Error('Expected a visibility switch'); return v; };
const list = (v: unknown, max: number): unknown[] => { if (!Array.isArray(v) || v.length > max) throw Error('Too many items or missing list'); return v; };
const unique = <T extends { id: string }>(items: T[]) => { if (new Set(items.map(x => x.id)).size !== items.length) throw Error('Duplicate identifiers'); return items; };
const theme = (v: unknown): MusicTheme => { if (!MUSIC_THEMES.includes(v as MusicTheme)) throw Error('Choose a supported appearance'); return v as MusicTheme; };
const copy = (v: unknown, required = false): Localized => { const x = record(v); const en = string(x.en); if (required && !en.trim()) throw Error('English text is required'); return { en, ...(x.hi === undefined ? {} : { hi: string(x.hi) }) }; };
const url = (v: unknown) => { const s = string(v, 2048), u = new URL(s); if (u.protocol !== 'https:' || u.username || u.password) throw Error('Image must use HTTPS'); return s; };
export function parseMusicReleaseV2(value: unknown): MusicReleaseV2 {
  const x = record(value);
  if (x.schemaVersion === 1) return migrateMusicRelease(parseMusicRelease(x));
  if (x.schemaVersion !== 2) throw Error('Unsupported music page version');
  const categories = unique(list(x.categories, 100).map(v => { const c = record(v); return { id: id(c.id), name: copy(c.name, true), description: copy(c.description), theme: theme(c.theme), icon: theme(c.icon), visible: bool(c.visible), archived: bool(c.archived), ...(c.imageId ? { imageId: id(c.imageId) } : {}) }; }));
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  const rawTracks = list(x.tracks, 500).map(record);
  // Reuse audio/rights/timing validation through a legacy-compatible projection.
  const legacy = parseMusicRelease({ ...x, schemaVersion: 1, tracks: rawTracks.map(t => {
    const category = categoryMap.get(id(t.category)); if (!category || category.archived) throw Error('Reassign tracks before archiving a category');
    return { ...t, category: category.theme };
  }) });
  const tracks = legacy.tracks.map((t, i) => ({ ...t, category: id(rawTracks[i].category), ...(rawTracks[i].imageId ? { imageId: id(rawTracks[i].imageId) } : {}) }));
  const rawPlaylists = list(x.playlists, 100).map(record);
  const playlists = legacy.playlists.map((p, i) => ({ ...p, ...(rawPlaylists[i].description ? { description: copy(rawPlaylists[i].description) } : {}), ...(rawPlaylists[i].imageId ? { imageId: id(rawPlaylists[i].imageId) } : {}) }));
  const media = unique(list(x.media, 200).map(v => { const m = record(v); const width = Number(m.width), height = Number(m.height); if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width * height > 40000000) throw Error('Invalid image dimensions'); return { id: id(m.id), name: string(m.name, 200), alt: copy(m.alt), width, height, thumbnail: url(m.thumbnail), square: url(m.square), banner: url(m.banner), original: url(m.original) }; }));
  const images = new Set(media.map(m => m.id));
  const image = (v: unknown) => { if (!v) return {}; const key = id(v); if (!images.has(key)) throw Error('Image no longer exists'); return { imageId: key }; };
  const refs = { track: new Set(tracks.map(t => t.id)), playlist: new Set(playlists.map(p => p.id)), category: new Set(categories.filter(c => !c.archived).map(c => c.id)) };
  const destination = (v: unknown): MusicDestination => { const d = record(v); if (d.type === 'library') return { type: 'library' }; if (d.type !== 'track' && d.type !== 'playlist' && d.type !== 'category') throw Error('Choose a destination'); const key = id(d.id); if (!refs[d.type].has(key)) throw Error('Destination no longer exists'); if (d.play !== undefined && typeof d.play !== 'boolean') throw Error('Invalid playback action'); if (d.type === 'category' && d.play) throw Error('Categories cannot autoplay'); return { type: d.type, id: key, ...(d.play === undefined ? {} : { play: d.play }) }; };
  for (const item of [...categories, ...tracks, ...playlists]) image(item.imageId);
  const p = record(x.presentation), h = record(p.header), search = record(p.search), tabs = record(p.tabs), results = record(p.results), home = record(p.home);
  const sections = unique(list(p.sections, 30).map((v): MusicSection => {
    const s = record(v); const base = { id: id(s.id), title: copy(s.title), subtitle: copy(s.subtitle), visible: bool(s.visible), theme: theme(s.theme), ...image(s.imageId) };
    if (s.type === 'featured' || s.type === 'banner') { if (s.layout !== 'hero') throw Error('Invalid card layout'); const target = destination(s.target); if (s.type === 'featured' && target.type !== 'track' && target.type !== 'playlist') throw Error('Choose a recording or playlist for the featured card'); return { ...base, type: s.type, layout: 'hero', target, button: copy(s.button, true) }; }
    if (s.type !== 'tracks' && s.type !== 'playlists' && s.type !== 'categories') throw Error('Unsupported section type');
    const allowed = s.type === 'categories' ? ['chips', 'cards'] : ['cards', 'list']; if (!allowed.includes(String(s.layout))) throw Error('Choose a supported layout');
    const ids = list(s.ids, 500).map(id); if (new Set(ids).size !== ids.length) throw Error('Repeated section selection');
    const set = s.type === 'tracks' ? refs.track : s.type === 'playlists' ? refs.playlist : refs.category; if (ids.some(key => !set.has(key))) throw Error('Section references missing content');
    if (s.type === 'tracks') { const categoryId = s.categoryId ? id(s.categoryId) : undefined; if (categoryId && !refs.category.has(categoryId)) throw Error('Section category no longer exists'); return { ...base, type: 'tracks', layout: s.layout as 'cards' | 'list', ids, ...(categoryId ? { categoryId } : {}) }; }
    if (s.type === 'categories') return { ...base, type: 'categories', layout: s.layout as 'chips' | 'cards', ids };
    return { ...base, type: 'playlists', layout: s.layout as 'cards' | 'list', ids };
  }));
  if (!sections.some(s => s.visible) && !search.visible) throw Error('Keep at least one section or search visible');
  return { ...legacy, schemaVersion: 2, tracks, playlists, categories, media, presentation: {
    header: { visible: bool(h.visible), title: copy(h.title, true), subtitle: copy(h.subtitle), icon: theme(h.icon) },
    search: { visible: bool(search.visible), placeholder: copy(search.placeholder, true) },
    tabs: { explore: copy(tabs.explore, true), favorites: copy(tabs.favorites, true), recent: copy(tabs.recent, true), showFavorites: bool(tabs.showFavorites), showRecent: bool(tabs.showRecent) },
    results: { all: copy(results.all, true), favorites: copy(results.favorites, true), recent: copy(results.recent, true), empty: copy(results.empty, true) }, sections,
    home: { visible: bool(home.visible), title: copy(home.title, true), subtitle: copy(home.subtitle), eyebrow: copy(home.eyebrow), button: copy(home.button, true), theme: theme(home.theme), ...image(home.imageId), target: destination(home.target) },
  } };
}
export function legacyMusicRelease(value: MusicReleaseV2): MusicRelease {
  const categories = new Map(value.categories.map(c => [c.id, c.theme]));
  return parseMusicRelease({ ...value, schemaVersion: 1, tracks: value.tracks.map(t => ({ ...t, category: categories.get(t.category) ?? 'soundscape' })) });
}
export function sectionItems(release: MusicReleaseV2, section: MusicSection) {
  if (section.type === 'tracks') return section.ids.length ? section.ids : release.tracks.filter(t => !section.categoryId || t.category === section.categoryId).map(t => t.id);
  if (section.type === 'playlists') return section.ids.length ? section.ids : release.playlists.map(p => p.id);
  if (section.type === 'categories') return (section.ids.length ? section.ids.map(key => release.categories.find(c => c.id === key)!) : release.categories).filter(c => c && c.visible && !c.archived).map(c => c.id);
  return [];
}
export function mediaUsage(release: MusicReleaseV2, imageId: string): string[] {
  return [...release.tracks.map(t => ({ ...t, label: t.metadata.en.title })), ...release.playlists.map(p => ({ ...p, label: p.metadata.en.title })), ...release.categories.map(c => ({ ...c, label: c.name.en })), ...release.presentation.sections.map(s => ({ ...s, label: s.title.en || s.type })), { ...release.presentation.home, label: 'Home music card' }].filter(v => v.imageId === imageId).map(v => v.label);
}
export function missingTranslations(release: MusicReleaseV2): number {
  let count = 0; const walk = (v: unknown) => { if (!v || typeof v !== 'object') return; if ('en' in v && typeof (v as Localized).en === 'string') { if ((v as Localized).en.trim() && !(v as Localized).hi?.trim()) count++; return; } Object.values(v).forEach(walk); }; walk(release.presentation); walk(release.categories); return count + [...release.tracks, ...release.playlists].filter(t => !t.metadata.hi).length;
}
export type { MusicText };
