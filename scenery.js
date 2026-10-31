/* ======================================================================
   StarVale scenery — a painted lake valley.
   Everything outdoors is built like a landscape painting: hand-style sprite
   sheets and panoramas (tools/paint) store light as data, and this module
   turns them into colour through ramps and an hour-by-hour palette, so the
   whole frame changes key together, sunrise to night.
   ====================================================================== */
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{ const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
function hash2(x,z){ let n=Math.sin(x*127.1+z*311.7)*43758.5453; return n-Math.floor(n); }
export function vnoise(x,z){
  const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi;
  const u=xf*xf*(3-2*xf), v=zf*zf*(3-2*zf);
  const a=hash2(xi,zi),b=hash2(xi+1,zi),c=hash2(xi,zi+1),d=hash2(xi+1,zi+1);
  return lerp(lerp(a,b,u),lerp(c,d,u),v);
}
function rng(seed){ let s=seed>>>0; return ()=>{ s=(s+0x6D2B79F5)|0; let t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

/* ---------- land and lake ---------- */
export const FARM_HALF=13, WATER_Y=-1.15;
const LAKE={cz:128,rx:250,rz:100};
export const ISLANDS=[[-52,96,18],[64,124,22],[-26,68,5],[-118,134,16],[138,86,11],[-8,176,11]];     // x,z,radius
const CAPES=[[214,128,92],[-226,116,96],[92,214,66],[-96,216,74],[10,244,80]];                        // headlands reaching in from the shore
export function lakeField(x,z){            // > 0 is water
  const dx=x/LAKE.rx, dz=(z-LAKE.cz)/LAKE.rz;
  let f=1-Math.hypot(dx,dz);
  f+=(vnoise(x*.012+3,z*.012+7)-.5)*.22+(vnoise(x*.043,z*.043)-.5)*.05;
  for(const [ix,iz,ir] of CAPES){ const d=Math.hypot(x-ix,z-iz); if(d<ir*2) f=Math.min(f,(d/ir-1+(vnoise(x*.03,z*.03)-.5)*.5)*.5); }
  for(const [ix,iz,ir] of ISLANDS){ const d=Math.hypot(x-ix,z-iz); if(d<ir*3) f=Math.min(f,(d/(ir*(.75+.5*vnoise(x*.07+5,z*.07)))-1)*.16); }
  return Math.min(f,(z-27)/70);
}
/* Mist Creek: from the north-west highland over the falls, down the rapids and into the lake.
   x,z,water height,half width,foam */
export const RIVER=[[-268,-16,34,3.2,.1],[-244,4,31,3.4,.15],[-226,20,28.4,3.8,.35],[-214,31,26.6,4.2,.6],[-210.5,34.5,9.2,4.6,1],[-203,41,7.4,5,.9],[-192,47,5,5.2,.8],[-180,52,2.6,5.6,.7],[-168,56,.2,6.5,.5],[-156,60,-1.15,8,.25]];
const FALLS={x:-212,z:33,top:26.6,bot:9.2};
export function riverAt(x,z){              // nearest point on the creek: distance, water height, half width
  if(x>-130||z<-40||z>90) return null;
  let best=1e9, by=0, bw=4, bs=0;
  for(let i=0;i<RIVER.length-1;i++){ const a=RIVER[i], b=RIVER[i+1], vx=b[0]-a[0], vz=b[1]-a[1], t=clamp(((x-a[0])*vx+(z-a[1])*vz)/(vx*vx+vz*vz),0,1), d=Math.hypot(x-a[0]-vx*t,z-a[1]-vz*t);
    if(d<best){ best=d; by=lerp(a[2],b[2],t); bw=lerp(a[3],b[3],t); bs=i+t; } }
  return {d:best,y:by,w:bw,s:bs};
}
export function terrainH(x,z){
  const e=clamp((Math.max(Math.abs(x),Math.abs(z))-FARM_HALF)/18,0,1);
  let h=((vnoise(x*.035,z*.035)-.5)*8+(vnoise(x*.11,z*.11)-.5)*1.5)*e*e;
  const r=Math.hypot(x/LAKE.rx,(z-LAKE.cz)/LAKE.rz);
  h+=smooth(1.02,1.75,r)*78*(.45+1.1*vnoise(x*.012+9,z*.012+2))*smooth(60,170,Math.hypot(x,z))*lerp(.2,1,smooth(90,250,Math.abs(x)));   // valley walls: high at the sides, low at the far end so the peaks show
  h+=smooth(70,210,Math.hypot(x,z+6))*34*vnoise(x*.014+3,z*.014)*smooth(40,-30,z);          // wooded ridges behind the farm
  if(h<-.45) h=-.45+(h+.45)*.16;                                                             // hollows stay dry above the lake level
  for(const [ix,iz,ir] of ISLANDS){ const d=Math.hypot(x-ix,z-iz); if(d<ir*1.4) h=Math.max(h,WATER_Y+(1-d/(ir*1.2))*ir*.34); }
  { const px=Math.max(0,Math.abs(x+38.5)-9), pz=Math.max(0,Math.abs(z+14)-8), pd=Math.hypot(px,pz); if(pd<10) h=lerp(0,h,smooth(0,10,pd)); }   // the greenhouse sits on a level pad
  const rv=riverAt(x,z);
  if(rv&&rv.d<46){ const bank=rv.y+1.1+Math.max(0,rv.d-rv.w)*.34; h=lerp(bank,h,smooth(16,46,rv.d)); if(rv.d<rv.w+3) h=lerp(rv.y-.9,h,smooth(rv.w-.6,rv.w+3,rv.d)); }
  const f=lakeField(x,z);
  if(f>-.07){ const s=smooth(-.07,0,f); h=lerp(h,WATER_Y+.25,s); if(f>0) h=WATER_Y+.25-Math.min(5,f*34); }
  return h;
}
// the dock reaches from the end of the farm path into the lake
export const DOCK={x:15,z0:0,z1:0,w:2.5,y:.02};
(()=>{ let z=20; while(lakeField(DOCK.x,z)<-.012&&z<60) z+=.4; DOCK.z0=z-3; DOCK.z1=z+15; })();
export const onDock=(x,z)=>(Math.abs(x-DOCK.x)<DOCK.w/2+.15&&z>DOCK.z0&&z<DOCK.z1+2)||(Math.abs(x-DOCK.x)<DOCK.w/2+1.6&&z>DOCK.z1-.3&&z<DOCK.z1+2.1);
export const inWater=(x,z)=>(lakeField(x,z)>-.004&&!onDock(x,z))||inRiver(x,z);
export function inRiver(x,z,m=.9){ const r=riverAt(x,z); return !!r&&r.d<r.w*m; }
export const walkH=(x,z)=>onDock(x,z)?Math.max(DOCK.y+.05,terrainH(x,z)):terrainH(x,z);

/* walking paths; kept clear of trees and painted into the ground */
export const PATHS=[
  [[0,-9.5],[1,-2],[0,13],[4,20],[14,25],[15,31]],         // cabin → dock
  [[4,-9],[14,-13],[26,-20],[34,-24]],                     // farm → town plaza
  [[34,-24],[50,-24],[66,-24],[84,-24]],[[34,-24],[22,-30]],[[36,-24],[36,-34]],[[50,-24],[50,-30]],[[64,-24],[64,-28]],[[62,-24],[64,-14]],[[50,-24],[54,-4]],[[26,-20],[20,-4]],
  [[4,20],[24,24]],
  [[-4,-9],[-16,-18],[-28,-30],[-40,-37]],                 // farm → mine
  [[-2,-8.5],[-13,-6]],                                    // → market stall
  [[-1,3],[-13,4]],                                        // → coop
  [[-13,4],[-60,14],[-112,26],[-150,38],[-178,40]]         // → the creek and the falls
];
function segDist(px,pz,a,b){ const vx=b[0]-a[0],vz=b[1]-a[1],t=clamp(((px-a[0])*vx+(pz-a[1])*vz)/(vx*vx+vz*vz),0,1); return Math.hypot(px-a[0]-vx*t,pz-a[1]-vz*t); }
function pathDist(x,z){ let d=1e9; for(const p of PATHS) for(let i=0;i<p.length-1;i++) d=Math.min(d,segDist(x,z,p[i],p[i+1])); return d; }
function keepClear(x,z){
  if(x>-28&&x<23&&z>-27&&z<25) return true;               // farm + yard
  if(x>14&&x<96&&z>-56&&z<8) return true;                 // town
  if(x>-50&&x<-27&&z>-24&&z<-4) return true;              // greenhouse
  if(x>19&&x<38&&z>-4&&z<30) return true;                 // barn, fish shop
  if(Math.hypot(x-138,z-86)<14) return true;              // lighthouse keeper's yard
  if(Math.hypot(x+40,z+40)<9) return true;                // mine mouth
  const rv=riverAt(x,z); if(rv&&rv.d<rv.w+3.5) return true;
  return pathDist(x,z)<3.2;
}

/* ---------- colour ---------- */
const hex=h=>{ const n=parseInt(h.slice(1),16); return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]; };
const mixc=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
const setC=(c,a)=>c.setRGB(a[0],a[1],a[2],THREE.SRGBColorSpace);

// Each row is one hour of the painted day, sampled from reference palettes. Times are minutes from midnight.
const F=['top','mid','low','cloudL','cloudS','sun','rockS','rockL','snowS','snowL','forS','forL','haze','mist','water','shade','lit','gS','gM','gH'];
const N=['mistAmt','gAmt','sunI','ambI','glint','fog','night'];
const KEYS=[
 //  t    sky top    mid       low       cloudL    cloudS    sun       rockS     rockL     snowS     snowL     forS      forL      haze      mist      water     shade     lit       gradS     gradM     gradH      mist grade sun  amb  glint fog     night
 [ 360,'#b490b4','#e4acb4','#f4d2c0','#fbe2d0','#a48cc0','#fff2c8','#6e5a94','#ae9ace','#b49ede','#fae2dc','#4c3a68','#927498','#d8b4c6','#d0bcea','#e6b8c0','#7c6aa4','#fff4e6','#3a2c54','#a488ac','#fae0d0', .75,.42,1.5,1.05,.8,.0016,.0],
 [ 460,'#9fa8c8','#c6c6d6','#e4dcd4','#eef0f4','#9aa2b8','#fff4d8','#56607e','#98a4bc','#a8b6d0','#f0f2f6','#2e3c3e','#68785c','#c4ccd8','#d8dce6','#b4bccc','#6c7690','#fff4e4','#1c2228','#7a7e84','#e8ece8', .85,.32,1.9,.95,.8,.0015,.0],
 [ 600,'#7f9fcc','#a9c0de','#d6e0ea','#f6f8fa','#a4b2cc','#fffbe8','#4c5a78','#94a2bc','#a4b6d6','#ffffff','#22343a','#5c7a4e','#b8cadc','#dfe6ee','#a8c0dc','#66748e','#fff8ea','#14191e','#7e8078','#f0f2ec', .3,.22,2.5,1.0,.8,.0012,.0],
 [ 780,'#7a9ccc','#a4bedf','#d4dee8','#fbfcfd','#a8b6cf','#ffffff','#4a5874','#98a4b8','#a8bad8','#ffffff','#20343a','#5e7e4e','#b4c8dc','#e6eaf0','#a4bee0','#6c7a94','#fffaf0','#121820','#807f76','#f4f2ea', .12,.2,2.7,1.0,.9,.0010,.0],
 [ 930,'#54708c','#7c94a4','#c4c0ac','#e8dfc8','#58687c','#fff0c0','#3e4a5e','#8a8c8c','#8c9cb4','#ece4d0','#1c2e30','#58683e','#a8ac9c','#c8c4b0','#6c8496','#4e5c70','#ffeccc','#141c22','#6c6e68','#e8dcbc', .22,.34,2.3,.85,1.,.0012,.0],
 [1050,'#b89a8c','#e4c09a','#f4dcae','#fae4bc','#a87c70','#fff0b0','#6a4a4c','#c49c84','#c8988e','#fce8c8','#463026','#987044','#e4bc98','#f0cca4','#d8ac86','#786070','#ffe6c0','#2c1a16','#a07858','#f8dcb0', .25,.34,2.2,.95,1.,.0013,.0],
 [1130,'#b48a7c','#d8a080','#eccb9c','#f2d6ac','#96605a','#ffe6a8','#5a3c44','#bc8876','#b88484','#f4d0b4','#3a2424','#94583a','#dc9a7c','#e4a884','#c88a6c','#6c4a54','#ffd8a8','#241214','#946048','#f4c094', .22,.3,1.9,.85,1.,.0014,.0],
 [1200,'#c890ac','#eab0c0','#f4c8c6','#f8d4d6','#9484b0','#ffe0c8','#4a4670','#8878a8','#9490c0','#ecccd8','#2a2c46','#5a5674','#d4a8bc','#ccacd8','#e0a8bc','#54507c','#f8d4d4','#26264a','#7c6c9c','#f4ccd0', .45,.44,1.1,.8,.8,.0016,.1],
 [1275,'#3e3a6c','#6a5a90','#a07ca4','#a488b0','#3a3660','#ffd8c0','#262a50','#4e4c7c','#54588c','#a8a0c8','#161a30','#322f4e','#6a5c8c','#7c70a8','#54527e','#2e2e58','#b8a8c8','#12122a','#3e3a68','#b4a4c8', .4,.62,.5,.55,.8,.0017,.55],
 [1380,'#1a2150','#2a3468','#46528e','#5a68a4','#1c2450','#f4f0dc','#141c44','#2c3a70','#3c4c8c','#9fb0d8','#0c1228','#232c4c','#2e3a70','#44568c','#2a3468','#1e2a58','#8ea4cc','#080c1e','#28386c','#a4b4d8', .3,.66,.34,.62,.9,.0015,1],
 [1560,'#10163a','#1c2450','#2e3a70','#3c4a84','#12183c','#f4f0dc','#0e1436','#222e60','#30407c','#8a9cc8','#080e20','#1a2240','#222c5c','#34426e','#1e2852','#182048','#7c90bc','#060a18','#20305c','#94a4cc', .3,.68,.3,.58,.9,.0015,1]
].map(r=>{ const o={t:r[0]}; F.forEach((k,i)=>o[k]=hex(r[i+1])); N.forEach((k,i)=>o[k]=r[i+1+F.length]); return o; });

function palette(t){
  let i=0; while(i<KEYS.length-2&&t>=KEYS[i+1].t) i++;
  const a=KEYS[i], b=KEYS[i+1], f=clamp((t-a.t)/(b.t-a.t),0,1), o={};
  for(const k of F) o[k]=mixc(a[k],b[k],f);
  for(const k of N) o[k]=lerp(a[k],b[k],f);
  return o;
}
// overcast / rain: the same hour, drained toward slate
function weatherize(p,w){
  if(w==='clear') return p;
  const q=w==='rain'?.68:.42, g=mixc(p.mid,[.44,.47,.52],.6), o={...p};
  for(const k of ['top','mid','low','cloudL','haze','water']) o[k]=mixc(p[k],g,q);
  o.cloudS=mixc(p.cloudS,[.26,.29,.34],q); o.sunI=p.sunI*(1-q*.72); o.mistAmt=Math.min(1,p.mistAmt+q*.5); o.fog=p.fog*(1+q*.9);
  return o;
}

/* ramps: one row per painted material, value left to right */
const RAMP={
  spruce:['#0a1216','#10232a','#17343a','#234a3f','#3c6444','#6d8144','#a89a4e','#dcc06a'],
  wood:  ['#17110f','#2c211c','#46362c','#675040','#8c7058'],
  earth: ['#2a211e','#4a382e','#6e5442','#8e7058','#a88c74'],
  rock:  ['#26212c','#463a44','#6a5258','#927468','#bc9c88'],
  snow:  ['#6e78a4','#9aa8cc','#d0d8ec','#f4f6fb','#ffffff'],
  ice:   ['#3a3448','#6c6a8c','#a8acc8','#e4e8f4','#ffffff']
};
const SEASON={
  broad1:[['#2a0f18','#5c1f2c','#963a42','#c86458','#e8926c','#f4bc90'],['#101f18','#1c3a26','#2e5a30','#4e7c38','#7c9c44','#b4c060'],['#2c0f0f','#5a1a14','#9c2c18','#d24e1a','#ec7c24','#f4a93a','#fbd66a'],['#3a3448','#6c6a8c','#a8acc8','#e4e8f4','#ffffff']],
  broad2:[['#1e1a0c','#44380f','#766420','#a88c2c','#d4b440','#ecd872'],['#14241a','#22402a','#386434','#5c8840','#8cac50','#c0cc70'],['#3a2410','#6e4414','#b07a1c','#dca52c','#f2cc4c','#fbe88a'],['#3a3448','#6c6a8c','#a8acc8','#e4e8f4','#ffffff']],
  broad3:[['#22120c','#4e2410','#8a4416','#c06c20','#e49a38','#f4c870'],['#121f16','#1e3824','#32562e','#527838','#80a044','#b4bc5c'],['#250a10','#4c1016','#821c1c','#b4301e','#d8542a','#ec8a3e'],['#3a3448','#6c6a8c','#a8acc8','#e4e8f4','#ffffff']],
  larch: [['#1e1a0e','#46401a','#7c7028','#b0a03c','#d8c85c','#f2e690'],['#14241c','#20402a','#34603a','#4e7f44','#7ca04e','#b4c268'],['#1e1410','#4f2c14','#8a5a1e','#c28a2a','#e4b23e','#f6d670','#fff0b0'],['#2a2230','#4a4050','#8080a0','#d4d8e8','#ffffff']],
  shrub: [['#1c2a16','#3a5022','#648030','#94a844','#c4c868'],['#14241a','#22402a','#3a6434','#608840','#90ac50'],['#250a10','#4c1016','#821c1c','#b4301e','#d8542a','#ec8a3e'],['#3a3044','#5c4c60','#8c7c90','#c8c0d0','#f4f4f8']],
  tuft:  [['#1a2010','#3c4a1c','#6c7a2c','#a0a040','#d0c464'],['#141e10','#28401c','#4c6c2a','#7c9238','#b0b450'],['#1e1410','#4f2c14','#8a5a1e','#c28a2a','#e4b23e','#f6d670'],['#3c3640','#6a6270','#a8a4b4','#dcdce8','#ffffff']],
  ground:[['#1e2a18','#34461e','#566a28','#7e8a38','#a8a450'],['#18251a','#2c4220','#4a642a','#6e8434','#969c44'],['#2c2214','#54421c','#826a2a','#ac8e3c','#d0b05c'],['#8c98b8','#b0bcd4','#d8dfec','#f0f3f9','#ffffff']]
};
const ROWS=['spruce','wood','earth','rock','snow','ice','broad1','broad2','broad3','larch','shrub','tuft','ground'];
export const rowV=n=>(ROWS.indexOf(n)+.5)/ROWS.length;
const rampData=new Uint8Array(256*ROWS.length*4);
const rampTex=new THREE.DataTexture(rampData,256,ROWS.length,THREE.RGBAFormat);
rampTex.colorSpace=THREE.SRGBColorSpace; rampTex.minFilter=rampTex.magFilter=THREE.LinearFilter; rampTex.wrapS=rampTex.wrapT=THREE.ClampToEdgeWrapping;
function writeRow(name,stops){
  const y=ROWS.indexOf(name), pts=stops.map(hex), n=pts.length-1;
  for(let x=0;x<256;x++){ const u=x/255*n, i=Math.min(n-1,Math.floor(u)), c=mixc(pts[i],pts[i+1],u-i), o=(y*256+x)*4;
    rampData[o]=c[0]*255; rampData[o+1]=c[1]*255; rampData[o+2]=c[2]*255; rampData[o+3]=255; }
}
for(const k in RAMP) writeRow(k,RAMP[k]);

/* ---------- shared uniforms ---------- */
export const U={
  uRain:{value:0}, uLodT:{value:46}, uLodP:{value:28}, uWindAmp:{value:.6}, uWindDir:{value:new THREE.Vector2(.8,.6)}, uNoise:{value:null},
  uHeight:{value:null}, uHeightSpan:{value:440}, uPush:{value:new THREE.Vector4(0,0,1.3,0)}, uPush2:{value:new THREE.Vector4(0,0,.8,0)}, uSunDirW:{value:new THREE.Vector3(0,1,0)},
  uTime:{value:0}, uShade:{value:new THREE.Color()}, uLit:{value:new THREE.Color()}, uFog:{value:new THREE.Color()}, uFogD:{value:.0014},
  uSnow:{value:0}, uRamps:{value:rampTex}, uSide:{value:new THREE.Vector3(1,0,0)}, uReveal:{value:new THREE.Vector4(.5,.5,10,1)}, uRes:{value:new THREE.Vector2(1,1)},
  uCloud:{value:null}, uCloudOff:{value:new THREE.Vector2()}, uCloudAmt:{value:0}, uCloudTint:{value:new THREE.Color(1,1,1)}, uFogSun:{value:new THREE.Color(0,0,0)}, uGlow:{value:0}, uSeason:{value:0}
};
const ramp=`vec3 ramp(float v,float row){ return texture2D(uRamps,vec2(clamp(v,.004,.996),row)).rgb; }`;
export const RAMP_GLSL=ramp;
// light shared by everything outdoors: slow cloud shadows crossing the valley, and haze that warms toward the sun
export const CLOUD_GLSL=`uniform sampler2D uCloud; uniform vec2 uCloudOff; uniform float uCloudAmt; uniform vec3 uCloudTint;
  vec3 cloudShade(vec2 p){ float n=texture2D(uCloud,p*.00085+uCloudOff).r; return mix(vec3(1.),uCloudTint,uCloudAmt*smoothstep(.45,.6,n)); }`;
function tileNoise(S,seed){            // tiling fractal noise, for the cloud shadows
  const r=rng(seed), oct=[[6,.5],[13,.27],[29,.15],[61,.08]].map(([n,w])=>({n,w,g:Float32Array.from({length:n*n},()=>r())})), d=new Uint8Array(S*S*4);
  for(let j=0;j<S;j++) for(let i=0;i<S;i++){ let v=0; for(const o of oct){ const x=i/S*o.n, y=j/S*o.n, xi=Math.floor(x), yi=Math.floor(y), fx=x-xi, fy=y-yi, ux=fx*fx*(3-2*fx), uy=fy*fy*(3-2*fy), n=o.n, g=(a,b)=>o.g[((b%n)*n+(a%n))];
      v+=lerp(lerp(g(xi,yi),g(xi+1,yi),ux),lerp(g(xi,yi+1),g(xi+1,yi+1),ux),uy)*o.w; }
    d[(j*S+i)*4]=clamp(v,0,1)*255; d[(j*S+i)*4+3]=255; }
  const t=new THREE.DataTexture(d,S,S,THREE.RGBAFormat); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.minFilter=THREE.LinearMipmapLinearFilter; t.magFilter=THREE.LinearFilter; t.generateMipmaps=true; t.needsUpdate=true; return t;
}

/* ---------- loading ---------- */
const load=(url,fn)=>new Promise((res,rej)=>new THREE.TextureLoader().load(url,t=>{ fn&&fn(t); res(t); },undefined,rej));
export const ATLAS={}; export const TEX={};
export async function loadScenery(onProgress){
  const atlas=await (await fetch('assets/paint/atlas.json')).json(); Object.assign(ATLAS,atlas);
  const sheet=t=>{ t.anisotropy=8; t.generateMipmaps=true; t.minFilter=THREE.LinearMipmapLinearFilter; t.magFilter=THREE.LinearFilter; };
  const pano=t=>{ t.wrapS=THREE.RepeatWrapping; t.anisotropy=8; t.minFilter=THREE.LinearMipmapLinearFilter; };
  const wrap=t=>{ t.wrapS=t.wrapT=THREE.RepeatWrapping; t.anisotropy=8; t.minFilter=THREE.LinearMipmapLinearFilter; };
  const names=[['sheet_trees',sheet],['sheet_plants',sheet],['sheet_near',sheet],['mt_far',pano],['mt_ring',pano],['mt_mask',pano],['clouds',pano],['mt_height',null,'png'],['mt_detail',wrap],['ground_bits',wrap],
    ['surf_log'],['surf_boards'],['surf_shingle'],['surf_stone'],['surf_fur'],
    ['ground_tile',t=>{ t.wrapS=t.wrapT=THREE.RepeatWrapping; t.anisotropy=8; t.minFilter=THREE.LinearMipmapLinearFilter; }]];
  let done=0; await Promise.all(names.map(([n,f,ext])=>load('assets/paint/'+n+'.'+(ext||'webp'),f).then(t=>{ TEX[n]=t; onProgress&&onProgress(++done/names.length); })));
}

/* ---------- sky ---------- */
const skyU={ uTop:{value:new THREE.Color()},uMid:{value:new THREE.Color()},uLow:{value:new THREE.Color()},uCL:{value:new THREE.Color()},uCS:{value:new THREE.Color()},
  uSunC:{value:new THREE.Color()}, uSunD:{value:new THREE.Vector3(0,1,0)}, uMoonD:{value:new THREE.Vector3(0,1,0)}, uNight:{value:0}, uCover:{value:.5}, uAurora:{value:0},
  uClouds:{value:null}, uTime:U.uTime };
function buildSky(root){
  skyU.uClouds.value=TEX.clouds;
  const m=new THREE.ShaderMaterial({ side:THREE.BackSide, depthWrite:false, depthTest:false, fog:false, toneMapped:false, uniforms:skyU,
    vertexShader:`varying vec3 vD; void main(){ vD=position; vec4 p=projectionMatrix*mat4(mat3(viewMatrix))*vec4(position,1.); gl_Position=p.xyww; }`,
    fragmentShader:`precision highp float;
      uniform vec3 uTop,uMid,uLow,uCL,uCS,uSunC,uSunD,uMoonD; uniform float uNight,uCover,uAurora,uTime; uniform sampler2D uClouds; varying vec3 vD;
      float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      void main(){ vec3 d=normalize(vD); float h=max(d.y,0.); float b=pow(h,.62);
        float q=floor(b*34.+fract(atan(d.x,d.z)*7.)*.4)/34.; q=mix(b,q,.65);                                  // soft banding, as brushed
        vec3 c=q<.3?mix(uLow,uMid,q/.3):mix(uMid,uTop,clamp((q-.3)/.62,0.,1.));
        float az=atan(d.x,d.z);
        if(uNight>.01){                                                                                      // stars: little crosses
          vec2 g=vec2(az*42.,h*70.), id=floor(g), f=fract(g)-.5; float s=h21(id);
          if(s>.93&&h>.03){ float w=h21(id+7.)*.34+.1; float k=step(abs(f.x),w)*step(abs(f.y),.045)+step(abs(f.y),w*1.3)*step(abs(f.x),.03);
            c+=clamp(k,0.,1.)*uNight*(.35+.65*h21(id+3.))*vec3(.92,.94,1.); }
          float ms=acos(clamp(dot(d,uMoonD),-1.,1.));
          c+=uNight*(step(ms,.2)*.05+step(ms,.14)*.07)*vec3(.7,.75,1.);
          vec3 mr=normalize(cross(uMoonD,vec3(0.,1.,0.))); float cres=length(vec2(dot(d-uMoonD,mr)-.022,d.y-uMoonD.y));
          if(ms<.075&&cres>.055) c=mix(c,vec3(1.,.98,.9),uNight);
          if(uAurora>.01){ float w=sin(az*3.+uTime*.05)+sin(az*7.3-uTime*.03)*.4; float y=h-(.34+.09*w);
            float r=exp(-y*y*190.)*(.55+.45*sin(az*44.+uTime*.2+w*3.));
            c+=uAurora*r*uNight*vec3(.16,.72,.56); }
        }
        float sd=acos(clamp(dot(d,uSunD),-1.,1.)); float above=1.-uNight;                                      // sun: hard concentric rings
        c=mix(c,mix(c,uSunC,.1),step(sd,.26)*above); c=mix(c,mix(c,uSunC,.18),step(sd,.17)*above); c=mix(c,uSunC,step(sd,.075)*above);
        c+=uSunC*.12*above*exp(-sd*sd*3.);
        vec2 uv=vec2(az/6.28318*3.+uTime*.00028,clamp(asin(h)/1.5708/.42,0.,1.)); vec3 t=texture2D(uClouds,uv).rgb;
        float e=mix(.8,.44,uCover), m=smoothstep(e,e+.01,t.g), sm=smoothstep(e-.02,e+.16,t.b)*.72;
        vec3 cc=mix(uCS,uCL,t.r); c=mix(c,mix(uCS,uCL,.56),sm*(1.-m)); c=mix(c,cc,m);
        c=mix(c,uLow,smoothstep(.05,.0,h)*.7);
        gl_FragColor=vec4(c,1.); }` });
  const dome=new THREE.Mesh(new THREE.SphereGeometry(10,32,20),m); dome.frustumCulled=false; dome.renderOrder=-100; root.add(dome);
}

/* ---------- painted mountain layers: cylinders that hold their distance, a parallax stack ---------- */
const mtU={ uRS:{value:new THREE.Color()},uRL:{value:new THREE.Color()},uSS:{value:new THREE.Color()},uSL:{value:new THREE.Color()},uFS:{value:new THREE.Color()},uFL:{value:new THREE.Color()},uHz:{value:new THREE.Color()},uDL:{value:new THREE.Color()},uDS:{value:new THREE.Color()} };
const layers=[];
function buildMountains(root,qual){
  const mk=(tex,R,H,rep,off,base,hz,kind,mist)=>{
    const g=new THREE.CylinderGeometry(R,R,H,96,1,true);
    const m=new THREE.ShaderMaterial({ side:THREE.BackSide, fog:false, toneMapped:false,
      uniforms:{ ...mtU, uMap:{value:tex}, uRep:{value:rep}, uOff:{value:off}, uHazeAmt:{value:hz}, uLowMist:{value:mist}, uKind:{value:kind}, uDecAmt:{value:0}, uSnowK:{value:1} },
      vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader:`precision highp float;
        uniform sampler2D uMap; uniform vec3 uRS,uRL,uSS,uSL,uFS,uFL,uHz,uDL,uDS; uniform float uRep,uOff,uHazeAmt,uLowMist,uKind,uDecAmt,uSnowK; varying vec2 vUv;
        void main(){ vec4 t=texture2D(uMap,vec2(vUv.x*uRep+uOff,vUv.y)); if(t.a<.5) discard; float v=t.r; vec3 c;
          if(uKind<.5){ vec3 rk=mix(uRS,uRL,v), sn=mix(uSS,uSL,smoothstep(.1,.8,v)); c=mix(rk,sn,t.g*uSnowK); c=mix(c,mix(uFS,uFL,v*1.4),t.b); }
          else { float w=clamp(v*2.2,0.,1.); c=mix(uFS,uFL,w); c=mix(c,mix(uDS,uDL,w),step(.5,t.g)*uDecAmt); }
          float low=1.-smoothstep(.0,.42,vUv.y); c=mix(c,uHz,clamp(uHazeAmt+low*low*uLowMist,0.,1.));
          gl_FragColor=vec4(c,1.); }` });
    const o=new THREE.Mesh(g,m); o.frustumCulled=false; o.position.y=base+H/2; o.renderOrder=-90; root.add(o);
    layers.push({o,m,base,H});
  };
  mk(TEX.mt_far,1450,620,2,.08,-6,.5,0,.5);             // the last, palest range stays a painting
  buildRing(root,qual);
}
/* real mountains: a mesh ring around the valley, cut into sectors so what is behind you is never drawn.
   Light moves across the faces with the sun, cloud shadows drift over them, and they shift against each other as you row */
let ringMat=null, ringTreeMat=null;
const RING={CX:0,CZ:70,Rin:430,Rout:1160,Top:430};
function ringHeightReader(){
  const tex=TEX.mt_height, c=document.createElement('canvas'), w=tex.image.width, h=tex.image.height; c.width=w; c.height=h; const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(tex.image,0,0); const d=x.getImageData(0,0,w,h).data;
  const H=(i,j)=>{ const o=(j*w+((i%w+w)%w))*4; return (d[o]*256+d[o+1])/65535; };
  return (u,v)=>{ const fi=u*w, fj=v*(h-1), i0=Math.floor(fi), j0=Math.min(h-2,Math.floor(fj)), tx=fi-i0, ty=fj-j0; return lerp(lerp(H(i0,j0),H(i0+1,j0),tx),lerp(H(i0,j0+1),H(i0+1,j0+1),tx),ty); };
}
const ringPos=(hh,u,v)=>{ const ang=u*Math.PI*2, rad=RING.Rin+(RING.Rout-RING.Rin)*Math.pow(v,1.25), edge=smooth(0,.12,v); return [RING.CX+Math.cos(ang)*rad,hh*RING.Top*edge+(1-edge)*18-4,RING.CZ+Math.sin(ang)*rad]; };
function ringSectors(root,heightAt,mat,N,M,layer){
  const SECT=18, n=Math.round(N/SECT);
  for(let s=0;s<SECT;s++){ const P=new Float32Array((n+1)*(M+1)*3), UV=new Float32Array((n+1)*(M+1)*2), I=[];
    for(let a=0;a<=n;a++) for(let r=0;r<=M;r++){ const u=(s+a/n)/SECT, v=r/M, o=a*(M+1)+r; P.set(ringPos(heightAt(u%1,v),u,v),o*3); UV.set([u,v],o*2); }
    for(let a=0;a<n;a++) for(let r=0;r<M;r++){ const p=a*(M+1)+r, q=p+M+1; I.push(p,p+1,q,q,p+1,q+1); }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(P,3)); g.setAttribute('uv',new THREE.BufferAttribute(UV,2)); g.setIndex(I); g.computeBoundingSphere();
    const o=new THREE.Mesh(g,mat); o.layers.set(layer); root.add(o); }
}
function buildRing(root,qual){
  const heightAt=ringHeightReader();
  ringMat=new THREE.ShaderMaterial({ fog:false, toneMapped:false, side:THREE.DoubleSide, uniforms:{ ...U, ...mtU, uMap:{value:TEX.mt_ring}, uMask:{value:TEX.mt_mask}, uDetail:{value:TEX.mt_detail}, uSun:U.uSunDirW, uLine:{value:.45}, uDecAmt:{value:0}, uGrove:{value:null} },
    vertexShader:`varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`precision highp float; uniform sampler2D uMap,uMask,uDetail; uniform vec3 uRS,uRL,uSS,uSL,uFS,uFL,uHz,uDL,uDS,uSun,uFogSun; uniform float uLine,uDecAmt; varying vec2 vUv; varying vec3 vW; ${CLOUD_GLSL}
      void main(){ vec2 ruv=vec2(vUv.x,1.-vUv.y); vec4 t=texture2D(uMap,ruv), mk=texture2D(uMask,ruv); float a=vUv.x*6.28318; vec2 q=t.rg*2.-1.; float crease=t.b-.5;
        vec2 dv=vec2(vUv.x*2600.,vW.y*1.1+vUv.y*420.); vec3 d1=texture2D(uDetail,dv*.0032).rgb, d2=texture2D(uDetail,dv*.0117+.31).rgb, d3=texture2D(uDetail,dv*.041+.13).rgb;
        q+=(d1.rg-.5)*.62+(d2.rg-.5)*.46+(d3.rg-.5)*.24; crease+=(d1.b-.5)*.34+(d2.b-.5)*.3+(d3.b-.5)*.22;
        vec3 U=vec3(-sin(a),0.,cos(a)), V=vec3(cos(a),0.,sin(a)), n=normalize(U*q.x+V*q.y+vec3(0.,1.,0.)*sqrt(max(.02,1.-min(dot(q,q),.98))));
        float lam=clamp(dot(n,normalize(uSun+vec3(0.,.32,0.)))*1.1+.1,0.,1.);
        float v=clamp(lam*.9+crease*.8,0.,1.);
        float strata=sin(vW.y*.19+sin(a*14.)*2.4+d1.b*5.)*.5+.5; v=clamp(v-smoothstep(.72,.98,strata)*.09,0.,1.); v=floor(v*13.+.5)/13.;
        vec3 rock=mix(uRS,uRL,v), sn=mix(uSS,uSL,smoothstep(.1,.72,v));
        float steep=smoothstep(.62,.36,n.y), snow=smoothstep(uLine,uLine+.018,mk.r+crease*.08)*(1.-steep*.72); vec3 c=mix(rock,sn,snow);
        float w=clamp(v*1.5,0.,1.); vec3 fo=mix(uFS,uFL,w); float grove=smoothstep(.42,.58,texture2D(uDetail,vW.xz*.0031).b+texture2D(uDetail,vW.xz*.0009).b-.5); fo=mix(fo,mix(uDS,uDL,w),grove*uDecAmt);
        float fm=smoothstep(.32,.66,mk.g+(d2.b-.5)*.9); c=mix(c,fo*(.74+.42*smoothstep(.3,.7,d3.b)),fm);
        c*=cloudShade(vW.xz);
        vec3 vd=normalize(vW-cameraPosition); float d=length(vW.xz-cameraPosition.xz), hz=smoothstep(380.,1400.,d)*.36; float low=1.-smoothstep(10.,120.,vW.y); c=mix(c,uHz+uFogSun*pow(max(dot(vd,uSunDirW),0.),6.),clamp(hz+low*low*.3,0.,1.));
        gl_FragColor=vec4(c,1.); }`.replace('uniform vec3 uRS','uniform vec3 uSunDirW; uniform vec3 uRS') });
  const [N,M]={low:[720,84],med:[1080,120],high:[1440,160]}[qual]||[1080,120];
  ringSectors(root,heightAt,ringMat,N,M,1); ringSectors(root,heightAt,ringMat,540,48,2);        // the lake mirror sees a light copy
  ringTrees(root,qual,heightAt);
}
/* forests on the slopes: real sprites, thousands of them, so a ridge line is made of trees, and they catch the same light */
function ringTrees(root,qual,heightAt){
  const tex=TEX.mt_mask, c=document.createElement('canvas'); c.width=1024; c.height=160; const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(tex.image,0,0,1024,160); const mk=x.getImageData(0,0,1024,160).data;
  const forestAt=(u,v)=>mk[(Math.min(159,Math.floor(v*160))*1024+Math.floor(u*1024)%1024)*4+1]/255;
  const r=rng(909), cap={low:5000,med:11000,high:18000}[qual]||11000, names=['spruce_a','spruce_b','spruce_c','spruce_d','larch_a','broad_a','broad_b','larch_b'];
  const P=new Float32Array(cap*3), S=new Float32Array(cap*2), Q=new Float32Array(cap*4), Mi=new Float32Array(cap*3); let n=0;
  for(let i=0;i<cap*40&&n<cap;i++){ const u=r(), v=Math.pow(r(),1.5)*.9+.025; if(forestAt(u,v)<.5||r()>1-v*.6) continue;
    const p=ringPos(heightAt(u,v),u,v), rad=Math.hypot(p[0]-RING.CX,p[2]-RING.CZ); if(p[1]<6) continue;
    const grove=vnoise(p[0]*.006+3,p[2]*.006)>.5, nm=grove?names[4+Math.floor(r()*4)]:names[Math.floor(r()*4)], a=ATLAS[nm], h=(15+r()*13)*(1+smooth(600,1100,rad)*.9);
    P.set(p,n*3); S.set([h*a.w/a.h,h],n*2); Q.set([a.u0,a.v0,a.u1,a.v1],n*4); Mi.set([(r()-.5)*.26,grove?1:0,r()<.5?-1:1],n*3); n++; }
  const g=new THREE.InstancedBufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(new Float32Array([-.5,0,0, .5,0,0, .5,1,0, -.5,1,0]),3)); g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array([0,0,1,0,1,1,0,1]),2)); g.setIndex([0,1,2,0,2,3]);
  g.setAttribute('iPos',new THREE.InstancedBufferAttribute(P,3)); g.setAttribute('iSize',new THREE.InstancedBufferAttribute(S,2)); g.setAttribute('iRect',new THREE.InstancedBufferAttribute(Q,4)); g.setAttribute('iMisc',new THREE.InstancedBufferAttribute(Mi,3)); g.instanceCount=n;
  ringTreeMat=new THREE.ShaderMaterial({ fog:false, toneMapped:false, side:THREE.DoubleSide, uniforms:{ ...U, ...mtU, uMap:{value:TEX.sheet_trees}, uDecAmt:{value:0} },
    vertexShader:`attribute vec3 iPos,iMisc; attribute vec2 iSize; attribute vec4 iRect; uniform vec3 uSide; varying vec2 vUv; varying float vTone,vGrove,vL,vD; varying vec3 vP;
      void main(){ vec3 tc=cameraPosition-iPos; tc.y=0.; float d=max(length(tc),.001); tc/=d; vec3 right=vec3(tc.z,0.,-tc.x); vec3 wp=iPos+right*position.x*iSize.x+vec3(0.,position.y*iSize.y-1.5,0.);
        float u=iMisc.z<0.?1.-uv.x:uv.x; vUv=vec2(mix(iRect.x,iRect.z,u),mix(iRect.y,iRect.w,uv.y)); vTone=iMisc.x; vGrove=iMisc.y; vL=dot(right,uSide)*(uv.x-.5); vD=d; vP=iPos; gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.); }`,
    fragmentShader:`precision highp float; uniform sampler2D uMap; uniform vec3 uFS,uFL,uDS,uDL,uHz,uSS,uSL,uFogSun,uSunDirW; uniform float uDecAmt,uSnow; varying vec2 vUv; varying float vTone,vGrove,vL,vD; varying vec3 vP; ${CLOUD_GLSL}
      void main(){ vec4 t=texture2D(uMap,vUv); if(t.a<.42) discard; float v=t.r+(t.g-.5)*.2+vTone+vL*.5, w=clamp(v*1.5,0.,1.); vec3 c=mix(uFS,uFL,w); c=mix(c,mix(uDS,uDL,w),vGrove*uDecAmt);
        if(uSnow>.5) c=mix(c,mix(uSS,uSL,w),.42*smoothstep(.1,.6,t.b)+.1);
        c*=cloudShade(vP.xz); float hz=smoothstep(380.,1400.,vD)*.36, low=1.-smoothstep(10.,120.,vP.y); c=mix(c,uHz+uFogSun*pow(max(dot(normalize(vP-cameraPosition),uSunDirW),0.),6.),clamp(hz+low*low*.3,0.,1.));
        gl_FragColor=vec4(c,1.); }` });
  const o=new THREE.Mesh(g,ringTreeMat); o.frustumCulled=false; root.add(o);
}

/* ---------- sprites: instanced camera-facing paintings ---------- */
export function makeSprites(root,sheet,items,opts={}){
  const n=items.length, geo=new THREE.InstancedBufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array([-.5,0,0, .5,0,0, .5,1,0, -.5,1,0]),3));
  geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array([0,0, 1,0, 1,1, 0,1]),2));
  geo.setIndex([0,1,2,0,2,3]);
  const P=new Float32Array(n*3), S=new Float32Array(n*2), R=new Float32Array(n*4), M=new Float32Array(n*4);
  items.forEach((it,i)=>{ const a=ATLAS[it.name];
    P.set([it.x,it.y,it.z],i*3); S.set([it.h*a.w/a.h*(it.sx||1),it.h],i*2); R.set([a.u0,a.v0,a.u1,a.v1],i*4);
    const lod=/^(spruce|larch|broad)/.test(it.name)?1:/^(shrub|fern|tuft|reed)/.test(it.name)?3:2;
    M.set([rowV(it.row),it.tone||0,it.wind===undefined?1:it.wind,(it.flip?-1:1)*lod],i*4); });
  geo.setAttribute('iPos',new THREE.InstancedBufferAttribute(P,3));
  geo.setAttribute('iSize',new THREE.InstancedBufferAttribute(S,2));
  geo.setAttribute('iRect',new THREE.InstancedBufferAttribute(R,4));
  geo.setAttribute('iMisc',new THREE.InstancedBufferAttribute(M,4));
  if(opts.dynamic) for(const k of ['iPos','iSize','iRect','iMisc']) geo.attributes[k].setUsage(THREE.DynamicDrawUsage);
  geo.instanceCount=n;
  const mat=new THREE.ShaderMaterial({ fog:false, toneMapped:false, side:THREE.DoubleSide, alphaToCoverage:true,
    defines:opts.colored?{COLORED:1}:{},
    uniforms:{ ...U, uMap:{value:TEX[sheet]}, uSnowRow:{value:rowV('ice')} },
    vertexShader:`attribute vec3 iPos; attribute vec2 iSize; attribute vec4 iRect,iMisc;
      uniform float uTime,uFogD,uLodT,uLodP,uWindAmp; uniform vec3 uSide,uSunDirW;
      varying vec2 vUv; varying float vRow,vTone,vFogF,vSideL,vX,vNear,vLodF,vInsc; varying vec2 vP;
      void main(){ vec3 tc=cameraPosition-iPos; tc.y=0.; float d=max(length(tc),.001); tc/=d;
        vec3 right=vec3(tc.z,0.,-tc.x);
        float h=position.y*position.y*iMisc.z;
        float sw=(sin(uTime*1.05+iPos.x*.31+iPos.z*.23)+.5*sin(uTime*2.3+iPos.x*.9))*.02*(.5+uWindAmp)*iSize.y*h;
        float lm=abs(iMisc.w), lodR=lm<1.5?uLodT:(lm>2.5?uLodP:1e7); vLodF=cameraPosition.y<-1.15?1.:smoothstep(lodR-5.,lodR-1.,d);
        vec3 wp=iPos+right*(position.x*iSize.x+sw)+vec3(0.,position.y*iSize.y,0.);
        float u=iMisc.w<0.?1.-uv.x:uv.x;
        vUv=vec2(mix(iRect.x,iRect.z,u),mix(iRect.y,iRect.w,uv.y));
        vRow=iMisc.x; vTone=iMisc.y; vX=uv.x-.5; vSideL=dot(right,uSide); vFogF=1.-exp(-d*d*uFogD*uFogD); vNear=d; vP=iPos.xz; vInsc=pow(max(dot(normalize(wp-cameraPosition),uSunDirW),0.),5.);
        gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.); }`,
    fragmentShader:`precision highp float;
      uniform sampler2D uMap,uRamps; uniform vec3 uShade,uLit,uFog,uFogSun; uniform float uSnow,uSnowRow,uGlow; uniform vec4 uReveal; uniform vec2 uRes;
      varying vec2 vUv; varying float vRow,vTone,vFogF,vSideL,vX,vNear,vLodF,vInsc; varying vec2 vP; ${ramp} ${CLOUD_GLSL}
      float dith(vec2 p){ return fract(52.9829189*fract(dot(floor(p)+.5,vec2(.06711056,.00583715)))); }
      void main(){ if(vLodF<=dith(gl_FragCoord.xy)) discard; vec4 t=texture2D(uMap,vUv); if(t.a<.32) discard;
        #ifdef COLORED
        vec3 c=pow(t.rgb,vec3(2.2)); float v=dot(t.rgb,vec3(.3,.6,.1));
        #else
        float v=t.r+(t.g-.5)*.16+vTone+vSideL*vX*.42;
        vec3 c=ramp(v,vRow);
        if(uSnow>.01){ float s=uSnow*smoothstep(.1,.6,t.b)*smoothstep(.2,.42,t.r); c=mix(c,ramp(.45+v*.6,uSnowRow),s); }
        #endif
        c*=mix(uShade,uLit,smoothstep(.08,.7,v));
        #ifndef COLORED
        c=mix(c,ramp(v+.3,vRow)*uLit*1.5,vInsc*uGlow*.55);
        #endif
        c*=cloudShade(vP);
        c=mix(c,uFog+uFogSun*vInsc,vFogF);
        float a=clamp((t.a-.5)/max(fwidth(t.a),.0001)+.5,0.,1.);
        gl_FragColor=vec4(c,a); }` });
  const m=new THREE.Mesh(geo,mat); m.frustumCulled=false; if(opts.mainOnly){ m.layers.set(1); } root.add(m); return m;
}

/* ---------- ground ---------- */
const groundU={ uSeasonG:U.uSeason, uLeafRow:{value:rowV('broad3')}, uSplat:{value:null}, uTile:{value:null}, uBits:{value:null}, uGroundRow:{value:rowV('ground')}, uEarthRow:{value:rowV('earth')}, uRockRow:{value:rowV('rock')}, uIceRow:{value:rowV('ice')} };
export function splatPixel(x,z){   // zones used by the painted ground and the map
  const f=lakeField(x,z), y=terrainH(x,z);
  const dirt=clamp(1-(pathDist(x,z)-1.1+(vnoise(x*.6,z*.6)-.5)*1.2)/.9,0,1);
  const shore=smooth(-.03,-.004,f);
  const forest=smooth(.42,.62,vnoise(x*.022+11,z*.022+4));
  const hi=smooth(9,20,y);
  return {dirt,shore:Math.max(shore,hi),forest};
}
function bakeSplat(){
  const S=768, R=420, cv=document.createElement('canvas'); cv.width=cv.height=S; const cx=cv.getContext('2d'), im=cx.createImageData(S,S);
  for(let j=0;j<S;j++) for(let i=0;i<S;i++){ const x=(i+.5)/S*R*2-R, z=(j+.5)/S*R*2-R, s=splatPixel(x,z), o=(j*S+i)*4;
    im.data[o]=0; im.data[o+1]=s.dirt*255; im.data[o+2]=s.shore*255; im.data[o+3]=255; im.data[o]=s.forest*255; }
  cx.putImageData(im,0,0); splatCPU=im.data;
  const t=new THREE.CanvasTexture(cv); t.flipY=false; t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping; t.minFilter=THREE.LinearFilter; t.generateMipmaps=false; t.colorSpace=THREE.NoColorSpace;
  return t;
}
function groundMaterial(){
  const m=new THREE.MeshLambertMaterial({color:0xffffff});
  splatT=groundU.uSplat.value=bakeSplat(); groundU.uTile.value=TEX.ground_tile; groundU.uBits.value=TEX.ground_bits;
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,groundU,{uRamps:U.uRamps,uSnow:U.uSnow,uCloud:U.uCloud,uCloudOff:U.uCloudOff,uCloudAmt:U.uCloudAmt,uCloudTint:U.uCloudTint,uFogSun:U.uFogSun,uSunDirW:U.uSunDirW});
    sh.vertexShader='varying vec3 vWP; varying vec3 vWN;\n'+sh.vertexShader.replace('#include <worldpos_vertex>',
      '#include <worldpos_vertex>\n vWP=(modelMatrix*vec4(transformed,1.)).xyz; vWN=normal;');
    sh.fragmentShader=`varying vec3 vWP; varying vec3 vWN; uniform sampler2D uSplat,uTile,uRamps,uBits; uniform float uGroundRow,uEarthRow,uRockRow,uIceRow,uSnow,uLeafRow,uSeasonG; uniform vec3 uFogSun,uSunDirW; ${ramp} ${CLOUD_GLSL}\n`+
      sh.fragmentShader.replace('#include <fog_fragment>',`#ifdef USE_FOG
        { float ff=1.-exp(-fogDensity*fogDensity*vFogDepth*vFogDepth); gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor+uFogSun*pow(max(dot(normalize(vWP-cameraPosition),uSunDirW),0.),6.),ff); }
        #endif`).replace('#include <normal_fragment_maps>',`
        { float dn=length(vWP-cameraPosition), nk=1.-smoothstep(26.,64.,dn); if(nk>.01){ float e=.05; vec2 q=vWP.xz/9.; float h0=texture2D(uTile,q).g, hx=texture2D(uTile,q+vec2(e/9.,0.)).g, hz=texture2D(uTile,q+vec2(0.,e/9.)).g; vec3 wn=normalize(vWN+vec3(h0-hx,0.,h0-hz)*3.2*nk*(1.-uSnow*.9)); normal=normalize(mat3(viewMatrix)*wn); } }`).replace('#include <map_fragment>',`
        vec2 suv=vWP.xz/840.+.5; vec4 sp=texture2D(uSplat,suv);
        vec3 t1=texture2D(uTile,vWP.xz/9.).rgb, t2=texture2D(uTile,vWP.xz/31.).rgb, t3=texture2D(uTile,vWP.xz/157.).rgb;
        float g=(t1.r*.72+t2.r*.34+t3.r*.22-.14)*1.2+.0;
        vec3 grass=ramp(g,uGroundRow);
        vec3 earth=ramp(mix(t1.g,.5,.42)*.6+t2.g*.3+.05,uEarthRow);
        vec3 rock=ramp(t1.b*.42+t2.b*.42+t3.b*.2,uRockRow);
        vec3 c=mix(grass,earth,smoothstep(.25,.7,sp.g));
        float wet=smoothstep(.1,-.55,vWP.y+1.15);
        float steep=smoothstep(.72,.5,normalize(vWN).y);
        c=mix(c,rock,clamp(max(sp.b,steep)+t2.b*.3-.15,0.,1.));
        c*=1.34-sp.r*.3;
        float gd=length(vWP-cameraPosition), bk=1.-smoothstep(34.,84.,gd);
        if(bk>.01&&uSnow<.5){ vec3 b=texture2D(uBits,vWP.xz/4.3).rgb, b2=texture2D(uBits,vWP.xz/7.7+.37).rgb;
          float pz=clamp(sp.b*1.5+t2.r*.5-.42,0.,1.), pe=clamp(sp.g*1.1-.25,0.,1.), pr=b.g>.5?b.r:b2.r, pm=max(b.g*step(.52,t3.g+t2.g*.3+.22),b2.g*step(.5,t2.b+.12));
          c=mix(c,ramp(pr*1.05+.05,uRockRow)*1.12,pm*pz*bk);                                    // cobbles at the water, small stones in the earth of the paths
          c=mix(c,ramp(pr*.5+.38,uEarthRow),pm*pe*bk*.42);
          float lk=abs(uSeasonG-2.)<.5?1.:.3, lz=sp.r*(1.-smoothstep(.2,.6,sp.g))*smoothstep(.42,.64,t2.g+t3.r*.4)*lk, lf=max(smoothstep(.6,.64,b.b)*b.b,smoothstep(.74,.78,b2.b)*b2.b);
          c=mix(c,ramp(.3+lf*.6,uLeafRow),step(.1,lf)*lz*bk*.85); }
        c*=mix(1.,.55,wet);
        c*=cloudShade(vWP.xz);
        if(uSnow>.01){ c=mix(c,ramp(.74+t3.r*.14+(t2.r-.5)*.16,uIceRow),uSnow*smoothstep(.15,.4,.5+(t2.r-.5)*.5-sp.g*.3)); }
        diffuseColor.rgb*=c;`);
  };
  return m;
}
export let groundMesh=null;
function buildGround(root){
  const warp=(g,S)=>{ const p=g.attributes.position; for(let i=0;i<p.count;i++){ const u=p.getX(i), v=p.getY(i);
      const x=Math.sign(u)*Math.pow(Math.abs(u),1.45)*S, z=-Math.sign(v)*Math.pow(Math.abs(v),1.45)*S;
      p.setXYZ(i,x,terrainH(x,z),z); } g.computeVertexNormals(); return g; };
  const mat=groundMaterial();
  const hi=warp(new THREE.PlaneGeometry(2,2,260,260),640);
  groundMesh=new THREE.Mesh(hi,mat); groundMesh.receiveShadow=true; groundMesh.frustumCulled=false; groundMesh.layers.set(1); root.add(groundMesh);
  const lo=warp(new THREE.PlaneGeometry(2,2,70,70),640);                    // the lake mirror sees a light copy
  const lm=new THREE.Mesh(lo,mat); lm.frustumCulled=false; lm.layers.set(2); root.add(lm);
}

/* ---------- lake ---------- */
export let water=null; let mirrorEvery=1;
export const setMirrorEvery=n=>{ mirrorEvery=n; };
let aboveWater=[];
export const setUnderwater=on=>{ for(const o of aboveWater) o.visible=!on; };
const waterU={ sunD:new THREE.Vector3(0,1,0), uSunC:{value:new THREE.Color()}, uShallow:{value:new THREE.Color()}, uTint:{value:new THREE.Color()}, uGlint:{value:new THREE.Color()}, uGlintAmt:{value:1}, uTimeW:U.uTime, uShore:{value:null}, uTintAmt:{value:.14}, uFog:U.uFog, uFogD:U.uFogD, uNoise:{value:null} };
function shoreTex(){
  const S=512, d=new Uint8Array(S*S*4);
  for(let j=0;j<S;j++) for(let i=0;i<S;i++){ const x=(i+.5)/S*760-380, z=(j+.5)/S*460-50, f=lakeField(x,z), o=(j*S+i)*4; d[o]=clamp(f*16,0,1)*255; d[o+1]=clamp(f*3,0,1)*255; d[o+3]=255; }
  const t=new THREE.DataTexture(d,S,S,THREE.RGBAFormat); t.minFilter=t.magFilter=THREE.LinearFilter; t.needsUpdate=true; return t;
}
function buildLake(root,res){
  const shader={ name:'PaintedLake',
    uniforms:{ color:{value:null}, tDiffuse:{value:null}, textureMatrix:{value:null}, uTint:{value:null},uGlint:{value:null},uGlintAmt:{value:1},uTimeW:{value:0},uShore:{value:null},uTintAmt:{value:.14},uFog:{value:null},uFogD:{value:.001},uNoise:{value:null},uRain:{value:0},uSunD:{value:null},uSunC:{value:null},uShallow:{value:null},uGlow:{value:0},uCloud:{value:null},uCloudOff:{value:null},uCloudAmt:{value:0},uCloudTint:{value:null},uFogSun:{value:null} },
    vertexShader:`uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
      void main(){ vUv=textureMatrix*vec4(position,1.); vW=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`precision highp float;
      uniform sampler2D tDiffuse,uShore,uNoise; uniform vec3 uTint,uGlint,uFog,uSunD,uSunC,uShallow,uFogSun; uniform float uGlintAmt,uTimeW,uTintAmt,uFogD,uRain,uGlow; varying vec4 vUv; varying vec3 vW; ${CLOUD_GLSL}
      float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float dash(vec2 p,float dens){ vec2 g=floor(p), f=fract(p); float h=h21(g); if(h<dens) return 0.;
        float l=.22+.26*fract(h*7.3), c=.5+(fract(h*13.)-.5)*.4; return (1.-smoothstep(l*.7,l,abs(f.x-c)))*(1.-smoothstep(.12,.34,abs(f.y-.5))); }
      void main(){ vec2 p=vW.xz; float t=uTimeW; float d=length(cameraPosition-vW);
        vec4 s=texture2D(uShore,vec2((p.x+380.)/760.,(p.y+50.)/460.));
        float n=texture2D(uNoise,p*vec2(.006,.05)+vec2(t*.004,t*.0025)).b+texture2D(uNoise,p*vec2(.013,.11)-vec2(t*.006,0.)).b-1.;
        vec4 uv=vUv; uv.x+=n*.012*uv.w; uv.y+=n*.026*uv.w;
        vec3 c=texture2DProj(tDiffuse,uv).rgb;
        vec3 vd=(vW-cameraPosition)/max(d,.001); vec3 rd=vec3(vd.x,-vd.y,vd.z);
        float fres=pow(1.-clamp(-vd.y,0.,1.),4.);
        c=mix(c,uTint,uTintAmt+.1*(1.-s.g)+(1.-fres)*.12);
        c=mix(c,uShallow,(1.-smoothstep(.0,.42,s.g))*(1.-fres*.7)*.62);                         // the bed shows through at the edge
        float road=pow(max(dot(rd,uSunD),0.),26.)*uGlow, sheen=pow(max(dot(rd,uSunD),0.),7.)*uGlow;   // the sun's path across the lake
        float f1=smoothstep(14.,6.,d), f2=smoothstep(60.,24.,d)*smoothstep(10.,20.,d), f3=(1.-smoothstep(160.,420.,d)*.4)*smoothstep(36.,70.,d);
        float g=0.;
        float dn=.92-road*.5, cl=cloudShade(p).g;
        g+=f1*dash(vec2(p.x*1.9+t*.1,p.y*11.),dn)*.6;
        g+=f2*dash(vec2(p.x*.42-t*.06,p.y*2.6),dn-.01);
        g+=f2*dash(vec2(p.x*.97+t*.09+7.,p.y*5.3),dn+.02)*.7;
        g+=f3*dash(vec2(p.x*.13+t*.025,p.y*.9),dn);
        g+=f3*dash(vec2(p.x*.31-t*.04+3.,p.y*2.1),dn+.02)*.8;
        c=mix(c,uSunC,sheen*.3);
        c=mix(c,mix(uGlint,uSunC,road),clamp(g,0.,1.)*uGlintAmt*(.6+road*.4)*cl);
        if(uRain>.5&&d<70.){ vec2 cell=floor(p*.9), f=fract(p*.9)-.5; float h=h21(cell), ph=fract(t*.9+h*7.), r=length(f+vec2(h-.5,fract(h*3.)-.5)*.4); c=mix(c,uGlint,(1.-smoothstep(.015,.05,abs(r-ph*.46)))*(1.-ph)*.55*(1.-d/70.)); }
        float foam=smoothstep(.0,.05,s.r)*(1.-smoothstep(.05,.2,s.r+n*.05));
        c=mix(c,uGlint,foam*.55);
        c=mix(c,uFog+uFogSun*pow(max(dot(vd,uSunD),0.),6.),(1.-exp(-d*d*uFogD*uFogD))*.8);
        gl_FragColor=vec4(c,1.); }` };
  const geo=new THREE.PlaneGeometry(760,460);
  water=new Reflector(geo,{ textureWidth:res[0], textureHeight:res[1], shader, multisample:0, clipBias:.002 });
  water.rotation.x=-Math.PI/2; water.position.set(0,WATER_Y,180); water.frustumCulled=false; water.camera.layers.enable(2); root.add(water);
  const mirror=water.onBeforeRender; let tick=0;       // the reflection may refresh every 2nd or 3rd frame on slower machines
  water.onBeforeRender=function(r,sc,cam){ if(cam.isPerspectiveCamera&&(tick++%mirrorEvery)===0) mirror.call(this,r,sc,cam); };
  const u=water.material.uniforms;
  u.uTint.value=waterU.uTint.value; u.uGlint.value=waterU.uGlint.value; u.uFog.value=U.uFog.value; u.uShore.value=shoreTex(); u.uNoise.value=TEX.clouds; u.uSunD.value=waterU.sunD; u.uSunC.value=waterU.uSunC.value; u.uShallow.value=waterU.uShallow.value; u.uCloud.value=U.uCloud.value; u.uCloudOff.value=U.uCloudOff.value; u.uCloudTint.value=U.uCloudTint.value; u.uFogSun.value=U.uFogSun.value;
  waterU.uni=u;
}

