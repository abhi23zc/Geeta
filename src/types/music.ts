export type MusicCategory = string;

export type LyricSegment = {
  startMs: number;
  endMs: number;
  sanskrit?: string;
  transliteration?: string;
  translation?: string;
};

export type MusicTrack = {
  id: string;
  title: string;
  subtitle?: string;
  artist: string;
  album?: string;
  category: MusicCategory;
  categoryTheme?: import('../../shared/music-presentation').MusicTheme;
  durationMs: number;
  revision: string;
  availability: 'available' | 'comingSoon';
  asset?: import('../../shared/music').MusicAsset;
  bundledId?: string;
  audioSource?: number | { uri: string };
  artworkUrl?: string;
  artworkThumbnail?: string;
  artworkAlt?: string;
  raga?: string;
  deity?: string;
  tags: string[];
  isPremium?: boolean;
  isFeatured?: boolean;
  lyrics?: readonly LyricSegment[];
};

export type Playlist = {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  coverImage?: string | number;
  coverThumbnail?: string;
  category: MusicCategory | 'curated' | 'user' | 'favorites';
  trackIds: string[];
  isCurated: boolean;
  createdAt?: number;
  updatedAt?: number;
};

export type RepeatMode = 'off' | 'all' | 'one';

export type SleepTimerOption = 5 | 10 | 15 | 30 | 45 | 60 | 'end-of-track' | null;

