export type PresentationIdentity = {
  sessionId: string; stage: 'wake' | 'breathe' | 'gita'; hostGeneration: number; coverGeneration: number;
};
export function identityKey(identity: PresentationIdentity) {
  return JSON.stringify([identity.sessionId, identity.stage, identity.hostGeneration, identity.coverGeneration]);
}

/** One frame after measured content and focus, with a fresh identity check. */
export function createRitualReadiness(options: {
  identity: PresentationIdentity;
  eligible: () => boolean;
  acknowledge: (identity: PresentationIdentity) => Promise<{ accepted: boolean }>;
  frame: (callback: () => void) => number;
  cancelFrame: (frame: number) => void;
  onError: (error: unknown) => void;
}) {
  let epoch = 0;
  let laidOut = false, pending: number | null = null, accepted = false, inFlight = false, disposed = false;
  const cancel = () => { epoch++; if (pending !== null) options.cancelFrame(pending); pending = null; };
  const recheck = () => {
    cancel();
    if (disposed || accepted || inFlight || !laidOut || !options.eligible()) return;
    const scheduledEpoch = epoch;
    pending = options.frame(() => {
      pending = null;
      if (disposed || scheduledEpoch !== epoch || !laidOut || !options.eligible()) return;
      inFlight = true;
      void options.acknowledge(options.identity).then(result => {
        if (!disposed) accepted = result.accepted;
      }).catch(options.onError).finally(() => { inFlight = false; });
    });
  };
  return {
    layout(width: number, height: number) { laidOut = width > 0 && height > 0; recheck(); },
    recheck, cancel,
    dispose() { disposed = true; cancel(); },
  };
}
