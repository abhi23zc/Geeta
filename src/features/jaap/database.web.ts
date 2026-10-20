import type { CountEvent } from './model';
import { createJaapRepository, type JaapAdapter } from './repository-core';
let connection: Promise<IDBDatabase> | undefined;
function database(){
  return connection??=(new Promise<IDBDatabase>((resolve,reject)=>{
    if(typeof indexedDB==='undefined'){reject(Error('Browser storage is unavailable. Enable site storage to save your practice.'));return;}
    const request=indexedDB.open('aarambh-jaap',2);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('practice'))db.createObjectStore('practice');if(!db.objectStoreNames.contains('events'))db.createObjectStore('events',{keyPath:'id'});if(!db.objectStoreNames.contains('operations'))db.createObjectStore('operations');};
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Close older Aarambh tabs and retry.'));
  })).catch(error=>{connection=undefined;throw error;});
}
const adapter: JaapAdapter={
  async read(){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('practice','readonly');const req=tx.objectStore('practice').get('state');tx.oncomplete=()=>resolve(req.result??null);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});},
  async mutate(update,operationId){
    const db=await database();return new Promise((resolve,reject)=>{
      const tx=db.transaction(['practice','events','operations'],'readwrite'),store=tx.objectStore('practice'),request=store.get('state'),operation=operationId?tx.objectStore('operations').get(operationId):null;
      let value='',failure:unknown,readReady=false,operationReady=!operation;
      function commit(){if(!readReady||!operationReady)return;try{
        const raw=request.result??null;
        if(operation?.result){value=raw;return;}
        value=update(raw);
        const previousIds=new Set<string>(raw?JSON.parse(raw).events.map((e:CountEvent)=>e.id):[]),next=JSON.parse(value);
        for(const event of next.events as CountEvent[])if(!previousIds.has(event.id))tx.objectStore('events').put(event);
        if(operationId)tx.objectStore('operations').put(true,operationId);
        store.put(value,'state');
      }catch(e){failure=e;tx.abort();}}
      request.onsuccess=()=>{readReady=true;commit();};if(operation)operation.onsuccess=()=>{operationReady=true;commit();};
      tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(failure??tx.error);tx.onabort=()=>reject(failure??tx.error);
    });
  },
};
export const jaapRepository=createJaapRepository(adapter);
