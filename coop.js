/* Co-op over NOVA. The host's farm is the world: a guest arrives with a room code, is handed the whole farm, and from then on
   each player keeps their own bag, skills and energy while the land, the buildings and the gold are shared. Everything travels through
   a small relay on NOVA that stores nothing. The host's clock and the host's morning rule; each client sends what changed on its side. */
const HZ=6, SYNC_MS=700;
const MAPS=['tiles','debris'], DICTS=['chests','coop','cc','built','tapped'], LISTS=['machines','placements','crabs','forage','digs','felled','broken','orders','ccDone','museum','giants','saplings'], NUMS=['hay'];
const PERSONAL=['energy','maxEnergy','hp','maxHp','toolLvl','weapon','rod','can','inv','xp','prof','bag','recipes','crafts','tackle','tackleUses','rings','boots','friends','stats','achieved','quests','tools','owned','mail','hat','sash','sashes','tokens','trinket','trinketSlot','mastery','mastered'];
const js=JSON.stringify, api=(path,body)=>fetch('/api/co/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:js(body)}).then(r=>r.json().then(d=>r.ok?d:{error:d.error||'failed'})).catch(()=>({error:'offline'}));

export function makeCoop(G){
  const {S,L,toast,modal}=G, {el,closeModal}=G.vh;
  const C=G.coop={on:false,host:false,id:null,code:null,name:'',peers:new Map(),ready:new Set()};
  const line=(b,t)=>b.appendChild(el('div','hint',t));
  let es=null, last={}, gold0=0, posT=0, syncT=0, waiting=false;
  const send=(data,to)=>{ if(C.on) api('send',{code:C.code,id:C.id,to,data}); };
  const clean=s=>String(s||'').replace(/[<>&"']/g,'').trim().slice(0,16);

  /* ---------- a room ---------- */
  function listen(){ es=new EventSource('/api/co/stream?code='+C.code+'&id='+C.id); es.onmessage=e=>{ let m; try{ m=JSON.parse(e.data); }catch(x){ return; } on(m); }; es.onerror=()=>{ if(es.readyState===2) closed(L('连接断了','The connection dropped')); }; }
  function closed(msg){ if(!C.on) return; C.on=false; if(es) es.close(); for(const p of C.peers.values()) G.peerGone&&G.peerGone(p); C.peers.clear(); toast('👥 '+msg); G.coopHud&&G.coopHud(); if(!C.host) setTimeout(()=>G.coBack(),2400); }
  C.create=async name=>{ const r=await api('new',{name}); if(r.error){ toast('⚠️ '+r.error); return false; } Object.assign(C,{on:true,host:true,id:r.id,code:r.code,name:clean(name)}); snapshotHashes(); gold0=S.gold; listen(); G.coopHud&&G.coopHud(); return true; };
  C.join=async(code,name)=>{ const r=await api('join',{code,name}); if(r.error) return r; Object.assign(C,{on:true,host:false,id:r.id,code:r.code,name:clean(name)}); listen(); send({t:'hello',name:C.name}); return r; };
  C.leave=()=>{ if(!C.on) return; api('leave',{code:C.code,id:C.id}); closed(L('已离开房间','You left the room')); };
  addEventListener('pagehide',()=>{ if(C.on) navigator.sendBeacon&&navigator.sendBeacon('/api/co/leave',new Blob([js({code:C.code,id:C.id})],{type:'application/json'})); });

  function on(m){ const d=m.data||{};
    if(m.sys==='join'){ toast('👥 '+clean(m.name)+L(' 进来了',' joined')); return; }
    if(m.sys==='leave'){ const p=C.peers.get(m.id); if(p){ toast('👥 '+p.name+L(' 离开了',' left')); G.peerGone&&G.peerGone(p); C.peers.delete(m.id); } C.ready.delete(m.id); checkAll(); G.coopHud&&G.coopHud(); return; }
    if(m.sys==='closed'){ closed(L('房主关闭了房间','The host closed the room')); return; }
    if(d.t==='hello'&&C.host){ S.farmhands=S.farmhands||{}; send({t:'world',snap:G.snapshot(),you:S.farmhands[clean(d.name)]||null,clock:clock()},m.from); return; }
    if(d.t==='world'&&!C.host){ arrive(d); return; }
    if(d.t==='pos'){ G.peerMove&&G.peerMove(peer(m.from,d),d); return; }
    if(d.t==='sync'){ apply(d.d); return; }
    if(d.t==='gold'){ S.gold+=d.v; gold0+=d.v; G.renderStatus(); return; }
    if(d.t==='ship'&&C.host){ S.shipped.push(...d.list.filter(x=>Array.isArray(x)&&x.length===4)); return; }
    if(d.t==='clock'&&!C.host){ setClock(d); return; }
    if(d.t==='chat'){ const p=peer(m.from,{}); toast('💬 '+p.name+': '+clean2(d.text)); G.peerSay&&G.peerSay(p,clean2(d.text)); return; }
    if(d.t==='bed'){ C.ready.add(m.from); if(d.me&&C.host){ S.farmhands=S.farmhands||{}; S.farmhands[peer(m.from,{}).name]=d.me; } toast('🛏 '+peer(m.from,{}).name+L(' 睡下了',' went to bed')); checkAll(); return; }
    if(d.t==='up'){ C.ready.delete(m.from); return; }
    if(d.t==='day'&&!C.host){ G.coMorning&&G.coMorning(d.snap,d.clock); }
  }
  const clean2=s=>String(s||'').slice(0,160);
  function peer(id,d){ let p=C.peers.get(id); if(!p){ p={id,name:clean(d.name)||'?',x:0,z:0,yaw:0,tx:0,tz:0,where:''}; C.peers.set(id,p); G.coopHud&&G.coopHud(); } if(d.name) p.name=clean(d.name); return p; }

  /* ---------- the world, changing on both sides ---------- */
  const clock=()=>({time:S.time,day:S.day,season:S.season,year:S.year,absDay:S.absDay,weather:S.weather,tomorrow:S.tomorrow,luck:S.luck,festival:S.festival&&S.festival.id});
  function setClock(c){ const was=S.weather; if(Math.abs(c.time-S.time)>2) S.time=c.time; Object.assign(S,{day:c.day,season:c.season,year:c.year,absDay:c.absDay,weather:c.weather,tomorrow:c.tomorrow,luck:c.luck}); if(was!==c.weather) G.coWeather&&G.coWeather(); }
  function snapshotHashes(){ last={}; for(const k of MAPS){ last[k]={}; for(const [a,b] of S[k]) last[k][a]=js(b); } for(const k of DICTS){ last[k]={}; for(const a in S[k]||{}) last[k][a]=js(S[k][a]); } for(const k of [...LISTS,...NUMS]) last[k]=js(S[k]); }
  function diff(){ const out={}; let any=false; const put=(k,v)=>{ out[k]=v; any=true; };
    for(const k of MAPS){ const o={}, seen=last[k]; let n=0; for(const [a,b] of S[k]){ const j=js(b); if(seen[a]!==j){ seen[a]=j; o[a]=b; n++; } } for(const a in seen) if(!S[k].has(a)){ delete seen[a]; o[a]=null; n++; } if(n) put(k,o); }
    for(const k of DICTS){ const o={}, seen=last[k], cur=S[k]||{}; let n=0; for(const a in cur){ const j=js(cur[a]); if(seen[a]!==j){ seen[a]=j; o[a]=cur[a]; n++; } } for(const a in seen) if(!(a in cur)){ delete seen[a]; o[a]=null; n++; } if(n) put(k,o); }
    for(const k of [...LISTS,...NUMS]){ const j=js(S[k]); if(j!==last[k]){ last[k]=j; put(k,S[k]); } } return any?out:null; }
  function apply(d){ const was=new Map((S.placements||[]).map(p=>[p.id+'@'+p.x+','+p.z,p]));
    for(const k of MAPS) if(d[k]){ for(const a in d[k]){ if(d[k][a]===null){ S[k].delete(a); delete last[k][a]; } else { S[k].set(a,d[k][a]); last[k][a]=js(d[k][a]); } if(k==='tiles'){ const [x,z]=a.split(',').map(Number); G.refreshTileMesh(x,z); G.rebuildCrop(x,z); } } if(k==='debris') G.rebuildDebris(); }
    for(const k of DICTS) if(d[k]){ S[k]=S[k]||{}; for(const a in d[k]){ if(d[k][a]===null){ delete S[k][a]; delete last[k][a]; } else { S[k][a]=d[k][a]; last[k][a]=js(d[k][a]); if(k==='built') G.onBuilt&&G.onBuilt(a,true); } } }
    for(const k of [...LISTS,...NUMS]) if(k in d){ if(k==='felled'||k==='broken') G.worldFx.sync(k,S[k]||[],d[k]); S[k]=d[k]; last[k]=js(d[k]); if(k==='forage') G.rebuildForage(); if(k==='digs') G.rebuildDigs(); }
    if(d.placements){ const now=new Set(d.placements.map(p=>p.id+'@'+p.x+','+p.z)); for(const [k,p] of was) if(!now.has(k)){ S.placements=[...S.placements,p]; G.dropPlacement(S.placements[S.placements.length-1]); } for(const p of d.placements) if(!was.has(p.id+'@'+p.x+','+p.z)) G.spawnPlacement(p.id,p.x,p.z,p.ry); S.placements=d.placements; } }
  /* a guest receives the whole farm, then keeps a life of their own on it */
  function arrive(d){ const mine={}; PERSONAL.forEach(k=>mine[k]=d.you&&d.you[k]!==undefined?d.you[k]:S[k]); G.loadGame(d.snap); Object.assign(S,mine); if(!d.you){ S.inv={'seed:parsnip':15}; } setClock(d.clock); S.time=d.clock.time; G.festivalsToday(); snapshotHashes(); gold0=S.gold; G.dressUp&&G.dressUp(); G.renderStatus(); G.renderEnergy(); G.renderHotbar(); G.coWeather&&G.coWeather(); toast('👥 '+L('到了朋友的农场','You are on your friend\'s farm')); G.coopHud&&G.coopHud(); }
  G.coopPersonal=()=>{ const o={}; PERSONAL.forEach(k=>o[k]=S[k]); return o; };

  /* ---------- the night ---------- */
  C.toBed=()=>{ if(!C.on||C.peers.size===0) return false; waiting=true; C.ready.add(C.id); send({t:'bed',me:C.host?null:G.coopPersonal()}); toast('🛏 '+L('等其他人也睡下…','Waiting for the others to turn in…')); checkAll(); return true; };
  C.upAgain=()=>{ if(waiting){ waiting=false; C.ready.delete(C.id); send({t:'up'}); } };
  C.waiting=()=>waiting;
  function checkAll(){ if(!C.on||!C.host||!waiting) return; for(const id of C.peers.keys()) if(!C.ready.has(id)) return; C.ready.clear(); waiting=false; G.coSleepNow&&G.coSleepNow(); }
  /* the host's morning goes out to everyone */
  C.morning=()=>{ if(!C.on||!C.host) return; snapshotHashes(); gold0=S.gold; C.ready.clear(); waiting=false; send({t:'day',snap:G.snapshot(),clock:clock()}); };
  C.dayIn=snap=>{ waiting=false; C.ready.clear(); const d={}; for(const k of MAPS) d[k]=Object.fromEntries(snap[k]||[]); for(const k of MAPS) for(const [a] of S[k]) if(!(a in d[k])) d[k][a]=null; for(const k of DICTS){ d[k]=snap[k]||{}; for(const a in S[k]||{}) if(!(a in d[k])) d[k]={...d[k],[a]:null}; } for(const k of [...LISTS,...NUMS]) if(snap[k]!==undefined) d[k]=snap[k]; apply(d); S.gold=snap.gold; gold0=S.gold; snapshotHashes(); };

  /* ---------- each frame ---------- */
  G.coopTick=dt=>{ if(!C.on) return; G.peersTick&&G.peersTick(dt); posT+=dt; syncT+=dt*1000; if(posT>1/HZ){ posT=0; const p=G.player; send({t:'pos',name:C.name,x:+p.pos.x.toFixed(2),z:+p.pos.z.toFixed(2),yaw:+p.yaw.toFixed(2),sp:+p.speed.toFixed(1),where:S.inHouse?'house':S.inMine?(G.mine.mode||'mine')+S.mineLevel:'world',hat:S.hat||null,horse:!!S.onHorse}); }
    if(syncT>SYNC_MS){ syncT=0; const d=diff(); if(d) send({t:'sync',d}); if(S.gold!==gold0){ send({t:'gold',v:S.gold-gold0}); gold0=S.gold; } if(!C.host&&S.shipped.length){ send({t:'ship',list:S.shipped}); S.shipped=[]; } if(C.host&&(C.clockN=(C.clockN||0)+1)%4===0) send({t:'clock',...clock()}); } };

  /* ---------- the panel ---------- */
  const nameBox=()=>{ const i=document.createElement('input'); i.maxLength=16; i.placeholder=L('你的名字','Your name'); i.value=C.name||localName(); i.style.cssText='width:100%;box-sizing:border-box;padding:9px 12px;border-radius:10px;border:1px solid rgba(241,228,200,.3);background:rgba(0,0,0,.25);color:inherit;font:inherit;margin:6px 0'; return i; };
  const localName=()=>{ try{ return localStorage.getItem('sv_name')||''; }catch(e){ return ''; } }, keep=n=>{ try{ localStorage.setItem('sv_name',n); }catch(e){} };
  C.link=()=>location.origin+'/starvale?co='+C.code;
  G.openCoop=()=>modal('👥 '+L('联机','Co-op'),body=>{ if(C.on){ line(body,L('房间码','Room code')+': <b style="font-size:22px;letter-spacing:3px">'+C.code+'</b>'); line(body,L('把链接发给朋友,点开就进你的农场。','Send this link: one click and they are on your farm.')); const a=el('div','buy','<div class="nm">'+L('复制邀请链接','Copy the invite link')+'</div>'); a.onclick=()=>{ navigator.clipboard&&navigator.clipboard.writeText(C.link()).then(()=>toast('📋 '+L('已复制','Copied'))); }; body.appendChild(a); line(body,L('在线:','Here now: ')+[C.name+' ('+L('你','you')+')',...[...C.peers.values()].map(p=>p.name)].join('、')); const i=document.createElement('input'); i.placeholder=L('说点什么,回车发送','Say something, press Enter'); i.maxLength=160; i.style.cssText='width:100%;box-sizing:border-box;padding:9px 12px;border-radius:10px;border:1px solid rgba(241,228,200,.3);background:rgba(0,0,0,.25);color:inherit;font:inherit;margin:6px 0'; i.onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter'&&i.value.trim()){ send({t:'chat',text:i.value.trim()}); toast('💬 '+i.value.trim()); i.value=''; } }; body.appendChild(i); const x=el('div','buy','<div class="nm">'+(C.host?L('关闭房间','Close the room'):L('离开房间','Leave the room'))+'</div>'); x.onclick=()=>{ C.leave(); closeModal(); }; body.appendChild(x); return; }
    line(body,L('开一个房间,朋友就能来你的农场一起玩。各自有背包和技能,土地、建筑和金币共用。最多四人。','Open a room and friends can join your farm. Each keeps their own bag and skills; the land, buildings and gold are shared. Up to four players.')); const n=nameBox(); n.onkeydown=e=>e.stopPropagation(); body.appendChild(n); const c=el('div','buy','<div class="nm">'+L('开房间','Open a room')+'</div>'); c.onclick=async()=>{ const nm=clean(n.value)||'Host'; keep(nm); if(await C.create(nm)) G.openCoop(); }; body.appendChild(c); const j=document.createElement('input'); j.maxLength=6; j.placeholder=L('朋友的房间码','Your friend\'s code'); j.style.cssText=n.style.cssText+';text-transform:uppercase;letter-spacing:3px'; j.onkeydown=e=>e.stopPropagation(); body.appendChild(j); const b=el('div','buy','<div class="nm">'+L('加入','Join')+'</div>'); b.onclick=()=>{ const code=j.value.trim().toUpperCase(); if(code.length!==6) return; const nm=clean(n.value)||'Guest'; keep(nm); location.assign(location.pathname+'?co='+code+'&lang='+G.LANG()); }; body.appendChild(b); });
  /* arriving by link */
  C.autoJoin=async code=>{ const name=localName()||('Farmer'+Math.floor(Math.random()*90+10)); keep(name); const r=await C.join(code,name); if(r.error){ toast('⚠️ '+L('进不了这个房间:','Could not join that room: ')+r.error); return false; } return true; };
}
