import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useMemo, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { createTreeSession, createTransitionPresentation } from './session-model';
const Context = createContext<{ revision: number; claim: (screen: string) => boolean; claimTransition: (profile: string, revision: number) => Promise<boolean> } | null>(null);
export function TreeSessionProvider({ children }: PropsWithChildren) {
  const session = useRef(createTreeSession());
  const [revision, setRevision] = useState(0);
  const presentation = useRef(createTransitionPresentation(AsyncStorage));
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => { if (session.current.change(state)) setRevision(session.current.revision); });
    return () => listener.remove();
  }, []);
  const claimTransition = useCallback((profile: string, rev: number) => presentation.current.claim(profile, rev), []);
  const value = useMemo(() => ({ revision, claim: (screen: string) => session.current.claim(screen), claimTransition }), [revision, claimTransition]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTreeSession() { const value = useContext(Context); if (!value) throw new Error('TreeSessionProvider missing'); return value; }
