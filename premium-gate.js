(() => {
'use strict';
const file=decodeURIComponent(location.pathname.split('/').pop());
const unit=/^franzoesisch-15-minuten-lerneinheit(?:-aktiv)?\.html$/.test(file);
const title=document.getElementById('title'),message=document.getElementById('message'),start=document.getElementById('start');let loading=false;
async function load(){if(loading)return;loading=true;start.disabled=true;try{
const result=await FRPremium.call('premium-access',{action:'lesson',file});if(typeof result.html!=='string')throw new Error('Die Übung konnte nicht geladen werden.');
const lesson=new DOMParser().parseFromString(result.html,'text/html');
const shared=[['link','french-shared.css','href'],['script','french-answer-check.js','src'],['script','french-planner.js','src'],['script','french-navigation.js','src'],['script','french-goals.js','src'],['script','french-listening-progress.js','src']];
for(const [tag,file,attr]of shared){if([...lesson.querySelectorAll(tag+'['+attr+']')].some(el=>el.getAttribute(attr).split('?')[0]===file))continue;const el=lesson.createElement(tag);el.setAttribute(attr,file+'?v=20261014');if(tag==='link')el.rel='stylesheet';else if(!/answer-check|planner/.test(file))el.defer=true;lesson.head.append(el);}

for(const script of lesson.querySelectorAll('script[src]')){const name=new URL(script.getAttribute('src'),location.href).pathname.split('/').pop();if(name==='premium-gate.js')throw new Error('In Supabase liegt eine Zugangsseite statt der vollständigen Übung.');if(['learning-core.js','spanish-learning-core.js'].includes(name))script.remove();}
document.open();document.write('<!doctype html>\n'+lesson.documentElement.outerHTML);document.close();window.dispatchEvent(new Event('frpremiumlessonloaded'));
}catch(e){message.textContent=e.message;start.disabled=false;loading=false;}}
(async()=>{try{await FRLearning.ready;if(FRLearning.account==='guest'){title.textContent='Bitte zuerst anmelden';message.textContent='Melde dich über Mein Konto an und öffne diese Übung danach erneut.';return;}const status=await FRPremium.status();
if(unit){title.textContent='Deine 15-Minuten-Lerneinheit';message.textContent=status.premium?'Premium: Du kannst deine Einheit starten.':`Noch ${status.remaining} von 2 kostenlosen Starts diese Woche. Jeder neue Start zählt.`;if(status.premium||status.remaining>0){start.hidden=false;start.onclick=load;}else message.textContent='Die zwei kostenlosen Starts dieser Woche sind aufgebraucht.';}
else if(!status.premium){title.textContent='Diese Übung gehört zu Premium';message.textContent='Mit aktivem Premium-Abo kannst du diese Übung öffnen.';}else await load();
}catch(e){title.textContent='Zugang konnte nicht geprüft werden';message.textContent=e.message;}})();
})();
