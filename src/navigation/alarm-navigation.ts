type Playback = { ringing: boolean };

/** Coordinates asynchronous alarm checks without leaving navigation queued after unmount. */
export function createAlarmNavigation(
  readPlayback: () => Promise<Playback>,
  canNavigate: () => boolean,
  showWake: () => void,
  reportError: (error: unknown) => void,
) {
  let active = true;
  let generation = 0;
  return {
    async refresh() {
      const request = ++generation;
      try {
        const playback = await readPlayback();
        if (active && request === generation && playback.ringing && canNavigate()) showWake();
      } catch (error) {
        if (active && request === generation) reportError(error);
      }
    },
    invalidate() { generation++; },
    dispose() { active = false; generation++; },
  };
}
