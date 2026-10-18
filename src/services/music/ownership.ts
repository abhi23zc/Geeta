import { setAudioModeAsync } from 'expo-audio';
let tail = Promise.resolve();
export function serializedAudioMode(options: Parameters<typeof setAudioModeAsync>[0]) {
    const next = tail.catch(() => undefined).then(() => setAudioModeAsync(options));
    tail = next;
    return next;
}
export function musicAudioMode(background: boolean) { return serializedAudioMode({ playsInSilentMode: true, shouldPlayInBackground: background, interruptionMode: 'doNotMix', shouldRouteThroughEarpiece: false }); }
