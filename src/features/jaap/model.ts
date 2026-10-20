import { dayKey, shiftDay } from '../progress/model.ts';

export const MALA_SIZE = 108;
export const MATERIALS = ['rudraksha', 'tulsi', 'sandalwood', 'crystal'] as const;
export type MalaMaterial = typeof MATERIALS[number];
export type Mantra = { id: string; name: string; text: string; transliteration: string; custom?: boolean };
export const MANTRAS: Mantra[] = [
  { id: 'shiva', name: 'Om Namah Shivaya', text: 'ॐ नमः शिवाय', transliteration: 'Om Namah Shivaya' },
  { id: 'radha', name: 'Radhe Radhe', text: 'राधे राधे', transliteration: 'Radhe Radhe' },
  { id: 'ram', name: 'Shri Ram Jai Ram Jai Jai Ram', text: 'श्री राम जय राम जय जय राम', transliteration: 'Shri Ram Jai Ram Jai Jai Ram' },
  { id: 'krishna', name: 'Hare Krishna Mahamantra', text: 'हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे ।\nहरे राम हरे राम राम राम हरे हरे ॥', transliteration: 'Hare Krishna Hare Krishna, Krishna Krishna Hare Hare\nHare Rama Hare Rama, Rama Rama Hare Hare' },
  { id: 'ganesh', name: 'Om Gan Ganapataye Namah', text: 'ॐ गं गणपतये नमः', transliteration: 'Om Gan Ganapataye Namah' },
  { id: 'vasudeva', name: 'Om Namo Bhagavate Vasudevaya', text: 'ॐ नमो भगवते वासुदेवाय', transliteration: 'Om Namo Bhagavate Vasudevaya' },
];
export type JaapPreferences = { material: MalaMaterial; mantraId: string; setupComplete: boolean; focus: boolean; background: 'plain' | 'lotus' | 'diya' | 'photo'; photoUri?: string; haptics: 'off' | 'light' | 'medium' | 'strong'; bell: boolean; keepAwake: boolean; dailyMalas: number; reminderEnabled: boolean; reminderMinutes: number };
export type JaapSession = { id: string; mantra: Mantra; startedAt: string; finishedAt: string | null; total: number; activeMs: number; runningSince: string | null; paused: boolean; size: 108; dayCounts: Record<string, number> };
export type CountEvent = { id: string; sessionId: string; type: 'count' | 'undo'; at: string; date: string; mantraId: string; undoes?: string; sankalpId?: string };
export type JaapReceipt = { id: string; kind: 'jaap-active' | 'jaap'; completedAt: string };
export type JaapDay = { total: number; mantras: Record<string, number>; active: boolean; bonus: boolean };
export type Sankalp = { id: string; mantraId: string; intention: string; duration: number; dailyMalas: number; startedAt: string; status: 'active' | 'paused' | 'archived' | 'complete'; days: string[]; counts: Record<string, number> };
export type JaapState = { version: 1; preferences: JaapPreferences; customMantras: Mantra[]; sessions: JaapSession[]; activeId: string | null; events: CountEvent[]; days: Record<string, JaapDay>; sankalps: Sankalp[]; pendingRewards: JaapReceipt[]; operations: string[]; timezone: string | null };
export type JaapAction =
  | { type: 'start'; id: string; at: string; timezone: string }
  | { type: 'count' | 'undo'; id: string; at: string; timezone: string }
  | { type: 'pause' | 'resume' | 'finish'; at: string }
  | { type: 'preferences'; patch: Partial<JaapPreferences> }
  | { type: 'mantra'; mantra: Mantra }
  | { type: 'sankalp'; program: Sankalp }
  | { type: 'program-status'; id: string; status: Sankalp['status'] }
  | { type: 'ack'; ids: string[] };
