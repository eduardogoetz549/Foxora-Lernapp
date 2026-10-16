(()=>{'use strict';
function build(summary,catalog,now=Date.now(),limit=3){
 const candidates=catalog.map(meta=>{const m=summary.modules?.[meta.module]||{},entries=Object.entries(m.questions||{}),due=entries.filter(([,q])=>Date.parse(q.due)<=now),errors=due.filter(([,q])=>q.unresolvedError),overdue=due.reduce((n,[,q])=>Math.max(n,(now-Date.parse(q.due))/86400000),0),consolidated=entries.filter(([,q])=>q.consolidated).length;
 const count=Number(meta.count)||0;const unseen=count?Math.max(0,count-entries.length):0;
 const score=errors.length*12+due.length*3+Math.min(30,overdue)+(due.length&&consolidated?2:0);
 return {...meta,due:due.length,errors:errors.length,unseen,consolidated,score,ids:due.sort((a,b)=>Number(b[1].unresolvedError)-Number(a[1].unresolvedError)||Date.parse(a[1].due)-Date.parse(b[1].due)).slice(0,10).map(([id])=>id)};
 }).filter(x=>x.file&&/^spanisch-[a-z0-9-]+\.html$/.test(x.file));
 const selected=[],used=new Set();const add=(x,reason)=>{if(!x||used.has(x.module)||selected.length>=limit)return;used.add(x.module);selected.push({...x,reason,href:x.file+(x.ids.length?'?smart=1&review_ids='+x.ids.map(encodeURIComponent).join(','):'?smart=1')})};
 const ranked=candidates.filter(x=>x.due).sort((a,b)=>b.score-a.score||a.file.localeCompare(b.file));
 if(ranked.length)add(ranked[0],ranked[0].errors?'Offene Fehler mit fälligem Wiederholungstermin':'Fällige Wiederholung');
 const other=ranked.find(x=>!used.has(x.module)&&x.daily!==selected[0]?.daily);add(other,'Abwechslung zwischen Grammatik und Alltag · fällige Aufgaben');
 for(const x of ranked)add(x,x.errors?'Fehler festigen':'Bekanntes zum fälligen Termin auffrischen');
 if(selected.length<limit){const levels=Object.entries(summary.modules||{}).filter(([,m])=>m.answered).map(([id])=>catalog.find(x=>x.module===id)?.level).filter(Boolean);const level=levels.length?Math.min(...levels):1;
  const fresh=candidates.filter(x=>x.level===level&&x.unseen&&!used.has(x.module)).sort((a,b)=>Number(b.daily!==selected.at(-1)?.daily)-Number(a.daily!==selected.at(-1)?.daily)||a.file.localeCompare(b.file));
  for(const x of fresh)add(x,'Neue Aufgaben auf deinem bisherigen Niveau');
 }
 return selected;
}
window.ESPlan={build};
})();
