/* The film. Every shot is a function of time, stepped frame by frame, so a take is exact and repeatable: where the star figure stands, where the
   lens is, what hour and season it is. No panels are ever on screen. Loaded only with ?shot&film=1. */
import * as THREE from 'three';

const ease=u=>u*u*(3-2*u), lin=(a,b,u)=>a+(b-a)*u, mix=(a,b,u)=>a.map((v,i)=>lin(v,b[i],u)), clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;
const path=(P,u)=>{ const n=P.length-1, s=clamp(u)*n, i=Math.min(n-1,Math.floor(s)); return mix(P[i],P[i+1],s-i); };
export const FPS=60, W=2560, H=1440;
/* a message-channel yield: unlike a timer it is not throttled while the pane is hidden */
const tick=()=>new Promise(r=>{ const c=new MessageChannel(); c.port1.onmessage=()=>{ c.port1.close(); r(); }; c.port2.postMessage(0); });

export function setup(v){ let seed=20261031; Math.random=()=>{ seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
  const {G,S,player,camera,setSeason,applyWeather}=v, M=G.mine; const set=(season,time,weather='clear')=>{ S.season=season; setSeason(season); S.time=time; S.weather=weather; applyWeather(); };
  const world=()=>{ if(S.inHouse) v.leaveHouse(); if(G.mine.mode==='desert') G.leaveDesert(); if(G.mine.mode==='island') G.leaveIsland(); if(S.inMine) M.leave(true); S.boating=false; };
  const grid=()=>{ for(let x=-6;x<=6;x++) for(let z=2;z<=11;z++){ S.tiles.set(x+','+z,{tilled:true,watered:(x+z)%3!==0,crop:{id:['cauliflower','parsnip','potato','kale'][Math.abs(x)%4],stage:Math.min(9,6+Math.abs(z)%5),watered:true,acc:0}}); G.refreshTileMesh(x,z); G.rebuildCrop(x,z); } };
  const farmReady={done:false}; const birds=new THREE.Group(); for(let i=0;i<9;i++){ const m=new THREE.Mesh(new THREE.ConeGeometry(.14,.9,3),new THREE.MeshBasicMaterial({color:0x141018,fog:false})); m.rotation.z=Math.PI/2; m.scale.z=.2; birds.add(m); } birds.visible=false; v.scene.add(birds);
  const star=new THREE.Mesh(new THREE.SphereGeometry(1.1,12,8),new THREE.MeshBasicMaterial({color:0xfff4d8,fog:false,toneMapped:false})); star.visible=false; v.scene.add(star);
  let swingAt=null; const DK=v.DOCK.z1;
  /* nothing grows where the lens travels */
  const DESERT_KEEP=()=>{ const K=v.DESERT.keepOut; if(K.length) return; for(let t=0;t<=1;t+=.1) K.push([lin(9,6,t),lin(42,30,t),5],[lin(13,9,t),8,6],[lin(-11,-14.5,t),lin(20,12,t),6],[lin(-14,-20,t),lin(10,-5.5,t),4]); for(let z=30;z>=-30;z-=6) K.push([z*.1+2,z,9]); for(let x=-40;x<=40;x+=6) K.push([x,20,8],[x,32,6],[x,8,6]); };
  const gate=new THREE.Group(), gm=new THREE.MeshLambertMaterial({color:0x201a22}); for(const x of [-7,7]){ const b=new THREE.Mesh(new THREE.BoxGeometry(5,16,3.4),gm); b.position.set(15+x,8,27); gate.add(b); for(let i=0;i<5;i++){ const c=new THREE.Mesh(new THREE.BoxGeometry(5.8,.5,4),gm); c.position.set(15+x,1.5+i*3.3,27); gate.add(c); } } const lt=new THREE.Mesh(new THREE.BoxGeometry(19,4,3.8),gm); lt.position.set(15,15.8,27); gate.add(lt); gate.visible=false; v.scene.add(gate);
  /* t0,t1 on the 0.6 s beat of the cut; hold: extra seconds rendered past the end for a dissolve */
  const SHOTS=[
   {id:'A',t0:.9,t1:4.3,in(){ world(); set(0,396); },pose(u){ return {p:[0,21],yaw:0,sp:0}; },cam(u){ const e=ease(u); return {p:mix([.3,.7,16],[.3,3.6,12.4],e),l:mix([0,1.5,30],[0,7,64],e),f:40}; }},
   {id:'B',t0:4.3,t1:6.1,in(){ world(); set(0,430); },pose(u){ return {p:[15,lin(31,37,u)],yaw:0,sp:3.4}; },cam(u){ return {p:[6.4,1,lin(30,36.5,u)],l:[24,3.6,lin(33.5,40,u)],f:36,roll:lin(.025,-.015,u)}; }},
   {id:'C',t0:6.1,t1:9.1,in(){ world(); set(0,480); },pose(u){ const q=path([[-6,21],[8,23.4],[24,23]],u); return {p:q,yaw:Math.atan2(16,1),sp:7.2}; },cam(u){ return {p:mix([-16,2.4,12],[9,2,14.2],u),l:mix([2,1.6,26],[26,1.4,27],u),f:40}; }},
   {id:'D',t0:9.1,t1:12.1,in(){ world(); set(1,600); },pose(u){ return {p:[-8,27.0],yaw:0,sp:0}; },act(u,a){ if(a===0) G.setCut(true); },cam(u){ return null; },out(){ G.setCut(false); v.cut.on=false; v.cut.k=0; }},
   {id:'E1',t0:12.1,t1:15.1,hold:.7,in(){ world(); set(0,620); if(!farmReady.done){ grid(); farmReady.done=true; } swingAt=0; S.tool=1; G.renderHotbar(); },pose(u){ return {p:[lin(-.5,1,u),6.8],yaw:-2.3,sp:0}; },act(u,a,t){ if(t-swingAt>1.1){ swingAt=t; G.swing(); G.splash&&G.splash(.4,8); } },cam(u){ const e=ease(u); return {p:mix([-6.6,2.1,-.8],[-5.8,2,-.1],e),l:mix([.4,.95,7.4],[.5,1,7.6],e),f:30}; }},
   {id:'E2',t0:14.4,t1:18.1,in(){ world(); set(2,1136); birds.visible=true; },pose(u){ return {p:[12.9,DK+.5],yaw:-.96,sp:0}; },act(u){ birds.children.forEach((b,i)=>{ const k=i-4, a=Math.abs(k), cx=17-.82*70+.57*lin(-46,44,u), cz=DK-2.6+.57*70+.82*lin(-46,44,u); b.position.set(cx-.57*a*2.6+.82*k*1.8,23+a*.5+Math.sin(u*2),cz-.82*a*2.6-.57*k*1.8); b.scale.setScalar(1.5); b.rotation.set(Math.PI/2,0,Math.sin(u*46+i)*.5); }); },cam(u){ const e=ease(u); return {p:mix([17.2,1,DK-2.6],[17.5,1.2,DK-2.9],e),l:mix([-40,9,DK+36],[-40,12,DK+36],e),f:38}; },out(){ birds.visible=false; }},
   {id:'E3',t0:18.1,t1:20.5,in(){ world(); set(1,700); },pose(u){ return {p:[-40,lin(-27,-37.5,clamp((u-.25)/.75))],yaw:Math.PI,sp:u>.25?4.2:0}; },cam(u){ const e=ease(u); return {p:mix([-40,1.9,-20],[-40,1.9,-23],e),l:[-40,2.7,-44],f:26}; }},
   {id:'F',t0:20.5,t1:22.3,in(){ world(); set(1,700); M.enter(44); },pose(u){ return {p:[0,lin(9,-3,u)],yaw:Math.PI,sp:4.2}; },cam(u){ return {p:[lin(.3,.1,u),.9,lin(15,5.4,u)],l:[0,1.5,lin(-6,-16,u)],f:44}; }},
   {id:'G',t0:22.3,t1:24.1,in(){ world(); set(1,700); M.enter(12); M.mons=[M.mons.find(m=>m.def.model==='slime')||M.mons[0]]; if(M.mons[0]) M.mons[0].mesh.scale.setScalar(1.3); swingAt=22.75; S.tool=5; G.renderHotbar(); },pose(u){ return {p:[1.7,2],yaw:-1.4,sp:0}; },act(u,a,t){ const m=M.mons[0]; if(m){ m.x=.1; m.z=2.5; m.cd=9; } if(swingAt&&t>swingAt){ G.swing(); swingAt=t+.66; } },cam(u){ const e=ease(u); return {p:mix([3.2,1.2,4.6],[2.9,1.2,4.2],e),l:mix([.5,1,2.2],[.5,1.05,2.2],e),f:30}; }},
   {id:'H',t0:24.1,t1:25.3,in(){ world(); set(2,1060); },pose(u){ return {p:[22,-31.6],yaw:Math.PI,sp:0}; },cam(u){ const e=ease(u); return {p:mix([22,1.5,-17],[22,1.5,-18.4],e),l:[22,3.4,-34],f:30}; }},
   {id:'I',t0:25.3,t1:25.9,in(){ world(); set(3,1300); },pose(u){ return {p:[0,-10.2],yaw:Math.PI,sp:0}; },cam(u){ return {p:[0,1.4,lin(3.4,2.6,u)],l:[0,3.4,-16],f:34}; }},
   {id:'J',t0:25.9,t1:27.1,in(){ world(); v.enterHouse(true); set(1,1200); },pose(u){ return {p:[0,lin(1.6,-2.2,u)],yaw:Math.PI,sp:3.2}; },cam(u){ const e=u*u; return {p:[lin(.5,.1,e),lin(2.1,1.7,e),lin(3.9,.8,e)],l:[0,1.1,-4],f:58}; }},
   {id:'K',t0:27.1,t1:29.5,in(){ world(); v.enterHouse(true); set(1,1200); },pose(u){ const q=v.house.userData.spots.stove; return {p:[q.x,q.z+1],yaw:Math.PI,sp:0}; },cam(u){ const q=v.house.userData.spots.stove, e=ease(u); return {p:mix([q.x+2.6,1.5,q.z+3.4],[q.x+2.2,1.5,q.z+3],e),l:[q.x,1,q.z],f:46}; }},
   {id:'L',t0:29.5,t1:31.3,in(){ world(); set(0,740); (G.people||[]).slice(0,7).forEach((p,i)=>{ const a=i/7*6.28, x=34+Math.cos(a)*4.4, z=-22+Math.sin(a)*3.2; p.x=p.tx=x; p.z=p.tz=z; p.wait=99; p.mesh.visible=true; }); },pose(u){ return {p:[34,-22],yaw:Math.PI,sp:0}; },cam(u){ const e=u*(2-u); return {p:mix([34,2.1,1],[34,1.9,-11],e),l:[34,1.7,-30],f:36}; }},
   {id:'M',t0:31.3,t1:33.7,in(){ world(); set(1,1350); S.day=28; G.jellies&&G.jellies(); },pose(u){ return {p:[15,43],yaw:0,sp:0}; },cam(u){ const e=ease(u); return {p:[14.2,1.6,39.6],l:[15.4,lin(2,44,e),lin(60,104,e)],f:48}; }},
   {id:'N',t0:33.7,t1:34.9,in(){ world(); set(2,1090); S.boating=true; },pose(u){ return {p:[124.9,73],yaw:.7,sp:0}; },act(u){ S.time=lin(1096,1215,u); },cam(u){ return {p:[lin(122.4,122.2,u),1.5,lin(69.6,69.4,u)],l:[136,8,86],f:36}; }},
   {id:'O',t0:34.9,t1:36.1,in(){ world(); set(1,800); if(!S.built.barn){ S.built.barn=3; S.built.coop=3; G.onBuilt('barn',true); G.onBuilt('coop',true); ['cow','cow','sheep','goat','pig'].forEach(a=>G.spawnAnimal(a)); ['chicken','chicken','duck'].forEach(a=>G.spawnAnimal(a)); for(let i=0;i<60;i++) v.step(v.tNow+=33); } },pose(u){ return {p:[lin(21,26,u),15.6],yaw:Math.PI/2,sp:3.4}; },cam(u){ return {p:[lin(13.5,15,u),1.7,lin(14,13.4,u)],l:[27,1,12],f:28}; }},
   {id:'P',t0:36.1,t1:39.2,in(){ world(); set(3,840,'snow'); },pose(u){ return {p:[34,-20],yaw:Math.PI,sp:0}; },cam(u){ const e=u*(2-u); return {p:mix([34,3,6],[34,2.3,-11],e),l:[34,3.6,-36],f:40}; }},
   {id:'Q',t0:39.2,t1:41.7,in(){ world(); set(1,800); DESERT_KEEP(); G.enterDesert(); },pose(u){ return {p:[0,-24],yaw:0,sp:0}; },cam(u){ return {p:[lin(9,6,u),1.5,lin(42,30,u)],l:[-1,3,-36],f:40}; }},
   {id:'R',t0:41.7,t1:44.5,in(){ world(); set(1,800); G.enterIsland(); },pose(u){ return {p:[lin(-8,-3,u),14],yaw:.9,sp:3.2}; },cam(u){ const e=ease(u); return {p:mix([-16,1.6,30],[-13,1.7,28],e),l:mix([14,4.6,-20],[16,5,-20],e),f:36}; }},
   {id:'S',t0:44.5,t1:48.7,in(){ world(); set(2,1020); },pose(u){ return {p:[-30,8],yaw:.5,sp:0}; },cam(u){ return {p:[lin(-27.6,-26.8,u),1.5,lin(-3,-2.7,u)],l:[lin(-26,-25.4,u),2,20],f:30}; }},
   {id:'T',t0:48.7,t1:50.5,in(){ world(); set(2,960); S.boating=true; },pose(u){ return {p:[lin(-4,22,u),53.5],yaw:Math.PI/2,sp:0}; },cam(u){ return {p:[9,.5,lin(47,47.4,u)],l:[lin(1,17,ease(u)),.7,57],f:30}; }},
   {id:'U1',t0:50.5,t1:53.8,hold:.7,in(){ world(); set(1,860); DESERT_KEEP(); G.enterDesert(); },pose(u){ return {p:[lin(30,-8,u),32],yaw:-Math.PI/2,sp:4.2}; },cam(u){ return {p:[lin(13,9,u),.7,8],l:[lin(12,8,u),5.6,70],f:30}; }},
   {id:'U2',t0:53.1,t1:57.1,in(){ world(); set(1,860); DESERT_KEEP(); G.enterDesert(); },pose(u){ return {p:[lin(-14,-20,ease(clamp(u*1.4))),lin(10,-5.5,ease(clamp(u*1.4)))],yaw:Math.PI*1.1,sp:u<.7?3.6:0}; },cam(u){ const e=ease(u); return {p:mix([-11,3.2,20],[-14.5,2.2,12],e),l:mix([-18,2,-10],[-20,2.2,-12],e),f:36}; }},
   {id:'V',t0:57.1,t1:59.7,in(){ world(); set(1,1330); star.visible=true; star.position.set(15,62,300); gate.visible=true; },pose(u){ return {p:[15,DK+.5],yaw:0,sp:0}; },cam(u){ const e=ease(u); return {p:mix([15,1.4,24],[15,1.4,16.5],e),l:[15,9,120],f:32}; },out(){ star.visible=false; gate.visible=false; }}
  ];
  let cur=null, begun=0, last=null;
  const pose={u:0,a:0,t:0};
  G.film={ SHOTS,
    /* frame() calls these */
    tick(dt){ if(!cur) return; const s=cur; pose.u=clamp(pose.t/(s.t1-s.t0)); s.act&&s.act(pose.u,pose.a,s.t0+pose.t); pose.a++; pose.t+=dt; },
    pose(dt){ if(!cur) return; const q=cur.pose(pose.u), [x,z]=q.p; player.vel.set(0,0,0); player.pos.x=x; player.pos.z=z; player.yaw=q.yaw; player.speed=q.sp; player.moving=q.sp>.1; if(q.sp) player.walkT+=q.sp*dt*2.7; },
    camera(){ if(!cur) return; const c=cur.cam(pose.u); if(!c) return; camera.position.set(...c.p); camera.fov=c.f||42; camera.updateProjectionMatrix(); camera.lookAt(...c.l); if(c.roll) camera.rotateZ(c.roll); } };
  /* page-side controls */
  const seek=(id,u=0)=>{ const s=SHOTS.find(x=>x.id===id); if(cur&&cur.out) cur.out(); cur=s; begun=performance.now(); pose.t=0; pose.a=0; s.in(); const stepTo=(s.t1-s.t0)*u; let n=Math.round(stepTo*FPS); v.tNow=(v.tNow||1e5); for(let i=0;i<Math.min(n,5);i++){ pose.t+=1/FPS; } pose.t=stepTo; for(let i=0;i<3;i++){ v.tNow+=1000/FPS; v.step(v.tNow); } };
  v.film={ SHOTS,seek,
    size(w=W,h=H){ v.renderer.setPixelRatio(1); v.renderer.setSize(w,h,false); v.composer&&v.composer.setSize(w,h); camera.aspect=w/h; camera.updateProjectionMatrix(); v.syncRes&&v.syncRes(); },
    frame(){ v.tNow+=1000/FPS; v.step(v.tNow); },
    /* renders one shot with the hardware encoder and hands back the file */
    async record(id,{w=W,h=H,bitrate=42e6,upload}){ const s=SHOTS.find(x=>x.id===id), secs=(s.t1-s.t0)+(s.hold||0), n=Math.round(secs*FPS); const { Muxer, ArrayBufferTarget }=await import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/+esm'); const target=new ArrayBufferTarget(), mux=new Muxer({target,video:{codec:'avc',width:w,height:h,frameRate:FPS},fastStart:'in-memory'}); let err=null; const enc=new VideoEncoder({output:(c,m)=>mux.addVideoChunk(c,m),error:e=>{ err=e; }}); enc.configure({codec:'avc1.640034',width:w,height:h,bitrate,framerate:FPS,latencyMode:'quality',hardwareAcceleration:'prefer-hardware'});
      v.film.size(w,h); seek(id,0); const cv=v.renderer.domElement, t0=performance.now(); for(let i=0;i<n;i++){ v.film.frame(); const f=new VideoFrame(cv,{timestamp:Math.round(i*1e6/FPS),duration:Math.round(1e6/FPS)}); enc.encode(f,{keyFrame:i%120===0}); f.close(); while(enc.encodeQueueSize>6) await tick(); if(i%20===0) await tick(); if(err) throw err; } await enc.flush(); mux.finalize(); const buf=target.buffer; let up=null; if(upload){ const r=await fetch(upload+id+'.mp4',{method:'PUT',body:buf}); up=r.status; } return {id,frames:n,bytes:buf.byteLength,ms:Math.round(performance.now()-t0),up}; } };
}
