import * as SQLite from 'expo-sqlite';
import type { CountEvent } from './model';
import { createJaapRepository, type JaapAdapter } from './repository-core';
let db: Promise<SQLite.SQLiteDatabase> | undefined;
function database() {
  return db ??= (async()=>{
    const d=await SQLite.openDatabaseAsync('jaap-v1.db');
    await d.execAsync(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS jaap_state(id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS jaap_events(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS jaap_operations(id TEXT PRIMARY KEY);`);
    return d;
  })().catch(error=>{db=undefined;throw error;});
}
const adapter: JaapAdapter={
  async read(){const d=await database();return (await d.getFirstAsync<{json:string}>('SELECT json FROM jaap_state WHERE id=1'))?.json??null;},
  async mutate(update,operationId){
    const d=await database();let value='';
    await d.withExclusiveTransactionAsync(async tx=>{
      const raw=(await tx.getFirstAsync<{json:string}>('SELECT json FROM jaap_state WHERE id=1'))?.json??null;
      if(operationId&&await tx.getFirstAsync('SELECT id FROM jaap_operations WHERE id=?',operationId)){value=raw!;return;}
      value=update(raw);
      const previousIds=new Set<string>(raw?JSON.parse(raw).events.map((e:CountEvent)=>e.id):[]);
      const next=JSON.parse(value);
      for(const event of next.events as CountEvent[])if(!previousIds.has(event.id))await tx.runAsync('INSERT OR IGNORE INTO jaap_events(id,session_id,json) VALUES(?,?,?)',event.id,event.sessionId,JSON.stringify(event));
      if(operationId)await tx.runAsync('INSERT INTO jaap_operations(id) VALUES(?)',operationId);
      await tx.runAsync('INSERT INTO jaap_state(id,json) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json',value);
    });return value;
  },
};
export const jaapRepository=createJaapRepository(adapter);
