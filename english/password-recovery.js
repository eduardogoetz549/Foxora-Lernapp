(()=>{'use strict';
 const query=new URLSearchParams(location.search);
 // Older redirects included #Konto before Supabase's own fragment.
 const fragment=new URLSearchParams(location.hash.replace(/^#(?:Konto[#&])?/,''));
 const arrival=query.get('reset')==='1'||query.get('type')==='recovery'||fragment.get('type')==='recovery';
 const state={arrival,pending:arrival,valid:false,error:null,userId:null};
 const key='foxora:password-recovery:v1';
 const cleanURL=()=>{const url=new URL(location.href);for(const k of ['access_token','refresh_token','token_hash','code','type','error','error_code','error_description'])url.searchParams.delete(k);url.searchParams.set('reset','1');url.hash='Konto';history.replaceState(null,'',url.href);};
 const notify=()=>window.dispatchEvent(new CustomEvent('frrecoverychange'));
 const remember=session=>{if(!session?.user?.id)return;state.userId=session.user.id;state.valid=true;state.pending=false;state.error=null;try{sessionStorage.setItem(key,JSON.stringify({userId:state.userId,until:Date.now()+3600000}));}catch(_){};};
 function mark(event,session){if(event==='PASSWORD_RECOVERY'){state.arrival=true;window.FRRecoveryArrival=true;remember(session);notify();}if(event==='SIGNED_OUT'){state.valid=false;state.userId=null;try{sessionStorage.removeItem(key);}catch(_){};notify();}}
 async function initialize(client){
  if(!state.arrival)return;
  try{
   const err=fragment.get('error_description')||query.get('error_description')||fragment.get('error')||query.get('error');if(err)throw new Error('Der Passwort-Link ist abgelaufen oder ungültig. Fordere einen neuen Link an.');
   let result;const access=fragment.get('access_token')||query.get('access_token'),refresh=fragment.get('refresh_token')||query.get('refresh_token');
   if(access||refresh){if(!access||!refresh)throw new Error('Der Passwort-Link ist unvollständig. Fordere einen neuen Link an.');result=await client.auth.setSession({access_token:access,refresh_token:refresh});}
   else if(query.get('token_hash'))result=await client.auth.verifyOtp({token_hash:query.get('token_hash'),type:'recovery'});
   else if(query.get('code'))result=await client.auth.exchangeCodeForSession(query.get('code'));
   else{
    const {data,error}=await client.auth.getSession();if(error)throw error;
    let previous;try{previous=JSON.parse(sessionStorage.getItem(key));}catch(_){}
    if(!previous||previous.until<Date.now()||previous.userId!==data.session?.user?.id)throw new Error('Dieser Link enthält keine gültige Passwort-Freigabe. Fordere eine neue Passwort-Mail an und öffne deren Bestätigungslink.');
    result={data,error:null};
   }
   if(result.error)throw result.error;
   const session=result.data?.session;if(!session?.user?.id)throw new Error('Der Passwort-Link konnte nicht bestätigt werden. Fordere einen neuen Link an.');
   const checked=await client.auth.getUser();if(checked.error||checked.data?.user?.id!==session.user.id)throw new Error('Der Passwort-Link konnte nicht bestätigt werden. Fordere einen neuen Link an.');
   remember(session);
  }catch(_){state.valid=false;state.userId=null;state.error='Der Passwort-Link ist ungültig, abgelaufen oder konnte nicht geprüft werden. Fordere eine neue Passwort-Mail an und öffne den neuesten Link. Du musst dich dafür nicht zuerst anmelden.';try{sessionStorage.removeItem(key);}catch(_){};}
  finally{state.pending=false;cleanURL();notify();}
 }
 function complete(){state.arrival=false;state.pending=false;state.valid=false;state.userId=null;window.FRRecoveryArrival=false;try{sessionStorage.removeItem(key);}catch(_){};}
 window.FRRecovery=Object.assign(state,{initialize,mark,complete});window.FRRecoveryArrival=arrival;
 if(arrival){document.documentElement.classList.add('foxora-recovery');const style=document.createElement('style');style.textContent='html.foxora-recovery #accountForm,html.foxora-recovery #accountSignedIn{display:none!important}html.foxora-recovery #accountResetForm{display:block!important}';document.head.appendChild(style);}
})();
