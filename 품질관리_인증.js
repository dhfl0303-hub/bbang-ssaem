// 임시 기기 로그인. Firebase 서버 인증이 아니다.
const QC_LOCAL_KEY='qc-local-login-0018-v1';
const QC_LOCAL_DEFAULT={salt:'qc-local-0018-v1',hash:'edccc8a5645b629825aedcf9540fb285280f1d9cba268ab483546c7d8d93827a'};
async function qcPasswordHash(password,salt){
 const enc=new TextEncoder(),key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:120000,hash:'SHA-256'},key,256);
 return Array.from(new Uint8Array(bits),x=>x.toString(16).padStart(2,'0')).join('');
}
function qcLocalCredential(){const saved=localStorage.getItem(QC_LOCAL_KEY);if(!saved)return QC_LOCAL_DEFAULT;const parsed=JSON.parse(saved);if(!parsed.salt||!parsed.hash)throw new Error('로그인 정보 오류');return parsed}
async function qcVerifyPassword(password){const saved=qcLocalCredential();return await qcPasswordHash(password,saved.salt)===saved.hash}
async function qcUpdatePassword(current,next,confirmation){
 if(!await qcVerifyPassword(current))throw new Error('현재 비밀번호가 맞지 않습니다.');
 if(next.length<6)throw new Error('새 비밀번호는 6자리 이상 입력해주세요.');
 if(next!==confirmation)throw new Error('새 비밀번호가 서로 다릅니다.');
 if(next===current)throw new Error('현재 비밀번호와 다른 값을 입력해주세요.');
 const salt=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
 const hash=await qcPasswordHash(next,salt);localStorage.setItem(QC_LOCAL_KEY,JSON.stringify({salt,hash}));
}
window.qcAuthReady=new Promise(resolve=>{
 const panel=document.createElement('section');panel.id='qcLogin';panel.innerHTML='<form id="qcLoginForm"><h1>빵쌤에프앤비 품질관리팀</h1><h2>로그인</h2><label>사원번호<input id="qcEmployee" autocomplete="username" inputmode="numeric" required></label><label>비밀번호<input id="qcPassword" type="password" autocomplete="current-password" required></label><button type="submit">로그인</button><p id="qcAuthStatus" role="status"></p><small>임시 기기 로그인 · 서버 인증은 연결 전입니다.</small></form>';document.body.append(panel);
 const message=document.getElementById('qcAuthStatus');
 document.getElementById('qcLoginForm').onsubmit=async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button'),password=document.getElementById('qcPassword');button.disabled=true;message.textContent='';try{
 if(document.getElementById('qcEmployee').value.trim()!=='0018'||!await qcVerifyPassword(password.value)){message.textContent='사원번호 또는 비밀번호를 확인해주세요.';return}
 panel.remove();document.documentElement.classList.add('qc-authenticated');setupQcAccountMenu();resolve({employee:'0018',mode:'local'});
 }catch{message.textContent='로그인 정보를 확인하지 못했습니다. 브라우저 저장 권한과 HTTPS 주소를 확인해주세요.'}finally{password.value='';button.disabled=false}};
});
function setupQcAccountMenu(){
 const bar=document.createElement('div');bar.id='qcAccountMenu';bar.innerHTML='<span>0018 · 임시 로그인</span><button id="qcChangePassword" type="button">비밀번호 변경</button><button id="qcLogout" type="button">로그아웃</button>';document.body.prepend(bar);
 document.getElementById('qcLogout').onclick=()=>{if(confirm('로그아웃할까요? 저장하지 않은 입력은 사라지고 저장한 일지는 유지됩니다.'))location.reload()};
 document.getElementById('qcChangePassword').onclick=()=>{
 const dialog=document.createElement('dialog');dialog.id='qcPasswordDialog';dialog.innerHTML='<form><h2>비밀번호 변경</h2><label>현재 비밀번호<input name="current" type="password" autocomplete="current-password" required></label><label>새 비밀번호<input name="next" type="password" autocomplete="new-password" minlength="6" required></label><label>새 비밀번호 확인<input name="confirm" type="password" autocomplete="new-password" minlength="6" required></label><p>변경은 이 브라우저에만 적용됩니다. 다른 기기에는 적용되지 않으며 브라우저 데이터를 지우면 초기화됩니다.</p><p role="status"></p><button type="submit">변경</button><button type="button" id="qcClosePassword">닫기</button></form>';document.body.append(dialog);dialog.showModal();const form=dialog.querySelector('form'),status=dialog.querySelector('[role="status"]');dialog.addEventListener('close',()=>dialog.remove());dialog.querySelector('#qcClosePassword').onclick=()=>dialog.close();form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('[type="submit"]');button.disabled=true;try{await qcUpdatePassword(form.elements.current.value,form.elements.next.value,form.elements.confirm.value);status.textContent='비밀번호를 변경했습니다. 다음 로그인부터 적용됩니다.'}catch(error){status.textContent=error.message||'변경하지 못했습니다.'}finally{form.reset();button.disabled=false}};
 };
}
