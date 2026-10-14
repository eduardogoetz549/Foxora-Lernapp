function translateServerError(message){if(!message)return '';const errors={"Bitte zuerst anmelden.":"Please sign in first.","Ungültiges Kartenset.":"Invalid flashcard set.","Füge mindestens eine Karte hinzu.":"Add at least one card.","Ungültige Lernkarte.":"Invalid flashcard.","Kostenlos sind maximal 3 Karteien möglich. Weitere Karteien gehören zu Premium.":"Free accounts can save up to 3 sets across all languages. Additional sets require Premium.","Kostenlos sind maximal 30 Karten pro Kartei möglich. Bestehende Karten bleiben erhalten.":"Free sets can contain up to 30 cards. Existing cards are preserved.",'Bitte melde dich zuerst an.':'Please sign in first.','Die Anfrage konnte nicht verarbeitet werden. Bitte später erneut versuchen.':'The request could not be processed. Please try again later.','Diese Übung gehört zu Premium.':'This exercise requires Premium.','Du hast diese Woche bereits zwei Einheiten gestartet.':'You have already started two sessions this week.','Die Zahlung konnte nicht gestartet werden.':'Payment could not be started.','Du hast bereits Premium.':'You already have Premium.','Es besteht bereits ein Abo. Nutze Abo verwalten.':'A subscription already exists. Use Manage subscription.'};return errors[message]||'The server could not complete this request. Please try again or contact the site owner.';}
(() => {
 'use strict';
 if (window.__foxoraGermanCoreStarted) return;
 window.__foxoraGermanCoreStarted = true;
/* French learning progress: local event log and account-specific cloud sync. */
(() => {
  'use strict';
  const URL = 'https://npbiccwpyetefnlmjihd.supabase.co';
  const KEY = 'sb_publishable_b3PsFQ0rO-lYqbbr05e2Qg_-sGGgjSp';
  const TABLE = 'fr_learning_events';
  const PREFIX = 'de_en_learning_events_v1:';
  let actor = 'guest', client = null, syncing = false, initialized = false;
  let resyncRequested = false;
  let status = 'Loading your learning history …';
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; } };
  const events = () => { const value=read(PREFIX+actor); return Array.isArray(value)?value.filter(e=>String(e?.module||'').startsWith('de_en_')):[]; };
  function write(value) {
    try { localStorage.setItem(PREFIX+actor,JSON.stringify(value)); }
    catch (_) { status='Your browser could not save your progress.'; }
  }
  function notify() { window.dispatchEvent(new CustomEvent('frlearningchange')); }
  const ordered = () => events().sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));
  function summary() {
    // Preserve existing guest totals until the first new event. Account data stays separate.
    const list=ordered(), old=null;
    const result={xp:0,total:0,correct:0,streak:0,day:{answered:0,correct:0},daily:{},modules:{},history:[]};
    if(old && !list.length) return {...result,...old,day:old.daily?.[dayKey()]||result.day};
    const rounds={};
    for(const e of list) {
      const m=result.modules[e.module] ||= {questions:{},answered:0,correct:0,completed:0};
      if(e.kind==='answer') {
        result.total++; result.correct+=e.ok?1:0; result.xp+=e.ok?10:2;
        const daily=result.daily[e.date] ||= {answered:0,correct:0};daily.answered++;daily.correct+=e.ok?1:0;
        m.answered++;m.correct+=e.ok?1:0;
        const q=m.questions[e.question] ||= {strength:0,wrong:0,correct:0,spacedCorrect:0,unresolvedError:false};
        const previous=Date.parse(q.last), at=Date.parse(e.at);
        const spaced=Number.isFinite(previous)&&at-previous>=86400000;
        q.attempts=(q.attempts||0)+1;
        if(e.ok){
          q.correct++;q.strength=Math.min(3,q.strength+1);
          if(spaced&&e.details?.quality!=='assisted'&&e.details?.quality!=='hard')q.spacedCorrect++;
          q.reviewStage=Math.min(5,(q.reviewStage||0)+((q.attempts===1||spaced)&&e.details?.quality!=='assisted'&&e.details?.quality!=='hard'?1:0));
          if(spaced)q.unresolvedError=false;
        }else{
          q.wrong++;q.strength=Math.max(0,q.strength-1);
          q.reviewStage=Math.max(0,(q.reviewStage||0)-2);
          q.spacedCorrect=0;q.unresolvedError=true;
        }
        q.last= e.at;q.text=e.text;
        q.lastCorrect=!!e.ok;
        // Optional quality is explicit; old events remain valid without it.
        const quality=e.details?.quality;
        const days=e.ok?[0,1,3,7,14,30][q.reviewStage]:0;
        const interval=quality==='assisted'?Math.min(1,days):quality==='hard'?Math.min(3,days):days;
        q.due=new Date(at+interval*86400000).toISOString();
        q.consolidated=!q.unresolvedError&&q.spacedCorrect>=4&&q.reviewStage>=5;

        const round=rounds[e.module] ||= {answered:0,correct:0};round.answered++;round.correct+=e.ok?1:0;
      } else if(e.kind==='finish') {
        const round=rounds[e.module]||{answered:0,correct:0};
        result.history.push({module:e.module,date:e.date,pct:e.pct,at:e.at,...round,wrong:round.answered-round.correct});
        m.completed++;m.lastScore=e.pct;m.best=Math.max(m.best||0,e.pct);rounds[e.module]={answered:0,correct:0};
      }
    }
    result.day=result.daily[dayKey()]||result.day;
    let cursor=new Date();cursor.setHours(12,0,0,0);
    if(!result.daily[dayKey(cursor)])cursor.setDate(cursor.getDate()-1);
    while(result.daily[dayKey(cursor)]){result.streak++;cursor.setDate(cursor.getDate()-1);}
    return result;
  }
  function add(data) {
    if(!initialized) return;
    const now=new Date();
    const event={id:crypto.randomUUID(),at:now.toISOString(),date:dayKey(now),...data};
    const list=events();list.push(event);write(list);notify();void sync();
  }
  async function sync() {
    if(!client || actor==='guest')return;
    if(syncing){resyncRequested=true;return;}
    const owner=actor;syncing=true;
    try {
      // Idempotent immutable events avoid overwriting another device's progress.
      const list=events();
      for(let i=0;i<list.length;i+=100) {
        const {error}=await client.from(TABLE).upsert(list.slice(i,i+100).map(e=>({user_id:owner,event_id:e.id,payload:e})),{onConflict:'user_id,event_id',ignoreDuplicates:true});
        if(error)throw error;
      }
      const remote=[];
      for(let offset=0;;offset+=1000) {
        const {data,error}=await client.from(TABLE).select('payload').eq('user_id',owner).order('event_id').range(offset,offset+999);
        if(error)throw error;remote.push(...data.map(row=>row.payload).filter(e=>typeof e?.module==='string'&&e.module.startsWith('de_en_')));if(data.length<1000)break;
      }
      if(actor!==owner)return;
      const merged=new Map([...remote,...events()].map(e=>[e.id,e]));write([...merged.values()]);status='Progress synced with your account.';
    } catch (_) {
      if(actor===owner)status='Saved locally. Cloud sync failed; check your connection and account setup.';
    } finally { syncing=false;notify();if(resyncRequested){resyncRequested=false;setTimeout(()=>{void sync();},0);} }
  }
  function loadSDK() {
    if(window.supabase)return Promise.resolve(window.supabase);
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload=()=>resolve(window.supabase);script.onerror=reject;document.head.appendChild(script);
    });
  }
  let readyResolve;
  const ready=new Promise(resolve=>readyResolve=resolve);
  const api={ready,summary,events:()=>ordered().map(e=>({...e})),get events(){return ordered();},level:xp=>Math.floor(Math.max(0,xp)/100)+1,
    get client(){return client;},get status(){return status;},get account(){return actor;},sync,
    record(module,id,ok,review=false,text='',details=null) {
      add({kind:'answer',module,question:String(id),ok:!!ok,review:!!review,text:String(text).slice(0,500),...(details ? {details:Object.fromEntries(['own','right','prompt','explanation','topic','file','type'].map(k=>[k,String(details[k]??'').replace(/<[^>]*>/g,'').slice(0,800)]).concat([['unanswered',!!details.unanswered],['quality',['assisted','hard','normal'].includes(details.quality)?details.quality:'normal']]))} : {})});
    },
    finish(module,pct){add({kind:'finish',module,pct:Math.min(100,Math.max(0,Number(pct)||0))});},
    dueScore(module,id){const q=summary().modules[module]?.questions?.[String(id)];return !q?100:Date.parse(q.due)<=Date.now()?200+(q.unresolvedError?100:0)+Math.min(60,q.wrong*5)+Math.min(60,Math.max(0,(Date.now()-Date.parse(q.due))/86400000)):10-q.strength;},
    moduleData(module) {
      const m=summary().modules[module];
      if(!m)return actor==='guest'?(read(module)||{}):{};
      return {totalAttempts:m.answered,totalCorrect:m.correct,completed:m.completed,lastScore:m.lastScore,best:m.best,
        mastery:Object.fromEntries(Object.entries(m.questions).map(([id,q])=>[id,q.strength])),
        wrongIds:Object.entries(m.questions).filter(([,q])=>q.unresolvedError).map(([id])=>Number(id)),
        historicalWrongIds:Object.entries(m.questions).filter(([,q])=>q.wrong>0).map(([id])=>Number(id)),
        dueIds:Object.entries(m.questions).filter(([,q])=>Date.parse(q.due)<=Date.now()).map(([id])=>Number(id)),
        consolidatedIds:Object.entries(m.questions).filter(([,q])=>q.consolidated).map(([id])=>Number(id))};
    },
    saveModuleData(module,data){try{localStorage.setItem('de_en_module_cache_v1:'+actor+':'+module,JSON.stringify(data));}catch(_){}},
  };
  window.FRLearning=api;
  (async()=>{
    try {
      const sdk=await loadSDK();client=sdk.createClient(URL,KEY,{auth:{detectSessionInUrl:!window.FRRecovery?.arrival}});
      client.auth.onAuthStateChange((event,session)=>{window.FRRecovery?.mark(event,session);});
      if(window.FRRecovery?.arrival)await window.FRRecovery.initialize(client);
      const {data,error}=await client.auth.getSession();if(error)throw error;
      actor=data.session?.user?.id||'guest';initialized=true;
      status=actor==='guest'?'Progress is saved on this device.':'Syncing progress …';
      if(window.FRRecovery?.arrival)void sync();else await sync();
      client.auth.onAuthStateChange((_event,session)=>{
        const next=session?.user?.id||'guest';if(next===actor)return;
        actor=next;status=actor==='guest'?'Guest mode: saved locally.':'Syncing progress …';
        notify();setTimeout(()=>{void sync();},0);
      });
    } catch (_) {initialized=true;status='Offline: progress is saved locally as a guest.';}
    finally {readyResolve();notify();}
  })();
  window.addEventListener('online',()=>{void sync();});
  window.addEventListener('storage',event=>{if(event.key===PREFIX+actor)notify();});
})();

