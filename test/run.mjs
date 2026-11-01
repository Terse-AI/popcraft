import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const dom=new JSDOM('<!doctype html><body><div id="hud"></div></body>'); globalThis.document=dom.window.document; globalThis.window=dom.window; globalThis.addEventListener=()=>{}; globalThis.performance=globalThis.performance||{now:()=>Date.now()};
/* the rules run headless: the game's logic modules, copied beside stand-ins for everything that draws */
const here=path.dirname(fileURLToPath(import.meta.url)), build=path.join(here,'.build');
fs.rmSync(build,{recursive:true,force:true}); fs.mkdirSync(path.join(build,'node_modules'),{recursive:true});
fs.writeFileSync(path.join(build,'package.json'),'{"type":"module"}');
for(const f of ['data.js','valley.js','systems.js','late.js']) fs.copyFileSync(path.join(here,'..',f),path.join(build,f));
for(const f of ['scenery.js','cave.js','buildings.js','creatures.js']) fs.copyFileSync(path.join(here,'stubs',f),path.join(build,f));
fs.cpSync(path.join(here,'stubs','three'),path.join(build,'node_modules','three'),{recursive:true});
const D=await import(path.join(build,'data.js')), V=await import(path.join(build,'valley.js'));
let pass=0, fail=0; const ok=(c,m)=>{ if(c) pass++; else { fail++; console.log('FAIL',m); } }, eq=(a,b,m)=>ok(a===b,m+' got '+a+' want '+b);
export function fresh(){ const S=V.defaultState(); const toasts=[], G={S,toasts,lang:'en',$:s=>document.querySelector(s),L:(a,b)=>b,toast:m=>toasts.push(m),LANG:()=>'en',camera:{},scene:{add(){}},renderer:{},world:{add(){},remove(){},visible:true},player:{pos:{x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}},yaw:0}};
  let box=document.getElementById('dynmodal'); if(!box){ box=document.createElement('div'); box.id='dynmodal'; document.body.appendChild(box); }
  G.modal=(t,fn)=>{ box.classList.remove('hidden'); box.innerHTML='<div id="mb"></div>'; const b=box.firstChild; G.title=t; fn(b); G.body=b; };
  G.click=txt=>{ const c=[...G.body.querySelectorAll('.buy,.hudrow')].find(e=>e.textContent.includes(txt)); if(!c) throw new Error('no button '+txt+' in '+G.body.textContent.slice(0,200)); c.onclick(); };
  Object.assign(G,{snd(){},sndAt(){},renderHotbar(){},renderStatus(){},renderEnergy(){},rebuildCrop(){},refreshTileMesh(){},rebuildDebris(){},rebuildForage(){},rebuildDigs(){},spawnPlacement(){},spawnAnimal(t,x){ S.animals.push({type:t,fr:0,age:0,mood:1,...x}); },onMine(){},fadeMsg(){},shake(){},chips(){},seasonName:i=>['Spring','Summer','Fall','Winter'][i],itemIcon:(k,i)=>k+':'+i,toolNames:()=>['Hoe','Can','Axe','Pick','Scythe','Sword'],toolEm:()=>['','','','','',''],tkey:(x,z)=>x+','+z,getTile:(x,z)=>S.tiles.get(x+','+z),aoe:()=>[[0,0]],target:()=>G.tgt,spend(n){ S.energy-=n; },setCut(){},onNewDay(){},storeSave(d){ G.saved=JSON.parse(JSON.stringify(d)); return true; },nova(){}});
  V.makeValley(G); G.mine.group={visible:false}; G.mine.stuff={add(){},remove(){}}; G.mine.light={color:{setHex(){}},position:{set(){}}}; return G; }
const tests=await import('./tests.mjs'); await tests.default({D,V,ok,eq,fresh});
console.log('pass',pass,'fail',fail); process.exit(fail?1:0);
