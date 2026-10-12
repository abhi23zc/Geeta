import 'firebase/auth';
import type { Persistence } from 'firebase/auth';
// Firebase's public declarations omit this React Native runtime export. Metro
// selects @firebase/auth's react-native bundle, which supplies this function.
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: { setItem(key: string, value: string): Promise<void>; getItem(key: string): Promise<string | null>; removeItem(key: string): Promise<void> }): Persistence;
}
