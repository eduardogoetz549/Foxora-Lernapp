(()=>{'use strict';
const norm=v=>String(v??'').normalize('NFC').toLowerCase().replace(/[‘’`ʼ]/g,"'").replace(/\s*'\s*/g,"'").replace(/\s+/g,' ').trim().replace(/[.!?]+$/,'');
window.FRAnswers={check:(v,a,accepted=[])=>[a,...accepted].some(x=>norm(v)===norm(x)),normalize:norm};
function plan(pool,states={},now=Date.now()){
 const mode=new URLSearchParams(location.search).get('review');
 if(mode==='errors'||mode==='due')return pool.filter(q=>{const s=states[String(q.id)];return s&&(mode==='errors'?s.unresolvedError:Date.parse(s.due)<=now)}).slice(0,10);
 const due=pool.filter(q=>{const s=states[String(q.id)];return s&&(s.unresolvedError||Date.parse(s.due)<=now)}).sort((a,b)=>Number(!!states[b.id]?.unresolvedError)-Number(!!states[a.id]?.unresolvedError)||Date.parse(states[a.id]?.due)-Date.parse(states[b.id]?.due));
 const rest=pool.filter(q=>!due.includes(q));for(let i=rest.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[rest[i],rest[j]]=[rest[j],rest[i]]}return [...due,...rest].slice(0,10);
}
window.ENDailySupport={plan};})();