/* ---------- the creek: flowing ribbon, white over the falls and rapids ---------- */
const creekU={ uDeep:{value:new THREE.Color()}, uTint:{value:new THREE.Color()}, uFoam:{value:new THREE.Color()}, uTime:U.uTime, uN:{value:null}, uFog:U.uFog, uFogD:U.uFogD };
function buildCreek(root){
  creekU.uN.value=TEX.clouds;
  const pts=RIVER.map(p=>new THREE.Vector3(p[0],p[2],p[1])), curve=new THREE.CatmullRomCurve3(pts,false,'catmullrom',.12), N=160, P=[],UV=[],F=[],I=[];
  let run=0, prev=null;
  for(let i=0;i<=N;i++){ const t=i/N, p=curve.getPoint(t), d=curve.getTangent(t), r=riverAt(p.x,p.z)||{w:5}, w=r.w*1.15, nx=-d.z, nz=d.x, l=Math.hypot(nx,nz)||1, slope=Math.min(1,Math.abs(d.y)*2.2+.0);
    if(prev) run+=prev.distanceTo(p); prev=p.clone();
    const foam=Math.max(slope,lerp(.1,1,0)*0);
    P.push(p.x+nx/l*w,p.y+.02,p.z+nz/l*w, p.x-nx/l*w,p.y+.02,p.z-nz/l*w); UV.push(0,run,1,run); F.push(foam,foam);
    if(i<N){ const a=i*2; I.push(a,a+1,a+2,a+1,a+3,a+2); } }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2)); g.setAttribute('aF',new THREE.Float32BufferAttribute(F,1)); g.setIndex(I);
  const m=new THREE.ShaderMaterial({ fog:false, toneMapped:false, side:THREE.DoubleSide, uniforms:creekU,
    vertexShader:`attribute float aF; varying vec2 vUv; varying float vF; varying float vD; void main(){ vUv=uv; vF=aF; vec4 w=modelMatrix*vec4(position,1.); vD=length(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`precision highp float; uniform sampler2D uN; uniform vec3 uTint,uDeep,uFoam,uFog; uniform float uTime,uFogD; varying vec2 vUv; varying float vF,vD;
      void main(){ float sp=1.6+vF*3.4; vec2 q=vec2(vUv.x*.42,vUv.y*.026-uTime*sp*.012), q2=vec2(vUv.x*.9+.3,vUv.y*.06-uTime*sp*.021);
        float a=texture2D(uN,q).b, b=texture2D(uN,q2).b, f3=texture2D(uN,vec2(vUv.x*1.8,vUv.y*.11-uTime*sp*.03)).b, e=abs(vUv.x-.5)*2.;
        float streak=smoothstep(.6-vF*.46,.74-vF*.34,a*.5+b*.34+f3*.34+e*e*.22);
        float dash=smoothstep(.62,.66,f3)*(1.-vF)*.55;
        vec3 c=mix(uDeep,uTint,smoothstep(.25,.7,b+e*.3)); c=mix(c,uFoam,clamp(max(streak,dash)+vF*.3,0.,1.));
        c=mix(c,uFog,1.-exp(-vD*vD*uFogD*uFogD));
        gl_FragColor=vec4(c,1.); }` });
  const o=new THREE.Mesh(g,m); o.frustumCulled=false; root.add(o);
  // spray at the foot of the falls
  const n=70, sg=new THREE.BufferGeometry(), sp=new Float32Array(n*3); sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
  const c=document.createElement('canvas'); c.width=c.height=48; const x=c.getContext('2d'), rg=x.createRadialGradient(24,24,2,24,24,23); rg.addColorStop(0,'rgba(255,255,255,.8)'); rg.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=rg; x.fillRect(0,0,48,48);
  const spray=new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:2.6,map:new THREE.CanvasTexture(c),transparent:true,opacity:.42,depthWrite:false,toneMapped:false})); spray.frustumCulled=false; root.add(spray);
  spray.userData.t=Array.from({length:n},(_,i)=>[i/n,Math.random()*6.28,Math.random()]); sprayFx=spray;
}
let sprayFx=null;
function updateSpray(dt){ if(!sprayFx) return; const p=sprayFx.geometry.attributes.position, T=sprayFx.userData.t;
  for(let i=0;i<T.length;i++){ const t=T[i]; t[0]+=dt*(.34+t[2]*.3); if(t[0]>1) t[0]-=1; const q=t[0], r=1+q*5.5*(.4+t[2]); p.setXYZ(i,FALLS.x+Math.cos(t[1])*r+2,FALLS.bot+.3+Math.sin(q*3.1)*3.2*(.5+t[2]),FALLS.z+Math.sin(t[1])*r+3); }
  p.needsUpdate=true; }

/* ---------- mist: slow additive veils in nested rings ---------- */
const mistU={ uMistC:{value:new THREE.Color()}, uMistA:{value:.5}, uTime:U.uTime, uN:{value:null} };
function buildMist(root){
  mistU.uN.value=TEX.clouds;
  const rings=[];
  [[170,20,0],[260,30,.33],[390,44,.71]].forEach(([R,H,off])=>{
    const m=new THREE.ShaderMaterial({ side:THREE.BackSide, transparent:true, depthWrite:false, fog:false, toneMapped:false, blending:THREE.AdditiveBlending,
      uniforms:{ ...mistU, uOff:{value:off} },
      vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader:`precision highp float; uniform vec3 uMistC; uniform float uMistA,uTime,uOff; uniform sampler2D uN; varying vec2 vUv;
        void main(){ float y=vUv.y; float b=texture2D(uN,vec2(vUv.x*3.+uTime*.0009+uOff,.72+y*.07)).b; float b2=texture2D(uN,vec2(vUv.x*7.-uTime*.0014+uOff*2.,.6+y*.1)).b;
          float a=smoothstep(.46,.86,b*.7+b2*.5)*smoothstep(.0,.08,y)*(1.-smoothstep(.12,.9,y));
          gl_FragColor=vec4(uMistC*a*uMistA*.75,1.); }` });
    const o=new THREE.Mesh(new THREE.CylinderGeometry(R,R,H,64,1,true),m); o.position.y=WATER_Y+H/2-1; o.frustumCulled=false; o.renderOrder=20; o.layers.set(1); root.add(o); rings.push(o);
  });
  return rings;
}

/* ---------- rocks ---------- */
function vn3(x,y,z){ return (vnoise(x+z*.7,y-z*.4)+vnoise(y*1.3+5,z*1.3-x*.5))*.5; }
function rockGeo(seed,flat,detail=2){
  const s=seed*7.3, r=rng(seed*31+5), cuts=Array.from({length:6},()=>{ const a=r()*6.28, b=r()*2-1, q=Math.sqrt(1-b*b); return [Math.cos(a)*q,b,Math.sin(a)*q,.62+r()*.3]; });
  let g=new THREE.IcosahedronGeometry(1,detail); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g=mergeVertices(g,1e-3); const p=g.attributes.position;
  for(let i=0;i<p.count;i++){ let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const n=1+(vn3(x*1.1+s,y*1.1,z*1.1)-.5)*1.1+(vn3(x*3+s,y*3,z*3)-.5)*.34+(Math.abs(vn3(x*6.5+s,y*6.5,z*6.5)-.5)*2-.3)*.13+(vn3(x*14+s,y*14,z*14)-.5)*.06; x*=n; y*=n; z*=n;
    for(const c of cuts){ const d=x*c[0]+y*c[1]+z*c[2]-c[3]; if(d>0){ x-=c[0]*d*.86; y-=c[1]*d*.86; z-=c[2]*d*.86; } }        // cleaved faces
    let yy=y*flat; if(yy<-.2) yy=-.2; p.setXYZ(i,x,yy,z); }
  g.computeVertexNormals(); return g;
}
const toonGrad=(()=>{ const d=new Uint8Array([70,130,195,255]); const t=new THREE.DataTexture(d,4,1,THREE.RedFormat); t.minFilter=t.magFilter=THREE.NearestFilter; t.needsUpdate=true; return t; })();
export function toonOf(params){ return new THREE.MeshToonMaterial({gradientMap:toonGrad,...params}); }
function buildRocks(root,obst){
  const r=rng(77), geos=[rockGeo(1,.72,5),rockGeo(2,.6,5),rockGeo(3,.84,5),rockGeo(4,.5,5),rockGeo(5,.7,2),rockGeo(6,.56,2),rockGeo(7,.8,2),rockGeo(8,.5,2)];
  const mat=toonOf({color:0xffffff});
  mat.onBeforeCompile=sh=>{ Object.assign(sh.uniforms,{uRamps:U.uRamps,uTile:{value:TEX.ground_tile},uDetail:{value:TEX.mt_detail},uRockRow:{value:rowV('rock')},uMossRow:{value:rowV('ground')},uIceRow:{value:rowV('ice')},uSnow:U.uSnow,uCloud:U.uCloud,uCloudOff:U.uCloudOff,uCloudAmt:U.uCloudAmt,uCloudTint:U.uCloudTint});
    sh.vertexShader='varying vec3 vWN; varying vec3 vWP;\n'+sh.vertexShader.replace('#include <defaultnormal_vertex>',
      `#include <defaultnormal_vertex>\n mat3 svM=mat3(instanceMatrix); vWN=normalize(svM*(objectNormal/vec3(dot(svM[0],svM[0]),dot(svM[1],svM[1]),dot(svM[2],svM[2]))));`).replace('#include <project_vertex>',
      `#include <project_vertex>\n vWP=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;`);
    sh.fragmentShader=`varying vec3 vWN; varying vec3 vWP; uniform sampler2D uRamps,uTile,uDetail; uniform float uRockRow,uMossRow,uIceRow,uSnow; ${ramp} ${CLOUD_GLSL}\n`+sh.fragmentShader.replace('#include <normal_fragment_maps>',`
      { vec2 rq=(rd1.rg-.5)*1.25+(rd2.rg-.5)*.8+(rd3.rg-.5)*.4; normal=normalize(mat3(viewMatrix)*normalize(nn+vec3(rq.x,rq.y*.4,rq.y))); }`).replace('#include <map_fragment>',`
      vec3 tb=texture2D(uTile,vWP.xz/4.+vWP.y*.17).rgb, tc=texture2D(uTile,vec2(vWP.x+vWP.z,vWP.y*1.6)/7.).rgb;
      vec3 nn=normalize(vWN); float side=1.-abs(nn.y);
      vec2 ruv=abs(nn.y)>.62?vWP.xz:vec2(vWP.x*.7+vWP.z*.7,vWP.y); vec3 rd1=texture2D(uDetail,ruv*.11).rgb, rd2=texture2D(uDetail,ruv*.37+.31).rgb, rd3=texture2D(uDetail,ruv*1.1+.13).rgb;
      float crack=(rd1.b-.5)*.7+(rd2.b-.5)*.6+(rd3.b-.5)*.34;
      float v=mix(tb.b,tc.b,side)*.42+.26+nn.y*.14+crack*.62;
      vec3 c=ramp(v,uRockRow);
      float lichen=smoothstep(.62,.7,rd2.b+tb.r*.1)*smoothstep(.45,.62,tc.r)*.5; c=mix(c,ramp(.78,uRockRow)*vec3(1.02,1.,.86),lichen);
      float moss=smoothstep(.5,.8,nn.y+tb.r*.34+crack*.5-.05);
      c=mix(c,ramp(tb.r*.8+rd3.b*.28-.04,uMossRow),moss*.94);
      if(uSnow>.01) c=mix(c,ramp(.6+tb.r*.4,uIceRow),uSnow*smoothstep(.3,.62,nn.y));
      c*=mix(.5,1.,smoothstep(-1.5,.2,vWP.y+1.15));
      c*=cloudShade(vWP.xz);
      diffuseColor.rgb*=c;`); };
  const spots=[[],[],[],[],[],[],[],[]];
  const add=(x,z,s,sy)=>{ const y=terrainH(x,z), sp={x,y:y-.1*s,z,s,sy,ry:r()*6.28}; spots[Math.floor(r()*4)+(s<1.7?4:0)].push(sp); sp.ob=s>1.1?{x,z,r:s*.82,kind:'rock'}:null; if(sp.ob) obst.push(sp.ob); return; };
  // along the shore, in groups, big ones half in the water
  for(let i=0;i<40000;i++){ const x=(r()-.5)*560, z=24+r()*250, f=lakeField(x,z); if(f<-.016||f>.01) continue; if(Math.hypot(x-15,z-34)<8) continue;
    if(vnoise(x*.06+2,z*.06)<.44) continue; add(x,z,.5+r()*r()*r()*6.5,.62+r()*.5); }
  // scattered in the meadows and woods
  for(let i=0;i<620;i++){ const x=(r()-.5)*500, z=(r()-.5)*500-50, f=lakeField(x,z); if(f>-.02||keepClear(x,z)) continue; if(vnoise(x*.03,z*.03)<.55) continue; add(x,z,.5+r()*r()*3.4,.65+r()*.4); }
  // boulders in and along the creek, stacked at the falls
  for(let i=0;i<600;i++){ const k=r()*(RIVER.length-1), a=RIVER[Math.floor(k)], b=RIVER[Math.ceil(k)], q=k%1, cx=lerp(a[0],b[0],q), cz=lerp(a[1],b[1],q), w=lerp(a[3],b[3],q), ang=r()*6.28, rad=w*(.6+r()*1.7), x=cx+Math.cos(ang)*rad, z=cz+Math.sin(ang)*rad, rv=riverAt(x,z); if(!rv) continue; const inside=rv.d<rv.w*.7; if(inside&&r()<.72) continue; const yy=terrainH(x,z), s=(.6+r()*r()*3)*(Math.abs(k-3.5)<1.2?1.7:1); spots[Math.floor(r()*4)+(s<1.7?4:0)].push({x,y:yy-.1*s,z,s,sy:.7+r()*.5,ry:r()*6.28}); if(!inside&&s>1.2) obst.push({x,z,r:s*.8,kind:'rock'}); }
  // reefs off the shore
  for(let i=0;i<70;i++){ const x=(r()-.5)*420, z=46+r()*230, f=lakeField(x,z); if(f<.015||f>.16) continue; add(x,z,.5+r()*1.8,.5+r()*.3); }
  const d=new THREE.Object3D(); rockGeos=geos;
  // grouped by area as well as by shape, so rocks behind you are never drawn
  spots.forEach((all,i)=>{ const areas=new Map(); for(const q of all){ const k=Math.floor(q.x/170)+','+Math.floor(q.z/170); if(!areas.has(k)) areas.set(k,[]); areas.get(k).push(q); }
   for(const list of areas.values()){ const im=new THREE.InstancedMesh(geos[i],mat,list.length); const col=new THREE.Color();
    list.forEach((s,k)=>{ d.position.set(s.x,s.y,s.z); d.rotation.set(0,s.ry,0); d.scale.set(s.s,s.s*s.sy,s.s*(.8+.5*((k*7%10)/10))); d.updateMatrix(); im.setMatrixAt(k,d.matrix); const ri=rockInst.length; rockInst.push({im,k,m:d.matrix.clone(),ob:s.ob}); if(s.ob) s.ob.ri=ri; col.setScalar(.82+.3*((k*3%7)/7)); im.setColorAt(k,col); });
    im.receiveShadow=true; im.computeBoundingSphere(); im.boundingSphere.radius+=9; root.add(im); } });
  return spots.flat();
}

