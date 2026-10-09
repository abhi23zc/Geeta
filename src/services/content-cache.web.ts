import type { CacheSnapshot } from './content-cache';
import type { GitaVerse } from '@/data/gita-verses';
export const subscribeContent = (_fn: () => void) => () => {};
export const pinContent = (_id: string) => () => {};
export const cancelContentSync = () => {};
export const syncContent = async (_force = false) => {};
export const setWifiOnly = async (_value: boolean) => {};
export const saveTeaching = async (_practice: GitaVerse) => {};
export const removeSavedTeaching = async (_id: string) => {};
export const clearContentDownloads = async () => {};
export const prepareAlarmPreview = async (_key: string): Promise<string> => { throw new Error('Alarm preview requires Android'); };
export const prepareSavedReplay = async (_id: string): Promise<{ practice: GitaVerse; release: () => void }> => { throw new Error('Saved audio downloads require Android'); };
export const readContent = async (): Promise<CacheSnapshot> => ({ days: {}, saved: [], alarms: [], bytes: 0, lastSync: 0, error: null, syncing: false, progress: 'Offline downloads are supported on Android.', wifiOnly: false, configured: false });

export async function preparePracticeRecording(practice: GitaVerse): Promise<{ narration: NonNullable<GitaVerse['narration']>; release: () => void }> {
  if (typeof practice.narration?.audioSource === 'number') return { narration: practice.narration, release: () => {} };
  throw new Error('Recording downloads require Android. You can complete by reading.');
}
