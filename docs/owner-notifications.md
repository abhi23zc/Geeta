# Owner-controlled notifications

Implemented for Android with Expo SDK 57. Dispatch defaults to **paused** when
`notificationControl/current` is absent. No backend deployment, credential setup,
production activation, or APK build is performed by the implementation.

## Configuration before deployment

1. Enable **Anonymous** sign-in in Firebase Authentication. Do not enable automatic
   deletion of anonymous users: the installation identity must remain stable.
2. The owner's Android client configuration has been copied to `google-services.json`
   and linked in `app.json`. Its package is `com.zrf.aarambh` and project is
   `geeta-56cdb`. Public Firebase Auth settings and the notification API URL are
   configured locally in `.env.local`; deploy/environment settings must use the
   matching Firebase project. `GEETA_GOOGLE_SERVICES_FILE` optionally overrides the
   native client configuration file. This file contains client identifiers, not a
   server service-account private key.
3. Enable the **Firebase Cloud Messaging API (HTTP v1)** in that Firebase project.
   The deployed Cloud Functions runtime service account must have permission to
   send messages (the Firebase Cloud Messaging API Admin role). Server OAuth tokens
   come from Firebase Admin's managed application-default credentials. Do not put a
   service-account private key into the app or browser.
4. Deploy the notification functions, Firestore indexes/rules, existing Storage
   rules, and Hosting. Cloud Tasks and Cloud Scheduler also need their normal
   service permissions. The task queue is in `asia-south1`; only Firebase
   admin-claim users can use admin HTTP operations.
5. Keep dispatch paused until device acceptance. **Build/install Android only when
   explicitly instructed by the owner**, per `AGENTS.md`.

If an Android directory already exists from an older build, regenerate native
configuration with `npx expo prebuild --platform android --no-install` before the
authorized build. Verify `android/app/google-services.json` matches the root file,
the Google Services Gradle plugin is applied, and the manifest default notification
channel is `owner-announcements-v1`. Updating JavaScript alone cannot add native
Firebase configuration to an installed APK. An error saying `Default FirebaseApp
is not initialized` requires a newly configured native build. For the audible
owner channel, omit `sound` to use the Android default; SDK 57 treats a sound string
as a bundled custom filename. The silent channel uses `sound: null`.

Push transport is direct **Firebase Cloud Messaging HTTP v1**. It does not use
Expo Push Service, Expo access tokens, EAS push credentials, or an EAS project ID.
The app continues using the SDK 57 `expo-notifications` native module to obtain
FCM tokens, create channels, present notifications, and handle taps.

If migrating a previously deployed Expo implementation, remove its retired
`notificationReceipts` scheduler/function during deployment. Old Expo tokens are
ineligible until the updated app registers its native FCM token; old campaigns must
be saved/recreated for FCM before dispatch. Keep dispatch paused during migration.

Admin Studio adds a separate Notifications workspace. Save a draft, preview its
AND audience filters, test only selected app user codes, review the exact message,
and then send/schedule. Scheduling defaults to Asia/Kolkata and stores UTC. DST
ambiguities/gaps are rejected. Tests obey dispatch pause and recipient eligibility.

## API and storage

Dedicated POST API: `/api/notifications/{register,open,preview,save,send,schedule,test,cancel,pause,history}`.
Every endpoint verifies a Firebase ID token; admin operations additionally require
`admin: true`. Registration derives ownership from that token, never from a body
UID. Opening records require the delivery UID to equal the authenticated UID.
Firebase rules deny direct writes to all notification collections, including by
admin browsers. Normal users cannot read notification records directly.

- `notificationInstallations`: stable anonymous UID, server-generated code,
  preferences, permission, native FCM token, language/timezone/version, activity timestamp,
  and minimal engagement summary. No tasks, reflections, or teaching text is uploaded.
- `notificationCodes` and `notificationTokens`: collision protection and token
  ownership. Reused tokens invalidate a previous installation to avoid duplicate sends.
- `notificationCampaigns/{id}/recipients/{uid}`: deterministic delivery state,
  FCM message ID, bounded retries, errors, and deduplicated opening state.
