import * as SQLite from 'expo-sqlite';
let database: Promise<SQLite.SQLiteDatabase> | undefined;
export function musicDatabase() {
    return database ??= (async () => {
        const d = await SQLite.openDatabaseAsync('music-v1.db');
        await d.execAsync(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS music_cache(key TEXT PRIMARY KEY, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS downloads(hash TEXT PRIMARY KEY, track TEXT NOT NULL, json TEXT NOT NULL, path TEXT NOT NULL, bytes INTEGER NOT NULL, status TEXT NOT NULL, resume TEXT, error TEXT);
CREATE TABLE IF NOT EXISTS music_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
        return d;
    })();
}
