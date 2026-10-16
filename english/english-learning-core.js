(() => {
 'use strict';
 if (window.__foxoraLearningCoreStarted) return;
 window.__foxoraLearningCoreStarted = true;
/* English learning progress; shared Foxora account and Supabase session. */
(() => {
  'use strict';
  const URL = 'https://npbiccwpyetefnlmjihd.supabase.co';
  const KEY = 'sb_publishable_b3PsFQ0rO-lYqbbr05e2Qg_-sGGgjSp';
  const TABLE = 'fr_learning_events';
  const PREFIX = 'en_learning_events_v1:';
  let actor = 'guest', client = null, syncing = false, initialized = false;
  let resyncRequested = false;
  let status = 'Lernspeicher wird geladen …';
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; } };
  const events = () => { const value=read(PREFIX+actor); return Array.isArray(value)?value.filter(e=>String(e?.module||'').startsWith('en_')):[]; };
  function write(value) {
    try { localStorage.setItem(PREFIX+actor,JSON.stringify(value)); }
    catch (_) { status='Der Browser konnte den Fortschritt nicht speichern.'; }
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
    const now=new Date(Math.max(Date.now(),events().reduce((n,e)=>Math.max(n,Date.parse(e.at)||0),0)+1));
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
        if(error)throw error;remote.push(...data.map(row=>row.payload).filter(e=>String(e?.module||'').startsWith('en_')));if(data.length<1000)break;
      }
      if(actor!==owner)return;
      const merged=new Map([...remote,...events()].map(e=>[e.id,e]));write([...merged.values()]);status='Fortschritt mit deinem Konto synchronisiert.';
    } catch (_) {
      if(actor===owner)status='Lokal gespeichert. Cloud-Synchronisierung nicht möglich: Internetverbindung und Supabase-Einrichtung prüfen.';
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
  const api={ready,summary,beginnerCheckpoint(lesson,step){if(!Number.isInteger(lesson)||lesson<0||lesson>=6||!Number.isInteger(step)||step<0||step>6)return;const previous=ordered().filter(e=>e.kind==='beginnerCheckpoint'&&e.module==='en_beginner_progress').at(-1);const stamp=Math.max(Date.now(),(Date.parse(previous?.at)||0)+1);add({kind:'beginnerCheckpoint',module:'en_beginner_progress',lesson,step,at:new Date(stamp).toISOString()});return stamp;},
    events:()=>ordered().map(e=>({...e})),
    setting(key,fallback=null){const entry=ordered().filter(e=>e.kind==='setting'&&e.module==='en_settings'&&e.key===key).at(-1);return entry?entry.value:fallback;},
    setSetting(key,value){add({kind:'setting',module:'en_settings',key,value});},
    activeSeconds(seconds){if(Number.isFinite(seconds)&&seconds>0)add({kind:'activity',module:'en_activity',seconds:Math.min(60,Math.floor(seconds))});},
    todaySeconds(){return events().filter(e=>e.kind==='activity'&&e.date===dayKey()).reduce((n,e)=>n+Math.max(0,Math.min(60,Number(e.seconds)||0)),0);},
    guidanceMode(){const e=ordered().filter(e=>e.kind==='guidance'&&e.module==='en_guidance').at(-1);return e?.mode==='all'?'all':'guided';},
    setGuidanceMode(mode){add({kind:'guidance',module:'en_guidance',mode:mode==='all'?'all':'guided'});},
    level:xp=>Math.floor(Math.max(0,xp)/100)+1,
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
    saveModuleData(module,data){try{localStorage.setItem('en_module_cache_v1:'+actor+':'+module,JSON.stringify(data));}catch(_){}},
  };
  window.FRLearning=api;
  (async()=>{
    try {
      const sdk=await loadSDK();client=sdk.createClient(URL,KEY,{auth:{storageKey:'sb-npbiccwpyetefnlmjihd-auth-token',persistSession:true,autoRefreshToken:true,detectSessionInUrl:!window.FRRecovery?.arrival}});
      client.auth.onAuthStateChange((event,session)=>{window.FRRecovery?.mark(event,session);});
      if(window.FRRecovery?.arrival)await window.FRRecovery.initialize(client);
      const {data,error}=await client.auth.getSession();if(error)throw error;
      actor=data.session?.user?.id||'guest';initialized=true;
      status=actor==='guest'?'Fortschritt wird auf diesem Gerät gespeichert.':'Fortschritt wird synchronisiert …';
      if(window.FRRecovery?.arrival)void sync();else await sync();
      client.auth.onAuthStateChange((_event,session)=>{
        const next=session?.user?.id||'guest';if(next===actor)return;
        actor=next;status=actor==='guest'?'Gastmodus: lokal gespeichert.':'Fortschritt wird synchronisiert …';
        notify();setTimeout(()=>{void sync();},0);
      });
    } catch (_) {initialized=true;status='Offline: Fortschritt wird lokal als Gast gespeichert.';}
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
    if (!client) throw new Error('Die Anmeldung konnte nicht geladen werden. Lade die Seite neu.');
    const { data, error } = await client.auth.getSession();
    if (error || !data.session) throw new Error('Bitte melde dich zuerst an.');

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
      throw new Error('Die Premium-Funktion ist nicht erreichbar. Prüfe deine Internetverbindung und die Supabase-Einrichtung.');
    }

    let result;
    try { result = await response.json(); }
    catch (_) { throw new Error('Die Premium-Funktion hat eine ungültige Antwort gesendet.'); }
    if (!response.ok) {
      throw new Error(result?.error || result?.message || 'Premium-Anfrage fehlgeschlagen (HTTP ' + response.status + ').');
    }
    return result;
  }

  async function redirect(name) {
    const result = await call(name);
    let destination;
    try { destination = new URL(result.url); }
    catch (_) { throw new Error('Stripe hat keinen gültigen Zahlungslink zurückgegeben.'); }
    if (destination.protocol !== 'https:' ||
        !['checkout.stripe.com', 'billing.stripe.com'].includes(destination.hostname)) {
      throw new Error('Stripe hat einen unerwarteten Zahlungslink zurückgegeben.');
    }
    window.location.assign(destination.href);
  }

  window.FRPremium = {
    call,
    status: () => call('premium-access', { action: 'status' }),
    checkout: () => redirect('create-checkout'),
    portal: () => redirect('customer-portal'),
    protectedFile: file => /^(?:englisch-.*-[23]-oberstufe(?:-mit-gemischten-schreibuebungen)?|englisch-(?:grammatik-|alltag-)?pruefung-[123]-oberstufe|englisch-jetzt-anwenden-[23]|englisch-15-minuten-lerneinheit)\.html$/.test(file),
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