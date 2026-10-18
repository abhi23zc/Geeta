import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { connectFirestoreEmulator, collection, doc, getDoc, getDocs, getFirestore, setDoc } from 'firebase/firestore';
import { connectStorageEmulator, getBlob, getStorage, ref, uploadBytesResumable } from 'firebase/storage';
import { dateWindow, validDate, parseAlarm, type AudioAsset, type PublishedPractice, type AlarmTone } from '../../shared/content';
import { checkAudioFile, importPractice } from './practice-import';
import './style.css';
const MusicWorkspace = React.lazy(() => import('./music').then(module => ({ default: module.MusicWorkspace })));
import { NotificationsWorkspace } from './notifications';
const env = import.meta.env;
const configured = !!env.VITE_FIREBASE_PROJECT_ID;
const app = configured ? initializeApp({ apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID, storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET, appId: env.VITE_FIREBASE_APP_ID }) : null;
const auth = app ? getAuth(app) : null, db = app ? getFirestore(app) : null, storage = app ? getStorage(app) : null;
if (env.VITE_USE_EMULATORS === 'true' && auth && db && storage) { connectAuthEmulator(auth, 'http://localhost:9099'); connectFirestoreEmulator(db, 'localhost', 8080); connectStorageEmulator(storage, 'localhost', 9199); }
const blank = (): string => JSON.stringify({ id: crypto.randomUUID(), revision: crypto.randomUUID(), kind: 'gita', chapter: 1, verse: '1', theme: '', sanskrit: '', transliteration: '', meaning: '', takeaway: '', context: '', reflectionPrompt: '', words: [], narration: { asset: {}, segments: [] } }, null, 2);
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const initialAlarms = (): AlarmTone[] => ['gita', 'shankh', 'pranayama'].map(key => ({ key: key as AlarmTone['key'], title: key, description: '', revision: crypto.randomUUID(), asset: {} as AudioAsset }));
function Admin() {
  const [workspace, setWorkspace] = useState<'content' | 'notifications' | 'music'>('content');
  const [user, setUser] = useState<User | null>(null), [authorized, setAuthorized] = useState(false), [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  const [start, setStart] = useState(localDate()), [selected, setSelected] = useState(0);
  const [buffers, setBuffers] = useState<string[]>(() => Array.from({ length: 7 }, blank));
  const [assets, setAssets] = useState<(AudioAsset | undefined)[]>(Array(7).fill(undefined));
  const [filenames, setFilenames] = useState<string[]>(Array(7).fill(''));
  const [alarms, setAlarms] = useState<AlarmTone[]>(initialAlarms);
  const [release, setRelease] = useState<string | null>(null), [releases, setReleases] = useState<string[]>([]), [enabled, setEnabled] = useState(true), [coverage, setCoverage] = useState<string[]>([]);
  const [published, setPublished] = useState<Record<string, PublishedPractice>>({});
  const [preview, setPreview] = useState(''), [position, setPosition] = useState(0), [dirty, setDirty] = useState(false);
  const player = useRef<HTMLAudioElement>(null), locked = useRef(false);
  const text = buffers[selected], dates = dateWindow(start), date = dates[selected];
  let practice: PublishedPractice | undefined, issue = '';
  try { practice = importPractice(text, assets[selected]); } catch (error) { issue = error instanceof Error ? error.message : String(error); }
  const setText = (value: string) => { setBuffers(rows => rows.map((row, i) => i === selected ? value : row)); setDirty(true); };
  async function api(path: string, body: unknown) {
    if (!user) throw new Error('Sign in first');
    const response = await fetch(`/api/admin/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error ?? 'Content operation failed'); return result;
  }
  async function load() {
    if (!db) return;
    const current = (await getDoc(doc(db, 'delivery/current'))).data(); setRelease(current?.releaseId ?? null); setEnabled(current?.enabled !== false);
    const ids = (await getDocs(collection(db, 'releases'))).docs.map(d => ({ id: d.id, at: d.data().publishedAt })).sort((a,b) => String(b.at).localeCompare(String(a.at))); setReleases(ids.map(d => d.id));
    const r = current?.releaseId ? (await getDoc(doc(db, `releases/${current.releaseId}`))).data() : undefined;
    setPublished(r?.schedule ?? {}); setCoverage(dateWindow(localDate(), 14).filter(date => !r?.schedule?.[date]));
    return r;
  }
  useEffect(() => auth ? onAuthStateChanged(auth, current => { setUser(current); setAuthorized(false); if (current) void current.getIdTokenResult().then(async token => {
    setAuthorized(token.claims.admin === true);
    if (token.claims.admin === true) { const r = await load(); if (r?.alarms?.length) setAlarms(r.alarms); }
  }).catch(error => setStatus(String(error))); }) : undefined, []);
  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);
  function resetPreview() { player.current?.pause(); setPreview(''); setPosition(0); }
  async function action(fn: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setStatus('Working…');
    try { await fn(); } catch (error) { setStatus(error instanceof Error ? error.message : String(error)); }
    finally { locked.current = false; setBusy(false); }
  }
  async function upload(file: File, kind: 'daily' | 'alarm', index: number) {
    if (!storage || !user) throw new Error('Sign in first');
    checkAudioFile(file, kind);
    const extension = file.name.toLowerCase().endsWith('.mp3') ? 'mp3' : 'm4a';
    const path = `drafts/${user.uid}/${crypto.randomUUID()}.${extension}`;
    const task = uploadBytesResumable(ref(storage, path), file, { contentType: extension === 'mp3' ? 'audio/mpeg' : 'audio/mp4' });
    await new Promise<void>((resolve, reject) => task.on('state_changed', s => setStatus(`Uploading ${Math.round(s.bytesTransferred/s.totalBytes*100)}%`), reject, resolve));
    const asset = await api('validate-asset', { path, kind }) as AudioAsset;
    if (kind === 'daily') {
      setAssets(rows => rows.map((a,i) => i === index ? asset : a));
      setFilenames(rows => rows.map((name,i) => i === index ? file.name : name));
    } else setAlarms(rows => rows.map((a,i) => i === index ? { ...a, revision: crypto.randomUUID(), asset } : a));
    resetPreview(); setPreview(URL.createObjectURL(file)); setDirty(true);
    setStatus(`Audio verified · ${(asset.durationMs/1000).toFixed(2)} seconds. Your text and timings have been kept.`);
  }
  async function previewAsset(asset?: AudioAsset) {
    if (!asset?.url || !storage) throw new Error('Choose and upload audio first');
    const url = new URL(asset.url);
    const path = url.hostname === 'storage.googleapis.com' ? decodeURIComponent(url.pathname.split('/').slice(2).join('/')) : decodeURIComponent(url.pathname.split('/o/')[1] ?? '');
    if (!path) throw new Error('Audio preview is unavailable');
    const blob = await getBlob(ref(storage, path)); resetPreview(); setPreview(URL.createObjectURL(blob)); setStatus('Preview ready');
  }
  if (!configured) return <main><h1>Geeta admin setup</h1><p>Copy .env.example to .env.local and enter the Firebase web app configuration, then restart the admin server.</p></main>;
  if (!user) return <main><h1>Geeta content admin</h1><button disabled={busy} onClick={() => void action(async () => { await signInWithPopup(auth!, new GoogleAuthProvider()); })}>Sign in with Google</button><p>{status}</p></main>;
  if (!authorized) return <main><h1>Admin access required</h1><p>Ask the project operator to assign the admin claim to {user.uid}, then sign in again.</p><button onClick={() => void signOut(auth!)}>Sign out</button></main>;
  if (workspace === 'music') return <main><header><h1>Geeta Music Studio</h1><button onClick={() => setWorkspace('content')}>Content workspace</button></header><React.Suspense fallback={<p role="status">Loading Music Studio…</p>}><MusicWorkspace user={user} storage={storage!} /></React.Suspense></main>;
  if (workspace === 'notifications') return <main><header><h1>Geeta Admin Studio</h1><button onClick={() => setWorkspace('content')}>Content workspace</button></header><NotificationsWorkspace user={user} /></main>;
  return <main><header><div><h1>Geeta content studio</h1><p>Choose a date, paste your teaching, and upload its narration.</p></div><button disabled={busy} onClick={() => { if (!dirty || confirm('Sign out with unsaved changes?')) void signOut(auth!); }}>Sign out</button></header><nav aria-label="Workspaces"><button disabled={busy} onClick={() => setWorkspace('music')}>Music workspace</button><button disabled={busy} onClick={() => setWorkspace('notifications')}>Notifications workspace</button></nav><p role="status">{status}</p>
    <section><h2>1. Choose the date</h2><label>Calendar starts on<input type="date" disabled={busy} value={start} onChange={e => { if(validDate(e.target.value)) { setStart(e.target.value); setDirty(true); resetPreview(); } }} /></label>
      <nav aria-label="Publication dates">{dates.map((d,i) => <button disabled={busy} key={d} aria-pressed={selected === i} onClick={() => { setSelected(i); resetPreview(); }}>{d}<small>{published[d] ? 'Published' : 'Not published'}</small></button>)}</nav>
      <p>Your content will be published for <strong>{date}</strong>. You can publish one date at a time.</p>
      <button disabled={busy || !published[date]} onClick={() => { if (!dirty || confirm('Replace this editor with the published teaching? Other dates will be kept.')) {
        const p = published[date]; setText(JSON.stringify(p,null,2)); setAssets(rows=>rows.map((a,i)=>i===selected ? undefined : a)); setFilenames(rows=>rows.map((a,i)=>i===selected ? '' : a)); resetPreview();
      } }}>Edit published teaching for this date</button>
    </section>
    <section><h2>2. Paste your teaching</h2><p>Paste the JSON you already have, including text and narration timings. Audio details such as clipId and title can stay as they are.</p>
      <label>Or import a JSON file<input type="file" accept=".json,application/json" disabled={busy} onChange={e => { const f=e.target.files?.[0]; if(f) void action(async()=>{ if(f.size > 900000) throw new Error('JSON file is too large'); const value=await f.text(); JSON.parse(value); setText(value); setStatus('Teaching imported. Choose its matching narration recording.'); }); e.target.value=''; }} /></label>
      <label>Teaching JSON<textarea rows={16} disabled={busy} value={text} onChange={e=>setText(e.target.value)} spellCheck={false} /></label>
      <p>Changes are kept when you switch dates. Save a draft before closing the studio.</p>
    </section>
    <section><h2>3. Upload the narration</h2><label>Matching MP3 or M4A · up to 20 MB<input type="file" accept=".mp3,.m4a" disabled={busy} onChange={e=>{ const f=e.target.files?.[0]; if(f) void action(()=>upload(f,'daily',selected)); e.target.value=''; }} /></label>
      {assets[selected] ? <p className="success">{filenames[selected]} · {(assets[selected]!.durationMs/1000).toFixed(2)} seconds · verified</p> : null}
      <button disabled={busy || !practice} onClick={()=>void action(()=>previewAsset(practice?.narration.asset))}>Listen to this teaching</button>
      <audio ref={player} controls src={preview || undefined} onTimeUpdate={()=>setPosition(Math.round((player.current?.currentTime ?? 0)*1000))} /><p>Playback cursor: {position} ms</p>
      <label>Seek to milliseconds<input type="number" min="0" disabled={busy} onChange={e=>{ if(player.current) player.current.currentTime=Number(e.target.value)/1000; }} /></label>
    </section>
    <section><h2>4. Review and publish</h2>{practice ? <div className="review"><h3>{practice.referenceLabel ?? `Chapter ${practice.chapter} · Verse ${practice.verse}`}</h3><p>{practice.theme}</p><p className="sanskrit">{practice.sanskrit}</p><p>{practice.meaning}</p><p>{practice.narration.segments.length} timed segments · finish at {(practice.narration.completionMs/1000).toFixed(2)} seconds</p><p className="success">Ready to publish for {date}</p></div> : <p className="notice">{issue}</p>}
      <button className="primary" disabled={busy || !practice} onClick={()=>void action(async()=>{
        const p=importPractice(buffers[selected],assets[selected]);
        await api('publish-day',{date,practice:{...p,revision:crypto.randomUUID()},expectedReleaseId:release}); await load();
        setStatus(`Published ${p.referenceLabel ?? p.id} for ${date}. Open Downloads in the app and refresh.`);
      })}>Publish teaching for {date}</button><p>Existing dates and published alarm music are kept.</p>
      <button disabled={busy} onClick={()=>void action(async()=>{
        await setDoc(doc(db!,`drafts/${user.uid}`),{start,buffers,assets:assets.map(a=>a ?? null),filenames,alarms,updatedAt:new Date().toISOString()});setDirty(false);setStatus('Draft saved, including your pasted text.');
      })}>Save draft</button>
      <button disabled={busy} onClick={()=>{ if(dirty && !confirm('Replace unsaved changes with your saved draft?')) return; void action(async()=>{
        const d=(await getDoc(doc(db!,`drafts/${user.uid}`))).data(); if(!d) throw new Error('No saved draft');
        const rows=d.buffers ?? d.practices?.map((p:PublishedPractice)=>JSON.stringify(p,null,2));
        if(!validDate(d.start) || !Array.isArray(rows) || rows.length!==7 || rows.some(v=>typeof v!=='string')) throw new Error('Saved draft is invalid');
        setStart(d.start);setBuffers(rows);setAssets(Array.from({length:7},(_,i)=>d.assets?.[i] ?? undefined));setFilenames(Array.from({length:7},(_,i)=>d.filenames?.[i] ?? ''));setAlarms(d.alarms ?? initialAlarms());setSelected(0);resetPreview();setDirty(false);setStatus('Draft loaded');
      }); }}>Load draft</button>
    </section>
    <section><h2>Publication coverage</h2><p>{coverage.length ? `Unscheduled in next 14 days: ${coverage.join(', ')}` : 'Next 14 days are covered.'}</p><p>Current release: {release ?? 'None'}</p>
      <button disabled={busy} onClick={()=>void action(async()=>{await load();setStatus('Publication state reloaded; your editor changes have been kept.');})}>Reload publication state</button>
      <button disabled={busy} onClick={()=>void action(async()=>{await api('delivery',{enabled:!enabled});await load();setStatus(enabled ? 'App refresh paused' : 'App refresh enabled');})}>{enabled ? 'Pause app refresh' : 'Enable app refresh'}</button>
      <select aria-label="Restore release" defaultValue="" disabled={busy} onChange={e=>{const id=e.target.value;if(id && confirm('Restore this earlier release? Its dates and alarm music will replace the current publication.')) void action(async()=>{await api('restore',{restoreId:id,expectedReleaseId:release});await load();setStatus('Earlier release restored');});e.target.value='';}}><option value="">Restore an earlier release…</option>{releases.map(id=><option key={id}>{id}</option>)}</select>
    </section>
    <details><summary>Alarm music and seven-day batch publication</summary><section><h2>Alarm music</h2><p>Single-date publication keeps the currently published alarm music. Use batch publication below when replacing alarm music.</p>{alarms.map((alarm,i)=><div key={alarm.key}><h3>{alarm.key}</h3><label>Title<input disabled={busy} value={alarm.title} onChange={e=>{setAlarms(rows=>rows.map((a,j)=>i===j ? {...a,title:e.target.value,revision:crypto.randomUUID()} : a));setDirty(true);}} /></label><label>Description<input disabled={busy} value={alarm.description} onChange={e=>{setAlarms(rows=>rows.map((a,j)=>i===j ? {...a,description:e.target.value,revision:crypto.randomUUID()} : a));setDirty(true);}} /></label><input aria-label={`Upload ${alarm.key} alarm`} type="file" accept=".mp3,.m4a" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f) void action(()=>upload(f,'alarm',i));e.target.value='';}} /><p>{alarm.asset.sha256 ? 'Verified audio available' : 'Audio required'}</p></div>)}</section>
      <section><h2>Publish all seven dates and alarm music</h2>{dates.map((d,i)=>{let label='Needs content and audio';try{label=importPractice(buffers[i],assets[i]).theme;}catch{}return <p key={d}>{d} · {label}</p>;})}
        <button disabled={busy} onClick={()=>void action(async()=>{
          const practices=buffers.map((t,i)=>{try{return {...importPractice(t,assets[i]),revision:crypto.randomUUID()};}catch(error){throw new Error(`${dates[i]}: ${error instanceof Error ? error.message : String(error)}`);}});
          await api('publish',{start,practices,alarms:alarms.map(parseAlarm),expectedReleaseId:release});await load();setStatus('Seven days and alarm music published');
        })}>Publish verified seven days</button>
      </section></details>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Admin />);
