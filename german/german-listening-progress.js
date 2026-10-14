(()=>{'use strict';
const snapshots=new WeakMap();
document.addEventListener('submit',event=>{const form=event.target;if(!form.closest('#dialogueContent'))return;queueMicrotask(async()=>{
 if(!form.checkValidity())return;const feedback=document.getElementById('dialogueFeedback');if(!feedback)return;
 const fields=[...form.querySelectorAll('fieldset')],lines=[...feedback.querySelectorAll('p')].filter(p=>/^[✓↻]/.test(p.textContent.trim()));if(lines.length!==fields.length||!fields.length)return;
 const answers=fields.map(f=>{const input=f.querySelector('input:checked');return input?.closest('label')?.textContent.trim()||'';});const signature=JSON.stringify(answers);if(snapshots.get(form)===signature)return;snapshots.set(form,signature);
 const title=document.getElementById('dialogueTitle')?.textContent.trim()||'Listening dialogue',match=location.pathname.match(/-([23])\.html$/),level=Number(match?.[1]||1),module='de_en_listening_'+level;
 const capture=fields.map((f,i)=>({ok:lines[i].textContent.trim().startsWith('✓'),prompt:f.querySelector('legend')?.textContent||'',own:answers[i],explanation:lines[i].textContent.replace(/^[✓↻]\s*/,''),right:lines[i].textContent.match(/Correct answer:\s*(.*)$/)?.[1]||answers[i]}));
 const account=window.FRLearning?.account;await window.FRLearning?.ready;if(!window.FRLearning||FRLearning.account!==account)return;
 const assisted=!!document.querySelector('#dialogueContent details[open]');
 capture.forEach((q,i)=>FRLearning.record(module,title+'|'+i,q.ok,false,q.prompt,{...q,topic:'Listening · '+title,file:location.pathname.split('/').pop(),type:'listening',quality:assisted?'assisted':'normal'}));FRLearning.finish(module,Math.round(capture.filter(q=>q.ok).length/capture.length*100));
 });},false);
function note(){document.querySelectorAll('p.note,.note').forEach(p=>{if(/(?:comprehension|understanding|quiz).*(?:not|aren.t).*(?:progress|saved|stored)/i.test(p.textContent))p.textContent='Your comprehension answers count towards learning progress. Signed-in progress is synced with your account; guest progress stays on this device.';});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',note,{once:true});else note();
})();
