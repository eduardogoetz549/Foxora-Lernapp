/* Account-scoped outbox; optimistic database versions preserve concurrent edits. */
(()=>{'use strict';let owner='guest',busy=false,again=false,initialized=false;
const prefix='fr_flashcards_v2:',cache=()=>prefix+owner,notice=()=>document.getElementById('frDeckSyncStatus');
const read=key=>{try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch{return []}};
function message(text){if(notice())notice().textContent=text;}
function local(){localStorage.setItem(cache(),JSON.stringify(decks));}
function changed(){if(current){current=decks.find(d=>d.id===current.id)||null;}renderDecks();}
function save(){if(!initialized)return;for(const d of decks){const signature=JSON.stringify({name:d.name,cards:d.cards});if(d._signature!==signature){d._signature=signature;d._dirty=true;d._revision=(d._revision||0)+1;}}local();message(owner==='guest'?'Auf diesem Gerät gespeichert. Melde dich an, um Sets mit deinem Konto zu synchronisieren.':'Auf diesem Gerät gespeichert · Synchronisierung läuft …');void sync();}
function switchAccount(){const next=FRLearning.account;if(next===owner&&initialized)return;owner=next;initialized=true;decks=read(cache());current=null;draft=[];studyOrder=[];studyIndex=0;newDeck();changed();message(owner==='guest'?'Gast: Sets bleiben auf diesem Gerät.':'Kartensets werden geladen …');migrationButton();void sync();}
function migrationButton(){const old=read('fr_custom_flashcard_decks_v1'),guest=owner!=='guest'?read(prefix+'guest'):[];const button=document.getElementById('frImportLocal');button.hidden=!old.length&&!guest.length;button.onclick=()=>{const existing=new Set(decks.map(d=>JSON.stringify([d.name,d.cards.map(c=>[c.front,c.back])])));let n=0;for(const d of [...old,...guest]){const key=JSON.stringify([d.name,(d.cards||[]).map(c=>[c.front,c.back])]);if(existing.has(key)||!d.cards?.length)continue;decks.push({id:uid(),name:d.name,cards:d.cards.map(c=>({...c})),updated:Date.now()});existing.add(key);n++;}save();changed();message(n+' lokale Sets in den aktuellen Speicher übernommen. Die Originale bleiben erhalten.');};}
async function sync(){if(!initialized||owner==='guest'||!FRLearning.client)return;if(busy){again=true;return;}busy=true;const actor=owner;const client=FRLearning.client;
 try{
  for(const d of [...decks].filter(d=>d._dirty)){
   if(owner!==actor)return;const id=d.id,revision=d._revision;
   const {data,error}=await client.rpc('fr_save_flashcard_deck_v2',{p_id:id,p_name:d.name,p_cards:d.cards,p_expected_updated_at:d._cloudVersion||null});
   if(owner!==actor)return;
   if(error){if(String(error.message).includes('FLASHCARD_CONFLICT')){d.id=uid();d.name=d.name.replace(/ \(Konfliktkopie\)$/,'')+' (Konfliktkopie)';delete d._cloudVersion;d._dirty=true;d._signature=JSON.stringify({name:d.name,cards:d.cards});local();again=true;message('Unterschiedliche Bearbeitungen erkannt. Beide Versionen bleiben als getrennte Sets erhalten.');continue;}throw error;}
   d._cloudVersion=data;if(d._revision===revision)d._dirty=false;else again=true;local();
  }
  const remote=[];for(let offset=0;;offset+=1000){const {data,error}=await client.from('fr_flashcard_decks').select('id,name,cards,updated_at').eq('user_id',actor).order('id').range(offset,offset+999);if(error)throw error;if(owner!==actor)return;remote.push(...data);if(data.length<1000)break;}
  for(const r of remote){const existing=decks.find(d=>d.id===r.id);if(existing?._dirty)continue;const d={id:r.id,name:r.name,cards:r.cards,updated:Date.parse(r.updated_at),_cloudVersion:r.updated_at,_dirty:false};d._signature=JSON.stringify({name:d.name,cards:d.cards});const i=decks.findIndex(x=>x.id===r.id);if(i<0)decks.push(d);else decks[i]=d;}
  local();changed();message('Kartensets und Lernkartenstand mit deinem Konto synchronisiert.');
 }catch(e){if(owner===actor)message('Lokal gespeichert. Synchronisierung derzeit nicht möglich. Verbindung prüfen; bei der ersten Einrichtung die beiliegende SQL-Datei ausführen.');}
 finally{busy=false;if(again){again=false;void sync();}}
}
async function boot(){await FRLearning.ready;const host=document.querySelector('main');const p=document.createElement('p');p.id='frDeckSyncStatus';p.className='fr-sync-status';p.setAttribute('role','status');const b=document.createElement('button');b.id='frImportLocal';b.type='button';b.className='btn secondary';b.textContent='Vorhandene lokale Sets übernehmen';host.prepend(p,b);persist=save;switchAccount();window.addEventListener('frlearningchange',switchAccount);window.addEventListener('online',()=>void sync());window.addEventListener('focus',()=>void sync());}
boot();
})();
