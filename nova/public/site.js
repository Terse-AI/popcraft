/* NOVA's page: language, accounts, the player that takes over the screen, and the bridge that keeps a game's save in your account */
(function(){
const $=s=>document.querySelector(s), boot=JSON.parse($('#boot').textContent), game=boot.game, GAME_ORIGIN='https://popcraft-production.up.railway.app';
let lang=null; try{ lang=localStorage.getItem('nova_lang'); }catch(e){} if(!lang) lang=(navigator.language||'').startsWith('zh')?'zh':'en';
const T=(zh,en)=>lang==='zh'?zh:en;
function applyLang(){ document.documentElement.lang=lang; document.querySelectorAll('[data-en]').forEach(e=>{ if(e.dataset.zh===undefined) e.dataset.zh=e.textContent; e.textContent=lang==='en'?e.dataset.en:e.dataset.zh; }); document.querySelectorAll('[data-en-ph]').forEach(e=>{ if(e.dataset.zhPh===undefined) e.dataset.zhPh=e.placeholder; e.placeholder=lang==='en'?e.dataset.enPh:e.dataset.zhPh; }); const l=$('#lang'); if(l) l.textContent=lang==='en'?'中文':'EN'; paintSave(); }
$('#lang').onclick=()=>{ lang=lang==='en'?'zh':'en'; try{ localStorage.setItem('nova_lang',lang); }catch(e){} applyLang(); };
if(!document.body.classList.contains('solidnav')){ const f=()=>$('#nav').classList.toggle('on',scrollY>40); addEventListener('scroll',f,{passive:true}); f(); }
function toast(t){ let e=$('#toast'); if(e) e.remove(); e=document.createElement('div'); e.id='toast'; e.textContent=t; document.body.appendChild(e); setTimeout(()=>e.remove(),2400); }
function ask(title,text,yes,no){ return new Promise(ok=>{ const d=document.createElement('div'); d.id='dlg'; d.innerHTML='<div><h3></h3><p></p><div class="cta"><button class="btn" data-a="0"></button><button class="btn solid" data-a="1"></button></div></div>'; d.querySelector('h3').textContent=title; d.querySelector('p').textContent=text; d.querySelector('[data-a="1"]').textContent=yes; d.querySelector('[data-a="0"]').textContent=no; d.onclick=e=>{ const a=e.target.dataset&&e.target.dataset.a; if(a!==undefined||e.target===d){ d.remove(); ok(a==='1'); } }; document.body.appendChild(d); }); }

/* accounts */
const clerk={ready:false};
const token=async()=>{ try{ return window.Clerk&&Clerk.session?await Clerk.session.getToken():null; }catch(e){ return null; } };
function paintAuth(){ const a=$('#auth'); if(!a||!clerk.ready) return; a.innerHTML=''; if(Clerk.user){ const b=document.createElement('div'); a.appendChild(b); Clerk.mountUserButton(b,{afterSignOutUrl:location.pathname}); } else { const b=document.createElement('button'); b.textContent=T('登录','Sign in'); b.onclick=()=>signIn(); a.appendChild(b); } }
function signIn(){ return new Promise(ok=>{ if(!clerk.ready) return ok(false); if(Clerk.user) return ok(true); const stop=Clerk.addListener(({user})=>{ if(user){ stop&&stop(); ok(true); } }); Clerk.openSignIn({}); }); }
addEventListener('load',async()=>{ if(!boot.clerk||!window.Clerk){ waitClerk(); return; } start(); });
let authReady; const authP=new Promise(r=>authReady=r);
window.NovaSite={T,toast,ask,token,signIn,applyLang,authed:authP,get lang(){ return lang; }};
function waitClerk(){ let n=0; const t=setInterval(()=>{ if(window.Clerk){ clearInterval(t); start(); } else if(++n>40){ clearInterval(t); refreshSave(); } },250); }
async function start(){ try{ await Clerk.load(); clerk.ready=true; paintAuth(); Clerk.addListener(()=>{ paintAuth(); refreshSave(); }); refreshSave(); }catch(e){ console.warn('clerk',e); } authReady&&authReady(); }

/* the launcher: continue if a save exists, otherwise a new game */
let save=null;
const SEASON=[['春','Spring'],['夏','Summer'],['秋','Fall'],['冬','Winter']];
async function refreshSave(){ if(!game||!game.saves) return paintSave(); const t=await token(); if(!t){ save=null; return paintSave(); } try{ const r=await fetch('/api/saves/'+game.slug,{headers:{Authorization:'Bearer '+t}}); save=(await r.json()).save; }catch(e){ save=null; } paintSave(); }
function paintSave(){ const main=$('#mainplay'), alt=$('#altplay'), line=$('#saveline'); if(!main||!game) return; if(!game.saves){ main.textContent=T('开始玩','Start playing'); return; }
  if(save){ const m=save.meta||{}, s=SEASON[m.season||0]; line.hidden=false; line.textContent=T('存档 · ','Save · ')+T(s[0]+' 第 '+(m.day||1)+' 天',s[1]+' day '+(m.day||1))+' · '+(m.gold||0)+'g'; main.textContent=T('继续游戏','Continue'); if(alt) alt.textContent=T('新游戏','New game'); }
  else { line.hidden=true; main.textContent=T('开始新游戏','New game'); if(alt) alt.textContent=T('读取存档','Load save'); } }
async function onMain(){ if(!game) return; if(!game.saves) return play(game); if(save) return play(game,'continue'); play(game,'new'); }
async function onAlt(){ if(save){ if(await ask(T('开始新游戏?','Start a new game?'),T('下次保存时,新进度会覆盖现在的存档。','Your current save is replaced the next time you save.'),T('开始','Start'),T('取消','Cancel'))) play(game,'new'); return; }
  if(window.Clerk&&Clerk.user){ await refreshSave(); if(save) return play(game,'continue'); return toast(T('还没有存档,先开始新游戏吧','No save yet. Start a new game.')); }
  await signIn(); await refreshSave(); if(save) play(game,'continue'); else toast(T('这个账号还没有存档','No save on this account yet')); }
if($('#mainplay')) $('#mainplay').onclick=onMain; if($('#altplay')) $('#altplay').onclick=onAlt;

/* play: one click, and the game fills the screen */
const box=$('#player'); let frame=null;
const full=()=>{ if(box.requestFullscreen) box.requestFullscreen().catch(()=>{}); else if(box.webkitRequestFullscreen) box.webkitRequestFullscreen(); };
function play(g,mode='new'){ if(frame) return; box.hidden=false; document.body.style.overflow='hidden'; full(); frame=document.createElement('iframe'); frame.allow='autoplay; fullscreen; gamepad; clipboard-write'; const lo=document.createElement('div'); lo.id='ploading'; const lt=document.createElement('b'), lb=document.createElement('i'); lt.textContent=g.title; lo.append(lt,lb); box.appendChild(lo); const ready=()=>{ lo.classList.add('off'); setTimeout(()=>lo.remove(),600); }; box.__ready=ready; setTimeout(ready,g.saves?45000:6000); if(g.saves) frame.src=g.url+'/?nova=1&mode='+mode+'&lang='+lang; else if(g.url) frame.src=g.url; else { frame.src='/raw/'+g.id+(g.site?'/':''); frame.setAttribute('sandbox','allow-scripts allow-pointer-lock allow-forms allow-popups'); } box.appendChild(frame); frame.onload=()=>{ if(!frame) return; frame.focus(); if(!g.saves) ready(); }; fetch('/api/play/'+g.id,{method:'POST'}).then(r=>r.json()).then(d=>{ const p=$('#plays'); if(p&&d.plays) p.textContent=d.plays; }).catch(()=>{}); }
function stop(){ if(document.fullscreenElement) document.exitFullscreen().catch(()=>{}); if(frame){ frame.remove(); frame=null; } box.hidden=true; document.body.style.overflow=''; refreshSave(); }
$('#pexit').onclick=stop; $('#pfull').onclick=full;
/* the game SDK: any game on NOVA can ask for the player, keep data, or read the backend its creator connected. Only the running frame is answered, and only for its own game */
addEventListener('message',async e=>{ const d=e.data; if(!d||!d.novaCall||!frame||e.source!==frame.contentWindow) return; const reply=result=>e.source.postMessage({novaReply:d.novaCall,result},e.origin==='null'?'*':e.origin), q=d.data&&d.data.key?'key='+encodeURIComponent(d.data.key)+'&':'';
  if(d.type==='ready'){ box.__ready&&box.__ready(); return reply({ok:true}); }
  if(d.type==='load'){ const t=await token(); if(!t) return reply({data:null}); try{ const r=await fetch('/api/saves/'+game.slug+'?'+q+'data=1',{headers:{Authorization:'Bearer '+t}}); const j=await r.json(); reply({data:j.save&&j.save.data}); }catch(x){ reply({data:null}); } }
  else if(d.type==='save'){ const t=await token(); if(!t) return reply({needAuth:true}); try{ const r=await fetch('/api/saves/'+game.slug+'?'+q,{method:'PUT',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(d.data)}); reply({ok:r.ok}); }catch(x){ reply({ok:false}); } }
  else if(d.type==='user'){ const u=window.Clerk&&Clerk.user; reply(u?{signedIn:true,id:u.id,name:u.firstName||u.username||''}:{signedIn:false}); }
  else if(d.type==='config'){ reply(game.sdk||{auth:{mode:'nova'},db:{mode:'nova'}}); }
  else if(d.type==='signin'){ if(document.fullscreenElement) await document.exitFullscreen().catch(()=>{}); const ok=await signIn(); reply({ok}); } });

/* game page */
if(game&&$('#like')){ $('#like').onclick=async()=>{ const r=await fetch('/api/like/'+game.id,{method:'POST'}); const j=await r.json(); $('#likes').textContent=j.likes; }; }
if($('#share')) $('#share').onclick=async()=>{ const u=location.origin+'/'+game.slug; if(navigator.share){ try{ await navigator.share({title:game.title,url:u}); return; }catch(e){ return; } } try{ await navigator.clipboard.writeText(u); toast(T('链接已复制','Link copied')); }catch(e){ prompt('',u); } };
if($('#csend')) $('#csend').onclick=async()=>{ const text=$('#ctext').value.trim(); if(!text) return; const name=$('#cname').value.trim()||T('玩家','Player'); await fetch('/api/comment/'+game.id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,text})}); const c=document.createElement('div'); c.className='cmt'; const b=document.createElement('b'); b.textContent=name; const p=document.createElement('p'); p.textContent=text; c.append(b,p); $('#cmts').prepend(c); $('#ctext').value=''; };

