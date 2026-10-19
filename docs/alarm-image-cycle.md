# Seven-day alarm images

Open **Alarm images** in the admin workspace. Choose the local calendar date for
Day 1 and upload a static PNG, JPEG or WebP (up to 10 MB) into any of the seven
slots. Empty slots use the existing animated Aru mascot. Save/load drafts without
publishing, or publish the cycle independently of teachings and alarm music.
Images are normalized to WebP, preserving transparency and aspect ratio, with a
maximum dimension of 2048 pixels.

The same collection applies to all alarm modes. The seven slots repeat forever
from the selected start date. No weekly re-upload is required. Before the start
date the default mascot appears. Publishing seven empty slots intentionally
restores the default mascot every day. A release without image metadata keeps the
phone's installed collection.

Phones download every supplied image through the existing content refresh flow,
including background refresh, foreground refresh, and manual Downloads refresh.
Wi-Fi-only preferences and storage limits apply. A new collection becomes active
only after every supplied image passes size and SHA-256 checks. Interrupted
updates keep the previous collection; alarm display never requests a remote URL.
Downloads remain in app document storage until replaced or explicitly cleared.

The wake screen verifies the selected local file and falls back to Aru on missing,
corrupt or undecodable content. The selection is remembered by alarm session,
using the original alarm occurrence's local date, so snoozing across midnight or
receiving a new collection does not change that alarm's image. Cleanup protects
the installed collection and selected session image. The next alarm selects anew.

Verification:

- `npm run test:content`
- `npm run test:alarm-navigation`
- `npx tsc --noEmit`
- `npm --prefix admin run build`
- `npm --prefix firebase/functions run build`
- `node --test firebase/functions/tests/alarm-images.test.mjs`
- Firebase emulator security tests require Java 21 or newer.

Publishing requires deploying the updated content function, Storage rules and
admin workspace through the normal authorized deployment process. Existing app
versions ignore the optional image-cycle field. No native bridge change is needed.

## Deployment — 19 October 2026

With explicit user authorization, deployed `functions:content:contentApi,storage,hosting`
to `geeta-56cdb`. Admin and function builds, focused image/publication tests,
and Firestore/Storage security emulator tests passed. Emulator tests used the
installed `/opt/android-studio/jbr` runtime. Live verification returned HTTP 200
for the admin and content window API, confirmed seven content days, and matched
the served admin JavaScript byte-for-byte against the local production build,
including the seven-day image editor. No content was published and no APK built.
