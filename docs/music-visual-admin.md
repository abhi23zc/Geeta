# Visual Music Studio

Music Studio controls the Library screen and the music gateway on Home. It does not change alarm behavior, playback safety, bottom navigation, or unrelated Home content.

## Editing without code

1. Sign in to the existing content admin with an administrator account and open **Music workspace**.
2. Use **Library page** to edit the header, search, tabs and result headings. Add a featured recording/playlist, category navigation, playlist collection, recording collection or banner. Drag sections, or use their arrow buttons. Select a section to edit its copy, layout and destination.
3. Use **Home card** for the separate gateway on the main app Home screen. A normal destination opens content paused; select the playback switch only when a tap should start playback.
4. Use **Categories** to add/rename categories and assign recordings. Hiding removes navigation chips; archiving requires reassignment of referenced recordings and sections. Identifiers remain stable automatically.
5. Use **Recordings** and **Playlists** for titles, descriptions, artwork, audio, ordered recordings and timed lyrics. Recordings without matching audio remain Coming soon. Audio duration is verified, never entered manually.
6. Upload JPEG/PNG/WebP in **Artwork library**. Adjust horizontal/vertical focal points and inspect both crop previews. Use **Create another crop** to reuse the original safely. Then choose artwork using a card’s Artwork picker. Removing an image from a draft never deletes media retained by historical releases.
7. Switch between **English** and **हिन्दी**. Hindi is optional and falls back to English. The reminder counts missing translations.
8. Check the small/large phone preview, then **Review & publish**. Editing and autosaving drafts do not change the live app. Refresh the Library to fetch the published version immediately.

Empty collection selections automatically include all eligible items. Choose individual items to create a fixed, ordered collection. Category-based recording collections update as recording assignments change. Search/category results and personal Favorites/Recent use their own configured headings rather than editorial sections.

## Recovery and publication

Drafts save locally on edits and to the server after a short debounce. Local recovery is offered when a local draft is newer than the saved server draft. Draft requests are serialized, and publication waits for pending draft writes. A publication conflict preserves the draft; reload the server version, recover local changes if appropriate, and review against the published content.

Use **Published versions and restoration** to load an earlier version as a draft, inspect it, and publish a new audited release. Existing published media is retained so earlier versions remain restorable. No automatic image or recording garbage collection is performed.

The admin preview uses the same validated configuration, localization and collection selectors as the app. It is an illustrative HTML preview; final native typography, accessibility settings and spacing depend on the device.

## Compatibility and deployment

- The app requests `${EXPO_PUBLIC_MUSIC_API_URL}/catalog-v2`, falling back to `/catalog` only when the v2 endpoint is not installed. Existing cached v1 catalogs migrate automatically. Invalid/unreachable catalogs retain the last good release; first launch has a bundled fallback.
- Deploy updated Storage rules and `musicApi`, then publish the rebuilt admin hosting assets. The existing `/api/music/**` rewrite already points to this function. No new API environment variable is required.
- The first v2 publication atomically writes an immutable page release, a compatible v1 music release and the current pointer. Older apps receive the v1 projection with custom categories mapped to supported artwork themes. Obsolete admin sessions are rejected after v2 publication and must reload.
- The first admin draft uses the same seed as the offline app, including Coming soon recordings. Existing server drafts/releases take priority.
- Images are limited to 10 MB/40 megapixels, decoded and validated server-side, orientation-normalized, stripped of metadata, and converted to immutable WebP thumbnail/square/banner variants. Originals are retained for new crops. Draft upload paths are owner-scoped and write-once; only the backend can write published derivatives.
- Music Studio is lazy-loaded. The native Library uses a single virtualized vertical list and stable keys. Thumbnails and full artwork use appropriate derivatives with Expo Image disk/memory caching. Refreshes use ETags and the existing five-minute automatic throttle. Presentation refreshes do not replace the active playback session.
- Browser tests live under `admin/tests`; the fixture has mocked credentials/API and is not included in production Vite output. It never bypasses production authentication.

Following explicit user authorization, the Music API, Storage rules, and admin Hosting were deployed to `geeta-56cdb` on 2026-10-18. No APK was built and no catalog content was published. A released client update is required before installed older clients can render the new presentation settings. Native device verification remains a release gate.

## Verification commands

- `npm run test:music` — music playback/storage/catalog and presentation-contract tests, with individual assertions enabled.
- `npm --prefix admin run build` — admin type check and production bundle.
- `npm --prefix admin run test:music-ui` — Chromium form, preview, responsive layout, publishing conflict and local recovery tests. Set `CHROME_BIN` if needed, or install Playwright Chromium.
- `npm --prefix firebase/functions run build` — backend compile.
- `JAVA_HOME=/opt/android-studio/jbr PATH=/opt/android-studio/jbr/bin:$PATH firebase/functions/node_modules/.bin/firebase emulators:exec --project demo-geeta --only auth,firestore,storage,functions 'npm --prefix firebase/functions run test:music'` — local-only publication, image and security tests. A JDK 21+ is required; substitute its path on other machines.
- `node_modules/.bin/tsc --noEmit` — app/shared type check. No APK is produced by these commands.

## Recorded local verification

- App/shared TypeScript and affected music-file ESLint: passed.
- Music unit/contract/storage/synchronization tests: 39 assertions passed.
- Browser workflows: three tests passed, including local recovery and publication conflict preservation; desktop and 390 px layouts checked.
- Firebase emulators: 14 tests passed, covering original recording publication plus v2 presentation, image/crop validation, v1 compatibility, restore audit and security rules.
- Admin production build, functions build, and Expo web static export: passed. The existing large Firebase vendor chunk warning remains.
- Emulator functions ran under the host Node 24 runtime; deployment still targets Node 22. Native Android/iOS device behavior was not exercised, and no APK was built.

## Deployment verification — 2026-10-18

Firebase deployment completed for `functions:content:musicApi,storage,hosting`. The admin at https://geeta-56cdb.web.app returned HTTP 200 and its asset names matched the local production build. The `/api/music/catalog-v2` endpoint returned its expected HTTP 503 response, `No music release published`: an administrator must review and publish the first catalog. Existing apps continue using their bundled fallback until a release is published; older installed clients still require a client update for the configurable presentation.

## Recording preview retry fix — 2026-10-18

The first recording upload reached Available, then the automatic `getBlob` preview failed with `storage/retry-limit-exceeded`. The live bucket had no CORS entries. Browser download access now allows GET/HEAD from the two existing admin origins (`https://geeta-56cdb.firebaseapp.com` and `https://geeta-56cdb.web.app`), with storage authorization unchanged. `node scripts/music-storage-cors.cjs` inspects the configuration; `--apply` merges these entries using a metageneration precondition and the existing Firebase CLI login.

Newly verified recordings use the selected local file for immediate playback, avoiding a redundant download of up to 200 MB. Manual server-preview failure explicitly says the saved recording does not need another upload. Storage metadata/download retry time is bounded at 15 seconds. Four browser tests pass, including a recording upload where no second Storage download is made.
