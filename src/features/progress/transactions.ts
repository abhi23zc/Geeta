/** Shared barrier: settlement never reads a source outbox halfway through a completion save. */
let tail: Promise<unknown> = Promise.resolve();
export function progressTransaction<T>(operation: () => Promise<T>): Promise<T> {
  const next = tail.then(operation); tail = next.catch(() => undefined); return next;
}