/* ---------- planting the valley ---------- */
const pick=(a,r)=>a[Math.floor(r()*a.length)];
let splatT=null, blockT=null;
export const splatTex=()=>splatT, blockTex=()=>blockT;
/* the same fields the ground is painted from, on the CPU, so a chunk of grass can be baked without touching the GPU */
let heightCPU=null, splatCPU=null; const HS=512, HR=440, SS=768;
export function heightAt(x,z){ const fx=(x/HR+.5)*HS-.5, fz=(z/HR+.5)*HS-.5, i=Math.floor(fx), j=Math.floor(fz); if(!heightCPU||i<0||j<0||i>=HS-1||j>=HS-1) return terrainH(x,z); const a=heightCPU[j*HS+i], b=heightCPU[j*HS+i+1], c=heightCPU[(j+1)*HS+i], d=heightCPU[(j+1)*HS+i+1], tx=fx-i, tz=fz-j; return lerp(lerp(a,b,tx),lerp(c,d,tx),tz); }
export function splatAt(x,z){ const i=clamp(Math.floor((x/840+.5)*SS),0,SS-1), j=clamp(Math.floor((z/840+.5)*SS),0,SS-1), o=(j*SS+i)*4; return [splatCPU[o]/255,splatCPU[o+1]/255,splatCPU[o+2]/255]; }
export function blockedAt(x,z){ const i=Math.floor((x+128)*2), j=Math.floor((z+128)*2); return i>=0&&j>=0&&i<512&&j<512&&blockT.image.data[j*512+i]>5; }
export const blockHook={fn:null};
// where grass may not grow: floors, tilled soil. 0.5 unit cells over +-128.
export function stampBlock(x,z,hx,hz,v=255){ const d=blockT.image.data, S=512, c=S/256; for(let j=Math.max(0,Math.floor((z-hz+128)*c));j<Math.min(S,Math.ceil((z+hz+128)*c));j++) for(let i=Math.max(0,Math.floor((x-hx+128)*c));i<Math.min(S,Math.ceil((x+hx+128)*c));i++) d[j*S+i]=v; blockT.needsUpdate=true; if(blockHook.fn) blockHook.fn(x,z,hx,hz); }
function bakeFields(){
  const S=512, R=440, d=new Uint16Array(S*S); heightCPU=new Float32Array(S*S); for(let j=0;j<S;j++) for(let i=0;i<S;i++){ const h=terrainH((i+.5)/S*R-R/2,(j+.5)/S*R-R/2); heightCPU[j*S+i]=h; d[j*S+i]=THREE.DataUtils.toHalfFloat(h); }
  const t=new THREE.DataTexture(d,S,S,THREE.RedFormat,THREE.HalfFloatType); t.minFilter=t.magFilter=THREE.LinearFilter; t.needsUpdate=true; U.uHeight.value=t;
  U.uCloud.value=tileNoise(256,4242);
  blockT=new THREE.DataTexture(new Uint8Array(512*512),512,512,THREE.RedFormat); blockT.minFilter=blockT.magFilter=THREE.NearestFilter; blockT.needsUpdate=true;
  U.uNoise.value=TEX.clouds;
}
function plant(root,obst,qual){
  const plantCount={low:9000,med:17000,high:26000}[qual]||17000;
  const r=rng(1234), trees=[], plants=[], decals=[], mini=[]; let tall=1;
  const link=o=>{ const t=trees[trees.length-1]; t.ob=o; o.tree=t; t.idx=trees.length-1; obst.push(o); };
  const tree=(x,z,kind)=>{
    const y=terrainH(x,z)-.25;
    if(kind==='spruce'){ const h=(12+r()*13)*tall; trees.push({name:pick(['spruce_a','spruce_b','spruce_c','spruce_d'],r),x,y,z,h,row:'spruce',tone:(r()-.5)*.16,flip:r()<.5,wind:.7}); decals.push({x,z,r:h*.18}); link({x,z,r:.75,kind:'tree'}); mini.push({x,z,c:0}); }
    else if(kind==='larch'){ const h=(11+r()*11)*tall; trees.push({name:pick(['larch_a','larch_b'],r),x,y,z,h,row:'larch',tone:(r()-.5)*.14,flip:r()<.5,wind:.8}); decals.push({x,z,r:h*.16}); link({x,z,r:.6,kind:'tree'}); mini.push({x,z,c:1}); }
    else if(kind==='broad'){ const h=(7+r()*5.5)*tall; trees.push({name:pick(['broad_a','broad_b','broad_c'],r),x,y,z,h,row:pick(['broad1','broad1','broad2','broad3'],r),tone:(r()-.5)*.1,flip:r()<.5,wind:.5}); decals.push({x,z,r:h*.34}); link({x,z,r:.7,kind:'tree'}); mini.push({x,z,c:2}); }
    else if(kind==='snag'){ const h=7+r()*6; trees.push({name:'snag_a',x,y,z,h,row:'wood',tone:.1,flip:r()<.5,wind:.15,sheet:1}); obst.push({x,z,r:.5}); }
  };
  // forest: jittered grid thinned by a density field, species in drifts
  const STEP=6.4;
  for(let gz=-420;gz<420;gz+=STEP) for(let gx=-470;gx<470;gx+=STEP){
    const x=gx+(r()-.5)*STEP*.9, z=gz+(r()-.5)*STEP*.9, f=lakeField(x,z);
    if(f>-.006||keepClear(x,z)) continue;
    const dist=Math.hypot(x,z), far=dist>210, dens=vnoise(x*.016+1,z*.016+8);
    const near=clamp(1-(dist-22)/60,0,1);            // leave the meadows around the farm open
    let p=smooth(.34,.56,dens)*(1-near*.72);
    if(f>-.05) p=Math.max(p,.42);                    // a tree line along the water
    if(far) p=Math.max(p,.62);
    if(r()>p) continue;
    const sp=vnoise(x*.02+40,z*.02+30), shoreB=f>-.07;
    const kind=sp>.6?'broad':sp>.47||shoreB&&r()<.5?(r()<.6?'larch':'broad'):'spruce';
    tree(x,z,kind);
    if(r()<.012) tree(x+3,z+2,'snag');
  }
  // islands: rock cap and a crown of trees
  for(const [ix,iz,ir] of ISLANDS){ for(let i=0;i<ir*2.2;i++){ const a=r()*6.28, q=Math.sqrt(r())*ir*.85, x=ix+Math.cos(a)*q, z=iz+Math.sin(a)*q; if(lakeField(x,z)>-.012||Math.hypot(x-138,z-86)<15) continue; tall=.72; tree(x,z,r()<.45?'larch':r()<.5?'spruce':'broad'); tall=1; } }
  // framing groups by the farm: the view from the yard is composed, not left to chance
  [[-27,19,'broad'],[-31,23,'broad'],[-24,25,'larch'],[-34,17,'spruce'],[-38,22,'spruce'],[-29,27,'broad'],[29,16,'broad'],[33,22,'larch'],[27,24,'broad'],[36,14,'spruce'],[40,20,'spruce'],[31,29,'broad'],[-44,12,'larch'],[46,8,'broad'],[-50,4,'spruce'],[50,3,'spruce']]
    .forEach(([x,z,k])=>{ if(lakeField(x,z)<-.008) tree(x,z,k); });
  // understory
  for(let i=0;i<plantCount;i++){ const nearby=i<plantCount*.62, a=r()*6.28, qr=nearby?16+r()*r()*84:0, x=nearby?Math.cos(a)*qr*1.3:(r()-.5)*420, z=nearby?12+Math.sin(a)*qr:(r()-.5)*300-20, f=lakeField(x,z); if(f>-.004) continue;
    const y=terrainH(x,z), kp=keepClear(x,z);
    if(x>-11&&x<11&&z>-11&&z<14) continue;
    if(pathDist(x,z)<2) continue;
    const q=r();
    if(q<.1&&!kp){ const h=1.3+r()*1.5; plants.push({name:pick(['shrub_a','shrub_b','shrub_c'],r),x,y:y-.1,z,h,row:'shrub',tone:(r()-.5)*.12,flip:r()<.5,wind:.5,trees:true}); }
    else if(q<.2){ plants.push({name:pick(['fern_a','fern_b'],r),x,y:y-.05,z,h:.5+r()*.4,row:'tuft',tone:-.1+r()*.1,flip:r()<.5,wind:1.2}); }
    else { const big=f>-.02||r()<.12; plants.push({name:pick(['tuft_a','tuft_b','tuft_c'],r),x,y:y-.05,z,h:(big?.9:.45)+r()*.7,row:'tuft',tone:(r()-.5)*.2,flip:r()<.5,wind:1.6}); }
  }
  // reeds in the shallows
  for(let i=0;i<7000;i++){ const x=(r()-.5)*520, z=24+r()*300, f=lakeField(x,z); if(f<-.012||f>.012) continue; if(vnoise(x*.09,z*.09)<.5) continue; if(Math.hypot(x-14,z-34)<9) continue;
    plants.push({name:'reed_a',x,y:terrainH(x,z)-.1,z,h:1+r()*.8,row:'tuft',tone:r()*.1,flip:r()<.5,wind:1}); }
  // big framing pines
  [[-36,31],[42,33],[-72,44],[70,40]].forEach(([x,z])=>{ if(lakeField(x,z)<0) trees.push({name:'pine_big',x,y:terrainH(x,z)-.3,z,h:24,row:'spruce',tone:-.02,flip:x>0,wind:.25,sheet:1}); obst.push({x,z,r:1.2}); });

  plantedTrees=trees; plantedPlants=plants;
  const onTrees=[...trees.filter(t=>!t.sheet),...plants.filter(p=>p.trees)], onPlants=[...trees.filter(t=>t.sheet),...plants.filter(p=>!p.trees)];
  spriteTrees=makeSprites(root,'sheet_trees',onTrees);
  onTrees.forEach((t,i)=>{ const a=ATLAS[t.name]; t.bi=i; t.h0=t.h; t.w0=t.h*a.w/a.h*(t.sx||1); });
  makeSprites(root,'sheet_plants',onPlants,{mainOnly:true});
  // soft contact shadow under each tree
  const dg=new THREE.CircleGeometry(1,16); dg.rotateX(-Math.PI/2);
  const dm=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,color:0x101018,opacity:.28,toneMapped:false,fog:false});
  dm.onBeforeCompile=sh=>{ sh.vertexShader='varying vec2 vQ;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vQ=position.xz;');
    sh.fragmentShader='varying vec2 vQ;\n'+sh.fragmentShader.replace('#include <opaque_fragment>','#include <opaque_fragment>\n gl_FragColor.a*=1.-smoothstep(.2,1.,length(vQ));'); };
  const near=decals.filter(d=>Math.hypot(d.x,d.z)<230);
  const im=new THREE.InstancedMesh(dg,dm,near.length), o=new THREE.Object3D();
  near.forEach((d,i)=>{ o.position.set(d.x,terrainH(d.x,d.z)+.08,d.z); o.scale.set(d.r,1,d.r*.8); o.updateMatrix(); im.setMatrixAt(i,o.matrix); });
  im.frustumCulled=false; im.layers.set(1); root.add(im);
  return mini;
}

