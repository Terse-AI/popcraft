/* The film. Every shot is a function of time, stepped frame by frame, so a take is exact and repeatable: where the star figure stands, where the
   lens is, what hour and season it is. No panels are ever on screen. Loaded only with ?shot&film=1. */
import * as THREE from 'three';

const ease=u=>u*u*(3-2*u), lin=(a,b,u)=>a+(b-a)*u, mix=(a,b,u)=>a.map((v,i)=>lin(v,b[i],u)), clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;
const path=(P,u)=>{ const n=P.length-1, s=clamp(u)*n, i=Math.min(n-1,Math.floor(s)); return mix(P[i],P[i+1],s-i); };
export const FPS=60, W=2560, H=1440;

export function setup(v){ const {G,S,player,camera,setSeason,applyWeather}=v, M=G.mine; const set=(season,time,weather='clear')=>{ S.season=season; setSeason(season); S.time=time; S.weather=weather; applyWeather(); };
  const world=()=>{ if(S.inHouse) v.leaveHouse(); if(G.mine.mode==='desert') G.leaveDesert(); if(G.mine.mode==='island') G.leaveIsland(); if(S.inMine) M.leave(true); S.boating=false; };
  const grid=()=>{ for(let x=-6;x<=6;x++) for(let z=2;z<=11;z++){ S.tiles.set(x+','+z,{tilled:true,watered:(x+z)%3!==0,crop:{id:['cauliflower','parsnip','potato','kale'][Math.abs(x)%4],stage:Math.min(9,6+Math.abs(z)%5),watered:true,acc:0}}); G.refreshTileMesh(x,z); G.rebuildCrop(x,z); } };
  const farmReady={done:false}; const birds=new THREE.Group(); for(let i=0;i<9;i++){ const m=new THREE.Mesh(new THREE.ConeGeometry(.14,.9,3),new THREE.MeshBasicMaterial({color:0x141018,fog:false})); m.rotation.z=Math.PI/2; m.scale.z=.2; birds.add(m); } birds.visible=false; v.scene.add(birds);
  const star=new THREE.Mesh(new THREE.SphereGeometry(1.1,12,8),new THREE.MeshBasicMaterial({color:0xfff4d8,fog:false,toneMapped:false})); star.visible=false; v.scene.add(star);
  let swingAt=null;
  /* t0,t1 on the 0.6 s beat of the cut; hold: extra seconds rendered past the end for a dissolve */
  const SHOTS=[
   {id:'A',t0:.9,t1:4.3,in(){ world(); set(0,396); },pose(u){ return {p:[-8,24.4],yaw:0,sp:0}; },cam(u){ const e=ease(u); return {p:mix([-8,.62,19.4],[-8.2,2.6,16.8],e),l:mix([-8,1.3,30],[-8,3.2,46],e),f:42}; }},
   {id:'B',t0:4.3,t1:6.1,in(){ world(); set(0,430); },pose(u){ const x=lin(-22,-14.5,u); return {p:[x,25],yaw:Math.PI/2,sp:4.2}; },cam(u){ const x=lin(-25,-17,u); return {p:[x,.9,18.4],l:[x+3.4,2.4,31],f:36,roll:lin(.03,-.02,u)}; }},
   {id:'C',t0:6.1,t1:9.1,in(){ world(); set(0,480); },pose(u){ const q=path([[-6,21],[8,23.4],[24,23]],u); return {p:q,yaw:Math.atan2(16,1),sp:7.2}; },cam(u){ const e=u; return {p:mix([-16,3.4,12],[9,2.6,14.2],e),l:mix([2,1.4,26],[26,1.2,27],e),f:40}; }},
   {id:'D',t0:9.1,t1:12.1,in(){ world(); set(1,600); },pose(u){ return {p:[-8,27.0],yaw:0,sp:0}; },act(u,a){ if(a===0) G.setCut(true); },cam(u){ return null; },out(){ G.setCut(false); }},
   {id:'E1',t0:12.1,t1:15.1,hold:.7,in(){ world(); set(0,620); if(!farmReady.done){ grid(); farmReady.done=true; } swingAt=0; },pose(u){ return {p:[lin(-1,1,u),6.4],yaw:.3,sp:0}; },act(u,a,t){ if(t-swingAt>1.1){ swingAt=t; S.tool=1; G.swing(); G.splash&&G.splash(2,7); } },cam(u){ const e=ease(u); return {p:mix([-14,3.4,-5],[-12.4,3,-3.8],e),l:mix([0,.9,8],[0,1,8.4],e),f:32}; }},
   {id:'E2',t0:14.4,t1:18.1,in(){ world(); set(2,1136); birds.visible=true; },pose(u){ return {p:[15,44],yaw:0,sp:0}; },act(u){ birds.children.forEach((b,i)=>{ const k=(i-4), a=Math.abs(k); b.position.set(lin(60,-60,u)+a*4.2,34+a*1.1-Math.sin(u*2)*2,160+k*3); b.rotation.x=Math.sin(u*40+i)*.4; }); },cam(u){ const e=ease(u); return {p:mix([14.6,1.05,40.6],[15.2,1.5,40],e),l:mix([17,2.1,70],[16,3.4,70],e),f:40}; },out(){ birds.visible=false; }},
   {id:'E3',t0:18.1,t1:20.5,in(){ world(); set(1,700); },pose(u){ return {p:[lin(-40,-40,u),lin(-27,-37,clamp((u-.3)/.7))],yaw:Math.PI,sp:u>.3?4.2:0}; },cam(u){ const e=ease(u); return {p:mix([-40,1.2,-16],[-40,1.3,-20],e),l:[-40,3,-44],f:36}; }},
   {id:'F',t0:20.5,t1:22.3,in(){ world(); set(1,700); M.enter(44); },pose(u){ return {p:[0,lin(9,-3,u)],yaw:Math.PI,sp:4.2}; },cam(u){ return {p:[lin(.3,.1,u),.9,lin(15,5.4,u)],l:[0,1.5,lin(-6,-16,u)],f:44}; }},
   {id:'G',t0:22.3,t1:24.1,in(){ world(); set(1,700); M.enter(12); M.mons.slice(1).forEach(m=>{ m.x=99; m.z=99; }); swingAt=22.7; S.tool=5; },pose(u){ return {p:[1.6,2],yaw:-1.4,sp:0}; },act(u,a,t){ const m=M.mons[0]; if(m){ m.x=-1; m.z=2.4; } if(swingAt&&t>swingAt){ G.swing(); swingAt=t+.72; } },cam(u){ const e=ease(u); return {p:mix([3.9,1.5,4.9],[3.5,1.5,4.3],e),l:mix([-.5,1.1,1.9],[-.5,1.2,2],e),f:34}; }},
   {id:'H',t0:24.1,t1:25.3,in(){ world(); set(2,1060); },pose(u){ return {p:[22,-31.6],yaw:Math.PI,sp:0}; },cam(u){ const e=ease(u); return {p:mix([22,1.5,-17],[22,1.5,-18.4],e),l:[22,3.4,-34],f:30}; }},
   {id:'I',t0:25.3,t1:25.9,in(){ world(); set(3,1300); },pose(u){ return {p:[0,-10.2],yaw:Math.PI,sp:0}; },cam(u){ return {p:[0,1.4,lin(3.4,2.6,u)],l:[0,3.4,-16],f:34}; }},
   {id:'J',t0:25.9,t1:27.1,in(){ world(); v.enterHouse(true); set(1,1200); },pose(u){ return {p:[0,lin(2,-1.6,u)],yaw:Math.PI,sp:3.2}; },cam(u){ const e=u*u; return {p:[lin(.4,0,e),1.4,lin(2.9,-.2,e)],l:[0,1.3,-4],f:52}; }},
   {id:'K',t0:27.1,t1:29.5,in(){ world(); v.enterHouse(true); set(1,1200); },pose(u){ return {p:[-3,-2.6],yaw:Math.PI,sp:0}; },cam(u){ const e=ease(u); return {p:mix([2.9,1.5,2.9],[2.5,1.5,2.6],e),l:[-2.8,1.1,-3],f:44}; }},
   {id:'L',t0:29.5,t1:31.3,in(){ world(); set(0,740); S.festival=null; },pose(u){ return {p:[lin(34,34,u),lin(-24,-24,u)],yaw:0,sp:0}; },cam(u){ const e=u*(2-u); return {p:mix([34,2.2,-1],[34,2,-14],e),l:[34,2.2,-34],f:42}; }},
   {id:'M',t0:31.3,t1:33.7,in(){ world(); set(1,1350); S.day=28; G.jellies&&G.jellies(true); },pose(u){ return {p:[15,43],yaw:0,sp:0}; },cam(u){ const e=ease(u); return {p:[14.2,1.6,39.6],l:[15.4,lin(2,70,e),lin(60,120,e)],f:48}; }},
   {id:'N',t0:33.7,t1:34.9,in(){ world(); set(2,1090); },pose(u){ return {p:[126,74],yaw:.8,sp:0}; },act(u){ S.time=lin(1096,1215,u); },cam(u){ return {p:[lin(122.4,122.2,u),1.5,lin(69.6,69.4,u)],l:[136,8,86],f:36}; }},
   {id:'O',t0:34.9,t1:36.1,in(){ world(); set(1,800); },pose(u){ return {p:[lin(19,28,u),12],yaw:Math.PI/2,sp:4.2}; },cam(u){ return {p:[lin(18,20,u),2.3,24],l:[25,1.4,6],f:38}; }},
   {id:'P',t0:36.1,t1:39.2,in(){ world(); set(3,840,'snow'); },pose(u){ return {p:[34,-20],yaw:Math.PI,sp:0}; },cam(u){ const e=u*(2-u); return {p:mix([34,3,6],[34,2.3,-11],e),l:[34,3.6,-36],f:40}; }},
   {id:'Q',t0:39.2,t1:41.7,in(){ world(); set(1,800); G.enterDesert(); },pose(u){ return {p:[0,-20],yaw:0,sp:0}; },cam(u){ return {p:[lin(-8,-4,u),2.4,lin(36,24,u)],l:[lin(-6,-3,u),2.6,-20],f:42}; }},
   {id:'R',t0:41.7,t1:44.5,in(){ world(); set(1,800); G.enterIsland(); },pose(u){ return {p:[6,12],yaw:.6,sp:0}; },cam(u){ const e=ease(u); return {p:mix([-6,1.1,30],[-3,1.2,28.4],e),l:mix([10,3,-10],[12,3.2,-10],e),f:42}; }},
   {id:'S',t0:44.5,t1:48.7,in(){ world(); set(2,1020); },pose(u){ return {p:[24,23],yaw:0,sp:0}; },cam(u){ return {p:[lin(19,20,u),.8,lin(16.2,16.2,u)],l:[lin(25,26,u),2,30],f:34}; }},
   {id:'T',t0:48.7,t1:50.5,in(){ world(); set(2,960); },pose(u){ return {p:[lin(-20,26,u),14],yaw:Math.PI/2,sp:7.2}; },cam(u){ return {p:[3,.6,lin(5,5.3,u)],l:[lin(-6,16,ease(u)),1.1,15],f:36}; }},
   {id:'U1',t0:50.5,t1:53.8,hold:.7,in(){ world(); set(1,860); G.enterDesert(); },pose(u){ return {p:[lin(-30,-10,u),0],yaw:Math.PI/2,sp:4.2}; },cam(u){ return {p:[lin(-22,-19,u),.7,44],l:[lin(-18,-16,u),5,-30],f:30}; }},
   {id:'U2',t0:53.1,t1:57.1,in(){ world(); set(1,860); G.enterDesert(); },pose(u){ return {p:[lin(-14,-20,ease(clamp(u*1.4))),lin(10,-5.5,ease(clamp(u*1.4)))],yaw:Math.PI*1.1,sp:u<.7?3.6:0}; },cam(u){ const e=ease(u); return {p:mix([-11,3.2,20],[-14.5,2.2,12],e),l:mix([-18,2,-10],[-20,2.2,-12],e),f:36}; }},
   {id:'V',t0:57.1,t1:59.7,in(){ world(); set(1,1330); star.visible=true; star.position.set(15,70,300); },pose(u){ return {p:[15,44.5],yaw:0,sp:0}; },cam(u){ const e=ease(u); return {p:mix([15,.7,18],[15,.7,20.4],e),l:[15,7,120],f:30}; },out(){ star.visible=false; }}
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
      v.film.size(w,h); seek(id,0); const cv=v.renderer.domElement, t0=performance.now(); for(let i=0;i<n;i++){ v.film.frame(); const f=new VideoFrame(cv,{timestamp:Math.round(i*1e6/FPS),duration:Math.round(1e6/FPS)}); enc.encode(f,{keyFrame:i%120===0}); f.close(); while(enc.encodeQueueSize>6) await new Promise(r=>setTimeout(r,4)); if(i%20===0) await new Promise(r=>setTimeout(r,0)); if(err) throw err; } await enc.flush(); mux.finalize(); const buf=target.buffer; let up=null; if(upload){ const r=await fetch(upload+id+'.mp4',{method:'PUT',body:buf}); up=r.status; } return {id,frames:n,bytes:buf.byteLength,ms:Math.round(performance.now()-t0),up}; } };
}
