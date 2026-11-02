/* The film. Every shot is a function of time, stepped frame by frame, so a take is exact and repeatable: where the star figure stands, where the
   lens is, what hour and season it is. No panels are ever on screen. Loaded only with ?shot&film=1. */
import * as THREE from 'three';

const ease=u=>u*u*(3-2*u), lin=(a,b,u)=>a+(b-a)*u, mix=(a,b,u)=>a.map((v,i)=>lin(v,b[i],u)), clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;
const path=(P,u)=>{ const n=P.length-1, s=clamp(u)*n, i=Math.min(n-1,Math.floor(s)); return mix(P[i],P[i+1],s-i); };
export const FPS=30, SUB=4, W=3840, H=2160;
/* four renders to a frame, each a quarter pixel apart and spread over half the frame's time: a 180 degree shutter and supersampled edges */
const JIT=[[.125,.375],[-.375,.125],[.375,-.125],[-.125,-.375]];
/* a message-channel yield: unlike a timer it is not throttled while the pane is hidden */
const tick=()=>new Promise(r=>{ const c=new MessageChannel(); c.port1.onmessage=()=>{ c.port1.close(); r(); }; c.port2.postMessage(0); });

export function setup(v){ let seed=20261031; Math.random=()=>{ seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
  const {G,S,player,camera,setSeason,applyWeather}=v, M=G.mine; const set=(season,time,weather='clear')=>{ S.season=season; setSeason(season); S.time=time; S.weather=weather; applyWeather(); G.weatherSnap(weather==='rain'?1:0,weather==='snow'?1:0); };
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
   {id:'A',t0:1.6,t1:4.43,in(){ world(); set(0,640); },pose(u){ return {p:[-22,18],yaw:0,sp:0}; },cam(u){ const e=ease(u); return {p:mix([-21.4,.55,9.5],[-21.8,3.1,12.2],e),l:mix([-22,1.6,40],[-23,7,90],e),f:40}; }},
   {id:'B',t0:4.43,t1:6.23,in(){ world(); set(0,660); },pose(u){ return {p:[lin(-9,7,u),22.4],yaw:Math.PI/2,sp:6}; },cam(u){ return {p:[lin(-9.5,6,u),1.5,10.5],l:[lin(-7,8.5,u),3.4,70],f:32,roll:lin(.012,-.008,u)}; }},
   {id:'C',t0:6.23,t1:9.2,in(){ world(); set(0,700); },pose(u){ return {p:path([[-2,22.6],[10,23.2],[22,23]],u),yaw:Math.PI/2,sp:7}; },cam(u){ const q=path([[-2,22.6],[10,23.2],[22,23]],u); return {p:[lin(-14,-8,u),11,lin(6,8,u)],l:[q[0]+8,1.2,q[1]+10],f:36}; }},
   {id:'D',t0:9.2,t1:12.27,in(){ world(); set(1,640); },pose(u){ return {p:[15,36],yaw:-.97,sp:0}; },cam(u){ const e=ease(u); return {p:mix([25,.5,27],[23,.6,33],e),l:mix([-30,3,76],[-34,5,78],e),f:34}; }},
   {id:'E1',t0:12.27,t1:14.3,hold:.5,in(){ world(); set(0,620); if(!farmReady.done){ grid(); farmReady.done=true; } swingAt=0; S.tool=1; G.renderHotbar(); },pose(u){ return {p:[lin(-.5,1,u),6.8],yaw:-2.3,sp:0}; },act(u,a,t){ if(t-swingAt>1.1){ swingAt=t; G.swing(); G.splash&&G.splash(.4,8); } },cam(u){ const e=ease(u); return {p:mix([-6.6,2.1,-.8],[-5.8,2,-.1],e),l:mix([.4,.95,7.4],[.5,1,7.6],e),f:30}; }},
   {id:'E2',t0:14.3,t1:18.2,in(){ world(); set(2,1160); birds.visible=true; },pose(u){ return {p:[12.9,DK+.5],yaw:-.96,sp:0}; },act(u){ birds.children.forEach((b,i)=>{ const k=i-4, a=Math.abs(k), cx=17-.82*70+.57*lin(-46,44,u), cz=DK-2.6+.57*70+.82*lin(-46,44,u); b.position.set(cx-.57*a*2.6+.82*k*1.8,23+a*.5+Math.sin(u*2),cz-.82*a*2.6-.57*k*1.8); b.scale.setScalar(1.5); b.rotation.set(Math.PI/2,0,Math.sin(u*46+i)*.5); }); },cam(u){ const e=ease(u); return {p:mix([17.2,1,DK-2.6],[17.5,1.7,DK-2.9],e),l:mix([-40,9,DK+36],[-40,34,DK+36],e),f:38}; },out(){ birds.visible=false; }},
   {id:'E3',t0:18,t1:20.7,in(){ world(); set(3,840,'snow'); },pose(u){ return {p:[34,lin(-30,-15,u)],yaw:0,sp:3.4}; },cam(u){ return {p:[34,2.6,8],l:[34,3.8,-36],f:36}; }},
   {id:'F',t0:20.7,t1:22.5,in(){ world(); set(2,900); },pose(u){ return {p:[15,lin(27,33,u)],yaw:0,sp:3.4}; },cam(u){ return {p:[15.2,1.7,lin(20.5,26.5,u)],l:[15,3.2,lin(90,96,u)],f:38}; }},
   {id:'G',t0:22.5,t1:24.27,in(){ world(); set(2,900); const p=(G.people||[])[0]; if(p){ p.x=p.tx=36.4; p.z=p.tz=-22.4; p.wait=99; p.mesh.visible=true; } },pose(u){ return {p:[32.8,-21.4],yaw:1.8,sp:0}; },cam(u){ const e=ease(u); return {p:mix([29.6,1.5,-18.6],[29.6,1.5,-19.8],e),l:[36,1.25,-22.2],f:30}; }},
   {id:'H',t0:24.27,t1:25.47,in(){ world(); set(2,1000); },pose(u){ return {p:[22,-31.6],yaw:Math.PI,sp:0}; },cam(u){ const e=ease(u); return {p:mix([22,1.5,-17],[22,1.5,-18.4],e),l:[22,3.4,-34],f:30}; }},
   {id:'I',t0:25.47,t1:26.07,in(){ world(); set(3,1300); },pose(u){ return {p:[0,-10.2],yaw:Math.PI,sp:0}; },cam(u){ return {p:[0,1.4,lin(3.4,2.6,u)],l:[0,3.4,-16],f:34}; }},
   {id:'J',t0:26.07,t1:27.27,in(){ world(); v.enterHouse(true); set(1,1200); },pose(u){ return {p:[0,lin(1.6,-2.2,u)],yaw:Math.PI,sp:3.2}; },cam(u){ const e=u*u; return {p:[lin(.5,.1,e),lin(2.1,1.7,e),lin(3.9,.8,e)],l:[0,1.1,-4],f:58}; }},
   {id:'K',t0:27.27,t1:29.63,in(){ world(); v.enterHouse(true); set(1,1200); },pose(u){ const q=v.house.userData.spots.stove; return {p:[q.x,q.z+1],yaw:Math.PI,sp:0}; },cam(u){ const q=v.house.userData.spots.stove, e=ease(u); return {p:mix([q.x+2.6,1.5,q.z+3.4],[q.x+2.2,1.5,q.z+3],e),l:[q.x,1,q.z],f:46}; }},
   {id:'L',t0:29.63,t1:31.43,in(){ world(); set(0,740); (G.people||[]).slice(0,7).forEach((p,i)=>{ const a=i/7*6.28, x=34+Math.cos(a)*4.4, z=-22+Math.sin(a)*3.2; p.x=p.tx=x; p.z=p.tz=z; p.wait=99; p.mesh.visible=true; }); },pose(u){ return {p:[34,-22],yaw:Math.PI,sp:0}; },cam(u){ const e=u*(2-u); return {p:mix([34,2.1,1],[34,1.9,-11],e),l:[34,1.7,-30],f:36}; }},
   {id:'M',t0:31.43,t1:33.87,in(){ world(); set(2,1400); S.day=1; },pose(u){ return {p:[15,40],yaw:-.97,sp:0}; },cam(u){ const e=ease(u); return {p:[20,1.3,35],l:mix([-34,4,74],[-30,40,72],e),f:44,roll:lin(0,.09,e)}; }},
   {id:'N',t0:33.87,t1:35.07,in(){ world(); set(2,1090); S.boating=true; },pose(u){ return {p:[124.9,73],yaw:.7,sp:0}; },act(u){ S.time=lin(1096,1215,u); },cam(u){ return {p:[lin(122.4,122.2,u),1.5,lin(69.6,69.4,u)],l:[136,8,86],f:36}; }},
   {id:'O',t0:35.07,t1:36.27,in(){ world(); set(0,640); S.boating=true; },pose(u){ return {p:[lin(30,33.5,u),56],yaw:Math.PI/2,sp:0}; },cam(u){ return {p:[lin(27.5,31,u),1.5,47.5],l:[lin(33,36.5,u),1.5,70],f:34}; }},
   {id:'P',t0:36.27,t1:38.7,in(){ world(); set(3,840,'snow'); },pose(u){ return {p:[34,-20],yaw:Math.PI,sp:0}; },cam(u){ const e=u*(2-u); return {p:mix([34,3,6],[34,2.3,-11],e),l:[34,3.6,-36],f:40}; }},
   {id:'Q',t0:39.4,t1:41.83,in(){ world(); set(1,800,'rain'); },pose(u){ return {p:[15,41],yaw:-.97,sp:0}; },cam(u){ return {p:mix([21,1.7,31],[10,1.2,45],u),l:[-40,7,92],f:38}; }},
   {id:'R',t0:41.83,t1:44.6,in(){ world(); set(2,960); },pose(u){ return {p:[lin(1,9,u),21.6],yaw:Math.PI/2,sp:3.4}; },cam(u){ return {p:[lin(-3,6,u),.8,12.5],l:[lin(-1,8,u),3.2,70],f:30}; }},
   {id:'S',t0:44.6,t1:48.8,in(){ world(); set(2,1030); },pose(u){ return {p:[-25.6,6.6],yaw:.3,sp:0}; },cam(u){ return {p:[lin(-27.8,-26.6,u),1.8,lin(-3.2,-2.7,u)],l:[lin(-26.4,-25.2,u),2.4,20],f:30}; }},
   {id:'T',t0:48.8,t1:50.6,in(){ world(); set(2,1130); S.boating=true; },pose(u){ return {p:[lin(-4,22,u),53.5],yaw:Math.PI/2,sp:0}; },cam(u){ return {p:[9,.5,lin(47,47.4,u)],l:[lin(1,17,ease(u)),.7,57],f:30}; }},
   {id:'U1',t0:50.6,t1:53.37,in(){ world(); set(2,1060); },pose(u){ return {p:[lin(-26.6,-16.4,u),lin(8.1,22.9,u)],yaw:.61,sp:4.2}; },cam(u){ return {p:[lin(-2,-5,u),2.4,3],l:[lin(-62,-70,u),12,lin(44,50,u)],f:30}; }},
   {id:'U2',t0:53.37,t1:54.87,in(){ world(); set(0,1130); },pose(u){ return {p:[15,40],yaw:-.97,sp:0}; },cam(u){ return {p:[lin(22,21.6,u),2.2,lin(35,35.3,u)],l:[-34,8,74],f:40}; }},
   {id:'U3',t0:54.87,t1:57.27,in(){ world(); set(3,700,'snow'); },pose(u){ return {p:[-7,4],yaw:0,sp:0}; },cam(u){ const e=ease(u); return {p:mix([-6.2,2.6,-4.5],[-6.6,2.1,-2.6],e),l:[-8,2.4,40],f:40}; }},
   {id:'V',t0:57.27,t1:59.7,in(){ world(); set(2,1400); S.day=1; },pose(u){ return {p:[15,41],yaw:-.97,sp:0}; },cam(u){ const e=ease(u); return {p:mix([24,1.6,33],[21,1.5,35.4],e),l:[-40,20,90],f:46}; }},
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
    async record(id,{w=W,h=H,bitrate=90e6,upload}){ const s=SHOTS.find(x=>x.id===id), secs=(s.t1-s.t0)+(s.hold||0), n=Math.round(secs*FPS); const { Muxer, ArrayBufferTarget }=await import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/+esm'); const target=new ArrayBufferTarget(), mux=new Muxer({target,video:{codec:'avc',width:w,height:h,frameRate:FPS},fastStart:'in-memory'}); let err=null; const enc=new VideoEncoder({output:(c,m)=>mux.addVideoChunk(c,m),error:e=>{ err=e; }}); enc.configure({codec:'avc1.640033',width:w,height:h,bitrate,framerate:FPS,latencyMode:'quality',hardwareAcceleration:'prefer-hardware'});
      v.film.size(w,h); seek(id,0); const cv=v.renderer.domElement, frame=document.createElement('canvas'); frame.width=w; frame.height=h; const fx=frame.getContext('2d',{alpha:false}), step=1000/(FPS*2*SUB), t0=performance.now(); for(let i=0;i<n;i++){ for(let k=0;k<SUB;k++){ camera.setViewOffset(w,h,JIT[k][0],JIT[k][1],w,h); v.tNow+=step*(k<SUB-1?1:SUB+1); v.step(v.tNow); fx.globalAlpha=1/(k+1); fx.drawImage(cv,0,0,w,h); } const f=new VideoFrame(frame,{timestamp:Math.round(i*1e6/FPS),duration:Math.round(1e6/FPS)}); enc.encode(f,{keyFrame:i%60===0}); f.close(); let spins=0; const since=performance.now(); while(enc.encodeQueueSize>6){ if(++spins<40) await tick(); else await new Promise(r=>setTimeout(r,10)); if(performance.now()-since>25000) throw new Error('encoder stalled'); } if(i%20===0) await tick(); if(i%16===15&&window.__cool) await window.__cool(); if(err) throw err; } await enc.flush(); mux.finalize(); const buf=new Uint8Array(target.buffer); for(let i=0,k=0;i<buf.length;i+=6e6,k++){ let b=''; const part=buf.subarray(i,i+6e6); for(let j=0;j<part.length;j+=32768) b+=String.fromCharCode.apply(null,part.subarray(j,j+32768)); await window.__chunk(id+'.mp4',k,btoa(b)); } await window.__done(id+'.mp4'); return {id,frames:n,bytes:buf.length,ms:Math.round(performance.now()-t0)}; } };
}
