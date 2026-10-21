import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useProgress } from '@/features/progress/provider';
import { progressTransaction } from '@/features/progress/transactions';
import { notificationScheduleChanged } from '@/services/engagement-notifications';
import { getAlarmPresentationState } from '@/services/alarm';
import { jaapRepository } from './database';
import { activeSession, emptyJaap, selectedMantra, type JaapAction, type JaapPreferences, type JaapState, type Mantra } from './model';
let sequence=0;
export const jaapId=()=>`jaap-${Date.now()}-${++sequence}-${Math.random().toString(36).slice(2,10)}`;
function useJaapController(){
  const progress=useProgress();
  const [state,setState]=useState(emptyJaap),[ready,setReady]=useState(false),[error,setError]=useState<string|null>(null),[pending,setPending]=useState(0);
  const progressRef=useRef(progress);
  useEffect(()=>{progressRef.current=progress;},[progress]);
  const current=useRef(state),stopped=useRef(true),alive=useRef(true);
  const timezone=progress.progress?.timezone??Intl.DateTimeFormat().resolvedOptions().timeZone??'UTC';
  const publish=useCallback((value:JaapState)=>{current.current=value;if(alive.current)setState(value);},[]);
  const load=useCallback(async()=>{
    stopped.current=true;
    try {
      const value=await progressTransaction(async()=>{
        let value=await jaapRepository.load();const session=activeSession(value);
        if(session&&!session.paused){const last=value.events.findLast(e=>e.sessionId===session.id)?.at;value=await jaapRepository.dispatch({type:'pause',at:last&&last>=session.runningSince! ? last:session.runningSince??session.startedAt});}
        return value;
      });publish(value);if(alive.current){setReady(true);setError(null);}notificationScheduleChanged();
    }catch(e){if(alive.current)setError(e instanceof Error?e.message:'Jaap could not be loaded.');}
  },[publish]);
  useEffect(()=>{alive.current=true;queueMicrotask(()=>{void load();});return()=>{alive.current=false;};},[load]);
  const send=useCallback(async(action:JaapAction,settle=false)=>{
    if(!ready)return undefined;
    setPending(n=>n+1);
    try{
      const value=await progressTransaction(async()=>{const next=await jaapRepository.dispatch(action);publish(next);return next;});
      if(alive.current)setError(null);
      if(settle&&value.pendingRewards.length)await progressRef.current.refresh();
      if(action.type!=='count'||value.pendingRewards.length)notificationScheduleChanged();
      return value;
    }catch(e){stopped.current=true;if(alive.current)setError(e instanceof Error?e.message:'Your count could not be saved.');return undefined;}
    finally{if(alive.current)setPending(n=>Math.max(0,n-1));}
  },[ready,publish]);
  const pause=useCallback(async()=>{stopped.current=true;return send({type:'pause',at:new Date().toISOString()});},[send]);
  useEffect(()=>{const sub=AppState.addEventListener('change',next=>{if(next!=='active')void pause();});return()=>sub.remove();},[pause]);
  return useMemo(()=>({state,ready,error,busy:pending>0,retry:load,timezone:timezone,
    async begin(){const session=activeSession(current.current);if(!progress.ready||getAlarmPresentationState().active)return undefined;stopped.current=false;const value=await send(session?{type:'resume',at:new Date().toISOString()}:{type:'start',id:jaapId(),at:new Date().toISOString(),timezone:timezone});if(!value)stopped.current=true;return value;},
    async count(){if(stopped.current||error||getAlarmPresentationState().active||!progress.ready)return undefined;return send({type:'count',id:jaapId(),at:new Date().toISOString(),timezone:timezone},true);},
    undo:()=>send({type:'undo',id:jaapId(),at:new Date().toISOString(),timezone:timezone},true),pause,
    reset:()=>send({type:'reset',id:jaapId(),at:new Date().toISOString(),timezone:timezone},true),
    async finish(){stopped.current=true;return send({type:'finish',at:new Date().toISOString()},true);},
    preferences:(patch:Partial<JaapPreferences>)=>send({type:'preferences',patch}),
    async selectMantra(id:string){if(activeSession(current.current)&&selectedMantra(current.current).id!==id){const finished=await send({type:'finish',at:new Date().toISOString()},true);if(!finished)return undefined;stopped.current=true;}return send({type:'preferences',patch:{mantraId:id,setupComplete:true}});},
    addMantra:(mantra:Mantra)=>send({type:'mantra',mantra}),
  }),[state,ready,error,pending,load,send,pause,progress.ready,timezone]);
}
type JaapController=ReturnType<typeof useJaapController>;
const Context=createContext<JaapController|null>(null);
export function JaapProvider({children}:React.PropsWithChildren){const value=useJaapController();return <Context.Provider value={value}>{children}</Context.Provider>;}
export function useJaap(){const c=useContext(Context);if(!c)throw Error('JaapProvider missing');return c;}
