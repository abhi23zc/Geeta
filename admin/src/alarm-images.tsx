import React, { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import { ref, uploadBytesResumable, type FirebaseStorage } from 'firebase/storage';
import { parseAlarmImageCycle, type AlarmImageCycle, type ImageAsset } from '../../shared/content';
type Props = { user: User; db: Firestore; storage: FirebaseStorage; cycle?: AlarmImageCycle; release: string | null; api: (path: string, body: unknown) => Promise<unknown>; reload: () => Promise<unknown>; onBack: () => void };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function AlarmImagesEditor({ user, db, storage, cycle, release, api, reload, onBack }: Props) {
  const [draft, setDraft] = useState<AlarmImageCycle>(() => cycle ?? { revision: crypto.randomUUID(), startDate: today(), images: Array(7).fill(null) });
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  const locked = useRef(false);
  useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  const update = (value: AlarmImageCycle) => { setDraft(value); setDirty(true); };
  async function action(fn: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setStatus('Working…');
    try { await fn(); } catch (error) { setStatus(error instanceof Error ? error.message : String(error)); }
    finally { locked.current = false; setBusy(false); }
  }
  async function upload(file: File, index: number) {
    const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type];
    if (!extension || !file.size || file.size > 10 * 1024 * 1024) throw new Error('Use a static PNG, JPEG or WebP up to 10 MB');
    const path = `alarm-images/uploads/${user.uid}/${crypto.randomUUID()}.${extension}`;
    const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type });
    await new Promise<void>((resolve, reject) => task.on('state_changed', snapshot => setStatus(`Uploading ${Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)}%`), reject, resolve));
    const image = await api('validate-alarm-image', { path }) as ImageAsset;
    update({ ...draft, images: draft.images.map((old, i) => i === index ? image : old) });
    setStatus(`Day ${index + 1} image verified`);
  }
  return <section aria-label="Alarm image cycle"><button disabled={busy} onClick={() => { if (!dirty || confirm('Leave with unsaved image edits?')) onBack(); }}>Content workspace</button>
    <h2>Seven-day alarm images</h2><p>One collection for every alarm mode. Images repeat until replaced. Empty days show the default mascot. Phones keep the previous collection until every replacement image is downloaded.</p>
    <fieldset disabled={busy}><label>Day 1 starts on<input type="date" value={draft.startDate} onChange={e => update({ ...draft, startDate: e.target.value })} /></label>
    {draft.images.map((image, index) => <fieldset key={index}><legend>Day {index + 1}</legend>
      {image ? <img src={image.url} alt={`Day ${index + 1} alarm image preview`} style={{ width: 160, height: 160, objectFit: 'contain' }} /> : <p>Default mascot</p>}
      <label>PNG, JPEG or WebP · up to 10 MB<input type="file" accept="image/png,image/jpeg,image/webp" aria-label={`Upload day ${index + 1} image`} onChange={e => { const file = e.target.files?.[0]; if (file) void action(() => upload(file, index)); e.target.value = ''; }} /></label>
      <button disabled={!image} onClick={() => update({ ...draft, images: draft.images.map((old, i) => i === index ? null : old) })}>Clear day {index + 1}</button>
    </fieldset>)}</fieldset>
    <p role="status">{status}</p>
    <button disabled={busy} onClick={() => void action(async () => { await setDoc(doc(db, `drafts/${user.uid}-alarm-images`), { cycle: draft }); setDirty(false); setStatus('Image draft saved'); })}>Save draft</button>
    <button disabled={busy} onClick={() => { if (dirty && !confirm('Replace unsaved edits with the saved draft?')) return; void action(async () => { const saved = (await getDoc(doc(db, `drafts/${user.uid}-alarm-images`))).data(); setDraft(parseAlarmImageCycle(saved?.cycle)); setDirty(false); setStatus('Image draft loaded'); }); }}>Load draft</button>
    <button disabled={busy} onClick={() => void action(async () => { const next = parseAlarmImageCycle({ ...draft, revision: crypto.randomUUID() }); await api('publish-alarm-images', { cycle: next, expectedReleaseId: release }); await reload(); setDraft(next); setDirty(false); setStatus('Image cycle published. Phones download it on their next content refresh.'); })}>Publish seven-day cycle</button>
  </section>;
}
