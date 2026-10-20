import type { MusicCategory, MusicTrack, Playlist } from '@/types/music';

export const SACRED_CATEGORIES: {
  id: MusicCategory;
  title: string;
  hindiTitle: string;
  subtitle: string;
  iconName: string;
}[] = [
  {
    id: 'gita',
    title: 'Bhagavad Gita',
    hindiTitle: 'श्रीमद्भगवद्गीता',
    subtitle: 'Chanted shlokas with Hindi & English meaning',
    iconName: 'BookOpen',
  },
  {
    id: 'mantra',
    title: 'Vedic Mantras',
    hindiTitle: 'वैदिक मंत्र',
    subtitle: 'Gayatri, Maha Mrityunjaya & Divine Chants',
    iconName: 'Flower2',
  },
  {
    id: 'raga',
    title: 'Morning Ragas',
    hindiTitle: 'प्रातःकालीन राग',
    subtitle: 'Raag Bhairav, Todi & Classical Meditations',
    iconName: 'Music',
  },
  {
    id: 'flute',
    title: 'Sacred Flute',
    hindiTitle: 'दिव्य बांसुरी',
    subtitle: 'Peaceful Krishna flute & meditative melodies',
    iconName: 'Wind',
  },
  {
    id: 'pranayama',
    title: 'Pranayama & Breath',
    hindiTitle: 'प्राणायाम संगीत',
    subtitle: 'Rhythmic tones tuned for deep breathing',
    iconName: 'Activity',
  },
  {
    id: 'soundscape',
    title: 'Sacred Atmospheres',
    hindiTitle: 'पवित्र ध्वनि',
    subtitle: 'Temple bells, Shankh & 432Hz resonance',
    iconName: 'Sun',
  },
];

// Only the shipped recording is playable. Preview titles retain their stable IDs.
export const BUNDLED_AUDIO = { 'gita-10-20-hi': typeof require === 'function' ? require('@/assets/audio/gita/geeta-10-20-hi.mp3') : 1 };
export const SACRED_TRACKS: MusicTrack[] = [
  { id: 'gita-10-20', revision: 'bundled-v1', availability: 'available', bundledId: 'gita-10-20-hi', title: 'Bhagavad Gita · 10.20', subtitle: 'Hindi narration', artist: '', category: 'gita', durationMs: 58968, audioSource: BUNDLED_AUDIO['gita-10-20-hi'], tags: ['Gita'], isFeatured: true },
  ...([
    ['gayatri-mantra-108', 'Gayatri Mantra 108 Chants', 'mantra'],
    ['maha-mrityunjaya', 'Maha Mrityunjaya Mantra', 'mantra'],
    ['raag-bhairav-flute', 'Dawn Flute in Raag Bhairav', 'raga'],
    ['peaceful-morning-flute', 'Vrindavan Bamboo Flute', 'flute'],
    ['pranayama-432hz', '432Hz Vedic Breath Harmony', 'pranayama'],
    ['temple-shankh-bells', 'Sacred Shankh & Kashi Bells', 'soundscape'],
    ['om-vibrations-drone', 'Cosmic Om 108 Resonance', 'soundscape'],
  ] as const).map(([id, title, category]) => ({ id, title, category, revision: 'preview-v1', availability: 'comingSoon' as const, artist: '', durationMs: 0, tags: [] })),
];

export const SACRED_PLAYLISTS: Playlist[] = [
  {
    id: 'morning-awakening-ritual',
    title: 'Daily Morning Awakening',
    subtitle: 'Morning listening',
    description: 'Awaken body, mind, and spirit with Shankh cleansing, Raag Bhairav flute, and the radiant Gayatri Mantra.',
    coverImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
    category: 'curated',
    trackIds: ['temple-shankh-bells', 'raag-bhairav-flute', 'gayatri-mantra-108', 'gita-10-20'],
    isCurated: true,
  },
  {
    id: 'gita-daily-contemplation',
    title: 'Gita Sacred Contemplation',
    subtitle: 'Timeless Wisdom for Daily Action',
    description: 'Listen to spoken shlokas accompanied by traditional acoustic instrumentation, Sanskrit chanting, and practical daily reflections.',
    coverImage: 'https://images.unsplash.com/photo-1609137144822-261ec81640a3?w=800&auto=format&fit=crop&q=80',
    category: 'gita',
    trackIds: ['gita-10-20'],
    isCurated: true,
  },
  {
    id: 'vedic-mantra-protection',
    title: 'Vedic Mantras & Shield',
    subtitle: 'Gayatri, Maha Mrityunjaya & Shiva Stutis',
    description: 'Powerful ancient Vedic chants to remove obstacles, clear negative energy, and invoke divine grace.',
    coverImage: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80',
    category: 'mantra',
    trackIds: ['gayatri-mantra-108', 'maha-mrityunjaya', 'om-vibrations-drone'],
    isCurated: true,
  },
  {
    id: 'deep-pranayama-breath',
    title: 'Deep Pranayama & Breath Flow',
    subtitle: '432Hz & Rhythmic Breathing Beats',
    description: 'Immerse into tranquil harmonic soundscapes tuned to the natural frequency of breath and mindfulness.',
    coverImage: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800&auto=format&fit=crop&q=80',
    category: 'pranayama',
    trackIds: ['pranayama-432hz', 'peaceful-morning-flute', 'om-vibrations-drone'],
    isCurated: true,
  },
  {
    id: 'evening-tranquility-flute',
    title: 'Twilight Serenity & Sacred Flute',
    subtitle: 'Gentle Bansuri for Calm Evenings',
    description: 'Release the day’s fatigue and quiet the mind with the gentle, sweet melodies of sacred Vrindavan flute.',
    coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    category: 'flute',
    trackIds: ['peaceful-morning-flute', 'raag-bhairav-flute'],
    isCurated: true,
  },
];

export function getTrackById(id: string): MusicTrack | undefined {
  return SACRED_TRACKS.find((track) => track.id === id);
}

export function getPlaylistById(id: string): Playlist | undefined {
  return SACRED_PLAYLISTS.find((playlist) => playlist.id === id);
}

export function getTracksByCategory(category: MusicCategory): MusicTrack[] {
  return SACRED_TRACKS.filter((track) => track.category === category);
}

export { MUSIC_SEED as BUNDLED_MUSIC_RELEASE } from '../../shared/music-seed.ts';

export const unavailableMusicTrack=(id:string):MusicTrack=>({id,revision:'unavailable',availability:'comingSoon',title:'Unavailable recording',artist:'',category:'soundscape',durationMs:0,tags:[]});