/* gallery search */
if($('#q')) $('#q').oninput=e=>{ const q=e.target.value.toLowerCase(); document.querySelectorAll('#grid .card').forEach(c=>c.style.display=c.textContent.toLowerCase().includes(q)?'':'none'); };

/* upload */
if($('#drop')){ const drop=$('#drop'), file=$('#file'); let picked=null; const err=m=>{ const e=$('#uerr'); e.textContent=m; e.hidden=!m; };
  const take=f=>{ if(!f) return; if(!/\.(html?|zip)$/i.test(f.name)) return err(T('请选择 HTML 或 ZIP 文件','Choose an HTML or ZIP file')); if(f.size>80*1024*1024) return err(T('文件超过 80 MB','That file is over 80 MB')); err(''); picked=f; drop.querySelector('b').textContent=f.name; drop.querySelector('span').textContent=(f.size/1048576).toFixed(1)+' MB'; $('#form').hidden=false; $('#title').value=f.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' '); $('#title').focus(); };
  file.onchange=()=>take(file.files[0]); ['dragover','dragenter'].forEach(ev=>drop.addEventListener(ev,e=>{ e.preventDefault(); drop.classList.add('over'); })); ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{ e.preventDefault(); drop.classList.remove('over'); })); drop.addEventListener('drop',e=>take(e.dataTransfer.files[0]));
  $('#pub').onclick=async()=>{ if(!picked) return; const title=$('#title').value.trim(); if(!title) return err(T('给游戏起个名字','Give your game a title')); if(boot.clerk&&!(window.Clerk&&Clerk.user)){ const ok=await signIn(); if(!ok) return; } const t=await token(), author=$('#author').value.trim()||(window.Clerk&&Clerk.user&&Clerk.user.firstName)||'anon', blurb=$('#blurb').value.trim(), b=$('#pub'); b.disabled=true; b.textContent=T('发布中…','Publishing…'); err('');
    try{ let r; const h=t?{Authorization:'Bearer '+t}:{}; if(/\.zip$/i.test(picked.name)) r=await fetch('/api/upload-zip?'+new URLSearchParams({title,author,blurb}),{method:'POST',headers:h,body:picked}); else r=await fetch('/api/upload',{method:'POST',headers:{...h,'Content-Type':'application/json'},body:JSON.stringify({title,author,blurb,html:await picked.text()})}); const j=await r.json(); if(!r.ok){ const f=j.check&&j.check.failed&&j.check.failed.find(x=>x.severity==='error'); throw new Error(f?f.hint:j.error||'upload failed'); }
      if(j.status==='in_review'){ $('#form').hidden=true; drop.hidden=true; $('#done').hidden=false; $('#done h3').textContent=T('正在审核','In review'); $('#glink').parentElement.textContent=(j.review&&j.review.flags||[]).map(f=>f.hint).join(' ')||T('审核通过后自动上线。','It goes live once approved.'); return; } const u=location.origin+j.url; $('#form').hidden=true; drop.hidden=true; $('#done').hidden=false; const a=$('#glink'); a.textContent=u; a.href=j.url; if(j.id) $('#gmanage').href='/portal/'+j.id; $('#gcopy').onclick=async()=>{ await navigator.clipboard.writeText(u); toast(T('链接已复制','Link copied')); }; applyLang(); }catch(x){ err(x.message); } b.disabled=false; b.textContent=T('发布','Publish'); }; }
const hv=$('#heroV'); if(hv){ if(matchMedia('(prefers-reduced-motion:reduce)').matches) hv.remove(); else { hv.addEventListener('canplay',()=>hv.classList.add('on'),{once:true}); hv.play&&hv.play().catch(()=>{}); } }
applyLang();
})();
