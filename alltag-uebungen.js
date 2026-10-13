(() => {
 'use strict';
 const config=window.FRAlltag,$=id=>document.getElementById(id),answers=window.FRAnswers;
 if(!config||!Array.isArray(config.questions)||!answers)return;
 const requested=(new URL(location.href).searchParams.get('review_ids')||'').split(',').filter(x=>/^\d+$/.test(x)).map(Number);
 const selected=[...config.questions,...(config.legacyQuestions||[])].filter(q=>requested.includes(q.id));
 const targeted=!config.exam&&selected.length>0;
 let round=[],queue=[],position=0,correct=0,answered=0,locked=false,actor=null,finished=false,last=new Map(),examAnswers=[],timer=null,deadline=0,orderHistory=[],reviewRound=false,lastErrors=[],roundErrors=new Set();
 function shuffled(values){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 function sample(pool,counts){return shuffled(Object.entries(counts).flatMap(([type,n])=>shuffled(pool.filter(q=>q.type===type)).slice(0,n)));}
 function start(onlyErrors=false){
  reviewRound=onlyErrors===true;roundErrors=new Set();
  clearInterval(timer);document.getElementById('examReview')?.remove();
  round=reviewRound?config.questions.filter(q=>lastErrors.includes(q.id)):targeted?selected.slice(0,10):config.exam?shuffled([...new Set(config.questions.map(q=>q.topic))].flatMap(topic=>sample(config.questions.filter(q=>q.topic===topic),{choice:2,write:2,order:1}))):FRLearningSupport.plan(config.questions,FRLearning.summary().modules[config.module]?.questions||{});
  queue=round.map(q=>({...q,repetition:reviewRound?1:0}));position=0;correct=0;answered=0;locked=false;finished=false;last=new Map();examAnswers=[];
  $('result').hidden=true;$('quizCard').hidden=false;$('coachImage').src='fuchs-tipp.png';$('foxBubble').textContent=config.exam?'Prüfungsmodus: Die Auswertung erscheint erst nach der Abgabe.':'Lies die Situation. Nutze bei Fehlern die Erklärung und den Beispielsatz.';
  if(config.exam){deadline=Date.now()+30*60*1000;$('examTime').textContent='30:00';timer=setInterval(()=>{const left=Math.max(0,Math.ceil((deadline-Date.now())/1000));$('examTime').textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');if(!left)finishExam();},1000);}
  render();
 }
 function render(){
  locked=false;orderHistory=[];const q=queue[position];
  $('step').textContent='Aufgabe '+(position+1)+' von '+queue.length;$('score').textContent=config.exam?'Prüfungsmodus':correct+'/'+answered+' im ersten Durchgang';$('fill').style.width=Math.round(position/queue.length*100)+'%';
  $('mode').textContent=(q.repetition||targeted?'Wiederholung · ':'')+(q.taskLabel||(q.type==='write'?'Schreiben':'Auswahl'));
  $('question').textContent=q.type==='order'?'Bringe die Wörter in die richtige Reihenfolge.':q.type==='write'?'Schreibe die passende Antwort.':'Wähle die passende Antwort.';
  $('context').textContent=q.prompt;$('options').replaceChildren();$('feedback').replaceChildren();$('next').disabled=true;$('next').classList.remove('active');$('next').textContent='Weiter →';
  $('writeForm').hidden=q.type==='choice';$('writeAnswer').value='';$('writeAnswer').disabled=false;$('writeAnswer').readOnly=q.type==='order';$('writeAnswer').classList.remove('correct','wrong');$('checkWrite').disabled=false;
  if(q.type==='choice')shuffled(q.options).forEach(option=>{const b=document.createElement('button');b.type='button';b.className='option';b.textContent=option;b.onclick=()=>respond(option,b);$('options').append(b);});
  if(q.type==='order'){
   shuffled(q.tokens.map((word,index)=>({word,index}))).forEach(token=>{const b=document.createElement('button');b.type='button';b.className='word-token';b.textContent=token.word;b.onclick=()=>{if(locked)return;b.disabled=true;orderHistory.push({word:token.word,button:b});$('writeAnswer').value=orderHistory.map(t=>t.word).join(' ');};$('options').append(b);});
   const undo=document.createElement('button');undo.type='button';undo.className='word-undo';undo.textContent='Letztes Wort zurück';undo.onclick=()=>{if(locked)return;const last=orderHistory.pop();if(last)last.button.disabled=false;$('writeAnswer').value=orderHistory.map(t=>t.word).join(' ');};$('options').append(undo);
  }
 }
 function respond(own,selectedButton){
  if(locked||finished)return;
  if(!answers.normalize(own)){$('feedback').textContent='Gib zuerst eine Antwort ein.';return;}
  locked=true;const q=queue[position],ok=answers.check(own,q.answer,q.accepted||[]);
  $('options').querySelectorAll('button').forEach(b=>b.disabled=true);$('writeAnswer').disabled=true;$('checkWrite').disabled=true;
  if(config.exam){examAnswers.push({q,own,ok});if(selectedButton)selectedButton.classList.add('exam-selected');$('feedback').textContent='Antwort gespeichert.';}
  else{
   answered++;if(ok)correct++;last.set(q.id,ok);if(!ok)roundErrors.add(q.id);
   if(q.type==='choice')$('options').querySelectorAll('button').forEach(b=>{if(answers.check(b.textContent,q.answer,q.accepted||[]))b.classList.add('correct');});
   if(selectedButton&&!ok)selectedButton.classList.add('wrong');if(q.type!=='choice')$('writeAnswer').classList.add(ok?'correct':'wrong');
   FRCompactFeedback.render($('feedback'),ok,{answer:q.answer,type:'write',e:q.explanation},false);
   $('coachImage').src=ok?'fuchs-richtig.png':'fuchs-falsch.png';$('foxBubble').textContent=ok?'Très bien ! Weiter so.':'Nach der Runde kannst du nur deine Fehler üben.';
   if(window.FRLearning)FRLearning.record(config.module,q.id,ok,!!q.repetition||targeted,q.prompt,{own,right:q.answer,prompt:q.prompt,explanation:q.explanation,topic:config.topic,file:config.file,type:q.type});
   $('score').textContent=correct+'/'+answered+' im ersten Durchgang';
  }
  $('step').textContent='Aufgabe '+(position+1)+' von '+queue.length;$('next').disabled=false;$('next').classList.add('active');$('next').textContent=position===queue.length-1?(config.exam?'Prüfung abgeben':'Auswertung →'):'Weiter →';
 }
 $('writeForm').onsubmit=e=>{e.preventDefault();respond($('writeAnswer').value);};
 $('next').onclick=()=>{
  if(!locked||finished)return;position++;
  if(position<queue.length){render();return;}
  if(config.exam){finishExam();return;}
  finished=true;lastErrors=[...roundErrors];const pct=Math.round(correct/Math.max(1,round.length)*100);$('quizCard').hidden=true;$('result').hidden=false;$('fill').style.width='100%';$('resultScore').textContent=correct+' von '+round.length+' Antworten richtig ('+pct+' %)';
  $('resultText').textContent=reviewRound?'Fehlerwiederholung abgeschlossen.':lastErrors.length?'Runde abgeschlossen. Wiederhole jetzt nur deine Fehler.':'Runde abgeschlossen. Alle Antworten richtig.';
  if(window.FRLearning&&!reviewRound&&!targeted)FRLearning.finish(config.module,pct);
  let retry=$('errorsOnly');if(!retry){retry=document.createElement('button');retry.id='errorsOnly';retry.type='button';retry.className='restart';retry.textContent='Nur Fehler üben';$('result').append(retry);}retry.hidden=!lastErrors.length;retry.onclick=()=>start(true);setupFreeWriting();

 };
 function finishExam(){
  if(finished)return;finished=true;clearInterval(timer);$('quizCard').hidden=true;$('result').hidden=false;$('fill').style.width='100%';const good=examAnswers.filter(a=>a.ok).length,pct=Math.round(good/round.length*100);$('resultScore').textContent=good+' / '+round.length;$('resultText').textContent=pct+' % richtig. Nicht beantwortete Aufgaben zählen als falsch.';
  const detail=document.createElement('div');detail.id='examReview';
  round.forEach((q,i)=>{const a=examAnswers.find(a=>a.q.id===q.id),card=document.createElement('div');card.className='solution';const h=document.createElement('p');h.textContent=(i+1)+'. '+q.prompt;const own=document.createElement('p');own.textContent='Deine Antwort: '+(a?.own||'Nicht beantwortet');const right=document.createElement('p');right.textContent=(a?.ok?'Richtig. ':'Eine passende Lösung: '+q.answer+'\n')+q.explanation;card.append(h,own,right);detail.append(card);
   if(window.FRLearning)FRLearning.record(q.practiceModule,q.practiceId,!!a?.ok,false,q.prompt,{own:a?.own||'',right:q.answer,prompt:q.prompt,explanation:q.explanation,topic:q.topic,file:q.practiceFile,type:q.type,unanswered:!a});
  });$('result').append(detail);if(window.FRLearning)FRLearning.finish(config.module,pct);
 }
 function setupFreeWriting(){
  if(config.exam||!config.freeWriting)return;document.getElementById('freeWriting')?.remove();const section=document.createElement('section');section.id='freeWriting';section.className='card free-writing';const title=document.createElement('h2');title.textContent='Jetzt selbst schreiben';const task=document.createElement('p');task.textContent=config.freeWriting.prompt;const input=document.createElement('textarea');input.rows=5;input.maxLength=1000;input.lang='fr';input.id='ownMessage';const label=document.createElement('label');label.htmlFor=input.id;label.textContent='Deine eigene Nachricht';const button=document.createElement('button');button.type='button';button.className='home-btn';button.textContent='Mit Beispiel vergleichen';const model=document.createElement('div');model.className='solution';model.hidden=true;model.textContent='Beispiel:\n'+config.freeWriting.model+'\n\nSelbst prüfen: Passt meine Nachricht zur Situation? Stimmen die Verbformen? Sind meine Sätze vollständig?\nMehrere Formulierungen sind möglich. Dein freier Text wird hier nicht automatisch benotet.';button.onclick=()=>model.hidden=!model.hidden;
  const key='foxora:message:'+actor+':'+config.module;try{input.value=localStorage.getItem(key)||'';}catch{}input.oninput=()=>{try{localStorage.setItem(key,input.value);}catch{}};const help=document.createElement('div');help.className='language-help';const hint=document.createElement('p');hint.textContent='Kopiere deinen Text und korrigiere ihn mit LanguageTool.';const link=document.createElement('a');link.href='https://languagetool.org/fr';link.target='_blank';link.rel='noopener noreferrer';link.className='home-btn';link.textContent='LanguageTool öffnen ↗';help.append(hint,link);section.append(title,task,label,input,help,button,model);$('quizCard').parentNode.insertBefore(section,$('quizCard').nextSibling);
 }
 $('restart').onclick=()=>start(false);
 function accountChanged(){const next=window.FRLearning?.account||'guest';if(next===actor)return;actor=next;start();}
 window.addEventListener('frlearningchange',accountChanged);
 if(window.FRLearning?.ready)window.FRLearning.ready.then(accountChanged).catch(()=>{actor='guest';start();});else accountChanged();
})();
