// The four-seasons cut: nine shots on the reference's timeline, each in another season or sky. Renders in a local Chrome; takes come back over the debug pipe to this disk.
import puppeteer from 'puppeteer-core'; import fs from 'fs'; import {execSync} from 'child_process';
const mode=process.argv[2], ids=(process.argv[3]||'').split(',').filter(Boolean), outDir=process.argv[4]||'takes', U=+(process.argv[5]||.5); fs.mkdirSync(outDir,{recursive:true});
const therm=()=>{ try{ return +(/CPU_Speed_Limit\s*=\s*(\d+)/.exec(execSync('pmset -g therm').toString())||[0,100])[1]; }catch(e){ return 100; } };
const ac=()=>{ try{ return /AC Power/.test(execSync('pmset -g batt').toString()); }catch(e){ return true; } };
const browser=await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', protocolTimeout:1800000, userDataDir:process.env.HOME+'/Library/Caches/sv_film_prof', args:['--use-angle=metal','--enable-gpu','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--window-size=1280,720'] });
const bail=async why=>{ console.log('stopping:',why,therm()); try{ await browser.close(); }catch(e){} process.exit(3); };
const page=await browser.newPage(); await page.setViewport({width:1280,height:720});
const parts={}; await page.exposeFunction('__chunk',(name,i,b64)=>{ (parts[name]=parts[name]||[]).push(Buffer.from(b64,'base64')); });
await page.exposeFunction('__done',(name)=>{ const b=Buffer.concat(parts[name]||[]); fs.writeFileSync(outDir+'/'+name,b); delete parts[name]; return b.length; });
await page.exposeFunction('__cool',async()=>{ if(!ac()) await bail('on battery'); await new Promise(r=>setTimeout(r,5000)); let w=0; while(therm()<45){ if(++w>60) await bail('too hot'); await new Promise(r=>setTimeout(r,10000)); } });
page.on('pageerror',e=>console.log('pageerror',String(e).slice(0,300)));
await page.goto('https://nova-games.up.railway.app/play/starvale/?shot=1&manual=1&film=1',{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForFunction('window.__filmReady===true&&document.querySelector("#load.hidden")',{timeout:300000,polling:1000});
await page.evaluate(async()=>{
  const sc=await import('./scenery.js'), pr=await import('./props.js'), THREE=await import('three');
  const v=__sv, G=v.G, S=v.S, F=v.film.SHOTS, lin=(a,b,u)=>a+(b-a)*u, ease=u=>u*u*(3-2*u), mix=(a,b,u)=>a.map((x,i)=>lin(x,b[i],u)), cl=u=>Math.max(0,Math.min(1,u));
  const un=v.grade().uniforms.get('uShaft'); let sv_=0; window.__shaftK=1; Object.defineProperty(un,'value',{get:()=>sv_*window.__shaftK,set:x=>{sv_=x;}});
  const set=(s,t,w='clear')=>{ if(S.inHouse) v.leaveHouse(); if(S.inMine) G.mine.leave(true); S.boating=false; S.day=1; S.season=s; v.setSeason(s); S.time=t; S.weather=w; v.applyWeather(); G.weatherSnap(w==='rain'||w==='storm'?1:0,w==='snow'?1:0); G.volK=1; window.__shaftK=1; fire.visible=false; light.intensity=0; };
  const fire=pr.placedModel('campfire').clone(); fire.scale.setScalar(1.7); fire.visible=false; v.scene.add(fire);
  const light=new THREE.PointLight(0xff9a4a,0,9,2); v.scene.add(light);
  // the broad tree nearest the meadow, for the shot that looks out from under a crown
  const tree=sc.plantedTrees.filter(t=>/^broad/.test(t.row)).sort((a,b)=>Math.hypot(a.x+20,a.z-14)-Math.hypot(b.x+20,b.z-14))[0]||{x:-20,z:14};
  window.__tree=[tree.x,tree.z];
  const D=v.DOCK.z1;
  const L=[
   // spring morning: running the dock toward the mirror lake and the peaks
   {id:'M1',t0:0,t1:3.833,in(){ set(0,640); },pose(u){ return {p:[-7,4],yaw:0,sp:0}; },cam(u){ return {p:[0,.95,lin(154,138,u)],l:[0,lin(23,25,u),-60],f:40}; }},
   // summer noon: from the shore straight up until the whole valley is under us
   {id:'M2',t0:3.833,t1:7.2,in(){ set(1,780); },pose(u){ return {p:[11,22],yaw:-.97,sp:0}; },cam(u){ const e=ease(u); return {p:mix([13.5,1.6,17.5],[2,30,-6],e),l:mix([4,3,32],[-40,26,110],e),f:42}; }},
   // winter: snow falling on still water, at the water's edge
   {id:'M3',t0:7.2,t1:9.6,in(){ set(3,840,'snow'); },pose(u){ return {p:[34,lin(-30,-17,u)],yaw:0,sp:3.4}; },cam(u){ const e=ease(u); return {p:mix([34,2.4,9],[34,2.3,6.5],e),l:[34,4,-36],f:34}; }},
   // autumn: the boat crosses in front of a pink sunset
   {id:'M4',t0:9.6,t1:11.267,in(){ set(2,1160); },pose(u){ return {p:[-7,4],yaw:0,sp:0}; },cam(u){ return {p:[lin(111,116,u),1.1,62.5],l:[lin(150,154,u),15,100],f:40}; }},
   // summer evening: running straight into the sun, the light breaking through the crowns
   {id:'M5',t0:11.267,t1:15.333,in(){ set(1,1095); G.volK=4; window.__shaftK=3.2; },pose(u){ const d=sc.rig.sunDir, k=Math.hypot(d.x,d.z), dx=d.x/k, dz=d.z/k; return {p:[-4+dx*lin(2.5,9,u),6+dz*lin(2.5,9,u)],yaw:Math.atan2(dx,dz),sp:6}; },cam(u){ const d=sc.rig.sunDir, p=[-4+d.x*lin(0,1.4,u),1.25,6+d.z*lin(0,1.4,u)]; return {p,l:[p[0]+d.x*90,p[1]+d.y*90-12,p[2]+d.z*90],f:44}; }},
   // autumn night: from the aurora down to a fire at the end of the dock
   {id:'M6',t0:15.333,t1:19.2,in(){ set(2,1400); fire.visible=true; fire.position.set(-21,v.walkH(-21,19),19); light.position.set(-21,fire.position.y+.8,19); },pose(u){ return {p:[-19.6,20.8],yaw:-2.58,sp:0}; },act(u,a,t){ light.intensity=1.8+.6*Math.sin(t*23)+.4*Math.sin(t*7.3); },cam(u){ const e=ease(Math.min(1,u*1.35)); return {p:[-24.2,1.9,13.4],l:mix([-30,46,60],[-21,.6,19],e),f:44}; }},
   // winter night: through the frost toward the lit cabin under the aurora
   {id:'M7',t0:19.2,t1:22.533,in(){ set(3,1400); },pose(u){ return {p:[0,lin(-2,-8,u)],yaw:Math.PI,sp:2.6}; },cam(u){ const e=ease(u); return {p:mix([.3,.85,5.5],[.1,1.15,.4],e),l:[0,2.4,-16],f:40}; }},
   // summer storm: low over the lake, out past the dock into the rain
   {id:'M8',t0:22.533,t1:26.4,in(){ set(1,800,'storm'); },pose(u){ return {p:[-7,4],yaw:0,sp:0}; },cam(u){ return {p:mix([21.5,1.5,30],[11,.9,44],u),l:[-40,8,92],f:36}; }},
   // spring dusk: the sun going down over the peaks, the lake a mirror; it ends in light
   {id:'M9',t0:26.4,t1:30.67,in(){ set(0,1130); },pose(u){ return {p:[-7,4],yaw:0,sp:0}; },act(u){ S.time=lin(1124,1142,u); },cam(u){ const e=ease(u); return {p:mix([97,1.4,63],[91,1.3,66.5],e),l:mix([10,8,128],[6,8,128],e),f:40}; }},
  ];
  F.length=0; F.push(...L);
});
const list=ids.length?ids:await page.evaluate(()=>__sv.film.SHOTS.map(s=>s.id));
for(const id of list){
  if(mode!=='still'&&fs.existsSync(outDir+'/'+id+'.mp4')) continue;
  if(mode!=='still'){ if(!ac()) await bail('on battery'); let w=0; while(therm()<50){ if(++w>60) await bail('too hot'); await new Promise(r=>setTimeout(r,10000)); } }
  const t=Date.now();
  if(mode==='still'){ const r=await page.evaluate(async(id,uu)=>{ const f=__sv.film; f.seek(id,uu); for(let i=0;i<5;i++) f.frame(); return __sv.shot(1280,720,.86).split(',')[1]; },id,U); fs.writeFileSync(outDir+'/'+id+'_'+U+'.jpg',Buffer.from(r,'base64')); console.log(id,Date.now()-t,'ms'); }
  else { const r=await page.evaluate(async(id)=>{ const res=await __sv.film.record(id,{w:2560,h:1440,bitrate:60e6}); return {frames:res.frames,bytes:res.bytes,ms:res.ms}; },id); console.log(id,JSON.stringify(r),therm()); await new Promise(r=>setTimeout(r,1500)); }
}
await browser.close();
