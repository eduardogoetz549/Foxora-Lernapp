(() => {
 'use strict';
 function derive(summary,skip=false){
  const completed=Object.entries(summary.modules||{}).filter(([id,m])=>/^(?:de_|deutsch_|german_)/.test(id) && Number(m.completed)>0 && !/guidance|pruefung|prüfung|exam|15_minuten/.test(id));
  const daily=completed.filter(([id])=>/alltag|daily|jetzt.?anwenden/.test(id));
  const grammar=completed.filter(([id])=>!daily.some(([other])=>other===id));
  const topics=new Set(grammar.map(([id])=>id.replace(/_[123]_(?:oberstufe|level).*$/,'').replace(/_[123]$/,'')));
  return {grammar:skip||grammar.length>=1,daily:skip||topics.size>=2,lab:skip||(topics.size>=2&&daily.length>=1),exam:skip||(topics.size>=4&&daily.length>=1),count:topics.size,dailyCount:daily.length,skip};
 }
 window.DEGuidance={derive};
 if(!document.getElementById('deGuide'))return;
 const $=id=>document.getElementById(id);
 let ready=false,state=derive({}),lastActor=null;
 const hidden=new Set();
 function hide(el,on){if(!el)return;el.classList.toggle('de-guide-hidden',on);if(on)hidden.add(el);else hidden.delete(el);}
 function render(){
  const core=window.FRLearning;let mode=core?.guidanceMode?.();if(!mode){try{mode=localStorage.getItem('de_guidance_mode:'+core?.account)||'guided'}catch{mode='guided'}}state=derive(core?.summary?.()||{},(mode==='all'||mode==='free'));
  const steps=[true,state.grammar,state.daily,state.lab,state.exam];
  document.querySelectorAll('[data-de-step]').forEach(el=>{const n=Number(el.dataset.deStep);el.classList.toggle('done',steps[n]);el.setAttribute('aria-label', ['First lesson','Grammar','Everyday','Review','Exam'][n]+(steps[n]?' · unlocked':' · still locked'));el.textContent=['1 · First lesson','2 · Grammar','3 · Everyday','4 · Review','5 · Exam'][n]+(steps[n]?' ✓':' 🔒');});
  $('deGuideToggle').textContent=state.skip?'Show guided learning path':'Show all areas';
  const grammarFiles=["deutsch-en-sein-haben-1-oberstufe.html", "deutsch-en-artikel-plural-1-oberstufe.html", "deutsch-en-adjektive-1-oberstufe.html", "deutsch-en-pronomen-1-oberstufe.html"];
  function nextGrammar(){const modules=core?.summary?.().modules||{};return grammarFiles.find(file=>{const key=file.replace(/\.html$/,'').replace(/-/g,'_');return !Object.entries(modules).some(([id,m])=>id.includes(key)&&Number(m.completed)>0);})||grammarFiles[0];}
  let title,text,href;
  if(!state.grammar){title='Your first step';text='Start with sein and haben. Completing a round opens the grammar overview, whatever your score.';href='deutsch-en-sein-haben-1-oberstufe.html';}
  else if(!state.daily){title='Another grammar lesson';text='Complete a round in a second grammar topic to unlock everyday German.';href=nextGrammar();}
  else if(!state.lab){title='Use your German';text='Complete an everyday round to unlock your learning workshop.';href='deutsch-en-alltag-familie-1-oberstufe.html';}
  else if(!state.exam){title='Build your foundations';text=`${state.count} of 4 grammar topics completed. Then exam practice opens.`;href=nextGrammar();}
  else{title='Your learning path is open';text='You can explore all areas. Levels 2 and 3 and exams still require Premium.';href=nextGrammar();}
  if(state.skip){title='All areas are visible';text='Choose your topic and level freely. Premium rules still apply.';href=nextGrammar();}
  $('deGuideTitle').textContent=title;$('deGuideText').textContent=text;$('deGuideNext').href=href;
  hide($('Spi'),!state.grammar);hide($('Heute'),!state.grammar);hide($('Fortschritt'),!state.grammar);hide($('Pruefung'),!state.exam);hide($('lernwerkstatt'),!state.lab);hide($('analysisFold'),!state.lab);hide($('Pru'),!state.grammar);hide($('kompetenzlernen'),!state.lab);
  hide($('chooseEveryday')?.closest('article'),!state.daily);hide($('Alltag'),!state.daily);
  document.querySelectorAll('#Theoriekarten a').forEach(a=>hide(a,!state.grammar&&!a.href.includes('deutsch-en-theorie-sein-haben.html')));
  document.querySelectorAll('.welcome-path').forEach(el=>{const href=el.getAttribute('href');hide(el,!state.grammar||(href==='#Alltag'&&!state.daily)||(href==='#lernwerkstatt'&&!state.lab));});
  hide(document.querySelector('.welcome-paths'),!state.grammar);
  document.querySelectorAll('#navbar a[href^="#"]').forEach(a=>{const h=a.hash;hide(a,(h==='#Spi'&&!state.grammar)||(h==='#Fortschritt'&&!state.grammar)||(h==='#Pruefung'&&!state.exam)||(h==='#lernwerkstatt'&&!state.lab));});
  if($('deGuidePractice'))$('deGuidePractice').hidden=true;
  $('deGuideTheory').hidden=state.grammar;
  $('deGuideStatus').textContent=ready?(core?.account==='guest'?'Your learning path is saved on this device.':'Your progress syncs with your account.'):'Loading your progress …';
  document.documentElement.classList.remove('de-guide-loading');
  if(lastActor!==core?.account){lastActor=core?.account;checkHash();}
 }
 const restricted=h=>(['#Spi','#Grammatik','#Heute','#Fortschritt'].includes(h)&&!state.grammar)||(['#Alltag'].includes(h)&&!state.daily)||(['#lernwerkstatt','#Fehleranalyse'].includes(h)&&!state.lab)||(h==='#Pruefung'&&!state.exam);
 function checkHash(){if(restricted(location.hash)){history.replaceState(null,'','#hero');$('deGuide').scrollIntoView({block:'center'});$('deGuideStatus').textContent='This area opens after your next learning step. You can also show all areas.';}}
 document.addEventListener('click',e=>{const a=e.target.closest('a');if(a&&a.getAttribute('href')?.startsWith('#')&&restricted(a.getAttribute('href'))){e.preventDefault();e.stopImmediatePropagation();$('deGuide').scrollIntoView({block:'center'});$('deGuideStatus').textContent='This area opens after your next learning step.';}},true);
 $('deGuideToggle').onclick=()=>{const mode=state.skip?'guided':'all';if(window.FRLearning?.setGuidanceMode)window.FRLearning.setGuidanceMode(mode);else try{localStorage.setItem('de_guidance_mode:'+window.FRLearning?.account,mode)}catch{}render();};
 function openEveryday(e){e.preventDefault();const panel=$('Alltag'),button=$('chooseEveryday');if(panel.hidden)button.click();history.replaceState(null,'','#Alltag');requestAnimationFrame(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}));}
 $('deGuideNext').addEventListener('click',e=>{if($('deGuideNext').hash==='#Alltag')openEveryday(e);else if($('deGuideNext').hash==='#Grammatik'&&$('Grammatik').hidden)$('chooseGrammar')?.click();});

 window.addEventListener('hashchange',checkHash);window.addEventListener('frlearningchange',render);
 render();
 window.FRLearning?.ready.then(()=>{ready=true;$('deGuideToggle').disabled=false;render();checkHash();});
})();
