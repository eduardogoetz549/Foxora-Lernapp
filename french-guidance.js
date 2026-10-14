(() => {
 'use strict';
 function derive(summary,skip=false){
  const completed=Object.entries(summary.modules||{}).filter(([id,m])=>id.startsWith('fr_franzoesisch_') && Number(m.completed)>0 && !/guidance|pruefung|prüfung|exam|15_minuten/.test(id));
  const daily=completed.filter(([id])=>/alltag|daily|jetzt.?anwenden/.test(id));
  const grammar=completed.filter(([id])=>!daily.some(([other])=>other===id));
  const topics=new Set(grammar.map(([id])=>id.replace(/_[123]_(?:oberstufe|level).*$/,'').replace(/_[123]$/,'')));
  return {grammar:skip||grammar.length>=1,daily:skip||topics.size>=2,lab:skip||(topics.size>=2&&daily.length>=1),exam:skip||(topics.size>=4&&daily.length>=1),count:topics.size,dailyCount:daily.length,skip};
 }
 window.FRGuidance={derive};
 if(!document.getElementById('frGuide'))return;
 const $=id=>document.getElementById(id);
 let ready=false,state=derive({}),lastActor=null;
 const hidden=new Set();
 function hide(el,on){if(!el)return;el.classList.toggle('fr-guide-hidden',on);if(on)hidden.add(el);else hidden.delete(el);}
 function render(){
  const core=window.FRLearning;let mode=core?.guidanceMode?.();if(!mode){try{mode=localStorage.getItem('fr_guidance_mode:'+core?.account)||'guided'}catch{mode='guided'}}state=derive(core?.summary?.()||{},(mode==='all'||mode==='free'));
  const steps=[true,state.grammar,state.daily,state.lab,state.exam];
  document.querySelectorAll('[data-fr-step]').forEach(el=>{const n=Number(el.dataset.frStep);el.classList.toggle('done',steps[n]);el.setAttribute('aria-label', ['Erste Übung','Grammatik','Alltag','Wiederholen','Prüfung'][n]+(steps[n]?' · freigeschaltet':' · noch gesperrt'));el.textContent=['1 · Erste Übung','2 · Grammatik','3 · Alltag','4 · Wiederholen','5 · Prüfung'][n]+(steps[n]?' ✓':' 🔒');});
  $('frGuideToggle').textContent=state.skip?'Geführten Lernweg anzeigen':'Alle Bereiche anzeigen';
  const grammarFiles=["franzoesisch-verben-konjugation-1-oberstufe-mit-gemischten-schreibuebungen.html", "franzoesisch-artikel-nomen-1-oberstufe.html", "franzoesisch-adjektive-1-oberstufe.html", "franzoesisch-pronomen-1-oberstufe.html"];
  function nextGrammar(){const modules=core?.summary?.().modules||{};return grammarFiles.find(file=>{const key=file.replace(/\.html$/,'').replace(/-/g,'_');return !Object.entries(modules).some(([id,m])=>id.includes(key)&&Number(m.completed)>0);})||grammarFiles[0];}
  let title,text,href;
  if(!state.grammar){title='Dein erster Schritt';text='Starte mit Verben und Konjugation. Eine abgeschlossene Runde öffnet die Grammatikübersicht – unabhängig vom Ergebnis.';href='franzoesisch-verben-konjugation-1-oberstufe-mit-gemischten-schreibuebungen.html';}
  else if(!state.daily){title='Eine weitere Grammatikübung';text='Schliesse eine Runde in einem zweiten Grammatikthema ab. Danach öffnet sich Französisch im Alltag.';href=nextGrammar();}
  else if(!state.lab){title='Wende dein Französisch an';text='Schliesse eine Alltagsrunde ab. Danach öffnet sich deine Lernwerkstatt.';href='franzoesisch-alltag-familie-1-oberstufe.html';}
  else if(!state.exam){title='Vertiefe deine Grundlagen';text=`${state.count} von 4 Grammatikthemen abgeschlossen. Danach öffnet sich das Prüfungstraining.`;href=nextGrammar();}
  else{title='Dein Lernweg ist geöffnet';text='Du kannst alle Bereiche nutzen. Niveau 2 und 3 sowie Prüfungen benötigen weiterhin Premium.';href=nextGrammar();}
  if(state.skip){title='Alle Bereiche sind sichtbar';text='Wähle dein Thema und Niveau frei. Die Premium-Regeln gelten weiterhin.';href=nextGrammar();}
  $('frGuideTitle').textContent=title;$('frGuideText').textContent=text;$('frGuideNext').href=href;
  hide($('Spi'),!state.grammar);hide($('Heute'),!state.grammar);hide($('Fortschritt'),!state.grammar);hide($('Pruefung'),!state.exam);hide($('lernwerkstatt'),!state.lab);hide($('analysisFold'),!state.lab);hide($('Pru'),!state.grammar);hide($('kompetenzlernen'),!state.lab);
  hide($('chooseEveryday')?.closest('article'),!state.daily);hide($('Alltag'),!state.daily);
  document.querySelectorAll('#Theoriekarten a').forEach(a=>hide(a,!state.grammar&&!a.href.includes('franzoesisch-theorie-verben-konjugation.html')));
  document.querySelectorAll('.welcome-path').forEach(el=>{const href=el.getAttribute('href');hide(el,!state.grammar||(href==='#Alltag'&&!state.daily)||(href==='#lernwerkstatt'&&!state.lab));});
  hide(document.querySelector('.welcome-paths'),!state.grammar);
  document.querySelectorAll('#navbar a[href^="#"]').forEach(a=>{const h=a.hash;hide(a,(h==='#Spi'&&!state.grammar)||(h==='#Fortschritt'&&!state.grammar)||(h==='#Pruefung'&&!state.exam)||(h==='#lernwerkstatt'&&!state.lab));});
  if($('frGuidePractice'))$('frGuidePractice').hidden=true;
  $('frGuideTheory').hidden=state.grammar;
  $('frGuideStatus').textContent=ready?(core?.account==='guest'?'Dein Lernweg wird auf diesem Gerät gespeichert.':'Dein Lernfortschritt wird mit deinem Konto synchronisiert.'):'Lernfortschritt wird geladen …';
  document.documentElement.classList.remove('fr-guide-loading');
  if(lastActor!==core?.account){lastActor=core?.account;checkHash();}
 }
 const restricted=h=>(['#Spi','#Grammatik','#Heute','#Fortschritt'].includes(h)&&!state.grammar)||(['#Alltag'].includes(h)&&!state.daily)||(['#lernwerkstatt','#Fehleranalyse'].includes(h)&&!state.lab)||(h==='#Pruefung'&&!state.exam);
 function checkHash(){if(restricted(location.hash)){history.replaceState(null,'','#hero');$('frGuide').scrollIntoView({block:'center'});$('frGuideStatus').textContent='Dieser Bereich öffnet sich nach deinem nächsten Lernschritt. Du kannst auch alle Bereiche anzeigen.';}}
 document.addEventListener('click',e=>{const a=e.target.closest('a');if(a&&a.getAttribute('href')?.startsWith('#')&&restricted(a.getAttribute('href'))){e.preventDefault();e.stopImmediatePropagation();$('frGuide').scrollIntoView({block:'center'});$('frGuideStatus').textContent='Dieser Bereich öffnet sich nach deinem nächsten Lernschritt.';}},true);
 $('frGuideToggle').onclick=()=>{const mode=state.skip?'guided':'all';if(window.FRLearning?.setGuidanceMode)window.FRLearning.setGuidanceMode(mode);else try{localStorage.setItem('fr_guidance_mode:'+window.FRLearning?.account,mode)}catch{}render();};
 function openEveryday(e){e.preventDefault();const panel=$('Alltag'),button=$('chooseEveryday');if(panel.hidden)button.click();history.replaceState(null,'','#Alltag');requestAnimationFrame(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}));}
 $('frGuideNext').addEventListener('click',e=>{if($('frGuideNext').hash==='#Alltag')openEveryday(e);else if($('frGuideNext').hash==='#Grammatik'&&$('Grammatik').hidden)$('chooseGrammar')?.click();});

 window.addEventListener('hashchange',checkHash);window.addEventListener('frlearningchange',render);
 render();
 window.FRLearning?.ready.then(()=>{ready=true;$('frGuideToggle').disabled=false;render();checkHash();});
})();
