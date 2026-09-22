(function(global){
  'use strict';

  const INDEX_DOC='ledgerRecords_index';
  const LEGACY_DOC='ledgerRecords';
  const DOC_PREFIX='ledgerRecords_';
  const MAX_PART_BYTES=700000;

  function monthKey(record){
    const value=String(record&&record.date||'');
    let match=value.match(/^(20\d{2})-(\d{2})/);
    if(match) return match[1]+match[2];
    match=value.match(/^(\d{2})(\d{2})\d{2}$/);
    if(match) return '20'+match[1]+match[2];
    const now=new Date();
    return String(now.getFullYear())+String(now.getMonth()+1).padStart(2,'0');
  }

  function splitParts(records){
    const parts=[];
    let current=[];
    let currentBytes=2;
    (records||[]).forEach(record=>{
      const itemBytes=new Blob([JSON.stringify(record)]).size+(current.length?1:0);
      if(current.length&&currentBytes+itemBytes>MAX_PART_BYTES){
        parts.push(current);
        current=[];
        currentBytes=2;
      }
      current.push(record);
      currentBytes+=itemBytes;
    });
    if(current.length||!parts.length) parts.push(current);
    return parts;
  }

  function partDoc(month, partNo){
    return DOC_PREFIX+month+'_'+String(partNo).padStart(2,'0');
  }

  async function readJsonDoc(db, docName){
    const snap=await db.collection('appData').doc(docName).get();
    if(!snap.exists||!snap.data().data) return [];
    const parsed=JSON.parse(snap.data().data);
    return Array.isArray(parsed)?parsed:[];
  }

  async function load(db){
    if(!db) throw new Error('Firebase 연결 없음');
    const indexSnap=await db.collection('appData').doc(INDEX_DOC).get();
    if(!indexSnap.exists){
      return readJsonDoc(db,LEGACY_DOC);
    }
    const index=indexSnap.data()||{};
    const months=Array.isArray(index.months)?index.months:[];
    const parts=index.parts||{};
    const jobs=[];
    months.forEach(month=>{
      const count=Math.max(1,Number(parts[month]||1));
      for(let i=1;i<=count;i++) jobs.push(readJsonDoc(db,partDoc(month,i)));
    });
    const monthly=(await Promise.all(jobs)).flat();
    if(index.legacyMigrated===true) return monthly;
    const legacy=await readJsonDoc(db,LEGACY_DOC);
    const seen=new Set();
    return legacy.concat(monthly).filter(record=>{
      const key=JSON.stringify(record);
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function buildWritePlan(db, records){
    if(!db) throw new Error('Firebase 연결 없음');
    const grouped={};
    (records||[]).forEach(record=>{
      const month=monthKey(record);
      (grouped[month]||(grouped[month]=[])).push(record);
    });
    const oldIndexSnap=await db.collection('appData').doc(INDEX_DOC).get();
    const oldIndex=oldIndexSnap.exists?(oldIndexSnap.data()||{}):{};
    const allMonths=[...new Set([...(Array.isArray(oldIndex.months)?oldIndex.months:[]),...Object.keys(grouped)])].sort();
    const nextParts={};
    const writes=[];
    for(const month of allMonths){
      const monthParts=splitParts(grouped[month]||[]);
      nextParts[month]=monthParts.length;
      for(let i=0;i<monthParts.length;i++){
        writes.push({ref:db.collection('appData').doc(partDoc(month,i+1)),data:{
          data:JSON.stringify(monthParts[i]),
          month,
          part:i+1,
          updatedAt:new Date().toISOString()
        }});
      }
      const oldCount=Math.max(0,Number((oldIndex.parts||{})[month]||0));
      for(let i=monthParts.length+1;i<=oldCount;i++){
        writes.push({ref:db.collection('appData').doc(partDoc(month,i)),data:{data:'[]',month,part:i,updatedAt:new Date().toISOString()}});
      }
    }
    writes.push({ref:db.collection('appData').doc(INDEX_DOC),data:{
      schemaVersion:2,
      months:allMonths,
      parts:nextParts,
      legacyMigrated:true,
      updatedAt:new Date().toISOString()
    }});
    return writes;
  }

  async function stage(batch, db, records){
    const writes=await buildWritePlan(db,records);
    writes.forEach(write=>batch.set(write.ref,write.data));
    return writes.length;
  }

  async function save(db, records){
    if(!db) throw new Error('Firebase 연결 없음');
    const batch=db.batch();
    await stage(batch,db,records);
    await batch.commit();
    return records;
  }

  global.MESLedgerStore={load,save,stage,monthKey,splitParts,partDoc};
})(window);
