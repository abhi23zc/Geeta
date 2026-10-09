type Recording = { release(): void };
/** Owns asynchronous preparation and pin lifetimes; screen eligibility is always read live. */
export function createSavedReplay<T extends Recording>(options: {
  prepare(id: string): Promise<T>; eligible(): boolean; play(recording: T): void;
  pause(): void; busy(value: boolean): void; error(error: unknown): void;
}) {
  let generation = 0, pending = false, disposed = false;
  let release: (() => void) | null = null;
  const releaseCurrent = () => { const previous = release; release = null; previous?.(); };
  const invalidate = () => {
    generation++; pending = false;
    options.pause(); releaseCurrent();
    if (!disposed) options.busy(false);
  };
  return {
    async replay(id: string) {
      if (disposed || pending || !options.eligible()) return;
      pending = true;
      const command = ++generation;
      options.busy(true);
      let recording: T | null = null;
      try {
        recording = await options.prepare(id);
        if (disposed || command !== generation || !options.eligible()) { recording.release(); recording = null; return; }
        options.pause(); releaseCurrent();
        options.play(recording);
        release = recording.release;
        recording = null;
      } catch (error) {
        recording?.release();
        if (!disposed && command === generation && options.eligible()) options.error(error);
      } finally {
        if (!disposed && command === generation) { pending = false; options.busy(false); }
      }
    },
    invalidate,
    dispose() { disposed = true; invalidate(); },
  };
}
