export const LANGUAGES = ['en', 'hi', 'hinglish'] as const;
export type AppLanguage = typeof LANGUAGES[number];
export const LANGUAGE_NAMES: Record<AppLanguage, string> = { en: 'English', hi: 'हिंदी', hinglish: 'Hinglish' };
export const LANGUAGE_STORAGE_KEY = 'geeta:app-language-v1';
export function isLanguage(value: unknown): value is AppLanguage {
  return LANGUAGES.some(language => language === value);
}
export function readLanguage(raw: string | null, legacyQuiz: string | null): AppLanguage {
  if (raw !== null) {
    try { const value = JSON.parse(raw); return isLanguage(value) ? value : 'en'; } catch { return 'en'; }
  }
  try {
    const legacy = legacyQuiz ? JSON.parse(legacyQuiz) : null;
    return legacy?.version === 1 && isLanguage(legacy?.settings?.language) ? legacy.settings.language : 'en';
  } catch { return 'en'; }
}
export function interpolate(value: string, params: Record<string, string | number> = {}) {
  return value.replace(/\{(\w+)\}/g, (match, key: string) => params[key] === undefined ? match : String(params[key]));
}
/** Failed writes do not poison subsequent requests or publish an unsaved choice. */
export function createLanguageWriter(save: (language: AppLanguage) => Promise<void>, publish: (language: AppLanguage) => void, canWrite: () => boolean = () => true) {
  let tail: Promise<void> = Promise.resolve();
  return (language: AppLanguage) => {
    const next = tail.then(async () => { if (!canWrite()) throw new Error('Language preference is still loading.'); await save(language); publish(language); });
    tail = next.catch(() => undefined);
    return next;
  };
}

/** Read first; an alarm's provisional locale never overwrites an existing preference. */
export async function hydrateLanguagePreference(storage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
}, nativeFallback?: AppLanguage): Promise<AppLanguage> {
  const raw = await storage.getItem(LANGUAGE_STORAGE_KEY);
  const legacy = raw === null ? await storage.getItem('geeta:quiz-progress-v1') : null;
  const next = raw === null && legacy === null && nativeFallback ? nativeFallback : readLanguage(raw, legacy);
  if (raw === null) await storage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(next));
  return next;
}
