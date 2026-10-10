export type SplashPolicyParams = {
  alarmActive: boolean;
  alarmLoading: boolean;
  startupAlarmActive: boolean;
  sessionShown: boolean;
};

/**
 * Immediate yield policy: active alarms, loading alarms, or alarms triggered on startup
 * take absolute priority and must immediately bypass the splash animation.
 */
export function shouldSkipSplash(params: SplashPolicyParams): boolean {
  return (
    params.alarmActive ||
    params.alarmLoading ||
    params.startupAlarmActive ||
    params.sessionShown
  );
}
