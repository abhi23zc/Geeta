import type { OwnerPayload } from '../../shared/notifications';
export type OpeningState = { handled: string[]; opens: OwnerPayload[]; destination: OwnerPayload['destination'] | null };
export function queueOwnerOpening<T extends OpeningState>(state: T, payload: OwnerPayload): T {
  const key = `${payload.campaignId}/${payload.deliveryId}`;
  if (state.handled.includes(key)) return state;
  return { ...state, handled: [...state.handled.slice(-499), key], opens: [...state.opens, payload], destination: payload.destination };
}
export function deferOwnerNavigation(onboardingComplete: boolean, alarmActive: boolean, foreground: boolean) { return !onboardingComplete || alarmActive || !foreground; }
