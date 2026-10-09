import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { createRecoverableStore } from './storage-recovery';

export function useRecoverableStore<T>(key: string, empty: T, parse: (raw: string) => T, salvage: (raw: string) => T) {
  const [store] = useState(() => createRecoverableStore(AsyncStorage, key, empty, parse, salvage));
  const state = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
  useEffect(() => {
    void store.load();
    const subscription = AppState.addEventListener('change', next => { if (next !== 'active') void store.flush(); });
    return () => { subscription.remove(); void store.flush(); };
  }, [store]);
  return { ...state, update: store.update, retryLoad: store.load, retrySave: store.retrySave, recover: store.recover };
}
