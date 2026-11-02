// Drives the live game in a local Chrome. Frames and takes come straight back over the debug pipe and land on this disk; nothing is uploaded anywhere.
import puppeteer from 'puppeteer-core'; import fs from 'fs'; import {execSync} from 'child_process';
const mode=process.argv[2], ids=(process.argv[3]||'').split(',').filter(Boolean), outDir=process.argv[4]||'takes', U=+(process.argv[5]||.5); fs.mkdirSync(outDir,{recursive:true});
const therm=()=>{ try{ return +(/CPU_Speed_Limit\s*=\s*(\d+)/.exec(execSync('pmset -g therm').toString())||[0,100])[1]; }catch(e){ return 100; } };
const browser=await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', protocolTimeout:1800000, userDataDir:process.env.HOME+'/Library/Caches/sv_film_prof', args:['--use-angle=metal','--enable-gpu','--ignore-gpu-blocklist','--enable-unsafe-webgpu=false','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--window-size=1280,720'] });
const page=await browser.newPage(); await page.setViewport({width:1280,height:720});
const parts={}; await page.exposeFunction('__chunk',(name,i,b64)=>{ (parts[name]=parts[name]||[]).push(Buffer.from(b64,'base64')); });
await page.exposeFunction('__done',(name)=>{ const b=Buffer.concat(parts[name]||[]); fs.writeFileSync(outDir+'/'+name,b); delete parts[name]; return b.length; });
const ac=()=>{ try{ return /AC Power/.test(execSync('pmset -g batt').toString()); }catch(e){ return true; } };
// stop cleanly rather than sit hot: a take in progress is simply redone next run
const bail=async why=>{ console.log('stopping:',why,therm()); try{ await browser.close(); }catch(e){} process.exit(3); };
await page.exposeFunction('__cool',async()=>{ if(!ac()) await bail('on battery'); await new Promise(r=>setTimeout(r,5000)); let w=0; while(therm()<45){ if(++w>60) await bail('too hot'); await new Promise(r=>setTimeout(r,10000)); } });
page.on('pageerror',e=>console.log('pageerror',String(e).slice(0,300)));
await page.goto('https://nova-games.up.railway.app/play/starvale/?shot=1&manual=1&film=1',{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForFunction('window.__filmReady===true&&document.querySelector("#load.hidden")',{timeout:300000,polling:1000});
console.log('ready',await page.evaluate(()=>{ const gl=__sv.renderer.getContext(), e=gl.getExtension('WEBGL_debug_renderer_info'); return [e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'',typeof VideoEncoder]; }));
await page.evaluate(async()=>{ const sc=await import('./scenery.js'); const un=__sv.grade().uniforms.get('uShaft'); let sv_=0; window.__shaftK=1; Object.defineProperty(un,'value',{get:()=>sv_*window.__shaftK,set:x=>{sv_=x;}}); const v=__sv, G=v.G, S=v.S, F=v.film.SHOTS, lin=(a,b,u)=>a+(b-a)*u, ease=u=>u*u*(3-2*u), mix=(a,b,u)=>a.map((x,i)=>lin(x,b[i],u));
  const set=(s,t,w='clear')=>{ if(S.inHouse) v.leaveHouse(); S.boating=false; S.season=s; v.setSeason(s); S.time=t; S.weather=w; v.applyWeather(); G.weatherSnap(w==='rain'?1:0,w==='snow'?1:0); };
  const put=(id,o)=>Object.assign(F.find(x=>x.id===id),o);
  put('T',{pose(u){ return {p:[lin(6,12,u),53.5],yaw:Math.PI/2,sp:0}; },cam(u){ return {p:[lin(7.4,9.6,u),.8,46.6],l:[lin(7.6,11,ease(u)),2.2,60],f:40}; }});
  // rain on the meadow: wet grass at lens height, ripples and mist on the lake beyond
  put('K',{in(){ set(1,800,'rain'); },pose(u){ return {p:[-22,17.5],yaw:0,sp:0}; },cam(u){ const e=ease(u); return {p:mix([-21,1.5,7.5],[-21.4,1.7,10],e),l:mix([-22,2.4,50],[-22.4,3,60],e),f:38}; },act:undefined,out:undefined});
  // low sun through the trees: the beams themselves
  put('L',{in(){ set(1,1095); G.volK=4; window.__shaftK=3.2; },pose(u){ return {p:[-20,15],yaw:-.97,sp:0}; },cam(u){ const e=ease(u), d=sc.rig.sunDir, p=mix([-4,1.6,6],[-5.6,1.8,7.2],e); return {p,l:[p[0]+d.x*90,p[1]+d.y*90-13,p[2]+d.z*90],f:44}; },act:undefined,out(){ G.volK=1; window.__shaftK=1; }});
});
const list=ids.length?ids:await page.evaluate(()=>__sv.film.SHOTS.map(s=>s.id));
for(const id of list){
  if(mode!=='still'&&fs.existsSync(outDir+'/'+id+'.mp4')) continue;
  if(!ac()) await bail('on battery'); { let w=0; while(therm()<50){ if(++w>60) await bail('too hot'); await new Promise(r=>setTimeout(r,10000)); } }
  const t=Date.now();
  if(mode==='still'){ const uu=U; const r=await page.evaluate(async(id,uu)=>{ const f=__sv.film, v=__sv; f.seek(id,uu); for(let i=0;i<5;i++) f.frame(); const b=v.shot(1280,720,.86); return b.split(',')[1]; },id,uu); fs.writeFileSync(outDir+'/'+id+'.jpg',Buffer.from(r,'base64')); console.log(id,Date.now()-t,'ms'); }
  else { const r=await page.evaluate(async(id)=>{ const res=await __sv.film.record(id,{w:2560,h:1440,bitrate:60e6}); return {frames:res.frames,bytes:res.bytes,ms:res.ms}; },id); console.log(id,JSON.stringify(r),therm()); }
  await new Promise(r=>setTimeout(r,1500));
}
await browser.close();
