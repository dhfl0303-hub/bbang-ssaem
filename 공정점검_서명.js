function approvalKey(sheet){return sheet.sheet+'|approvalSignature'}
function staffKey(sheet){return sheet.sheet+'|staffSignature'}
function staffModeKey(sheet){return sheet.sheet+'|staffSignatureMode'}
function validSignature(value){return typeof value==='string'&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value)}
function signaturePad(parent,key,title){
 const box=document.createElement('div');box.className='signature-entry';const head=document.createElement('div');head.className='process-head';const label=document.createElement('strong');label.textContent=title;const clear=document.createElement('button');clear.type='button';clear.textContent='다시 서명';head.append(label,clear);
 const canvas=document.createElement('canvas');canvas.width=900;canvas.height=240;canvas.className='signature-canvas';canvas.setAttribute('aria-label',title+' 입력 영역');const state=document.createElement('p');state.className='muted';box.append(head,canvas,state);parent.append(box);
 const ctx=canvas.getContext('2d');ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#111';let drawing=false,dirty=false,pointer=null;
 const stored=values[key];if(validSignature(stored)){const image=new Image();image.onload=()=>{if(!dirty)ctx.drawImage(image,0,0,canvas.width,canvas.height)};image.src=stored}
 state.textContent=validSignature(stored)?'서명 입력됨':'서명 전';
 function point(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}
 canvas.onpointerdown=e=>{if(drawing||e.button!==0&&e.pointerType==='mouse')return;e.preventDefault();dirty=true;drawing=true;pointer=e.pointerId;canvas.setPointerCapture(pointer);const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.1,p.y+.1);ctx.stroke()};
 canvas.onpointermove=e=>{if(!drawing||e.pointerId!==pointer)return;e.preventDefault();const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke()};
 function finish(e){if(!drawing||e.pointerId!==pointer)return;drawing=false;values[key]=canvas.toDataURL('image/png');state.textContent='서명 입력됨 · 임시저장하면 함께 저장됩니다.';if(canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);pointer=null}
 canvas.onpointerup=finish;canvas.onpointercancel=finish;
 clear.onclick=()=>{dirty=true;drawing=false;ctx.clearRect(0,0,canvas.width,canvas.height);values[key]='';state.textContent='서명 전'};
}
function renderApproval(){
 const sheet=QC_SHEETS.find(s=>s.floor===$('floor').value&&s.stage===stage);let card=$('approvalCard');if(!card){card=document.createElement('section');card.id='approvalCard';card.className='card';document.querySelector('footer').before(card)}
 card.innerHTML='<h2>결재 서명 · '+esc(sheet.floor+' '+sheet.stage)+'</h2>';const modeLabel=document.createElement('label');modeLabel.className='signature-mode';modeLabel.textContent='담당 칸';const select=document.createElement('select');select.setAttribute('aria-label','담당 칸 사선 또는 서명');[['slash','사선'],['sign','서명']].forEach(([v,t])=>{const option=document.createElement('option');option.value=v;option.textContent=t;select.append(option)});select.value=values[staffModeKey(sheet)]||'slash';select.onchange=()=>{values[staffModeKey(sheet)]=select.value;renderApproval()};modeLabel.append(select);card.append(modeLabel);
 if(select.value==='sign')signaturePad(card,staffKey(sheet),'담당 서명');
 signaturePad(card,approvalKey(sheet),'승인 서명');
}
function setupApproval(){const before=render;render=function(){before();renderApproval()};renderApproval()}
function signatureImage(value,title){return validSignature(value)?'<img alt="'+title+'" src="'+value+'">':''}
function signatureInkBounds(pixels,width,height){
 let left=width,top=height,right=-1,bottom=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;if(pixels[i+3]>16&&Math.min(pixels[i],pixels[i+1],pixels[i+2])<240){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}}
 if(right<left)return null;const pad=Math.max(3,Math.ceil(Math.max(right-left+1,bottom-top+1)*.03));left=Math.max(0,left-pad);top=Math.max(0,top-pad);right=Math.min(width-1,right+pad);bottom=Math.min(height-1,bottom+pad);return {x:left,y:top,width:right-left+1,height:bottom-top+1};
}
async function preparePrintedSignatures(){
 await Promise.all(Array.from(document.querySelectorAll('.approval-sign img')).map(async image=>{await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const bounds=signatureInkBounds(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);if(!bounds)return;const cropped=document.createElement('canvas');cropped.width=bounds.width;cropped.height=bounds.height;cropped.getContext('2d').drawImage(canvas,bounds.x,bounds.y,bounds.width,bounds.height,0,0,bounds.width,bounds.height);image.src=cropped.toDataURL('image/png');await image.decode()}));
}
function approvalHeader(sheet){const signature=values[approvalKey(sheet)],staffSigning=values[staffModeKey(sheet)]==='sign';return '<tr><td colspan="12" class="document-header"><div class="header-layout"><div class="heading-left"><h1>'+esc(sheet.title)+'</h1><div class="header-meta"><span>점검일 : '+esc(displayQcDate($('date').value))+'</span><span>제품 : '+esc(getJournalProduct())+'</span><span>점검자 : '+esc($('inspector').value)+'</span></div></div><div class="approval-grid"><div class="approval-label">결<br><br>재</div><div>담당</div><div>승인</div><div class="'+(staffSigning?'approval-sign':'approval-slash')+'">'+(staffSigning?signatureImage(values[staffKey(sheet)],'담당 서명'):'')+'</div><div class="approval-sign">'+signatureImage(signature,'승인 서명')+'</div></div></div></td></tr>'}
