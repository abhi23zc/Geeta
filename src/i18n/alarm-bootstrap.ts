import type { AppLanguage } from './model';

/** Captured once per provider lifetime, even if the ritual ends during hydration. */
export function alarmLanguageBootstrap(snapshot: { active: boolean; validRitualIntent: boolean; userUnlocked: boolean; language: AppLanguage }) {
  return { immediate: snapshot.active && snapshot.validRitualIntent && snapshot.userUnlocked, language: snapshot.language };
}
