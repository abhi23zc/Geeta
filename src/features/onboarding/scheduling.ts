import { coreAlarmReady, type AlarmDraft } from './model.ts';

type Snapshot = { scheduled: boolean; config: { enabled: boolean; hour: number; minute: number; weekdays: string[]; tone: { key?: string } } | null };
export function createOnboardingScheduler(deps: {
  capabilities: () => Promise<{ notifications: boolean; exactAlarm: boolean; notificationChannelReady: boolean }>;
  snapshot: () => Promise<Snapshot>;
  toneKey: (tone: string) => string;
  schedule: (draft: AlarmDraft) => Promise<{ scheduled: boolean }>;
  eligible: () => boolean;
  generation?: () => number;
}) {
  let flight: Promise<void> | null = null;
  return (draft: AlarmDraft) => {
    if (flight) return flight;
    const epoch = deps.generation?.();
    const eligible = () => deps.eligible() && epoch === deps.generation?.();
    flight = (async () => {
      if (!eligible()) throw new Error('cancelled');
      const status = await deps.capabilities();
      if (!eligible()) throw new Error('cancelled');
      if (!coreAlarmReady(status)) throw new Error('needs-access');
      const snapshot = await deps.snapshot();
      if (!eligible()) throw new Error('cancelled');
      const [hour, minute] = draft.time.split(':').map(Number);
      const config = snapshot.config;
      const same = snapshot.scheduled && config?.enabled && config.hour === hour && config.minute === minute &&
        config.tone.key === deps.toneKey(draft.tone) && [...config.weekdays].sort().join(',') === [...draft.days].sort().join(',');
      if (!same) {
        const result = await deps.schedule(draft);
        if (!eligible()) throw new Error('cancelled');
        if (!result.scheduled) throw new Error('schedule-failed');
      }
      if (!eligible()) throw new Error('cancelled');
    })().finally(() => { flight = null; });
    return flight;
  };
}
