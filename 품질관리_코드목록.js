// MES 기준정보 읽기 전용. 생산·재고·일지 문서에는 접근하지 않는다.
const QC_CODE_PROJECT='bbang-ssaem-prod';
function qcCodeRows(kind,data){
 const entries=Array.isArray(data)?data.map(x=>[x.code,x]):Object.entries(data||{});
 const seen=new Set();return entries.map(([key,item])=>({code:String(kind==='recipeDB'?key:item?.code||key||'').trim(),name:String(item?.name||'').trim()})).filter(x=>{if(!x.code||!x.name||seen.has(x.code))return false;seen.add(x.code);return true}).sort((a,b)=>a.code.localeCompare(b.code,'ko',{numeric:true}));
}
function qcApplyCodes(cached){
 for(const [id,key] of [['products','recipes'],['materials','materials']]){const list=$(id);list.replaceChildren();for(const row of cached?.[key]||[]){const option=document.createElement('option');option.value=row.code+' · '+row.name;list.append(option)}}
}
async function qcReadMesCodes(documentId){
 if(!['ingredientDB','recipeDB'].includes(documentId))throw new Error('허용되지 않은 코드 목록');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{const response=await fetch('https://firestore.googleapis.com/v1/projects/'+QC_CODE_PROJECT+'/databases/(default)/documents/appData/'+documentId,{method:'GET',signal:controller.signal,cache:'no-store'});if(!response.ok)throw new Error(response.status===403||response.status===401?'MES 코드 읽기 권한을 확인해주세요.':'목록 조회 오류 ('+response.status+')');const doc=await response.json();const raw=doc.fields?.data?.stringValue;if(typeof raw!=='string')throw new Error('MES 코드 문서 형식이 예상과 다릅니다.');const rows=qcCodeRows(documentId,JSON.parse(raw));if(!rows.length)throw new Error('조회한 코드 목록이 비어 있습니다.');return rows}finally{clearTimeout(timer)}
}
async function setupQcCodeCatalog(){
 const host=$('product').closest('section');const bar=document.createElement('div');bar.className='row';const button=document.createElement('button');button.type='button';button.textContent='원료·배합코드 새로고침';const status=document.createElement('span');status.setAttribute('role','status');status.style.fontSize='13px';bar.append(button,status);host.append(bar);
 let cached=(await qmRead('meta','mesCodeCatalog'))?.value;qcApplyCodes(cached);
 function describe(){return cached?'배합 '+cached.recipes.length+'개 · 원료 '+cached.materials.length+'개 · 마지막 수신 '+new Date(cached.updatedAt).toLocaleString('ko-KR'):'아직 받은 코드 목록이 없습니다. 인터넷 연결 후 새로고침해주세요.'}
 status.textContent=describe();
 button.onclick=async()=>{if(!navigator.onLine){status.textContent='오프라인 · '+describe();return}button.disabled=true;status.textContent='MES 원료·배합코드 불러오는 중…';try{const [recipes,materials]=await Promise.all([qcReadMesCodes('recipeDB'),qcReadMesCodes('ingredientDB')]);const next={recipes,materials,updatedAt:new Date().toISOString()};await qmWrite((store,meta)=>meta.put({key:'mesCodeCatalog',value:next}));cached=next;qcApplyCodes(cached);status.textContent=describe()}catch(error){status.textContent='갱신 실패: '+(error.name==='AbortError'?'응답 시간 초과':error.message)+' 기존 목록과 입력내용은 유지됩니다.'}finally{button.disabled=false}};
 if(navigator.onLine)button.click();
}
window.qmReady.then(setupQcCodeCatalog).catch(error=>console.warn('코드 목록 초기화 실패',error));
