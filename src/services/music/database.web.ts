import type { SQLiteDatabase } from 'expo-sqlite';
/** Web uses an atomic AsyncStorage catalog snapshot and streams audio. Native downloads use SQLite. */
export async function musicDatabase(): Promise<SQLiteDatabase> {
  throw new Error('Music downloads are available in the mobile app.');
}
