(()=>{'use strict';
const plain=html=>{const d=document.createElement('div');d.innerHTML=String(html||'');return (d.textContent||'').replace(/\s+/g,' ').trim()};
function hint(x,answer){
 const ctx=plain(x.ctx),prompt=plain(x.q),exp=plain(x.e);
 const subject=ctx.match(/^(?:[^:]+:\s*)?(Je|J’|J'|Tu|Il|Elle|On|Nous|Vous|Ils|Elles)\s+_{2,}/i);
 const topic=location.pathname;
 if(subject&&/verben-konjugation|unregelmaessige-verben/.test(topic))return 'Mit '+subject[1].toLowerCase()+': '+subject[1].toLowerCase()+' '+answer+'.';
 const chunks=String(x.e||'').split(/<br\s*\/?\s*>|<\/p>/i).map(plain).filter(Boolean);
 const useful=chunks.find(t=>!/^\s*(Hier|Beispiel|Lösung|Richtige Lösung)\s*:/i.test(t));
 let rule=(useful||exp).replace(/^Regel:\s*/i,'');
 rule=rule.split(/\s+(?:Hier|Beispiel|Lösung):/)[0];
 const sentences=rule.match(/[^.!?]+[.!?]?/g)||[];
 const short=sentences.map(t=>t.trim()).find(t=>t.length>=12&&t.length<=170&&!/In dieser Aufgabe lautet|passende Form|müssen gesondert gelernt/.test(t));
 if(short)return short;
 if(ctx.includes('__')&&answer)return ctx.replace(/_{2,}/,answer).replace(/\s*\([^)]*\)\s*$/,'').trim();
 return '';
}
function render(node,ok,x,exam=false){node.replaceChildren();node.className='feedback show '+(exam?'':ok?'good':'bad');
 const status=document.createElement('strong');status.textContent=exam?'Antwort gespeichert.':ok?'✓ Richtig!':'✗ Noch nicht richtig.';node.append(status);
 if(exam)return;
 const answer=plain(x.type==='write'?x.answer:x.a?.[x.c]);
 if(!ok&&answer){const p=document.createElement('p');p.append('Richtige Lösung: ');const b=document.createElement('strong');b.textContent=answer;p.append(b);node.append(p)}
 const text=hint(x,answer);if(text){const p=document.createElement('p');p.className='fr-feedback-hint';p.textContent=text;node.append(p)}
}
window.FRCompactFeedback={render,hint};
})();