/* Premium: Anmeldung prüfen und die Supabase-Funktionen aufrufen. */
(() => {
  'use strict';
  const base = 'https://npbiccwpyetefnlmjihd.supabase.co/functions/v1/';
  const key = 'sb_publishable_b3PsFQ0rO-lYqbbr05e2Qg_-sGGgjSp';

  async function call(name, body = {}) {
    await window.FRLearning.ready;
    const client = window.FRLearning.client;
    if (!client) throw new Error('Sign-in could not load. Reload the page.');
    const { data, error } = await client.auth.getSession();
    if (error || !data.session) throw new Error('Please sign in first.');

    let response;
    try {
      response = await fetch(base + name, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + data.session.access_token,
          apikey: key,
        },
        body: JSON.stringify(body),
      });
    } catch (_) {
      throw new Error('Premium could not be reached. Check your connection and account setup.');
    }

    let result;
    try { result = await response.json(); }
    catch (_) { throw new Error('Premium returned an invalid response.'); }
    if (!response.ok) {
      throw new Error(translateServerError(result?.error || result?.message) || 'Premium request failed (HTTP ' + response.status + ').');
    }
    return result;
  }

  async function redirect(name) {
    const result = await call(name);
    let destination;
    try { destination = new URL(result.url); }
    catch (_) { throw new Error('Stripe did not return a valid payment link.'); }
    if (destination.protocol !== 'https:' ||
        !['checkout.stripe.com', 'billing.stripe.com'].includes(destination.hostname)) {
      throw new Error('Stripe returned an unexpected payment link.');
    }
    window.location.assign(destination.href);
  }

  window.FRPremium = {
    call,
    status: () => call('premium-access', { action: 'status' }),
    checkout: () => redirect('create-checkout'),
    portal: () => redirect('customer-portal'),
    protectedFile: file => /^deutsch-en-(?:[a-z]+(?:-[a-z]+)*-[23]-oberstufe(?:-mit-gemischten-schreibuebungen)?|pruefung-[123]-oberstufe)\.html$/.test(file) || file === 'deutsch-en-15-minuten-lerneinheit.html',
  };
})();


