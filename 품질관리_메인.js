function setupQualityHome(){
 const journal=document.querySelector('main');journal.id='journalScreen';const header=document.querySelector('header');header.className='qm-header';header.innerHTML='<div><small>BBANG SSAEM F&B · QUALITY CONTROL</small><h1 id="qmTitle">빵쌤에프앤비 품질관리팀 관리일지</h1></div><div class="qm-actions"><button type="button" id="qmBack" hidden>메인화면</button></div>';
 // 공정파트 선택은 메인 화면에서 담당한다. 기존 작성/저장 기능은 그대로 사용한다.
 journal.querySelector('nav').hidden=true;$('saved').closest('section').hidden=true;
 const home=document.createElement('main');home.id='qualityHome';home.className='qm-home';journal.before(home);let category='공정파트';
 function today(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
 function currentSnapshot(){return {date:$('date').value,product:getJournalProduct(),floor:$('floor').value,inspector:$('inspector').value,values,raws}}
 function canLoadAnother(){const current=currentSnapshot();if(!current.product)return true;const saved=records().find(r=>r.date===current.date&&r.product===current.product);if(saved&&JSON.stringify(saved.values)===JSON.stringify(values)&&saved.inspector===current.inspector)return true;return confirm('현재 입력 중인 내용을 다른 저장 일지로 바꿀까요? 저장하지 않은 내용이 있다면 취소 후 임시저장해주세요.')}
 function setView(view){const showJournal=view==='process';home.hidden=showJournal;journal.hidden=!showJournal;$('qmBack').hidden=!showJournal;$('qmTitle').textContent=showJournal?'공정파트 · 공정점검일지':'빵쌤에프앤비 품질관리팀 관리일지';document.title=showJournal?'공정점검일지 | 빵쌤에프앤비 품질관리팀':'빵쌤에프앤비 품질관리팀 관리일지';if(!showJournal)renderHome();window.scrollTo(0,0)}
 function navigate(view){const hash=view==='process'?'#process':'#home';if(location.hash===hash)setView(view);else location.hash=hash}
 function loadDraft(record){if(!canLoadAnother())return;['date','floor','inspector'].forEach(k=>$(k).value=record[k]||'');values=JSON.parse(JSON.stringify(record.values||{}));if(!values.periodProducts)values.periodProducts={오전:record.product||'',오후:''};raws=JSON.parse(JSON.stringify(record.raws||{오전:[''],오후:['']}));period='오전';stage=record.stage||'가공';['period','stage'].forEach(id=>$(id).querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.value===(id==='period'?period:stage))));render();$('status').textContent='임시저장한 일지를 불러왔습니다.';navigate('process')}
 function renderHome(){const all=records().slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')),date=today(),count=all.filter(r=>r.date===date).length;home.innerHTML='<div class="qm-intro"><div><h2>품질관리 업무</h2><p>'+esc(displayQcDate(date))+'</p></div><span class="qm-badge">기기 내 저장</span></div><div class="qm-stats"><div class="qm-stat"><span>오늘 임시저장</span><strong>'+count+'건</strong><small>최종 완료와 구분</small></div><div class="qm-stat"><span>저장된 일지</span><strong>'+all.length+'건</strong><small>이어 작성 가능</small></div><div class="qm-stat"><span>작성주기 확인</span><strong style="font-size:18px">'+Object.values(readSchedules()).filter(s=>QM_CADENCES[s.frequency]).length+'개 설정</strong><small>주기 설정 탭에서 변경</small></div></div><nav class="qm-tabs" aria-label="품질관리 업무 분류"></nav><section id="qmCatalog" class="qm-cards"></section><section class="qm-section"><div class="qm-section-head"><h2>임시저장한 일지</h2><span>공정점검일지 · 최근 날짜순</span></div><div id="qmDrafts"></div></section><p class="qm-footnote">현재 기록은 이 브라우저에 저장됩니다. 서버 동기화와 작성주기별 누락 확인은 아직 연결 전입니다.</p>';
 const tabs=home.querySelector('.qm-tabs');['공정파트','실험파트','기타 품질관리','주기 설정'].forEach(name=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.className=category===name?'active':'';b.setAttribute('aria-pressed',String(category===name));b.onclick=()=>{category=name;renderHome()};tabs.append(b)});
 const catalog=$('qmCatalog');if(category==='주기 설정'){renderScheduleSettings(catalog,date,renderHome)}else if(category==='공정파트'){[['공정점검일지','공정별 작업환경·온도·포장 상태를 오전·오후에 점검하고, 이탈사항과 조치내용을 기록하는 일지',true],['작업장위생점검일지','작업장 위생 점검 일지',false],['중량점검일지','제품 중량 점검 일지',false]].forEach(([name,description,ready])=>{const button=document.createElement('button');button.type='button';button.className='qm-log';button.disabled=!ready;button.innerHTML='<span class="qm-badge '+(ready?'':'pending')+'">'+(ready?'작성 가능':'준비 중')+'</span><strong>'+name+'</strong><p>'+description+'</p><div class="qm-card-foot"><span>'+esc(cadenceLabel(name))+'</span><span>'+(ready?'일지 열기 →':'추후 추가')+'</span></div>';if(ready)button.onclick=()=>navigate('process');catalog.append(button)})}else{catalog.innerHTML='<div class="qm-empty" style="grid-column:1/-1">'+esc(category)+' 일지는 양식을 정한 뒤 추가합니다.</div>'}
 const drafts=$('qmDrafts');if(!all.length)drafts.innerHTML='<div class="qm-empty">아직 임시저장한 일지가 없습니다.<br>공정점검일지에서 작성 후 임시저장하면 여기에 표시됩니다.</div>';all.forEach(record=>{const b=document.createElement('button');b.type='button';b.className='qm-draft';b.innerHTML='<div><strong>'+esc(record.product||'제품 미입력')+'</strong><small>'+esc(displayQcDate(record.date))+' · '+esc(record.floor||'')+' · '+esc(record.inspector||'점검자 미입력')+'</small></div><span class="qm-badge pending">이어 작성 →</span>';b.onclick=()=>loadDraft(record);drafts.append(b)});
 enhanceArchive();
 }
 function enhanceArchive(){
 const all=records(),saved=all.filter(r=>r.state==='saved'),drafts=all.filter(r=>r.state!=='saved');
 const stats=home.querySelectorAll('.qm-stat');stats[0].innerHTML='<span>오늘 저장</span><strong>'+saved.filter(r=>r.date===today()).length+'건</strong>';stats[1].innerHTML='<span>저장된 일지 / 임시저장</span><strong>'+saved.length+' / '+drafts.length+'건</strong>';
 const section=$('qmDrafts').closest('section');section.innerHTML='<div class="qm-section-head"><h2>저장한 일지</h2><button type="button" id="qmSyncAll">동기화 · 대기 '+qmPendingCount()+'건</button></div><p id="qmTransferStatus" role="status"></p><div id="qmFinalList"></div><h2>임시저장한 일지</h2><div id="qmDraftList"></div>';
 async function sync(id){const message=await qmSync(id);$('qmTransferStatus').textContent=message}
 $('qmSyncAll').onclick=()=>sync();
 function rows(list,target){
 if(!list.length){target.innerHTML='<p class="qm-empty">저장된 일지가 없습니다.</p>';return}
 list.forEach(record=>{
 const card=document.createElement('article');card.className='qm-archive';
 card.innerHTML='<strong>'+esc(record.product)+'</strong><p>'+esc(displayQcDate(record.date))+' · '+esc(record.inspector||'점검자 미입력')+' · '+(record.state==='saved'?(record.syncState==='synced'?'동기화 완료':'동기화 대기'):'임시저장')+'</p>';
 const actions=document.createElement('div');actions.className='qm-archive-actions';
 function button(text,handler){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=handler;actions.append(b);return b}
 button('열기',()=>{loadDraft(record);$('status').textContent='저장된 일지를 불러왔습니다.'});
 if(record.state==='saved'){
 const select=document.createElement('select');select.setAttribute('aria-label','출력할 양식');window.QC_SHEETS.forEach((s,i)=>{const option=document.createElement('option');option.value=i;option.textContent=s.floor+' '+s.stage;option.selected=s.floor===record.floor&&s.stage===(record.stage||'가공');select.append(option)});actions.append(select);
 button('PDF 출력',()=>qmPrintRecord(record,window.QC_SHEETS[Number(select.value)]));
 button('동기화',()=>sync(record.id));
 }
 button('삭제',async()=>{try{if(await qmDeleteRecord(record.id))$('qmTransferStatus').textContent='삭제했습니다. 서버 연결 후 삭제 요청도 동기화됩니다.'}catch(error){$('qmTransferStatus').textContent='삭제하지 못했습니다: '+error.message}});
 card.append(actions);target.append(card);
 });
 }
 rows(saved,$('qmFinalList'));rows(drafts,$('qmDraftList'));
 home.querySelector('.qm-footnote').textContent='점검일 기준 오늘 포함 14일간 기기에 보관합니다. 이전 일지는 자동삭제되므로 PDF를 미리 보관해주세요. 삭제한 일지의 재등장을 막는 최소 삭제표시는 유지합니다. 서버는 아직 연결 전입니다.';
 }
 window.addEventListener('qm-records-changed',()=>{if(!home.hidden)renderHome()});
 $('qmBack').onclick=()=>navigate('home');window.addEventListener('hashchange',()=>setView(location.hash==='#process'?'process':'home'));setView(location.hash==='#process'?'process':'home');
}
window.qmReady.then(()=>{setupOfflineJournal();setupQualityHome()}).catch(error=>{$('save').disabled=true;$('status').textContent='기기 저장소를 열지 못했습니다. 기존 자료는 삭제하지 않았습니다. '+error.message});
