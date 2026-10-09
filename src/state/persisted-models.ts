import { validDate } from '../../shared/content.ts';
export type DailyReflection = { verseId: string; text: string; completedAt?: string };
export type GitaProgress = { bookmarks: string[]; reflections: Record<string, DailyReflection>; breathingCompletedDates: string[] };
export const EMPTY_GITA: GitaProgress = { bookmarks: [], reflections: {}, breathingCompletedDates: [] };
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(v => typeof v === 'string' && v.length > 0);
const reflection = (value: unknown): value is DailyReflection => object(value) && typeof value.verseId === 'string' && !!value.verseId && typeof value.text === 'string' && (value.completedAt === undefined || (typeof value.completedAt === 'string' && Number.isFinite(Date.parse(value.completedAt))));
export function parseGitaProgress(raw: string): GitaProgress {
  const v = JSON.parse(raw);
  if (!object(v) || (v.bookmarks !== undefined && !strings(v.bookmarks)) || (v.breathingCompletedDates !== undefined && (!strings(v.breathingCompletedDates) || !v.breathingCompletedDates.every(validDate))) || (v.reflections !== undefined && (!object(v.reflections) || !Object.entries(v.reflections).every(([date, r]) => validDate(date) && reflection(r))))) throw new Error('Invalid saved progress');
  return salvageGitaProgress(raw);
}
export function salvageGitaProgress(raw: string): GitaProgress {
  let v: Record<string, unknown> = {};
  try { const parsed = JSON.parse(raw); if (object(parsed)) v = parsed; } catch {}
  return {
    bookmarks: Array.isArray(v.bookmarks) ? [...new Set(v.bookmarks.filter((id): id is string => typeof id === 'string' && !!id))] : [],
    breathingCompletedDates: Array.isArray(v.breathingCompletedDates) ? [...new Set(v.breathingCompletedDates.filter(validDate))] : [],
    reflections: object(v.reflections) ? Object.fromEntries(Object.entries(v.reflections).filter((entry): entry is [string, DailyReflection] => validDate(entry[0]) && reflection(entry[1]))) : {},
  };
}
export type AlarmSettings = { alarmTime: string; alarmTone: string; alarmDays: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[]; alarmEnabled: boolean };
export const DEFAULT_ALARM: AlarmSettings = { alarmTime: '06:30', alarmTone: 'Raag Bhairav & Sacred Flute', alarmDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], alarmEnabled: false };
const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export function salvageAlarmSettings(raw: string): AlarmSettings {
  let v: Record<string, unknown> = {};
  try { const parsed = JSON.parse(raw); if (object(parsed)) v = parsed; } catch {}
  return {
    alarmTime: typeof v.alarmTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.alarmTime) ? v.alarmTime : DEFAULT_ALARM.alarmTime,
    alarmTone: typeof v.alarmTone === 'string' && v.alarmTone.trim() ? v.alarmTone : DEFAULT_ALARM.alarmTone,
    alarmDays: Array.isArray(v.alarmDays) && v.alarmDays.some(d => days.includes(d)) ? [...new Set(v.alarmDays.filter(d => days.includes(d)))] as AlarmSettings['alarmDays'] : DEFAULT_ALARM.alarmDays,
    alarmEnabled: typeof v.alarmEnabled === 'boolean' ? v.alarmEnabled : false,
  };
}
export function parseAlarmSettings(raw: string): AlarmSettings {
  const v = JSON.parse(raw);
  // Old mirrors may omit fields; validate provided fields before supplying defaults.
  if (!object(v) || (v.alarmTime !== undefined && (typeof v.alarmTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v.alarmTime))) || (v.alarmTone !== undefined && (typeof v.alarmTone !== 'string' || !v.alarmTone.trim())) || (v.alarmEnabled !== undefined && typeof v.alarmEnabled !== 'boolean') || (v.alarmDays !== undefined && (!Array.isArray(v.alarmDays) || !v.alarmDays.length || !v.alarmDays.every(d => days.includes(d))))) throw new Error('Invalid saved alarm');
  return salvageAlarmSettings(raw);
}