export function emptyJaap(): JaapState {
  return { version: 1, preferences: { material: 'rudraksha', mantraId: 'shiva', setupComplete: false, focus: false, background: 'plain', haptics: 'light', bell: false, keepAwake: true, dailyMalas: 1, reminderEnabled: false, reminderMinutes: 19 * 60 }, customMantras: [], sessions: [], activeId: null, events: [], days: {}, sankalps: [], pendingRewards: [], operations: [], timezone: null };
}
export function allMantras(s: JaapState) { return [...MANTRAS, ...s.customMantras]; }
export function activeSession(s: JaapState) { return s.sessions.find(x => x.id === s.activeId) ?? null; }
export function selectedMantra(s: JaapState) { return allMantras(s).find(m => m.id === s.preferences.mantraId) ?? MANTRAS[0]; }
export function beadPosition(total: number) { return total === 0 ? 0 : (total - 1) % MALA_SIZE + 1; }
export function currentProgram(s: JaapState) { return s.sankalps.find(p => p.status === 'active' || p.status === 'paused') ?? null; }
export function todayTarget(s: JaapState, date: string) {
  const p = currentProgram(s);
  return p?.status === 'active' ? { count: p.counts[date] ?? 0, target: p.dailyMalas * MALA_SIZE } : { count: s.days[date]?.total ?? 0, target: s.preferences.dailyMalas * MALA_SIZE };
}
export function estimatedFinish(p: Sankalp, today: string) { return shiftDay(today, Math.max(0, p.duration - p.days.length - 1)); }
const integer = (n: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): n is number => Number.isSafeInteger(n) && (n as number) >= min && (n as number) <= max;
function checkPreferences(p: JaapPreferences) {
  if (!MATERIALS.includes(p.material) || !['plain','lotus','diya','photo'].includes(p.background) || !['off','light','medium','strong'].includes(p.haptics) || !integer(p.dailyMalas,1,108) || !integer(p.reminderMinutes,0,1439) || !['setupComplete','focus','bell','keepAwake','reminderEnabled'].every(k => typeof p[k as keyof JaapPreferences] === 'boolean') || typeof p.mantraId !== 'string' || (p.photoUri !== undefined && typeof p.photoUri !== 'string')) throw new Error('Invalid jaap preferences.');
}
function checkMantra(m: Mantra) {
  if (!m || typeof m.id !== 'string' || !m.id || typeof m.name !== 'string' || !m.name.trim() || m.name.length > 120 || typeof m.text !== 'string' || !m.text.trim() || m.text.length > 4000 || typeof m.transliteration !== 'string' || m.transliteration.length > 4000) throw new Error('Enter a mantra name and text.');
}
export function parseJaap(raw: string | null): JaapState {
  if (raw === null) return emptyJaap();
  try {
    const s: JaapState = JSON.parse(raw);
    if (!s || s.version !== 1 || !s.preferences || !['customMantras','sessions','events','sankalps','pendingRewards','operations'].every(k => Array.isArray(s[k as keyof JaapState])) || !s.days || typeof s.days !== 'object' || Array.isArray(s.days)) throw Error();
    checkPreferences(s.preferences); s.customMantras.forEach(checkMantra);
    if (!allMantras(s).some(m => m.id === s.preferences.mantraId) || (s.timezone !== null && (typeof s.timezone !== 'string' || !dayKey(new Date(),s.timezone)))) throw Error();
    const ids = new Set<string>();
    for (const session of s.sessions) {
      checkMantra(session.mantra);
      if (typeof session.id !== 'string' || ids.has(session.id) || !integer(session.total) || !integer(session.activeMs) || !session.dayCounts || !Object.values(session.dayCounts).every(n=>integer(n)) || Object.values(session.dayCounts).reduce((a,b)=>a+b,0)!==session.total || session.size !== 108 || !Number.isFinite(Date.parse(session.startedAt)) || (session.finishedAt !== null && !Number.isFinite(Date.parse(session.finishedAt))) || typeof session.paused !== 'boolean' || (session.runningSince !== null && !Number.isFinite(Date.parse(session.runningSince)))) throw Error();
      ids.add(session.id);
    }
    if ((s.activeId === null && s.sessions.some(x=>x.finishedAt===null)) || (s.activeId !== null && !s.sessions.some(x => x.id === s.activeId && x.finishedAt === null))) throw Error();
    if (s.sessions.filter(x => !x.finishedAt).length > 1) throw Error();
    const eventIds = new Set<string>();
    for (const e of s.events) { if (!e || typeof e.id !== 'string' || eventIds.has(e.id) || !ids.has(e.sessionId) || !['count','undo'].includes(e.type) || !Number.isFinite(Date.parse(e.at)) || !/^\d{4}-\d{2}-\d{2}$/.test(e.date) || (e.type === 'undo' && !eventIds.has(e.undoes!))) throw Error(); eventIds.add(e.id); }
    for (const d of Object.values(s.days)) if (!integer(d.total) || typeof d.active !== 'boolean' || typeof d.bonus !== 'boolean' || !d.mantras || !Object.values(d.mantras).every(v => integer(v)) || Object.values(d.mantras).reduce((a,b)=>a+b,0)!==d.total) throw Error();
    if(s.operations.some(id=>typeof id!=='string')||new Set(s.operations).size!==s.operations.length)throw Error();
    for (const r of s.pendingRewards) if (!r || !['jaap','jaap-active'].includes(r.kind) || typeof r.id !== 'string' || !r.id.startsWith(`${r.kind}:`) || !s.days[r.id.slice(r.kind.length+1)]?.active || (r.kind==='jaap'&&!s.days[r.id.slice(r.kind.length+1)]?.bonus) || !Number.isFinite(Date.parse(r.completedAt))) throw Error();
    for (const p of s.sankalps) if (!integer(p.duration,1,365) || !integer(p.dailyMalas,1,108) || !Array.isArray(p.days) || new Set(p.days).size !== p.days.length || p.days.length > p.duration || !p.counts || !Object.values(p.counts).every(n=>integer(n)) || !['active','paused','archived','complete'].includes(p.status) || !Number.isFinite(Date.parse(p.startedAt))) throw Error();
    return s;
  } catch { throw new Error('Jaap data could not be read. Your practice has not been reset.'); }
}
function paused(session: JaapSession, at: string): JaapSession {
  const elapsed = session.runningSince ? Math.max(0,Date.parse(at)-Date.parse(session.runningSince)) : 0;
  return { ...session, activeMs: session.activeMs + elapsed, runningSince: null, paused: true };
}
export function reduceJaap(previous: JaapState, a: JaapAction): JaapState {
  if ('at' in a && !Number.isFinite(Date.parse(a.at))) throw new Error('Correct your clock before continuing.');
  if ((a.type === 'count' || a.type === 'undo' || a.type === 'start') && previous.operations.includes(a.id)) return previous;
  const s: JaapState = JSON.parse(JSON.stringify(previous));
  const session = activeSession(s);
  if (a.type === 'preferences') { const p = { ...s.preferences,...a.patch }; checkPreferences(p); if (!allMantras(s).some(m=>m.id===p.mantraId)) throw Error('Choose an available mantra.'); if(session && p.mantraId!==session.mantra.id) throw Error('Finish your session before changing mantra.'); s.preferences=p; return s; }
  if (a.type === 'mantra') { checkMantra(a.mantra); if (allMantras(s).some(m=>m.id===a.mantra.id)) throw Error('This mantra already exists.'); s.customMantras.push({...a.mantra,custom:true}); return s; }
  if (a.type === 'ack') { s.pendingRewards=s.pendingRewards.filter(r=>!a.ids.includes(r.id)); return s; }
  if (a.type === 'sankalp') {
    const p=a.program;
    if(!integer(p.duration,1,365)||!integer(p.dailyMalas,1,108)||!allMantras(s).some(m=>m.id===p.mantraId)||typeof p.intention!=='string'||p.intention.length>500) throw Error('Check the sankalp duration and target.');
    if(!Number.isFinite(Date.parse(p.startedAt)) || s.sankalps.some(x=>x.id===p.id)) throw Error('Invalid sankalp.');
    s.sankalps=s.sankalps.map(x=>['active','paused'].includes(x.status)?{...x,status:'archived'}:x);
    s.sankalps.push({...p,status:'active',days:[],counts:{}});return s;
  }
  if (a.type === 'program-status') { const p=s.sankalps.find(x=>x.id===a.id); if(!p||!['active','paused'].includes(p.status)||!['active','paused','archived'].includes(a.status)) throw Error('This sankalp is no longer active.');p.status=a.status;return s; }
  if (a.type === 'start') {
    if(session) return s;
    s.timezone=s.timezone??a.timezone;
    s.events=[];s.operations=[];
    s.sessions.push({id:a.id,mantra:{...selectedMantra(s)},startedAt:a.at,finishedAt:null,total:0,activeMs:0,runningSince:a.at,paused:false,size:108,dayCounts:{}});s.activeId=a.id;s.operations.push(a.id);return s;
  }
  if (!session) { if(a.type==='pause'||a.type==='finish') return previous; throw Error('Begin a session first.'); }
  const index=s.sessions.findIndex(x=>x.id===session.id);
  if(a.type==='pause'||a.type==='finish'){s.sessions[index]=paused(session,a.at);if(a.type==='finish'){s.sessions[index].finishedAt=a.at;s.activeId=null;}return s;}
  if(a.type==='resume'){if(Date.parse(a.at)<Date.parse(session.startedAt))throw Error('Correct your clock before continuing.');if(session.paused)s.sessions[index]={...session,paused:false,runningSince:a.at};return s;}
  if(a.type!=='count'&&a.type!=='undo')return s;
  if(a.type==='count'&&session.paused)throw Error('Resume your practice to count.');
  if(Date.parse(a.at)<Date.parse(session.startedAt))throw Error('Correct your clock before continuing.');
  let date=dayKey(new Date(a.at),a.timezone), delta=1, undoTarget:CountEvent|undefined;
  if(a.type==='undo'){
    const undone=new Set(s.events.filter(e=>e.type==='undo').map(e=>e.undoes));
    undoTarget=s.events.findLast(e=>e.sessionId===session.id&&e.type==='count'&&!undone.has(e.id));
    if(!undoTarget)return previous;
    date=undoTarget.date;delta=-1;
  }
  const d=s.days[date]??{total:0,mantras:{},active:false,bonus:false};
  d.total+=delta;d.mantras[session.mantra.id]=(d.mantras[session.mantra.id]??0)+delta;
  if(!d.active&&delta>0){d.active=true;s.pendingRewards.push({id:`jaap-active:${date}`,kind:'jaap-active',completedAt:a.at});}
  if(!d.bonus&&d.total>=108){d.bonus=true;s.pendingRewards.push({id:`jaap:${date}`,kind:'jaap',completedAt:a.at});}
  s.days[date]=d;
  const p=currentProgram(s);
  const qualifying=p?.status==='active'&&p.mantraId===session.mantra.id&&Date.parse(a.at)>=Date.parse(p.startedAt);
  const linked=undoTarget?.sankalpId?s.sankalps.find(x=>x.id===undoTarget!.sankalpId):undefined;
  const program=delta<0?linked:qualifying?p:undefined;
  if(program){program.counts[date]=Math.max(0,(program.counts[date]??0)+delta);if(program.status==='active'&&!program.days.includes(date)&&program.counts[date]>=program.dailyMalas*108){program.days.push(date);if(program.days.length>=program.duration)program.status='complete';}}
  s.events.push({id:a.id,sessionId:session.id,type:a.type,at:a.at,date,mantraId:session.mantra.id,...(undoTarget?{undoes:undoTarget.id}:{}),...(program?{sankalpId:program.id}:{})});
  s.operations.push(a.id);s.sessions[index]={...session,total:session.total+delta,dayCounts:{...session.dayCounts,[date]:(session.dayCounts[date]??0)+delta}};s.timezone=a.timezone;return s;
}
