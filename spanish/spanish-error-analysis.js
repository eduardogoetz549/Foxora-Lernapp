(()=>{'use strict';const $=id=>document.getElementById(id);let catalog=[],premium=false,ready=false;
const fallback='spanisch-ser-estar-1-oberstufe.html';
function make(tag,text){const el=document.createElement(tag);if(text)el.textContent=text;return el}
function link(text,href,secondary=false){const a=make('a',text);a.href=href;a.className='fa-clean-btn'+(secondary?' secondary':'');return a}
function events(){try{const list=JSON.parse(localStorage.getItem('es_learning_events_v1:'+FRLearning.account)||'[]');return Array.isArray(list)?list.filter(e=>String(e.module||'').startsWith('es_')):[]}catch{return []}}
function data(){const summary=FRLearning.summary(),list=events(),latest=new Map();for(const e of [...list].sort((a,b)=>String(a.at).localeCompare(String(b.at))))if(e.kind==='answer')latest.set(e.module+':'+e.question,e);
 const topics=Object.entries(summary.modules||{}).filter(([id,m])=>id.startsWith('es_')&&m.answered>=5).map(([id,m])=>{const meta=catalog.find(x=>x.module===id);const event=list.find(e=>e.module===id&&e.details?.file);const file=meta?.file||event?.details?.file;const unresolved=[...latest.values()].filter(e=>e.module===id&&!e.ok);return {id,m,file,title:meta?.title||id.replace(/^es_spanisch_/,'').replace(/_[123]_oberstufe.*$/,'').replace(/_/g,' '),level:meta?.level||Number(file?.match(/-([123])-oberstufe/)?.[1]||1),wrong:unresolved.length,accuracy:Math.round(m.correct/Math.max(1,m.answered)*100)}}).filter(t=>t.file&&/^spanisch-[a-z0-9-]+\.html$/.test(t.file)).sort((a,b)=>b.wrong-a.wrong||a.accuracy-b.accuracy);
 return {summary,topics,errors:[...latest.values()].filter(e=>!e.ok&&e.details?.right)};
}
function paint(){if(!ready)return;const {summary,topics,errors}=data();$('analysisBasic').replaceChildren();$('analysisErrorList').replaceChildren();$('analysisDetail').replaceChildren();const weak=topics.find(t=>t.wrong>0);
 const box=make('div');box.className='fa-clean-overview';const actions=make('div');actions.className='fa-clean-actions';
 if(!summary.total){box.append(make('h3','Beginne mit einer Übungsrunde'),make('p','Danach zeigen wir dir, was du wiederholen kannst.'));actions.append(link('Übung starten',fallback));}
 else if(!weak){box.append(make('h3',topics.length?'Aktuell sind keine offenen Fehler erkennbar':'Noch etwas mehr üben'),make('p',topics.length?'Bearbeite ein weiteres Thema oder wiederhole bereits bekannte Aufgaben.':'Für eine sinnvolle Empfehlung brauchen wir mindestens fünf Antworten in einem Thema.'));actions.append(link('Weiterüben',topics[0]?.file||fallback));}
 else{box.append(make('h3','Dein nächster Schwerpunkt: '+weak.title),make('p',weak.wrong+' zuletzt falsch beantwortete Aufgaben · Niveau '+weak.level));actions.append(link('Empfohlene Übung starten',weak.file+'?smart=1'));}
 box.append(actions);$('analysisBasic').append(box);
 $('analysisAccount').textContent=FRLearning.account==='guest'?'Als Gast lernst du auf diesem Gerät. Mit einem Konto wird dein Fortschritt synchronisiert.':'';
 $('analysisErrorCount').textContent=errors.length?errors.length+' offene Fehler':'Keine offenen Fehler';
 if(!errors.length)$('analysisErrorList').append(make('p','Hier erscheinen Beispiele, sobald du Aufgaben falsch beantwortet hast.'));
 else if(!premium){$('analysisErrorList').append(make('p','Die Empfehlung oben ist kostenlos. Eigene Antworten, Lösungen und Erklärungen sind mit Premium verfügbar.'),link('Premium ansehen','#Premium',true));}
 else for(const e of errors.slice(0,10)){const card=make('article');card.className='fa-clean-error';card.append(make('p',e.details.prompt||e.text),make('p','Deine Antwort: '+(e.details.own||'Keine Antwort')),make('strong','Richtige Lösung: '+e.details.right),make('p',e.details.explanation||'Sieh dir die passende Theorie an.'));$('analysisErrorList').append(card)}
 $('analysisRefresh').disabled=!premium;$('analysisRefresh').hidden=!premium;$('analysisPremiumLink').hidden=premium;
 $('analysisStatus').textContent=premium?'Erstelle einen kurzen Plan aus deinem aktuellen Wiederholungsbedarf.':'Der persönliche Lernplan gehört zu Premium.';
}
$('analysisRefresh').onclick=()=>{const {topics}=data();const selected=topics.filter(t=>t.wrong>0).slice(0,3);$('analysisDetail').replaceChildren();if(!premium)return;if(!selected.length){$('analysisDetail').append(make('p','Kein offener Fehlerschwerpunkt. Starte ein neues Thema oder wiederhole bekannte Inhalte.'));return}
 selected.forEach((t,i)=>{const row=make('div');row.className='fa-clean-plan-step';row.append(make('h4','Schritt '+(i+1)+' · '+t.title),make('p','Eine Runde mit 10 Aufgaben. Wiederhole danach bei Bedarf nur die Fehler.'),link('Runde starten',t.file+'?smart=1'));$('analysisDetail').append(row)});$('analysisStatus').textContent='Dein Plan wurde aus den zuletzt falsch beantworteten Aufgaben erstellt.';
};
async function refreshPremium(){premium=false;try{if(FRLearning.account!=='guest')premium=!!(await FRPremium.status()).premium}catch{}paint()}
(async()=>{try{const r=await fetch('spanish-course-map.json?v=1');if(r.ok)catalog=await r.json()}catch{}await FRLearning.ready;ready=true;await refreshPremium();window.addEventListener('frlearningchange',()=>{paint()});let actor=FRLearning.account;window.addEventListener('frlearningchange',()=>{if(actor!==FRLearning.account){actor=FRLearning.account;void refreshPremium()}});})();
})();
