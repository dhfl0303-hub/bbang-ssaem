// 입력: YYMMDD 또는 YYMMDDHHmm. 저장: 기존 ISO 형식을 유지한다.
function parseQcDate(value,withTime=false){
 const raw=String(value||'').trim();if(!raw)return {valid:true,iso:'',display:'',digits:''};
 let digits;if(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(raw))digits=raw.slice(2).replace(/\D/g,'');
 else if(/^\d{4}년/.test(raw))digits=raw.replace(/\D/g,'').slice(2);
 else digits=raw;
 const length=withTime?10:6;if(!new RegExp('^\\d{'+length+'}$').test(digits))return {valid:false,digits};
 const y=2000+Number(digits.slice(0,2)),m=Number(digits.slice(2,4)),d=Number(digits.slice(4,6)),h=withTime?Number(digits.slice(6,8)):0,min=withTime?Number(digits.slice(8,10)):0;
 const date=new Date(Date.UTC(y,m-1,d));if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d||h>23||min>59)return {valid:false,digits};
 const day=y+'-'+digits.slice(2,4)+'-'+digits.slice(4,6),time=digits.slice(6,8)+':'+digits.slice(8,10);
 return {valid:true,digits,iso:day+(withTime?'T'+time:''),display:y+'년 '+digits.slice(2,4)+'월 '+digits.slice(4,6)+'일'+(withTime?' '+time:'')};
}
function displayQcDate(v,withTime=false){const p=parseQcDate(v,withTime);return p.valid?p.display:String(v||'')}
function qcDateInput(value,withTime,change){
 const input=document.createElement('input');input.type='text';input.inputMode='numeric';input.autocomplete='off';input.dataset.qcDate=withTime?'10':'6';
 input.placeholder='';input.title=withTime?'연월일시분 10자리 (예: 2609230900)':'연월일 6자리 (예: 260923)';input.value=displayQcDate(value,withTime);
 function check(commit){const p=parseQcDate(input.value,withTime);input.setCustomValidity(p.valid?'':withTime?'올바른 날짜와 시간을 10자리로 입력해주세요. 예: 2609230900':'올바른 날짜를 6자리로 입력해주세요. 예: 260923');input.setAttribute('aria-invalid',String(!p.valid));input.style.borderColor=p.valid?'':'#c63b45';if(commit)change(p.valid?p.iso:input.value);return p}
 input.addEventListener('focus',()=>{const p=parseQcDate(input.value,withTime);if(p.valid)input.value=p.digits;input.select()});
 input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,withTime?10:6);const p=check(true);if(p.valid&&p.iso)input.value=p.display});
 input.addEventListener('blur',()=>{const p=check(true);if(p.valid)input.value=p.display;else input.reportValidity()});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const p=check(true);if(p.valid)input.blur();else input.reportValidity()}});check(false);return input;
}
function parseQcTime(value){const raw=String(value||'').trim();if(!raw)return {valid:true,digits:'',display:''};const digits=raw.replace(':','');if(!/^\d{4}$/.test(digits)||Number(digits.slice(0,2))>23||Number(digits.slice(2))>59)return {valid:false,digits};return {valid:true,digits,display:digits.slice(0,2)+':'+digits.slice(2)}}
function qcTimeInput(value,change){
 const input=document.createElement('input');input.type='text';input.inputMode='numeric';input.autocomplete='off';input.placeholder='';input.dataset.qcDate='time';input.title='시간 4자리 입력 (예: 0900 → 09:00)';const initial=parseQcTime(value);input.value=initial.valid?initial.display:String(value||'');
 function check(commit){const p=parseQcTime(input.value);input.setCustomValidity(p.valid?'':'시간을 4자리로 입력해주세요. 0000~2359 범위이며 분은 00~59입니다.');input.setAttribute('aria-invalid',String(!p.valid));input.style.borderColor=p.valid?'':'#c63b45';if(commit)change(p.valid?p.display:input.value);return p}
 input.addEventListener('focus',()=>{const p=parseQcTime(input.value);if(p.valid)input.value=p.digits;input.select()});
 input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,4);const p=check(true);if(p.valid)input.value=p.display});
 input.addEventListener('blur',()=>{const p=check(true);if(p.valid)input.value=p.display;else input.reportValidity()});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(check(true).valid)input.blur();else input.reportValidity()}});check(false);return input;
}
function packagingTime24(digits,meridiem){const p=parseQcTime(digits);if(!p.valid||!p.display)return p;const hour=Number(p.digits.slice(0,2));if(hour>12)return {valid:false};return {valid:true,display:String(hour%12+(meridiem==='오후'?12:0)).padStart(2,'0')+':'+p.digits.slice(2)}}
function displayPackagingTime(value){const p=parseQcTime(value);if(!p.valid||!p.display)return value||'';const hour=Number(p.digits.slice(0,2));return (hour>=12?'오후':'오전')+' '+String(hour%12||12).padStart(2,'0')+':'+p.digits.slice(2)}
function qcPackagingTimeInput(value,change){
 const wrap=document.createElement('div');wrap.className='row';wrap.style.flexWrap='nowrap';const select=document.createElement('select');select.setAttribute('aria-label','포장시간 오전 또는 오후');['오전','오후'].forEach(text=>{const o=document.createElement('option');o.value=text;o.textContent=text;select.append(o)});
 const parsed=parseQcTime(value);select.value=parsed.valid&&parsed.display&&Number(parsed.digits.slice(0,2))>=12?'오후':'오전';let initial=parsed.valid&&parsed.display?String(Number(parsed.digits.slice(0,2))%12||12).padStart(2,'0')+':'+parsed.digits.slice(2):value||'';
 function commit(v){const p=packagingTime24(v,select.value);input.setCustomValidity(p.valid?'':'시간은 00~12시, 분은 00~59로 입력하고 오전·오후를 선택해주세요.');input.setAttribute('aria-invalid',String(!p.valid));input.style.borderColor=p.valid?'':'#c63b45';change(p.valid?p.display:v)}
 const input=qcTimeInput(initial,commit);input.placeholder='';input.title='4자리 시간 입력 후 오전·오후 선택';input.style.minWidth='0';input.style.width='100%';input.setAttribute('aria-label','포장시간 숫자 4자리');select.onchange=()=>commit(input.value);wrap.append(select,input);return wrap;
}
function parseQcTemperature(value){const raw=String(value??'').trim();if(!raw)return {valid:true,value:''};if(!/^-?\d+(?:\.\d{0,1})?$/.test(raw))return {valid:false};const n=Number(raw)/(raw.includes('.')?1:10);return Number.isFinite(n)?{valid:true,value:n.toFixed(1)}:{valid:false}}
function displayQcTemperature(value){if(value===''||value==null)return '';const n=Number(value);return Number.isFinite(n)?n.toFixed(1):String(value)}
function qcTemperatureInput(value,change){
 const input=document.createElement('input');input.type='text';input.inputMode='decimal';input.autocomplete='off';input.dataset.qcDate='temperature';input.value=displayQcTemperature(value);input.placeholder='';input.title='마지막 숫자가 소수 첫째 자리입니다. 예: 250 → 25.0, -180 → -18.0';
 function commit(){const p=parseQcTemperature(input.value);input.setCustomValidity(p.valid?'':'숫자를 입력해주세요. 영하는 앞에 -를 붙이세요.');input.setAttribute('aria-invalid',String(!p.valid));input.style.borderColor=p.valid?'':'#c63b45';change(p.valid?p.value:input.value);return p}
 input.addEventListener('focus',()=>{const n=Number(input.value);if(input.value!==''&&Number.isFinite(n))input.value=String(Math.round(n*10));input.select()});
 input.addEventListener('input',()=>{input.value=input.value.replace(/[^0-9.\-]/g,'');commit()});
 input.addEventListener('blur',()=>{const p=commit();if(p.valid)input.value=p.value;else input.reportValidity()});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(commit().valid)input.blur();else input.reportValidity()}});return input;
}
function setupQcDates(){
 const original=$('date');const edit=qcDateInput(original.value,false,v=>{if(/^\d{4}-\d{2}-\d{2}$/.test(v)||!v){if(original.value!==v){original.value=v;original.dispatchEvent(new Event('change'))}}});edit.id='dateTyping';edit.required=true;original.type='hidden';original.after(edit);
 const oldRender=render;render=function(){if(document.activeElement!==edit)edit.value=displayQcDate(original.value);oldRender()};
 ['save','pdf'].forEach(id=>{const button=$(id),handler=button.onclick;button.onclick=function(e){for(const field of document.querySelectorAll('[data-qc-date]')){if(!field.reportValidity())return}return handler.call(this,e)}});
}
