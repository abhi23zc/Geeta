# Aarambh production Android build

Expo project: https://expo.dev/accounts/zrf/projects/geeta

Project ID: `27cf64c0-bfba-4f41-827f-f45402a217f3`

Android package: `com.zrf.aarambh`. User-facing version: `1.0.0`.

`eas.json` defines a store-distribution production AAB, remote signing credentials, remote version-code management and automatic increments. The profile disables RevenueCat Test Store mode and alarm startup delays. Subscriptions remain development-only in the existing app; this release does not initialize RevenueCat or need its production SDK key.

The existing content/notification endpoints and Firebase client configuration were uploaded to this project's production environment. Existing `google-services.json` is included in the upload and contains the Android package above. Passwords, keystores, local environment files and credentials.json are excluded.

`.easignore` excludes generated native hosts, build outputs, private local environment files, Git history, other applications and the Bun lockfile. EAS uses `package-lock.json` and regenerates Android via Expo Prebuild. Local alarm Kotlin sources, resources, configuration plugins and animation assets are included. A fresh Android Prebuild verified the alarm lifecycle and volume-key hooks, MainActivity singleTop launch mode and core-library desugaring. Android module autolinking resolves MorningAlarmModule. EAS archive inspection verified the included sources and exclusions.

## Signing prerequisite

Completed checks: Expo Doctor (21/21), TypeScript, scoped configuration/plugin lint, 32 app-side JavaScript test files, 44 native alarm unit tests, instrumentation-source compilation, fresh Android Prebuild, module autolinking, EAS upload archive inspection and production Android JavaScript/Hermes export. The separate admin-editor suite has two existing failures finding rendered inputs; admin code is excluded from the Android bundle. Device and lock-screen verification remain outstanding.

The first cloud build identified a missing direct `expo-asset` peer dependency and SDK 57 patch-version mismatches. `expo-asset` and its config plugin were added, the SDK 57 packages were aligned, and the project now uses a single npm lockfile. The stale onboarding test expectation was updated to match the already-removed vibration page. The corrected production build uses version code `3`; the earlier version-code-2 build is superseded.

The user confirmed this is the first Google Play upload. EAS generated a new Android upload keystore, stored remotely under this project. The first production build uses version code `2` because automatic increments started from the local default `1`. Future updates must reuse this upload key.

A private local backup is stored in `builds/signing/aarambh-upload.jks` and `builds/signing/credentials.json`, with directory mode 700 and file mode 600. These files are excluded from Git and EAS uploads. The credentials file contains passwords; keep it private and make a secure backup outside this computer. To restore local credentials, copy the JSON to the project root without committing it; its keystore path is relative to the project root.

Upload certificate SHA-256: `42:28:A1:D4:55:9B:C3:DF:2C:94:D3:1E:1B:4E:4F:5B:15:56:3C:3F:40:4D:84:1C:5D:CC:B9:CC:F6:41:7C:7B`.

Superseded build: https://expo.dev/accounts/zrf/projects/geeta/builds/221908e1-b36f-4618-94b2-a835ee4ee67e

Corrected production build: https://expo.dev/accounts/zrf/projects/geeta/builds/c539d343-6de3-4b92-8332-8124ed81fe43

## Completed release bundle

The corrected EAS build finished successfully. Downloaded artifact: `builds/aarambh-1.0.0-v3-play-store.aab` (173,309,668 bytes), package `com.zrf.aarambh`, version `1.0.0`, version code `3`, minimum SDK `24`, target SDK `36`.

SHA-256: `2d8a74ee05178517c2257dfd5797685e3a4d944037de937ac64e24944ac8fdc6`.

Google bundletool validation, ZIP integrity and JAR signature verification passed. The upload certificate matches the backed-up EAS upload key. The compiled manifest retains the native alarm activity/service/receivers, direct-boot support, required alarm permissions and MainActivity singleTop mode. Release DEX contains AlarmPresentation, AlarmSnooze, VolumeKeyPress and MorningAlarmModule, including the hardware snooze event. All 52 checked arm64-v8a/x86_64 native libraries have ELF load-segment alignment of at least 16 KB.

Detailed artifact checks: `builds/aarambh-1.0.0-v3-play-store.validation.json`. Compiled manifest: `builds/aarambh-1.0.0-v3-play-store.manifest.xml`.

No APK was built or installed. Google Play upload and device/lock-screen testing are the next steps; the app has not been published.

## Build

After signing is established, run:

```sh
npm run build:android:production
```

The profile produces an AAB. It does not assemble an APK. The bundle is downloadable from the EAS build page. Upload the first bundle manually to Google Play Console's Internal testing track, enable Play App Signing, and verify the installed release, especially alarm delivery, volume-button snooze and lock-screen behavior. Building does not publish the app.

## Production APK

The `production-apk` profile extends `production` and overrides only `android.buildType` to `apk`. It uses the same production environment, remote upload keystore and automatic version-code increments as the Play Store AAB.

```sh
npm run build:android:apk
```

Requested APK build (version code `4`): https://expo.dev/accounts/zrf/projects/geeta/builds/5ca6631b-620a-47d0-ab9e-7ba3ff4bfeef

## Verification commands

```sh
npx tsc --noEmit
npm run test:alarm-navigation
node --test tests/subscriptions.test.mjs
npx eas-cli@latest build:inspect --platform android --profile production --stage archive --output /tmp/aarambh-eas-archive-review
```

Inspect that archive for the local alarm sources and assets, and confirm it excludes generated Android and local environment files. Post-build inspection runs a native build and is not necessary to check source packaging.

References: [SDK 57](https://docs.expo.dev/versions/v57.0.0/), [EAS configuration](https://docs.expo.dev/eas/json/), [Android build process](https://docs.expo.dev/build-reference/android-builds/), [EAS environment variables](https://docs.expo.dev/eas/environment-variables/).
