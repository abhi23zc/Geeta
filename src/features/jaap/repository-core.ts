import { emptyJaap, parseJaap, reduceJaap, type JaapAction } from './model.ts';
export interface JaapAdapter { read(): Promise<string | null>; mutate(update: (raw: string | null) => string, operationId?: string): Promise<string> }
export function createJaapRepository(adapter: JaapAdapter) {
  let tail: Promise<unknown> = Promise.resolve();
  const serial = <T>(f:()=>Promise<T>) => { const next=tail.catch(()=>undefined).then(f);tail=next;return next; };
  return {
    load: () => serial(async()=>parseJaap(await adapter.read())),
    dispatch: (action: JaapAction) => serial(async()=>parseJaap(await adapter.mutate(raw=>JSON.stringify(reduceJaap(parseJaap(raw),action)), 'id' in action && ['count','undo','start'].includes(action.type) ? action.id : undefined))),
    pending: () => serial(async()=>parseJaap(await adapter.read()).pendingRewards),
    flush: async()=>{await tail;},
  };
}
export const initialJaap = emptyJaap;
