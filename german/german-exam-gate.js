(() => {
'use strict';
const file=decodeURIComponent(location.pathname.split('/').pop());
const unit=/^deutsch-en-15-minuten-lerneinheit(?:-aktiv)?\.html$/.test(file);
const title=document.getElementById('title'),message=document.getElementById('message'),start=document.getElementById('start');let loading=false;
async function load(){if(loading)return;loading=true;start.disabled=true;try{
const result=await FRPremium.call('premium-access',{action:'lesson',file});if(typeof result.html!=='string')throw new Error('The lesson could not be loaded.');
const lesson=new DOMParser().parseFromString(result.html,'text/html');
for(const script of lesson.querySelectorAll('script[src]')){const name=new URL(script.getAttribute('src'),location.href).pathname.split('/').pop();if(name==='premium-gate.js')throw new Error('The stored file is an access page instead of the full lesson.');if(['learning-core.js','german-learning-core.js'].includes(name))script.remove();}
document.open();document.write('<!doctype html>\n'+lesson.documentElement.outerHTML);document.close();window.dispatchEvent(new Event('frpremiumlessonloaded'));
}catch(e){message.textContent=e.message;start.disabled=false;loading=false;}}
(async()=>{try{await FRLearning.ready;if(FRLearning.account==='guest'){title.textContent='Please sign in first';message.textContent='Sign in through My account and open this lesson again.';return;}const status=await FRPremium.status();
if(unit){title.textContent='Deine 15-Minuten-Lerneinheit';message.textContent=status.premium?'Premium: Du kannst deine Einheit starten.':`Noch ${status.remaining} von 2 kostenlosen Starts diese Woche. Jeder neue Start zählt.`;if(status.premium||status.remaining>0){start.hidden=false;start.onclick=load;}else message.textContent='Die zwei kostenlosen Starts dieser Woche sind aufgebraucht.';}
else if(!status.premium){title.textContent='This lesson requires Premium';message.textContent='You can open this lesson with an active Premium subscription.';}else await load();
}catch(e){title.textContent='Access could not be checked';message.textContent=e.message;}})();
})();
