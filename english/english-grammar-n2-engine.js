
const baseQuestions=window.ENGrammarPage.tasks;
let queue=[],current=0,score=0,answered=false,wrongCounts={},attempts=0,correctFirst=0,roundMode='learn',mistakeOnly=false,roundWrongIds=new Set(),lastRoundWrongIds=[];
const STORAGE_KEY=window.ENGrammarPage.module;
const step=document.getElementById('step'),fill=document.getElementById('fill'),scoreEl=document.getElementById('score'),
question=document.getElementById('question'),context=document.getElementById('context'),options=document.getElementById('options'),
feedback=document.getElementById('feedback'),next=document.getElementById('next'),quizCard=document.getElementById('quizCard'),
result=document.getElementById('result'),resultScore=document.getElementById('resultScore'),resultText=document.getElementById('resultText'),
restart=document.getElementById('restart'),mode=document.getElementById('mode'),mistakesBtn=document.getElementById('mistakesBtn'),examBtn=document.getElementById('examBtn');

function norm(v){return v.trim().toLowerCase().replace(/[’‘`]/g,"'").replace(/\s+/g," ")}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function getData(){return window.FRLearning ? FRLearning.moduleData(STORAGE_KEY) : {}}
function saveData(data){if(window.FRLearning)FRLearning.saveModuleData(STORAGE_KEY,data);}
function questionId(x){return x.id ?? baseQuestions.indexOf(x)}
function buildRound(onlyMistakes=false){
  let pool=baseQuestions.map((x,i)=>({...x,id:x.id??i,review:onlyMistakes}));
  if(onlyMistakes)return shuffle(pool.filter(x=>lastRoundWrongIds.includes(x.id)));
  return ENGrammarSupport.plan(pool,FRLearning.summary().modules[STORAGE_KEY]?.questions||{});
}
function reset(onlyMistakes=false){
  roundMode=new URLSearchParams(location.search).get('mode')==='exam'?'exam':'learn';
  mistakeOnly=onlyMistakes; queue=buildRound(onlyMistakes); roundWrongIds=new Set(); current=0;score=0;attempts=0;correctFirst=0;answered=false;wrongCounts={};
  if(!queue.length){quizCard.classList.add('hidden');result.classList.remove('hidden');resultScore.textContent='Hier ist gerade nichts fällig.';resultText.textContent='Starte eine normale Runde, um alle Aufgaben zu üben.';mistakesBtn.style.display='none';return;}quizCard.classList.remove('hidden');result.classList.add('hidden');load();
}
function load(){
  if(current>=queue.length){finish();return}
  answered=false; const x=queue[current];
  step.textContent=`Aufgabe ${current+1} von ${queue.length}`; fill.style.width=(current/queue.length*100)+'%'; scoreEl.textContent=`${score} richtig`;
  mode.textContent=roundMode==='exam'?'🎓 Prüfung':(x.review?'🔁 Wiederholung':(x.type==='write'?'⌨️ Selbst schreiben':'🇬🇧 Üben'));
  question.textContent=x.q; context.textContent=x.ctx; options.innerHTML=''; feedback.className='feedback';feedback.innerHTML='';next.classList.remove('active');
  if(x.type==='write'){
    options.innerHTML='<div class="mode-badge">⌨️ Ohne Auswahl – selbst schreiben</div><input id="writeInput" class="write-input" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Antwort auf Englisch eingeben …"><button id="checkWrite" class="check-write">Antwort prüfen</button>';
    const inp=document.getElementById('writeInput'),btn=document.getElementById('checkWrite');btn.onclick=()=>checkWrite(inp,btn,x);inp.onkeydown=e=>{if(e.key==='Enter'&&!answered)checkWrite(inp,btn,x)};setTimeout(()=>inp.focus(),50);
  } else {x.a.forEach((t,i)=>{const b=document.createElement('button');b.className='option';b.textContent=t;b.onclick=()=>choose(i,b,x);options.appendChild(b)})}
}
function record(ok,x,own){
  attempts++; if(ok)score++; if(ok&&!x.review)correctFirst++;
  const data=getData(), mastery=data.mastery||{}, id=questionId(x); data.totalAttempts=(data.totalAttempts||0)+1; data.totalCorrect=(data.totalCorrect||0)+(ok?1:0); data.lastPlayed=new Date().toISOString();
  if(ok) mastery[id]=Math.min(3,(mastery[id]||0)+1); else mastery[id]=Math.max(0,(mastery[id]||0)-1);
  data.mastery=mastery; let wrong=new Set(data.wrongIds||[]); if(ok && mastery[id]>=2)wrong.delete(id); if(!ok)wrong.add(id); data.wrongIds=[...wrong]; saveData(data);
  if(window.FRLearning) FRLearning.record(STORAGE_KEY,id,ok,!!x.review,(x.ctx||x.q||('Aufgabe '+(id+1))).replace(/<[^>]+>/g,''),{own,right:x.type==='write'?x.answer:x.a[x.c],prompt:(x.q||'')+' '+(x.ctx||''),explanation:x.e||'',topic:window.ENGrammarPage.topic,file:window.ENGrammarPage.file,type:x.type==='write'?'write':'choice'});
  if(!ok)roundWrongIds.add(id);
  scoreEl.textContent=`${score} richtig`;
}
function showFeedback(ok,x,answerText=''){
  if(roundMode==='exam'){feedback.className='feedback show';feedback.innerHTML='<strong>Antwort gespeichert.</strong>';}
  else {feedback.className='feedback show '+(ok?'good':'bad');feedback.innerHTML=ok?`<strong>✓ Richtig!</strong><br>${x.e}`:`<strong>✗ Noch nicht.</strong>${answerText}<br>${x.e}`;}
  next.classList.add('active');
}
function choose(i,b,x){if(answered)return;answered=true;const ok=i===x.c;const bs=[...options.querySelectorAll('.option')];bs.forEach(el=>el.disabled=true);if(roundMode!=='exam'){bs.forEach((el,j)=>{if(j===x.c)el.classList.add('correct')});if(!ok)b.classList.add('wrong')}record(ok,x,x.a[i]);showFeedback(ok,x)}
function checkWrite(inp,btn,x){if(answered||!norm(inp.value))return;answered=true;inp.disabled=true;btn.disabled=true;const ok=FRAnswers.check(inp.value,x.answer,x.accepted||[]);if(roundMode!=='exam')inp.classList.add(ok?'correct':'wrong');record(ok,x,inp.value);showFeedback(ok,x,`<br>Richtige Lösung: <strong>${x.answer}</strong>`)}
function finish(){
  quizCard.classList.add('hidden');result.classList.remove('hidden');fill.style.width='100%';
  const data=getData(), mastery=data.mastery||{}, mastered=Object.values(FRLearning.summary().modules[STORAGE_KEY]?.questions||{}).filter(q=>(q.strength||0)>=2).length, pct=Math.round((score/Math.max(1,attempts))*100), wrongIds=[...roundWrongIds]; lastRoundWrongIds=wrongIds;
  data.best=Math.max(data.best||0,pct);data.lastScore=pct;if(!mistakeOnly)data.completed=(data.completed||0)+1;saveData(data);
  if(window.FRLearning && !mistakeOnly) FRLearning.finish(STORAGE_KEY,pct);
  resultScore.textContent=`${score} von ${attempts} Antworten richtig (${pct} %)`;
  resultText.innerHTML=`<strong>${mastered} von ${baseQuestions.length}</strong> Aufgaben mit Lernstärke ab 2. Für sicheres Beherrschen sind Wiederholungen mit zeitlichem Abstand nötig.<br>Persönlicher Bestwert: <strong>${data.best} %</strong>.${roundMode==='exam'?'<br>Im Prüfungsmodus wurden Lösungen erst am Schluss bewertet.':''}`;
  mistakesBtn.style.display=wrongIds.length?'inline-block':'none';
}
next.onclick=()=>{if(!answered)return;current++;load()};restart.onclick=()=>{history.replaceState(null,'',location.pathname);reset(false)};mistakesBtn.onclick=()=>{history.replaceState(null,'',location.pathname);reset(true)};examBtn.onclick=()=>{location.href='englisch-pruefung-grammatik-2-oberstufe.html';};
quizCard.style.pointerEvents='none';
if(window.FRLearning){FRLearning.ready.then(()=>{quizCard.style.pointerEvents='';reset(false);});}
else {quizCard.style.pointerEvents='';reset(false);}
window.addEventListener('frlearningchange',()=>{if(window.FRLearning&&window._frActor!==FRLearning.account){window._frActor=FRLearning.account;}});

window.ENGrammarEngine={reset,load,get queue(){return queue},get current(){return current},get answered(){return answered}};
