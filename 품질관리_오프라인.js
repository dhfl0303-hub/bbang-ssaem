const QM_DB_NAME='bbang-ssaem-quality-offline-v1';
let qmDatabase=null,qmRecords=[],qmStorageError='',qmSyncBusy=false;
function qmDateToday(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function qmRetentionStart(today=qmDateToday()){const d=new Date(today+'T12:00:00');d.setDate(d.getDate()-13);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function qmExpired(record,today=qmDateToday()){return record.state!=='deleted'&&/^\d{4}-\d{2}-\d{2}$/.test(record.date||'')&&record.date<qmRetentionStart(today)}
function qmRecordId(record){return record.date+'|'+record.product}
function qmClone(value){return JSON.parse(JSON.stringify(value))}
function qmRead(store,key){return new Promise((resolve,reject)=>{const req=qmDatabase.transaction(store).objectStore(store).get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function qmAll(){return new Promise((resolve,reject)=>{const req=qmDatabase.transaction('journals').objectStore('journals').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function qmWrite(action){return new Promise((resolve,reject)=>{const tx=qmDatabase.transaction(['journals','meta'],'readwrite');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('저장 취소'));try{action(tx.objectStore('journals'),tx.objectStore('meta'))}catch(error){tx.abort();reject(error)}})}
async function qmCleanup(){
 if(!qmDatabase)return;const cutoff=qmRetentionStart();const expired=qmRecords.filter(r=>qmExpired(r));const roomCopy={...sharedRoom};Object.keys(roomCopy).forEach(k=>{if(/^\d{4}-\d{2}-\d{2}\|/.test(k)&&k.slice(0,10)<cutoff)delete roomCopy[k]});
 if(expired.length||Object.keys(roomCopy).length!==Object.keys(sharedRoom).length){await qmWrite((records,meta)=>{expired.forEach(r=>records.delete(r.id));meta.put({key:'rooms',value:roomCopy})});sharedRoom=roomCopy;qmRecords=qmRecords.filter(r=>!qmExpired(r));window.dispatchEvent(new Event('qm-records-changed'))}
 // 이전 저장 방식의 만료 기록도 정리한다. 유효한 기록은 그대로 보존한다.
 for(const key of ['qc-process-prototype-v1','qc-room-checks-v1']){try{const old=JSON.parse(localStorage.getItem(key)||'null');if(!old)continue;if(Array.isArray(old)){const keep=old.filter(r=>!qmExpired(r));if(keep.length!==old.length)localStorage.setItem(key,JSON.stringify(keep))}else{let changed=false;for(const k of Object.keys(old))if(/^\d{4}-\d{2}-\d{2}\|/.test(k)&&k.slice(0,10)<cutoff){delete old[k];changed=true}if(changed)localStorage.setItem(key,JSON.stringify(old))}}catch(error){console.warn('이전 만료 기록 정리 실패',error)}}
}
async function qmInitialize(){
 try{qmDatabase=await new Promise((resolve,reject)=>{const req=indexedDB.open(QM_DB_NAME,1);req.onupgradeneeded=()=>{const db=req.result;db.createObjectStore('journals',{keyPath:'id'});db.createObjectStore('meta',{keyPath:'key'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('다른 창을 닫고 다시 열어주세요.'))});
 const migrated=await qmRead('meta','legacyMigrated');if(!migrated){let legacy=[];try{legacy=JSON.parse(localStorage.getItem('qc-process-prototype-v1')||'[]')}catch{throw new Error('이전 기록을 읽지 못했습니다. 기존 저장 데이터는 보존되어 있습니다.')}
 const existing=await qmAll(),ids=new Set(existing.map(r=>r.id));await qmWrite((store,meta)=>{legacy.forEach(r=>{if(!r.date||!r.product||qmExpired(r))return;const record={...r,id:qmRecordId(r),state:'draft',stage:r.stage||'가공',revision:1,syncState:'draft'};if(!ids.has(record.id))store.put(record)});meta.put({key:'rooms',value:sharedRoom});meta.put({key:'legacyMigrated',value:true})})}
 const rooms=await qmRead('meta','rooms');if(rooms?.value)sharedRoom=rooms.value;qmRecords=await qmAll();await qmCleanup();records=()=>qmClone(qmRecords.filter(r=>r.state!=='deleted'&&!qmExpired(r)));setInterval(()=>qmCleanup().catch(console.warn),60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)qmCleanup().catch(console.warn)});
 }catch(error){qmStorageError=error.message||String(error);throw error}
}
function qmCapture(state){const now=new Date().toISOString();const snapshot={date:$('date').value,product:getJournalProduct().trim(),floor:$('floor').value,stage,inspector:$('inspector').value,values:qmClone(values),raws:qmClone(raws),roomValues:Object.fromEntries(Object.entries(sharedRoom).filter(([key])=>key.startsWith($('date').value+'|'))),state,updatedAt:now};snapshot.id=qmRecordId(snapshot);return snapshot}
async function qmSave(state){
 const status=$('status');if(!qmDatabase){status.textContent='기기 저장소를 사용할 수 없습니다.';return false}
 for(const field of document.querySelectorAll('#journalScreen [data-qc-date], main [data-qc-date]')){if(!field.disabled&&!field.reportValidity())return false}
 if(!$('date').value||!getJournalProduct().trim()){status.textContent='점검일자와 제품을 입력해주세요.';return false}
 const next=qmCapture(state);if(qmExpired(next)){status.textContent='최근 14일을 벗어난 점검일입니다. 점검일자를 확인해주세요.';return false}
 const prior=qmRecords.find(r=>r.id===next.id);if(state==='draft'&&prior?.state==='saved'){status.textContent='이미 저장한 일지입니다. 변경 내용을 반영하려면 저장 버튼을 눌러주세요.';return false}
 next.createdAt=prior?.createdAt||next.updatedAt;next.revision=(prior?.revision||0)+1;next.syncState=state==='saved'?'pending':'draft';
 $('save').disabled=true;$('saveFinal').disabled=true;
 try{await qmWrite((store,meta)=>{store.put(next);meta.put({key:'rooms',value:qmClone(sharedRoom)})});qmRecords=qmRecords.filter(r=>r.id!==next.id).concat([next]);status.textContent=state==='saved'?'기기에 저장했습니다. 메인에서 PDF 출력과 동기화를 할 수 있습니다.':'기기에 임시저장했습니다.';window.dispatchEvent(new Event('qm-records-changed'));return true}catch(error){status.textContent='저장 실패: '+error.message;return false}finally{$('save').disabled=false;$('saveFinal').disabled=false}
}
async function qmSync(id){
 if(qmSyncBusy)return '동기화 중입니다.';const target=qmRecords.filter(r=>['saved','deleted'].includes(r.state)&&r.syncState!=='synced'&&(!id||r.id===id)&&!qmExpired(r));if(!target.length)return '전송 대기 중인 일지가 없습니다.';
 if(!navigator.onLine)return '오프라인입니다. 기록은 기기에 보관되어 있습니다. 연결 후 다시 눌러주세요.';
 if(typeof window.QM_SYNC_ADAPTER?.saveRecord!=='function'||target.some(r=>r.state==='deleted')&&typeof window.QM_SYNC_ADAPTER?.deleteRecord!=='function')return '품질관리용 서버가 아직 연결되지 않았습니다. 기록은 기기에 저장되어 있으며 동기화 대기 상태를 유지합니다.';
 qmSyncBusy=true;let success=0,fail=0;try{for(const record of target){try{const response=await (record.state==='deleted'?window.QM_SYNC_ADAPTER.deleteRecord(qmClone(record)):window.QM_SYNC_ADAPTER.saveRecord(qmClone(record)));if(response?.id!==record.id||response?.revision!==record.revision)throw new Error('서버 저장 확인을 받지 못했습니다.');const latest=qmRecords.find(r=>r.id===record.id);if(!latest||latest.revision!==record.revision)continue;const done={...latest,syncState:'synced',syncedAt:new Date().toISOString()};await qmWrite(store=>store.put(done));qmRecords=qmRecords.map(r=>r.id===done.id?done:r);success++}catch{fail++}}window.dispatchEvent(new Event('qm-records-changed'));return success+'건 동기화 완료'+(fail?' · '+fail+'건 실패, 기기 기록 유지':'')}finally{qmSyncBusy=false}
}
function qmPendingCount(){return qmRecords.filter(r=>['saved','deleted'].includes(r.state)&&r.syncState!=='synced'&&!qmExpired(r)).length}
async function qmDeleteRecord(id){
 const current=qmRecords.find(r=>r.id===id);if(!current||current.state==='deleted')return false;
 if(!confirm('이 일지를 삭제할까요? 입력내용과 서명은 삭제되며 복구할 수 없습니다. 서버 연결 후 삭제 요청도 동기화됩니다.'))return false;
 const tombstone={id:current.id,date:current.date,state:'deleted',deletedAt:new Date().toISOString(),revision:(current.revision||0)+1,syncState:'pending'};
 await qmWrite(store=>store.put(tombstone));qmRecords=qmRecords.map(r=>r.id===id?tombstone:r);
 try{const legacy=JSON.parse(localStorage.getItem('qc-process-prototype-v1')||'[]');localStorage.setItem('qc-process-prototype-v1',JSON.stringify(legacy.filter(r=>qmRecordId(r)!==id)))}catch(error){console.warn('이전 저장본 정리 실패',error)}
 if(qmRecordId({date:$('date').value,product:getJournalProduct()})===id){values={};raws={오전:[''],오후:['']};render()}
 window.dispatchEvent(new Event('qm-records-changed'));return true;
}
// 서버 읽기를 연결할 때도 이 함수를 통해 병합해야 삭제된 일지가 복원되지 않는다.
async function qmMergeRemote(incoming){
 for(const record of incoming){if(!record.id||!record.date||qmExpired(record))continue;const local=qmRecords.find(r=>r.id===record.id);if(local?.state==='deleted')continue;
 if(record.state==='deleted'){const tombstone={id:record.id,date:record.date,state:'deleted',deletedAt:record.deletedAt,revision:record.revision,syncState:'synced'};await qmWrite(store=>store.put(tombstone));qmRecords=qmRecords.filter(r=>r.id!==record.id).concat(tombstone);continue}
 if(local&&(local.syncState!=='synced'||(local.revision||0)>=(record.revision||0)))continue;const remote={...qmClone(record),syncState:'synced'};await qmWrite(store=>store.put(remote));qmRecords=qmRecords.filter(r=>r.id!==record.id).concat(remote);
 }window.dispatchEvent(new Event('qm-records-changed'));
}
function qmPrintRecord(record,form){
 // 저장본으로 출력하고 현재 작성 중인 화면의 입력값은 그대로 복원한다.
 const savedValues=values,savedRaws=raws,savedRooms=sharedRoom,savedStage=stage;const old={date:$('date').value,floor:$('floor').value,inspector:$('inspector').value};
 try{values=qmClone(record.values||{});if(!values.periodProducts)values.periodProducts={오전:record.product||'',오후:''};raws=qmClone(record.raws||{});sharedRoom=qmClone(record.roomValues||sharedRoom);stage=form.stage;$('date').value=record.date;$('floor').value=form.floor;$('inspector').value=record.inspector||'';printSheet()}finally{values=savedValues;raws=savedRaws;sharedRoom=savedRooms;stage=savedStage;Object.entries(old).forEach(([k,v])=>$(k).value=v)}
}
function setupOfflineJournal(){
 const button=document.createElement('button');button.id='saveFinal';button.type='button';button.className='primary';button.textContent='저장';$('save').after(button);$('save').classList.remove('primary');$('save').onclick=()=>qmSave('draft');button.onclick=()=>qmSave('saved');
 const note=document.querySelector('.notice');note.textContent='기기에 먼저 저장합니다. 점검일 기준 오늘 포함 최근 14일만 보관하고 이전 기록은 자동삭제합니다. 필요한 PDF는 보관 기간 안에 출력해주세요. 원료·배합코드는 MES 기준정보를 읽어 사용합니다.';
}
window.qmReady=window.qcAuthReady.then(qmInitialize);