/* felling and breaking change the world, and regrow on schedule */
let spriteTrees=null, rockInst=[];
function setSpriteH(it,on){ if(it.bi===undefined||!spriteTrees) return; const a=spriteTrees.geometry.attributes.iSize, m=it; a.setXY(it.bi,on?m.w0:0,on?m.h0:0); a.needsUpdate=true; }
export function removeTree(o,i){ const t=o?o.tree:plantedTrees[i]; if(!t) return; t.gone=true; setSpriteH(t,false); if(!o) o=t.ob; if(o){ o.r=0; o.kind='felled'; } }
export function breakRock(o,i){ const k=o?o.ri:i, R=rockInst[k]; if(!R) return; const m=new THREE.Matrix4().makeScale(0,0,0); R.im.setMatrixAt(R.k,m); R.im.instanceMatrix.needsUpdate=true; if(!o) o=R.ob; if(o){ o.saved=o.r; o.r=0; o.kind='gone'; } }
export function restoreWorld(kind,i){ if(kind==='tree'){ const t=plantedTrees[i]; if(!t) return; t.gone=false; setSpriteH(t,true); if(t.ob){ t.ob.r=.7; t.ob.kind='tree'; t.ob.hp=undefined; } } else { const R=rockInst[i]; if(!R) return; R.im.setMatrixAt(R.k,R.m); R.im.instanceMatrix.needsUpdate=true; if(R.ob){ R.ob.r=R.ob.saved; R.ob.kind='rock'; R.ob.hp=undefined; } } }
let rockGeos=[];
export const rockGeoFor=i=>rockGeos[i%rockGeos.length];

