/** Device-local presentation; never use the configured recurring time as an occurrence. */
export function wakeHeading(now: Date) {
  const hour = now.getHours();
  if (hour >= 4 && hour < 6) return 'Sacred Dawn';
  if (hour >= 6 && hour < 12) return 'Morning Awakening';
  if (hour >= 12 && hour < 17) return 'Afternoon Pause';
  if (hour >= 17 && hour < 21) return 'Evening Reflection';
  return 'Peaceful Night';
}

export function showScheduledAlarm(now: number, scheduledAt?: number) {
  return typeof scheduledAt === 'number' && Number.isFinite(scheduledAt) && scheduledAt > 0 && now - scheduledAt >= 60_000;
}

export function formatWakeClock(now: Date) {
  const hour = now.getHours();
  return {
    time: `${String(hour % 12 || 12).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    meridiem: hour >= 12 ? 'PM' : 'AM',
  };
}
