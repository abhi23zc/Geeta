# Complete-song acquisition and offline music

## User behavior

Playback starts streaming immediately while the complete current recording is acquired. Playback loading, buffering, and seeking use only the main transport spinner; there are no loading/buffering text banners in the full or mini player.

The player has a direct Download action, with percentage and Downloaded status. Tapping it keeps the current acquisition permanently. There is no downloads-management sheet, Wi-Fi switch, storage meter, raw track ID, or bulk-delete action. Explicit downloads use the current connection, including cellular; old Wi-Fi-only settings no longer block them.

The library's Downloaded tab lists saved songs with titles/artists and artwork. Tap to play locally; its row menu removes a download. Bundled recordings are shown as Included with app. Existing ready downloads acquire display metadata without becoming temporary files. Saved metadata and files survive restart; playback does not require a successful catalog refresh, while catalog disable/unavailability rules still apply.

## Implementation

Android's MusicAcquisition owns one full-file acquisition per SHA-256, using Media3's range cache as its data source. Automatic acquisition follows native queue transitions and continues while the service/process remains active. Partials resume at their existing byte offset. Exact size and SHA-256 are checked before a final file is exposed. A journal and bridge progress/status events reconcile saved files into SQLite after JavaScript reconnects, before orphan cleanup.

Full temporary files use a separate 256 MiB budget; inactive older files are evicted, while current/pinned/running files are protected. Media3's range cache remains 128 MiB. Explicitly saved files remain in documents under the 1 GiB reservation budget. Promotion uses a verified staging file and atomic rename, retains an active temporary source, and performs large copies outside the monitor used by UI-thread commands. Temporary acquisition failure does not fail playback.

The iOS fallback shares existing resumable transfer jobs between automatic acquisition and explicit saving. Foreground/network restoration resumes paused work. iOS background execution is not guaranteed. Verified local files replace remote audio on the next seek or playback start, retaining position, queue, playback speed, timer, and play/pause intent. Finishing acquisition alone never restarts playback. Automatic files are temporary; only Download guarantees retention for offline use.

New bridge methods: acquire, acquisitions, cancelAcquisition, removeAcquisition, and localAcquisition, with acquisition events. SQLite adds music_download_tracks for display metadata and saved retention without rewriting legacy download rows. Web continues streaming without offline downloading.

## Validation and remaining device checks

Validation passed: 64 music tests, TypeScript, targeted ESLint, Kotlin compilation, native unit tests, and instrumentation-source compilation. Automated checks cover music transport, title persistence, legacy saved-file migration, cellular downloads, source handover, paused handover, checksums, shared transfers, and active-file protection. Kotlin unit tests cover verified file promotion, invalid-file rejection, and partial-file storage accounting. An instrumentation fixture covers complete acquisition and promotion without another upstream read; it is compiled but has not run on a device.

No APK is assembled or installed. After separate build authorization, verify on the Xiaomi phone: play while full acquisition progresses; one-tap permanent saving during acquisition; seeking before/after completion; notification-driven Next; app background/restart; airplane-mode playback; cancellation and removal; low storage; Hindi/English layout on small screens. Actual audible smoothness, network range behavior, and device background execution remain unverified.
