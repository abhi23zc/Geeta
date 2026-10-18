import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
const hook = registerHooks({ resolve(specifier, context, next) { try { return next(specifier, context); } catch(error) { if (specifier.startsWith('.') && context.parentURL && !specifier.endsWith('.ts')) { const url = new URL(specifier + '.ts', context.parentURL); if (existsSync(url)) return next(url.href, context); } throw error; } } });
const { parseMusicReleaseV2, migrateMusicRelease, legacyMusicRelease, sectionItems, mediaUsage, localized } = await import('../shared/music-presentation.ts');
const { editorSeed, categoryUsage, moveItem, newSection, removeImage, DraftQueue, changeSummary } = await import('../admin/src/music-editor-model.ts');
hook.deregister();
const fresh = () => { const p = structuredClone(editorSeed()); p.tracks = [p.tracks[0]]; p.playlists = []; p.presentation.sections = p.presentation.sections.map(s => s.type === 'playlists' ? { ...s, ids: [] } : s); return p; };
test('v1 migration preserves stable content and supplies an explicit featured target', () => {
 const page=fresh(), legacy=legacyMusicRelease(page), migrated=parseMusicReleaseV2(legacy);
 assert.equal(migrated.schemaVersion,2); assert.deepEqual(migrated.tracks.map(t=>t.id),legacy.tracks.map(t=>t.id)); assert.equal(migrated.presentation.sections[0].target.id,legacy.tracks[0].id);
 assert.deepEqual(legacyMusicRelease(migrated),legacy); assert.equal(parseMusicReleaseV2(page).presentation.home.target.type,'library');
});
test('new category identifiers survive validation and project to safe legacy artwork themes',()=>{
 const page=fresh();page.categories.push({...page.categories[0],id:'new-category',name:{en:'Peaceful evenings'},theme:'flute'});page.tracks[0].category='new-category';
 assert.equal(parseMusicReleaseV2(page).tracks[0].category,'new-category');assert.equal(legacyMusicRelease(page).tracks[0].category,'flute');
 page.categories.at(-1).archived=true;assert.throws(()=>parseMusicReleaseV2(page),/Reassign/);
});
test('sections resolve ordered selections, dynamic categories and category membership',()=>{
 const page=fresh();const s=newSection('tracks','test');assert.deepEqual(sectionItems(page,s),['gita-10-20']);s.categoryId='mantra';assert.deepEqual(sectionItems(page,s),[]);
 s.ids=['gita-10-20'];assert.deepEqual(sectionItems(page,s),s.ids);const c=newSection('categories','cat');page.categories[0].visible=false;assert.equal(sectionItems(page,c).includes('gita'),false);
 assert.ok(categoryUsage(page,'gita').includes('Bhagavad Gita · 10.20'));
});
test('all section types validate and reject unsafe layouts, references, duplicates and actions',()=>{
 for(const type of ['featured','banner','tracks','playlists','categories']){const p=fresh();p.presentation.sections=[newSection(type,'added')];if(type==='featured')p.presentation.sections[0].target={type:'track',id:p.tracks[0].id};assert.equal(parseMusicReleaseV2(p).presentation.sections.length,1);}
 for(const mutate of [p=>p.presentation.sections.push(p.presentation.sections[0]),p=>p.presentation.sections[0].target={type:'track',id:'missing'},p=>p.presentation.sections[0].layout='html',p=>p.presentation.sections[0].target={type:'javascript',id:'x'},p=>p.presentation.sections[0].imageId='missing',p=>p.presentation.sections[1].ids=['gita','gita'],p=>p.presentation.header.title.en='',p=>p.presentation.sections[0].target={type:'category',id:'gita',play:true}]){const p=fresh();mutate(p);assert.throws(()=>parseMusicReleaseV2(p));}
});
test('image references are validated, usage protects removal and optional Hindi falls back',()=>{
 const p=fresh();const image={id:'art',name:'Artwork',alt:{en:'Temple'},width:100,height:100,original:'https://example.test/o.webp',thumbnail:'https://example.test/t.webp',square:'https://example.test/s.webp',banner:'https://example.test/b.webp'};p.media.push(image);p.presentation.home.imageId='art';
 assert.equal(parseMusicReleaseV2(p).media.length,1);assert.deepEqual(mediaUsage(p,'art'),['Home music card']);assert.throws(()=>removeImage(p,'art'));
 delete p.presentation.home.imageId;assert.equal(removeImage(p,'art').media.length,0);assert.equal(localized({en:'English',hi:''},'hi'),'English');
 p.media[0].square='javascript:alert(1)';assert.throws(()=>parseMusicReleaseV2(p));
});
test('keyboard ordering preserves items and summary identifies changed appearance',()=>{
 assert.deepEqual(moveItem(['a','b','c'],0,2),['b','c','a']);assert.deepEqual(moveItem(['a'],0,-1),['a']);const p=fresh(),next=fresh();next.presentation.home.title.en='New';assert.deepEqual(changeSummary(p,next),['Library and Home appearance']);
});
test('draft saves are serialized even after an older request fails',async()=>{
 const queue=new DraftQueue(),calls=[];let release;const first=queue.enqueue(async()=>{calls.push('first');await new Promise(resolve=>{release=resolve;});throw Error('offline');});const second=queue.enqueue(async()=>{calls.push('second');});await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls,['first']);release();await assert.rejects(first);await second;await queue.flush();assert.deepEqual(calls,['first','second']);
});