// Personal greeting in existing fox bubbles on every page using learning-core.
(() => {
 let name = '';
 let observer;
 function paint() {
  observer?.disconnect();
  document.querySelectorAll('#foxBubble, .fox-bubble').forEach(bubble => {
   const previous = bubble.querySelector('[data-fox-name]');
   if (previous && previous.textContent === name + ', ' && name) return;
   if (previous) previous.remove();
   if (name && bubble.textContent.trim()) {
    const greeting = document.createElement('span');
    greeting.dataset.foxName = '1';
    greeting.textContent = name + ', ';
    bubble.prepend(greeting);
   }
  });
  if (document.body) observer.observe(document.body, {childList:true,subtree:true,characterData:true});
 }
 function sessionName(session) {
  const value = session?.user?.user_metadata?.name;
  name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0,60) : '';
  paint();
 }
 async function start() {
  observer = new MutationObserver(paint);
  paint();
  await window.FRLearning.ready;
  const client = window.FRLearning.client;
  if (!client) return;
  client.auth.onAuthStateChange((_event,session) => sessionName(session));
  const {data} = await client.auth.getSession();
  sessionName(data.session);
 }
 window.addEventListener('frpremiumlessonloaded', paint);
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => start().catch(()=>{}), {once:true});
 else start().catch(()=>{});
})();
})();
