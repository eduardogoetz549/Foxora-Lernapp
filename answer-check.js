/* Exact French checking with curated equivalent formulations; no fuzzy grammar matching. */
(()=>{'use strict';
const normalize=v=>String(v??'').normalize('NFC').toLocaleLowerCase('fr').replace(/[’‘`ʼ]/g,"'").replace(/[‐‑–]/g,'-').replace(/œ/g,'oe').replace(/æ/g,'ae').replace(/\s*'\s*/g,"'").replace(/\s*-\s*/g,'-').replace(/\s*([,;:!?])\s*/g,'$1').trim().replace(/[.!?]+$/,'').replace(/\s+/g,' ');
const groups=[
 ['où habites-tu','où est-ce que tu habites','tu habites où'],
 ['comment t’appelles-tu','comment est-ce que tu t’appelles','tu t’appelles comment'],
 ['où est la gare','où se trouve la gare','la gare est où','où est-ce que la gare se trouve'],
 ['combien ça coûte','combien cela coûte','ça coûte combien','quel est le prix'],
 ['puis-je payer par carte','est-ce que je peux payer par carte','je peux payer par carte','peut-on payer par carte'],
 ['quelle heure est-il','il est quelle heure','est-ce que vous avez l’heure','avez-vous l’heure'],
 ['je ne sais pas','je ne le sais pas'],
 ['à bientôt','à très bientôt'],
 ['soixante-dix','septante'],['quatre-vingt-dix','nonante'],['quatre-vingts','huitante','octante']
].map(g=>g.map(normalize));
function variants(answer,context={}){
 const n=normalize(answer);const exact=[answer];
 // Rephrasing is inappropriate when the instruction demands a particular construction.
 const instruction=String(context.instruction||context.q||context.prompt||'');
 if(!context.strict&&!/inversion|est-ce que|intonation|vernein|pronomen|pronom|négation|konjug|conjug|zeitform|conditionnel|subjonctif|artikel|adjektiv|wörtlich|wortwörtlich|genau|satzbau|ordne|reihenfolge|ersetze|ne\s*…|ne\s*\.\.\./i.test(instruction)){
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
