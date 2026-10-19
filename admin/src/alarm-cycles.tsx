import React, { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import { getBlob, ref, uploadBytesResumable, type FirebaseStorage } from 'firebase/storage';
import { TONE_KEYS, toneLabel, parseAlarmCycle, type AlarmCycle, type AudioAsset, type ToneKey } from '../../shared/content';
import { checkAudioFile } from './practice-import';

type Props = { onBack?: () => void; user: User; db: Firestore; storage: FirebaseStorage; release: string | null; cycles: AlarmCycle[]; api: (path: string, body: unknown) => Promise<unknown>; reload: () => Promise<unknown> };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const blankTrack = () => ({ title: '', asset: {} as AudioAsset });
const blank = (key: ToneKey): AlarmCycle => ({ key, revision: crypto.randomUUID(), startDate: today(), tracks: [blankTrack()] });
export function AlarmCyclesEditor({ onBack, user, db, storage, release, cycles, api, reload }: Props) {
  const [key, setKey] = useState<ToneKey>('gita');
  const [drafts, setDrafts] = useState<Record<ToneKey, AlarmCycle>>(() => Object.fromEntries(TONE_KEYS.map(k => [k, cycles.find(c => c.key === k) ?? blank(k)])) as Record<ToneKey, AlarmCycle>);
  const [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [dirty, setDirty] = useState(false), [preview, setPreview] = useState('');
  const locked = useRef(false);
  const cycle = drafts[key];
  const update = (next: AlarmCycle) => { setDrafts(d => ({ ...d, [key]: next })); setDirty(true); };
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function action(fn: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setStatus('Working…');
    try { await fn(); } catch (e) { setStatus(e instanceof Error ? e.message : String(e)); }
    finally { locked.current = false; setBusy(false); }
  }
  async function upload(file: File, index: number) {
    checkAudioFile(file, 'alarm');
    const extension = file.name.toLowerCase().endsWith('.mp3') ? 'mp3' : 'm4a';
    const path = `drafts/${user.uid}/${crypto.randomUUID()}.${extension}`;
    const task = uploadBytesResumable(ref(storage, path), file, { contentType: extension === 'mp3' ? 'audio/mpeg' : 'audio/mp4' });
    await new Promise<void>((resolve, reject) => task.on('state_changed', s => setStatus(`Uploading ${Math.round(s.bytesTransferred / s.totalBytes * 100)}%`), reject, resolve));
    const asset = await api('validate-asset', { path, kind: 'alarm' }) as AudioAsset;
    update({ ...cycle, tracks: cycle.tracks.map((t, i) => i === index ? { title: t.title || file.name.replace(/\.[^.]+$/, ''), asset } : t) });
    setPreview(URL.createObjectURL(file)); setStatus(`Day ${index + 1} audio verified`);
  }
  async function listen(asset: AudioAsset) {
    const url = new URL(asset.url);
    const path = url.hostname === 'storage.googleapis.com' ? decodeURIComponent(url.pathname.split('/').slice(2).join('/')) : decodeURIComponent(url.pathname.split('/o/')[1] ?? '');
    setPreview(URL.createObjectURL(await getBlob(ref(storage, path)))); setStatus('Preview ready');
  }
  let valid = false;
  try { parseAlarmCycle(cycle); valid = true; } catch { /* Incomplete editor slots are saved as drafts. */ }
  return <section aria-label="Alarm music cycles">{onBack ? <button disabled={busy} onClick={() => { if (!dirty || confirm('Leave with unsaved music edits? Save music drafts first to keep them.')) onBack(); }}>Content workspace</button> : null}<h2>Repeating alarm music</h2>
    <p>Upload once. Music repeats every 1–14 days until replaced. Phones keep their downloaded music until a complete replacement is ready.</p>
    <label>Awakening mode<select disabled={busy} value={key} onChange={e => { setKey(e.target.value as ToneKey); setPreview(''); }}>{TONE_KEYS.map(k => <option key={k} value={k}>{toneLabel(k)}</option>)}</select></label>
    <label>Cycle starts on<input type="date" disabled={busy} value={cycle.startDate} onChange={e => update({ ...cycle, startDate: e.target.value })} /></label>
    <label>Number of days<select disabled={busy} value={cycle.tracks.length} onChange={e => {
      const length = Number(e.target.value);
      if (length < cycle.tracks.length && !confirm('Remove the extra day slots from this draft?')) return;
      update({ ...cycle, tracks: Array.from({ length }, (_, i) => cycle.tracks[i] ?? blankTrack()) });
    }}>{Array.from({ length: 14 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label>
    {cycle.tracks.map((track, i) => <fieldset key={`${key}-${i}`} disabled={busy}><legend>Day {i + 1}</legend>
      <label>Track title<input maxLength={200} value={track.title} onChange={e => update({ ...cycle, tracks: cycle.tracks.map((t, j) => i === j ? { ...t, title: e.target.value } : t) })} /></label>
      <label>MP3 or M4A · up to 10 MB<input aria-label={`Upload day ${i + 1} alarm music`} type="file" accept=".mp3,.m4a" onChange={e => { const file = e.target.files?.[0]; if (file) void action(() => upload(file, i)); e.target.value = ''; }} /></label>
      <p>{track.asset.sha256 ? `Verified · ${(track.asset.durationMs / 1000).toFixed(1)} seconds` : 'Audio required'}</p>
      <button disabled={!track.asset.sha256} onClick={() => void action(() => listen(track.asset))}>Preview day {i + 1}</button>
    </fieldset>)}
    <audio controls src={preview || undefined} />
    <p role="status">{status}</p>
    <button disabled={busy} onClick={() => void action(async () => { await setDoc(doc(db, `drafts/${user.uid}-alarm-cycles`), { cycles: drafts, updatedAt: new Date().toISOString() }); setDirty(false); setStatus('All mode drafts saved'); })}>Save music drafts</button>
    <button disabled={busy} onClick={() => {
      if (dirty && !confirm('Replace unsaved music edits with saved drafts?')) return;
      void action(async () => {
        const saved = (await getDoc(doc(db, `drafts/${user.uid}-alarm-cycles`))).data()?.cycles;
        if (!saved || TONE_KEYS.some(k => saved[k]?.key !== k || !Array.isArray(saved[k]?.tracks) || saved[k].tracks.length < 1 || saved[k].tracks.length > 14)) throw new Error('No valid saved music drafts');
        setDrafts(saved); setDirty(false); setStatus('Music drafts loaded');
      });
    }}>Load music drafts</button>
    <button disabled={busy} onClick={() => {
      if (dirty && !confirm('Replace this mode’s edits with its published cycle?')) return;
      update(cycles.find(c => c.key === key) ?? blank(key)); setStatus('Published cycle loaded into editor');
    }}>Edit published cycle</button>
    <button disabled={busy} onClick={() => void action(async () => { await reload(); setStatus('Publication state reloaded; music edits kept'); })}>Reload publication state</button>
    <button className="primary" disabled={busy || !valid} onClick={() => void action(async () => {
      await api('publish-alarm-cycle', { cycle: parseAlarmCycle({ ...cycle, revision: crypto.randomUUID() }), expectedReleaseId: release });
      await reload(); setStatus(`${toneLabel(key)} cycle published. It will repeat until replaced. Other modes and teachings are kept. Save drafts to retain any other edits.`);
    })}>Publish this mode’s cycle</button>
  </section>;
}
