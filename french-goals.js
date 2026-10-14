(()=>{'use strict';if(window.__frGoalsStarted)return;window.__frGoalsStarted=true;
const $=id=>document.getElementById(id);let core,seconds=0,lastInput=Date.now(),lastTick=Date.now(),actor=null;
function goal(){const g=core?.setting('daily-goal',{mode:'answers',target:20});return g&&['answers','minutes'].includes(g.mode)?{mode:g.mode,target:Math.max(1,Math.min(g.mode==='minutes'?120:200,Number(g.target)||20))}:{mode:'answers',target:20};}
function paint(){if(!core)return;const g=goal(),s=core.summary(),value=g.mode==='minutes'?Math.floor(core.todaySeconds()/60):s.day.answered,unit=g.mode==='minutes'?' Min.':' Aufgaben';const text=Math.min(value,g.target)+' / '+g.target+unit;
 if($('dGoal'))$('dGoal').textContent=text;if($('dGoalFill'))$('dGoalFill').style.width=Math.min(100,value/g.target*100)+'%';if($('smartGoal'))$('smartGoal').textContent='Tagesziel '+text;
 const form=$('frGoalForm');if(form&&document.activeElement?.closest('#frGoalForm')!==form){$('frGoalMode').value=g.mode;$('frGoalTarget').value=g.target;}
 if($('frGoalProgress'))$('frGoalProgress').textContent='Heute: '+value+unit+' · '+(core.account==='guest'?'auf diesem Gerät':'mit deinem Konto gespeichert');
}
function flush(){if(!core||!seconds)return;const saved=Math.floor(seconds);if(saved>0){seconds-=saved;core.activeSeconds(saved);}}
function tick(){const now=Date.now(),elapsed=Math.min(5,(now-lastTick)/1000);lastTick=now;
 // Only a visible, focused learning page with interaction in the last minute counts.
 if(core&&document.visibilityState==='visible'&&document.hasFocus()&&now-lastInput<60000&&(/franzoesisch-/.test(location.pathname)||location.hash==='#theorie'))seconds+=elapsed;
 if(seconds>=30)flush();}
async function boot(){await window.FRLearning?.ready;core=window.FRLearning;if(!core)return;actor=core.account;
 const host=$('Heute');if(host){const box=document.createElement('section');box.className='fr-goals';box.innerHTML='<h3>Dein persönliches Tagesziel</h3><form id="frGoalForm"><label>Zielart <select id="frGoalMode"><option value="answers">Aufgaben</option><option value="minutes">Aktive Lernminuten</option></select></label><label>Mein Ziel <input id="frGoalTarget" type="number" min="1" max="200" required></label><button type="submit">Ziel speichern</button></form><p id="frGoalProgress" role="status"></p><p class="fr-upgrade-note">Lernzeit zählt auf geöffneten Übungs- und Theorieseiten bei aktiver Nutzung. Pausen und andere Tabs zählen nicht weiter. Die Tagesserie zählt Tage mit beantworteten Aufgaben.</p>';host.append(box);$('frGoalForm').onsubmit=e=>{e.preventDefault();const mode=$('frGoalMode').value,target=Number($('frGoalTarget').value),max=mode==='minutes'?120:200;if(!Number.isInteger(target)||target<1||target>max){$('frGoalProgress').textContent='Wähle ein Ziel zwischen 1 und '+max+'.';return;}core.setSetting('daily-goal',{mode,target});paint();};}
 paint();window.addEventListener('frlearningchange',()=>{if(actor!==core.account){seconds=0;actor=core.account;lastTick=Date.now();lastInput=Date.now();}paint();});setInterval(tick,1000);
}
for(const type of ['pointerdown','keydown','input','scroll','play'])document.addEventListener(type,()=>{lastInput=Date.now()},{passive:true,capture:true});
document.addEventListener('visibilitychange',()=>{flush();lastTick=Date.now();});window.addEventListener('pagehide',flush);boot();
})();
