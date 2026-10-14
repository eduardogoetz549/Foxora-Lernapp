/* Exact Spanish checking with curated equivalent formulations; no fuzzy grammar matching. */
(()=>{'use strict';
const normalize=v=>String(v??'').normalize('NFC').toLocaleLowerCase('es').replace(/[’‘`ʼ]/g,"'").replace(/[‐‑–]/g,'-').replace(/\s*'\s*/g,"'").replace(/\s*-\s*/g,'-').replace(/\s*([,;:!?])\s*/g,'$1').trim().replace(/[¿¡]/g,'').replace(/[.!?]+$/,'').replace(/\s+/g,' ');
const groups=[["¿Dónde está la estación?", "¿Dónde se encuentra la estación?"], ["¿Cuánto cuesta?", "¿Qué precio tiene?"], ["¿Puedo pagar con tarjeta?", "¿Se puede pagar con tarjeta?"], ["¿Cómo te llamas?", "¿Cuál es tu nombre?"]].map(g=>g.map(normalize));
function variants(answer,context={}){
 const n=normalize(answer);const exact=[answer];
 // Rephrasing is inappropriate when the instruction demands a particular construction.
 const instruction=String(context.instruction||context.q||context.prompt||'');
 if(!context.strict&&!/inversion|est-ce que|intonation|vernein|pronomen|pronom|négation|konjug|conjug|zeitform|condicional|subjuntivo|imperativo|ser.?estar|tú|usted|pretérito|imperfecto|artikel|adjektiv|wörtlich|wortwörtlich|genau|satzbau|ordne|reihenfolge|ersetze|ne\s*…|ne\s*\.\.\./i.test(instruction)){
  const group=groups.find(g=>g.includes(n));if(group)exact.push(...group);
 }
 return exact;
}
function check(value,answer,accepted=[],context={}){
 if(!normalize(value))return false;
 const candidates=[answer,...(Array.isArray(accepted)?accepted:[])].flatMap(a=>variants(a,context));
 const own=normalize(value);
 if(candidates.some(a=>normalize(a)===own))return true;
 // A learner may supply the whole completed sentence for a single-gap exercise.
 if(!context.strict){
  let sentence=String(context.ctx||context.prompt||'').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/\s*\([^)]*\)\s*$/,'').trim();
  if((sentence.match(/_{2,}/g)||[]).length===1){if(sentence.includes(':'))sentence=sentence.slice(sentence.lastIndexOf(':')+1).trim();return candidates.some(a=>normalize(sentence.replace(/_{2,}/,a))===own);}
 }
 return false;
}
window.FRAnswers={normalize,check,variants};
})();
