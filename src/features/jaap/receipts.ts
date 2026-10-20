import { jaapRepository } from './database';
/** These calls run inside progressTransaction, shared with count commits. */
export const getJaapReceipts = () => jaapRepository.pending();
export const acknowledgeJaapReceipts = (ids: string[]) => ids.length ? jaapRepository.dispatch({type:'ack',ids}) : Promise.resolve(null);