/* ---------- birds in formation, drifting across the sky ---------- */
function buildBirds(root){
  const n=11, g=new THREE.BufferGeometry(), pos=[], ph=[], tip=[];
  for(let i=0;i<n;i++){ const row=Math.ceil(i/2), s=i%2?1:-1, ox=row*s*3.2, oz=-row*3.4, p=i*1.7;
    for(const sd of [-1,1]){ pos.push(ox,0,oz+.34, ox,0,oz-.3, ox+sd*1.15,0,oz-.12); ph.push(p,p,p); tip.push(0,0,1); }
    pos.push(ox-.1,0,oz+.5, ox+.1,0,oz+.5, ox,0,oz-.62); ph.push(p,p,p); tip.push(0,0,0); }
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setAttribute('aP',new THREE.Float32BufferAttribute(ph,1)); g.setAttribute('aT',new THREE.Float32BufferAttribute(tip,1));
  const m=new THREE.ShaderMaterial({ side:THREE.DoubleSide, toneMapped:false, fog:false, uniforms:{uTime:U.uTime},
    vertexShader:`attribute float aP,aT; uniform float uTime; void main(){ vec3 p=position; float b=sin(uTime*5.4+aP); p.y+=aT*(b*.62+.12); p.x*=1.-aT*abs(b)*.18; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader:`void main(){ gl_FragColor=vec4(vec3(.05,.05,.07),1.); }` }), o=new THREE.Mesh(g,m); o.frustumCulled=false; root.add(o);
  return o;
}

/* ---------- build + per-frame ---------- */
export const obstacles=[]; export let miniTrees=[]; export let plantedTrees=[], plantedPlants=[];
const grid=new Map(); const CELL=8, gkey=(x,z)=>Math.floor(x/CELL)*4096+Math.floor(z/CELL);
function indexObstacles(){ grid.clear(); for(const o of obstacles){ const k=gkey(o.x,o.z); if(!grid.has(k)) grid.set(k,[]); grid.get(k).push(o); } }
export function addObstacle(x,z,r){ const o={x,z,r}; obstacles.push(o); const k=gkey(x,z); if(!grid.has(k)) grid.set(k,[]); grid.get(k).push(o); return o; }
// push a point out of trunks/rocks/buildings; returns nothing, mutates p
export function collide(p,rad){
  const cx=Math.floor(p.x/CELL), cz=Math.floor(p.z/CELL);
  for(let i=cx-1;i<=cx+1;i++) for(let j=cz-1;j<=cz+1;j++){ const l=grid.get(i*4096+j); if(!l) continue;
    for(const o of l){ if(o.box){ const dx=p.x-o.x, dz=p.z-o.z, hx=o.hx+rad, hz=o.hz+rad;
        if(Math.abs(dx)<hx&&Math.abs(dz)<hz){ const qx=hx-Math.abs(dx), qz=hz-Math.abs(dz); if(qx<qz) p.x+=Math.sign(dx||1)*qx; else p.z+=Math.sign(dz||1)*qz; } continue; }
      const dx=p.x-o.x, dz=p.z-o.z, q=o.r+rad, d=dx*dx+dz*dz;
      if(d<q*q&&d>1e-6){ const s=Math.sqrt(d), k=(q-s)/s; p.x+=dx*k; p.z+=dz*k; } } }
}
export function nearestOf(kind,x,z,reach){ let best=null, bd=reach; const cx=Math.floor(x/CELL), cz=Math.floor(z/CELL);
  for(let i=cx-1;i<=cx+1;i++) for(let j=cz-1;j<=cz+1;j++){ const l=grid.get(i*4096+j); if(!l) continue; for(const o of l){ if(o.kind!==kind) continue; const d=Math.hypot(x-o.x,z-o.z)-o.r; if(d<bd){ bd=d; best=o; } } }
  return best; }
export function addBoxObstacle(x,z,hx,hz){ const o={x,z,hx,hz,box:true}; obstacles.push(o); if(blockT) stampBlock(x,z,hx,hz); const k=gkey(x,z); [[-1,-1],[1,-1],[-1,1],[1,1],[0,0]].forEach(([a,b])=>{ const kk=gkey(x+a*hx,z+b*hz); if(!grid.has(kk)) grid.set(kk,[]); if(!grid.get(kk).includes(o)) grid.get(kk).push(o); }); return o; }

let mistRings=[], birds=null, birdT=0, root=null;
export const QUAL_RES={low:[512,320],med:[900,560],high:[1280,800]};
export function buildScenery(parent,qual){
  root=new THREE.Group(); parent.add(root);
  bakeFields(); const before=root.children.length; buildSky(root); buildMountains(root,qual); aboveWater=root.children.slice(before); buildGround(root);
  buildLake(root,QUAL_RES[qual]||QUAL_RES.med);
  mistRings=buildMist(root); buildCreek(root);
  const rocks=buildRocks(root,obstacles);
  miniTrees=plant(root,obstacles,qual); indexObstacles();
  birds=buildBirds(root);
  rampTex.needsUpdate=true;
  return root;
}
export function setSeason(season){
  for(const k in SEASON) writeRow(k,SEASON[k][season]);
  rampTex.needsUpdate=true;
  U.uSnow.value=season===3?1:0; U.uSeason.value=season;
  layers.forEach(l=>{ l.m.uniforms.uSnowK.value=[.9,.55,1,1][season]; }); if(ringMat){ ringMat.uniforms.uDecAmt.value=[.3,0,1,0][season]; ringMat.uniforms.uLine.value=[.4,.54,.44,.2][season]; } if(ringTreeMat) ringTreeMat.uniforms.uDecAmt.value=[.3,0,1,0][season];
}

// returns the frame's light rig so index.html can drive the directional light and grade
const revealV=new THREE.Vector3();
export const rig={ water:new THREE.Color(), rain:0, sunDir:new THREE.Vector3(0,1,0), sunI:2, ambI:1, sunCol:new THREE.Color(), ambCol:new THREE.Color(), gS:new THREE.Color(), gM:new THREE.Color(), gH:new THREE.Color(), gAmt:.3, night:0, fog:.001, fogCol:new THREE.Color(), sunC:new THREE.Color(), shaft:0 };
export function updateScenery(t,dt,minutes,weather0,camera,player,aurora){
  U.uTime.value=t;
  const weather=weather0==='storm'?'rain':weather0==='snow'?'cloudy':weather0;
  const P=weatherize(palette(minutes),weather);
  // sun crosses the south, so it sets over the lake; moon follows
  const a=clamp((minutes-330)/(1215-330),0,1)*Math.PI;
  const sx=Math.cos(a)*.92, sy=Math.sin(a)*.72+.012, sz=.6;
  rig.sunDir.set(sx,Math.max(sy,.02),sz).normalize();
  const ma=clamp((minutes-1190)/(1560-1190),0,1)*Math.PI;
  skyU.uMoonD.value.set(Math.cos(ma)*.75,Math.sin(ma)*.6+.12,.62).normalize();
  skyU.uSunD.value.copy(rig.sunDir);
  setC(skyU.uTop.value,P.top); setC(skyU.uMid.value,P.mid); setC(skyU.uLow.value,P.low); setC(skyU.uCL.value,P.cloudL); setC(skyU.uCS.value,P.cloudS); setC(skyU.uSunC.value,P.sun);
  skyU.uNight.value=P.night; skyU.uCover.value=weather==='rain'?1:weather==='cloudy'?.8:.56; skyU.uAurora.value=aurora?1:0;
  setC(mtU.uRS.value,P.rockS); setC(mtU.uRL.value,P.rockL); setC(mtU.uSS.value,P.snowS); setC(mtU.uSL.value,P.snowL); setC(mtU.uFS.value,P.forS); setC(mtU.uFL.value,P.forL); setC(mtU.uHz.value,P.haze);
  setC(mtU.uDS.value,mixc(P.forS,[.46,.2,.08],.55)); setC(mtU.uDL.value,mixc(P.forL,[.98,.66,.2],.7));
  setC(U.uShade.value,P.shade); setC(U.uLit.value,P.lit); setC(U.uFog.value,P.haze); U.uFogD.value=P.fog;
  setC(waterU.uTint.value,P.water); setC(waterU.uGlint.value,mixc(P.cloudL,[1,1,1],.4)); setC(creekU.uTint.value,mixc(P.water,P.mid,.25)); setC(creekU.uFoam.value,mixc(P.cloudL,[1,1,1],.6)); setC(creekU.uDeep.value,mixc(P.water,P.forS,.6)); updateSpray(dt);
  rig.water.copy(waterU.uTint.value); rig.rain=weather==='rain'?1:0;
  if(waterU.uni){ waterU.uni.uRain.value=U.uRain.value; waterU.uni.uTimeW.value=t; waterU.uni.uGlintAmt.value=P.glint; waterU.uni.uFogD.value=P.fog*.8; }
  setC(mistU.uMistC.value,P.mist); mistU.uMistA.value=P.mistAmt;
  // the sun side of every sprite, in world XZ
  U.uSide.value.set(rig.sunDir.x,0,rig.sunDir.z).normalize(); U.uSunDirW.value.copy(rig.sunDir);
  // cloud shadows drift with the high wind; the low sun lights the air toward it, and leaves and grass glow against it
  const day=1-P.night, wxK=weather==='rain'?.2:weather==='cloudy'?.5:1;
  U.uCloudOff.value.set(t*.0034,t*.0019); U.uCloudAmt.value=(weather==='rain'?.25:weather==='cloudy'?.5:.72)*day; setC(U.uCloudTint.value,mixc(P.shade,[1,1,1],.42));
  const gl=day*wxK*(.42+.58*(1-clamp(rig.sunDir.y/.62,0,1))); U.uGlow.value=gl;
  { const a=new THREE.Color(), b=new THREE.Color(); setC(a,P.sun); setC(b,P.haze); U.uFogSun.value.setRGB(Math.max(0,a.r-b.r),Math.max(0,a.g-b.g),Math.max(0,a.b-b.b)).multiplyScalar(.75*day*wxK); }
  const moonUp=P.night>.5; waterU.sunD.copy(moonUp?skyU.uMoonD.value:rig.sunDir); setC(waterU.uSunC.value,moonUp?P.snowL:P.sun);
  { const lit=P.lit, sh=mixc([.62*lit[0],.56*lit[1],.42*lit[2]],P.water,.45); setC(waterU.uShallow.value,sh); }
  if(waterU.uni){ waterU.uni.uGlow.value=moonUp?(P.night-.5)*1.1:gl*(1-P.night*2); waterU.uni.uCloudAmt.value=U.uCloudAmt.value; }
  const wa=t*.021; U.uWindDir.value.set(Math.cos(wa)*.8+.2,Math.sin(wa)*.6+.5).normalize();    // the breeze wanders, and picks up with the weather
  const target=(weather==='rain'?1.35:weather==='cloudy'?.95:.6)*(.82+.32*Math.sin(t*.13)); U.uWindAmp.value+=(target-U.uWindAmp.value)*Math.min(1,dt*.6);
  const c=camera.position;
  revealV.copy(player.pos); revealV.y+=1; revealV.project(camera);
  U.uReveal.value.set(revealV.x*.5+.5,revealV.y*.5+.5,c.distanceTo(player.pos)-.8,camera.aspect);
  layers.forEach(l=>{ l.o.position.x=c.x*.94; l.o.position.z=c.z*.94; });
  mistRings.forEach(o=>{ o.position.x=c.x; o.position.z=c.z; });
  if(birds){ birdT+=dt; const q=(birdT*.012)%1; birds.visible=q<.35&&P.night<.5; birds.position.set(lerp(c.x-260,c.x+260,q/.35),75+Math.sin(birdT*.1)*5,c.z+260); birds.rotation.y=-Math.PI/2; }
  rig.sunI=P.sunI; rig.ambI=P.ambI*(1+P.night*1.6); setC(rig.sunCol,P.lit); setC(rig.ambCol,mixc(P.mid,P.lit,.35+P.night*.55)); setC(rig.gS,P.gS); setC(rig.gM,P.gM); setC(rig.gH,P.gH); rig.gAmt=P.gAmt; rig.night=P.night; rig.fog=P.fog; rig.fogCol.copy(U.uFog.value); setC(rig.sunC,P.sun); rig.shaft=day*wxK;
  return rig;
}
/* tilled soil, painted to sit in the same ground */
export function paintedSoil(wet){
  const m=toonOf({color:0xffffff});
  m.onBeforeCompile=sh=>{ Object.assign(sh.uniforms,{uRamps:U.uRamps,uTile:{value:TEX.ground_tile},uDetail:{value:TEX.mt_detail},uEarthRow:{value:rowV('earth')},uWet:{value:wet?1:0},uCloud:U.uCloud,uCloudOff:U.uCloudOff,uCloudAmt:U.uCloudAmt,uCloudTint:U.uCloudTint});
    sh.vertexShader='varying vec3 vWP;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n vWP=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader=`varying vec3 vWP; uniform sampler2D uRamps,uTile,uDetail; uniform float uEarthRow,uWet; ${ramp} ${CLOUD_GLSL}\n`+sh.fragmentShader.replace('#include <map_fragment>',`
      vec3 t=texture2D(uTile,vWP.xz/3.).rgb, sd=texture2D(uDetail,vWP.xz*.34).rgb, sd2=texture2D(uDetail,vWP.xz*1.1).rgb; float v=t.g*.5+.12+(sd.b-.5)*.5+(sd2.b-.5)*.4; vec3 c=ramp(v,uEarthRow); if(uWet>.5) c*=vec3(.5,.46,.46); else c*=.88; c*=cloudShade(vWP.xz); diffuseColor.rgb*=c;`).replace('#include <normal_fragment_maps>',`normal=normalize(normal+mat3(viewMatrix)*vec3(sd.r-.5,0.,sd.g-.5)*.9+mat3(viewMatrix)*vec3(sd2.r-.5,0.,sd2.g-.5)*.6);`); };
  return m;
}
