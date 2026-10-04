import type { TaskRecord } from '@/state/tasks-model';
import { translate } from './translations.ts';
import type { AppLanguage } from './model';

export function taskDisplayTitle(task: TaskRecord, language: AppLanguage) {
  switch (task.templateId) {
    case 'surya': return translate('Morning Surya Namaskar & 10 min Dhyana', undefined, language);
    case 'proposal': return translate('Finish project proposal', undefined, language);
    case 'walk': return translate('Gym & evening walk', undefined, language);
    case 'read': return translate('Read 10 pages of Upanishads', undefined, language);
    default: return task.title;
  }
}
