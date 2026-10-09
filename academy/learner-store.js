'use strict';
window.LearnerStore = (() => {
 const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fresh=()=>({progress:{},notes:{},drafts:{},reviews:{},track:'python',lesson:'py-first',read:[],journey:{}});
 const normalize=data=>{const s=fresh();if(!data||typeof data!=='object')return s;for(const k of ['progress','notes','drafts','reviews','journey'])if(data[k]&&typeof data[k]==='object'&&!Array.isArray(data[k]))s[k]=data[k];for(const k of ['track','lesson'])if(typeof data[k]==='string')s[k]=data[k];if(Array.isArray(data.read))s.read=data.read;return s;};
 const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
 let profiles=read('studio:profiles',[{id:'guest',name:'Guest'}]);
 if(!Array.isArray(profiles)||!profiles.length)profiles=[{id:'guest',name:'Guest'}];
 profiles=profiles.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string');
 if(!profiles.some(p=>p.id==='guest'))profiles.unshift({id:'guest',name:'Guest'});
 let active=read('studio:active','guest');if(!profiles.some(p=>p.id===active))active='guest';
 const localKey=()=>active==='guest'?'ak:studio:v1':`studio:local:${active}`;
 let current=normalize(read(localKey(),null)),client=null,user=null,revision=null,dirty=false,timer=null,inFlight=null,epoch=0,ready=true,conflict=false,message='Saved on this device',config={},listeners=[],recovery=false,googleEnabled=false;
 const status=text=>{message=text;const e=$('#storage-state');if(e)e.textContent=text;const b=$('#account-button');if(b)b.textContent=user?'My account':profiles.find(p=>p.id===active)?.name==='Guest'?'Sign in / profiles':profiles.find(p=>p.id===active)?.name||'Profiles';const m=$('#account-status');if(m)m.textContent=text;};
 const emit=()=>{for(const fn of listeners)fn(current);status(message);};
 function save(value){current=value;if(!user){try{localStorage.setItem(localKey(),JSON.stringify(value));status('Saved on this device');}catch{status('Device storage unavailable — export a backup');}return;}dirty=true;status(ready&&!conflict?'Saving to your account…':'Not synced — open My account');clearTimeout(timer);timer=setTimeout(()=>flush(),900);}
 async function flush(){
  clearTimeout(timer);if(inFlight){await inFlight;if(dirty)return flush();return;}
  if(!user||!dirty||!ready||conflict)return;
  const owner=user.id,generation=epoch,payload=JSON.parse(JSON.stringify(current)),base=revision;dirty=false;
  inFlight=(async()=>{try{
   const row={user_id:owner,payload,revision:(base??0)+1};
   const query=base===null?client.from('learner_progress').insert(row):client.from('learner_progress').update({payload:row.payload,revision:row.revision}).eq('user_id',owner).eq('revision',base);
   const {data,error}=await query.select('revision').maybeSingle();
   if(generation!==epoch)return;
   if(error){if(error.code==='23505')conflict=true;throw error;}
   if(!data){conflict=true;throw Error('Another device saved newer progress.');}
   revision=data.revision;status(dirty?'Saving recent edits…':'Synced to your account');
  }catch(error){if(generation!==epoch)return;dirty=true;status(conflict?'Sync conflict — export then reload cloud progress':'Not synced — export a backup or retry');}
  finally{inFlight=null;}})();await inFlight;
 }
 async function loadUser(next){
  epoch++;if(!next)recovery=false;clearTimeout(timer);user=next;dirty=false;conflict=false;revision=null;ready=false;current=fresh();emit();
  if(!user){current=normalize(read(localKey(),null));ready=true;status('Saved on this device');emit();return;}
  const generation=epoch;status('Loading your private progress…');
  try{const {data,error}=await client.from('learner_progress').select('payload,revision').eq('user_id',user.id).maybeSingle();if(error)throw error;if(generation!==epoch)return;current=normalize(data?.payload);revision=data?.revision??null;ready=true;status('Synced to your account');emit();}
  catch{if(generation!==epoch)return;status('Cloud progress could not load — retry before editing');emit();}
 }
 async function init(){
  try{const response=await fetch('academy/accounts.json?v=13');if(response.ok)config=await response.json();}catch{}
  if(config.supabaseUrl&&config.publishableKey){
   try{
    if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl)||!config.publishableKey.startsWith('sb_publishable_'))throw Error('Invalid public account configuration');
    const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm');
    // Cloud session and progress are not retained after the browser tab closes.
    client=createClient(config.supabaseUrl,config.publishableKey,{auth:{flowType:'pkce',storage:AccountStorage.create(sessionStorage,localStorage),persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    try{const r=await fetch(config.supabaseUrl+'/auth/v1/settings',{headers:{apikey:config.publishableKey},signal:AbortSignal.timeout(5000)});if(r.ok)googleEnabled=(await r.json()).external?.google===true;}catch{}
    recovery=new URL(location.href).searchParams.get('recovery')==='1';
    client.auth.onAuthStateChange((_event,session)=>{if(_event==='PASSWORD_RECOVERY'){recovery=true;setTimeout(()=>{if(user)show();},0);}const next=session?.user??null;if(next?.id!==user?.id)setTimeout(()=>{if(next?.id!==user?.id)loadUser(next);},0);});
    const {data,error}=await client.auth.getSession();if(error)throw error;
    await loadUser(data.session?.user??null);if(recovery&&user)show();
   }catch{status('Account connection unavailable — using device profile');client=null;}
  }
  status(message);return current;
 }
 function download(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({version:1,...current},null,2)],{type:'application/json'}));a.download='my-learning-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
 async function switchLocal(id){if(user)return;save(current);active=id;try{localStorage.setItem('studio:active',JSON.stringify(active));}catch{}current=normalize(read(localKey(),null));status('Saved on this device');emit();}
 function show(){
  $('#account-dialog')?.remove();const dialog=document.createElement('dialog');dialog.id='account-dialog';dialog.className='account-dialog';
  dialog.innerHTML=`<form method="dialog"><button class="dialog-close secondary" aria-label="Close account panel">Close</button></form><div class="eyebrow">YOUR LEARNING SPACE</div><h2>${user?'Your account':'Make this journey yours'}</h2><p id="account-status" role="status">${esc(message)}</p>${user?`<p>Signed in as ${esc(user.email||'learner')}. Cloud progress belongs to this account. Signing out clears its in-memory work from this tab. Study timers continue until you finish them or their planned end; make a session private first if you want to stop sharing.</p><div class="button-row"><button class="primary" id="sync-retry">Retry sync</button><button class="secondary" id="cloud-reload">Reload cloud copy</button><button class="secondary" id="sign-out">Sign out</button></div><p class="lab-caption">If another device has newer progress, export this copy before reloading. Guest work is never automatically attached to an account.</p>`:`<p>Sign in to keep your roadmap, notes and project evidence together across devices.</p><button id="google-signin" class="primary" ${client&&googleEnabled?'':'disabled'}>Continue with Google</button>${client&&!googleEnabled?'<p class="lab-caption">Google sign-in is unavailable on this installation. Use email below.</p>':''}<form id="email-auth"><h3>Use email and password</h3><p class="lab-caption">New here? Choose Create account first, confirm your email, then sign in.</p><label class="field-label" for="auth-email">Email</label><input type="email" id="auth-email" required autocomplete="email"><label class="field-label" for="auth-password">Password (at least 10 characters for a new account)</label><input type="password" id="auth-password" required autocomplete="current-password"><div class="button-row"><button class="primary" type="submit" ${client?'':'disabled'}>Sign in</button><button class="secondary" type="button" id="email-signup" ${client?'':'disabled'}>Create account</button><button class="secondary" type="button" id="email-resend" ${client?'':'disabled'}>Resend confirmation email</button><button class="secondary" type="button" id="email-reset" ${client?'':'disabled'}>Forgot password</button></div><p class="lab-caption">Email confirmation may be required. This shared-device session lasts in this tab; sign out when finished.</p></form>${client?'':'<p class="notice">Cloud accounts are not enabled on this installation yet. Device profiles below work now. Your site owner needs to connect the account service before Google sign-in becomes available.</p>'}<hr><h3>Use a device profile</h3><p>Separate progress for people sharing this browser. These profiles have no password and are <strong>not private from other people using this device</strong>.</p><div class="profile-list">${profiles.map(p=>`<button class="secondary" data-profile="${esc(p.id)}">${esc(p.name)}${p.id===active?' · current':''}</button>`).join('')}</div><form id="profile-form"><label class="field-label" for="profile-name">New learner name</label><input id="profile-name" maxlength="40" required autocomplete="off" placeholder="A nickname is enough"><button class="primary" type="submit">Create device profile</button></form>`}${user&&recovery?'<form id="password-recovery"><label for="new-password">New password</label><input id="new-password" type="password" minlength="10" required autocomplete="new-password"><button class="primary">Save new password</button></form>':''}<div class="button-row"><button class="secondary" id="account-export">Export my progress</button></div><p class="lab-caption">Exported backups contain your notes. Store them privately. Signing in does not unlock the private source textbooks.</p>`;
  document.body.append(dialog);dialog.showModal();$('#account-export').onclick=download;
  if(user){
   if(recovery)$('#password-recovery').onsubmit=async e=>{e.preventDefault();const {error}=await client.auth.updateUser({password:$('#new-password').value});if(error)status(error.message);else{recovery=false;const url=new URL(location.href);url.searchParams.delete('recovery');history.replaceState(null,'',url);status('Password updated');show();}};
   $('#sync-retry').onclick=async()=>{if(!ready&&!dirty)await loadUser(user);else await flush();show();};
   $('#cloud-reload').onclick=async()=>{if(dirty&&!confirm('This replaces unsynced edits in this tab. Export a backup first if you need them. Reload?'))return;await loadUser(user);show();};
   $('#sign-out').onclick=async()=>{await flush();if(dirty&&!confirm('Some edits have not synced. Export them before signing out. Discard unsynced edits and sign out?'))return;const {error}=await client.auth.signOut({scope:'local'});if(error){status('Sign-out failed. Please retry.');return;}await loadUser(null);show();};
  }else{
   $('#google-signin').onclick=async()=>{const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}});if(error)status('Sign-in could not start. Please retry.');};
   const authAction=async mode=>{if(!client)return;const email=$('#auth-email').value.trim(),password=$('#auth-password').value;if(!$('#auth-email').reportValidity())return;if(!['reset','resend'].includes(mode)&&!password){status('Enter your password');return;}if(mode==='signup'&&password.length<10){status('Use at least 10 characters');return;}const buttons=[...$('#email-auth').querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);try{let result;if(mode==='signup')result=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});else if(mode==='resend')result=await client.auth.resend({type:'signup',email,options:{emailRedirectTo:location.origin+location.pathname}});else if(mode==='reset')result=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname+'?recovery=1'});else result=await client.auth.signInWithPassword({email,password});if(result.error)throw result.error;$('#auth-password').value='';status(mode==='signup'?'Check your email for confirmation if required.':mode==='reset'?'If available, a password reset link has been requested.':mode==='resend'?'Confirmation requested. Check inbox/spam and open the link in this browser.':'Signed in');if(result.data?.session){await loadUser(result.data.session.user);show();}}catch(error){const code=error.code||'';status(code==='email_not_confirmed'?'Confirm your email first. Check inbox/spam or tap Resend confirmation email.':code==='invalid_credentials'?'Email or password did not match. New here? Choose Create account first.':code==='over_email_send_rate_limit'||code==='over_request_rate_limit'?'Email limit reached. Wait before requesting another link, then try again.':error.message||'Sign-in unavailable. Please retry.');}finally{buttons.forEach(b=>b.disabled=false);}};
   $('#email-auth').onsubmit=e=>{e.preventDefault();authAction('signin');};$('#email-signup').onclick=()=>authAction('signup');$('#email-reset').onclick=()=>authAction('reset');$('#email-resend').onclick=()=>authAction('resend');
   dialog.querySelectorAll('[data-profile]').forEach(b=>b.onclick=async()=>{await switchLocal(b.dataset.profile);show();});
   $('#profile-form').onsubmit=async e=>{e.preventDefault();const name=$('#profile-name').value.trim();if(!name)return;const id=crypto.randomUUID();profiles.push({id,name});try{localStorage.setItem('studio:profiles',JSON.stringify(profiles));}catch{}await switchLocal(id);show();};
  }
 }
 addEventListener('beforeunload',e=>{if(user&&dirty){e.preventDefault();e.returnValue='';}});
 return {init,save,show,download,normalize,subscribe:fn=>listeners.push(fn),status:()=>status(message),connection:()=>({client,user,localId:active,name:profiles.find(p=>p.id===active)?.name||'Learner'}),canEdit:()=>!user||ready};
})();
