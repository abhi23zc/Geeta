import type { MusicRelease } from './music';
/** Serializable seed shared by the offline app and the first admin draft. */
export const MUSIC_SEED: MusicRelease = {
  schemaVersion: 1, releaseId: 'bundled', publishedAt: '2026-10-17T00:00:00Z', enabled: true,
  tracks: ([
    ['gita-10-20', 'Bhagavad Gita · 10.20', 'भगवद्गीता · १०.२०', 'gita'],
    ['gayatri-mantra-108', 'Gayatri Mantra 108 Chants', 'गायत्री मंत्र १०८ जाप', 'mantra'],
    ['maha-mrityunjaya', 'Maha Mrityunjaya Mantra', 'महामृत्युंजय मंत्र', 'mantra'],
    ['raag-bhairav-flute', 'Dawn Flute in Raag Bhairav', 'राग भैरव की प्रातः बांसुरी', 'raga'],
    ['peaceful-morning-flute', 'Vrindavan Bamboo Flute', 'वृंदावन की बांसुरी', 'flute'],
    ['pranayama-432hz', '432Hz Vedic Breath Harmony', '४३२ हर्ट्ज़ श्वास संगीत', 'pranayama'],
    ['temple-shankh-bells', 'Sacred Shankh & Kashi Bells', 'शंख और काशी की घंटियाँ', 'soundscape'],
    ['om-vibrations-drone', 'Cosmic Om 108 Resonance', 'ॐ अनुनाद', 'soundscape'],
  ] as const).map(([id, en, hi, category], i) => ({ id, category, revision: i ? 'preview-v1' : 'bundled-v1', availability: i ? 'comingSoon' : 'available', metadata: { en: { title: en, ...(!i ? { subtitle: 'Hindi narration' } : {}) }, hi: { title: hi, ...(!i ? { subtitle: 'हिंदी कथन' } : {}) } }, unavailableTranslations: [], tags: i ? [] : ['Gita'], ...(!i ? { bundledId: 'gita-10-20-hi' } : {}) })),
  playlists: [
    { id: 'morning-awakening-ritual', metadata: { en: { title: 'Daily Morning Awakening', subtitle: 'Includes Coming soon previews' } }, trackIds: ['temple-shankh-bells', 'raag-bhairav-flute', 'gayatri-mantra-108', 'gita-10-20'] },
    { id: 'gita-daily-contemplation', metadata: { en: { title: 'Gita Sacred Contemplation', subtitle: 'Available recording' } }, trackIds: ['gita-10-20'] },
    { id: 'vedic-mantra-protection', metadata: { en: { title: 'Vedic Mantras & Shield', subtitle: 'Includes Coming soon previews' } }, trackIds: ['gayatri-mantra-108', 'maha-mrityunjaya', 'om-vibrations-drone'] },
    { id: 'deep-pranayama-breath', metadata: { en: { title: 'Deep Pranayama & Breath Flow', subtitle: 'Includes Coming soon previews' } }, trackIds: ['pranayama-432hz', 'peaceful-morning-flute', 'om-vibrations-drone'] },
    { id: 'evening-tranquility-flute', metadata: { en: { title: 'Twilight Serenity & Sacred Flute', subtitle: 'Includes Coming soon previews' } }, trackIds: ['peaceful-morning-flute', 'raag-bhairav-flute'] },
  ],
};