- `notificationAudit`: administrative actor/actions/times.
- Private Storage `notification-manifests/{id}.json`: immutable recipient snapshot.
  Atomic create-if-absent is the freeze checkpoint; subsequent workers recover its
  same recipients and use a Firestore page cursor. Content/audience are immutable
  from the `freezing` state onward. The snapshot reflects registrations when the
  snapshot query runs, with a recorded freeze time.

The minute scheduler is a durable outbox for due work and interrupted workers.
Workers process at most 100 recipients per batch, use transactional leases,
and recheck permission, token, opt-out, cancellation, pause, and expiry immediately
before submission. A bounded pool makes single-attempt requests directly to FCM
using Firebase server OAuth credentials. The payload includes visible notification
text, an Android channel, TTL, and a versioned JSON `data.body` that SDK 57 exposes
as notification content data. Payloads are limited to 4096 bytes.

Explicit FCM `QUOTA_EXCEEDED`, `UNAVAILABLE`, or `INTERNAL` responses retry with
exponential backoff and jitter, at least one minute initially, honoring Retry-After,
up to five attempts. Network/timeout/unknown responses are recorded as unknown
without resending. Abandoned `submitting` intents are also unknown, including a
crash just before the actual provider call. The HTTP transport has no hidden socket
retry. This intentionally favors avoiding duplicate alerts over an ambiguous retry.

FCM acceptance is recorded immediately with its message ID. Direct FCM provides no
Expo-style individual receipt polling; no receipt scheduler or receipt count is
used. `UNREGISTERED` invalidates only the submitted token, without invalidating a
newer device token. Invalid payload, sender mismatch, and credential errors stop
retries. Cancellation cannot recall a provider submission; the final eligibility
check and external call still have a small unavoidable race.

`eligible`, `submitted`, `providerAccepted` (displayed as **FCM accepted**), current
failure/unknown/cancellation states, and unique `opened` counts are maintained
transactionally. FCM acceptance does **not** mean displayed on the device.

Delivery details and audit records are removed after 90 days (delivery retention
is based on campaign expiry); private recipient manifests are also removed then.
Campaign aggregate counters remain. Installation identities/preferences remain
until an operator explicitly removes them. Safety limit: audience scans examine
at most 100,000 installations and fail rather than silently truncate. Preview
shows the first 100 rows; explicit code audiences support up to 100 codes.

## Mobile behavior

Auth uses Firebase React Native persistence backed by AsyncStorage. Updates,
opening outbox, opt-out, and navigation deferral survive app restarts. Sync is
coalesced after relevant changes, refreshed on foreground/network/token changes,
and retried every minute while active. Notification permission is checked each
sync. Silent/audible announcements have separate Android channels. Local reminders
supply their channel in the SDK 57 trigger; native alarms remain independent.

Only versioned owner payloads may navigate to Home, Today, Gita, Quiz, Progress,
Saved Teachings, or Downloads. Duplicate responses do not duplicate opening
statistics. Onboarding and active alarm rituals defer navigation. Background
visible push does not depend on JS execution. Offline opt-out suppresses foreground
presentation immediately, but server/background suppression starts once the queued
preference reaches the server; previously submitted pushes cannot be recalled.

## Verification and acceptance

Local checks:

```
npx tsc --noEmit
npm run lint
npm --prefix admin run build
npm --prefix firebase/functions run build
npm run test:notifications
npm run test:firebase
```

Firebase CLI requires JDK 21 or later. Tests use `demo-geeta`, Firebase emulators,
and a fake FCM provider: no real campaigns or external notifications are sent.

Before enabling dispatch in production, verify with two physical Android devices:
code registration/persistence, foreground/background/swipe-away/locked-screen test
pushes, selected-user exclusions, permission denial, offline opt-out recovery,
audible/silent channels, scheduled sends, cancellation, opening deduplication,
onboarding/alarm deferral, invalid-token recovery, local reminder channels, and
native alarm regression. Device tests remain pending until the owner authorizes a
build and credentials/deployment are configured.

References: [SDK 57 notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/),
[Firebase HTTP v1](https://firebase.google.com/docs/cloud-messaging/auth-server),
[FCM error handling](https://firebase.google.com/docs/cloud-messaging/error-codes),
[Firebase task queues](https://firebase.google.com/docs/functions/task-functions).
