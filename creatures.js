/* Living 3D animals. Bodies are lofted along a spine and tinted by vertex colour under a painted fur tile;
   legs have knees, tails and ears carry momentum, and the gait is driven by distance actually travelled,
   so feet never slide and nothing pops between poses. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toonOf, TEX, U, CLOUD_GLSL } from './scenery.js';

const tau=Math.PI*2, clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
const damp=(a,b,k,dt)=>lerp(a,b,1-Math.exp(-k*dt));
const angDamp=(a,b,k,dt)=>{ let d=((b-a+Math.PI)%tau+tau)%tau-Math.PI; return a+d*(1-Math.exp(-k*dt)); };
const hex=h=>new THREE.Color(h);

/* ---------- materials ---------- */
let furM=null, plainM=null;
function rimmed(m){ m.onBeforeCompile=sh=>{ Object.assign(sh.uniforms,{uSunDirW:U.uSunDirW,uLitC:U.uLit,uGlowR:U.uGlow});
    sh.fragmentShader='uniform vec3 uSunDirW,uLitC; uniform float uGlowR;\n'+sh.fragmentShader.replace('#include <opaque_fragment>',`{ vec3 vs=normalize(mat3(viewMatrix)*uSunDirW); float rim=pow(1.-clamp(dot(normalize(normal),normalize(vViewPosition)),0.,1.),2.6); outgoingLight+=diffuseColor.rgb*uLitC*rim*(.2+.8*max(vs.z*-.5+.5,0.))*(.22+uGlowR*.8); }\n#include <opaque_fragment>`); }; return m; }
function mats(){ if(furM) return; const t=TEX.surf_fur; t.wrapS=t.wrapT=THREE.RepeatWrapping; t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; t.repeat.set(2,2);
  furM=rimmed(toonOf({map:t,vertexColors:true})); plainM=rimmed(toonOf({vertexColors:true})); }
/* fur: shells pushed out along the normal, cut to strands that thin toward the tip and lie back with gravity */
const SHELLS=new Map();
function shellMat(k,len,dens){ const key=k+'_'+len+'_'+dens; if(SHELLS.has(key)) return SHELLS.get(key);
  const m=toonOf({map:TEX.surf_fur,vertexColors:true}); m.onBeforeCompile=sh=>{ sh.vertexShader='varying vec3 vOP;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n vOP=position; transformed+=normal*${(len*k).toFixed(4)}+vec3(0.,-.5,-.5)*${(len*k*k).toFixed(4)};`);
    sh.fragmentShader='varying vec3 vOP;\n'+sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>\n vec3 fq=vOP*${dens.toFixed(1)}, fid=floor(fq); float fh=fract(sin(dot(fid,vec3(12.9,78.2,37.7)))*43758.5453); if(length(fract(fq)-.5)*1.5>1.-${k.toFixed(2)}*(.32+.68*fh)) discard; diffuseColor.rgb*=${(.92+k*.24).toFixed(3)}+fh*.08;`); };
  SHELLS.set(key,m); return m; }
function addFur(root,len,dens){ const list=[]; root.traverse(o=>{ if(o.isMesh&&o.userData.shell) list.push(o); }); const shells=[];
  for(const o of list) for(const k of [.34,.67,1]){ const s=new THREE.Mesh(o.geometry,shellMat(k,len,dens)); s.layers.set(1); o.add(s); shells.push(s); } return shells; }
export function furLod(A,cx,cz){ if(!A.shells) return; const on=Math.hypot(A.x-cx,A.z-cz)<34; if(on===A.shellOn) return; A.shellOn=on; for(const s of A.shells) s.visible=on; }

/* loft: rings = [[x,y,z, rx,ry, color], ...]; a soft tube closed at both ends, the rings refined along a spline.
   under: the colour toward the belly, blended round each ring, so coats shade like coats */
function refine(R,k){ if(k<2||R.length<3) return R; const out=[], n=R.length, cr=(a,b,c,d,t)=>.5*(2*b+(c-a)*t+(2*a-5*b+4*c-d)*t*t+(3*b-a-3*c+d)*t*t*t), ca=new THREE.Color(), cb=new THREE.Color();
  for(let i=0;i<n-1;i++){ const a=R[Math.max(0,i-1)], b=R[i], c=R[i+1], d=R[Math.min(n-1,i+2)]; for(let s=0;s<k;s++){ const t=s/k, q=[]; for(let j=0;j<5;j++) q.push(cr(a[j],b[j],c[j],d[j],t)); q[3]=Math.max(.001,q[3]); q[4]=Math.max(.001,q[4]); ca.set(b[5]); cb.set(c[5]); q[5]=ca.clone().lerp(cb,t); out.push(q); } }
  out.push(R[n-1]); return out; }
export function loft(rings0,seg=9,under=null,sub=3){
  const rings=refine(rings0,sub); seg=Math.round(seg*1.45);
  const P=[],C=[],UV=[],I=[], n=rings.length, c=new THREE.Color(), cu=under===null?null:new THREE.Color(under);
  rings.forEach((r,i)=>{ const prev=rings[Math.max(0,i-1)], next=rings[Math.min(n-1,i+1)];
    let dy=next[1]-prev[1], dz=next[2]-prev[2], dx=next[0]-prev[0], len=Math.hypot(dx,dy,dz)||1; dx/=len; dy/=len; dz/=len;
    const up=Math.abs(dy)>.92?[0,0,1]:[0,1,0]; let ax=[dy*up[2]-dz*up[1],dz*up[0]-dx*up[2],dx*up[1]-dy*up[0]], la=Math.hypot(...ax)||1; ax=ax.map(v=>v/la);
    const bx=[ax[1]*dz-ax[2]*dy,ax[2]*dx-ax[0]*dz,ax[0]*dy-ax[1]*dx];
    for(let k=0;k<seg;k++){ const t=k/seg*tau, x=Math.cos(t)*r[3], y=Math.sin(t)*r[4]; P.push(r[0]+ax[0]*x+bx[0]*y,r[1]+ax[1]*x+bx[1]*y,r[2]+ax[2]*x+bx[2]*y); c.set(r[5]);
      if(cu){ const low=clamp(-(bx[1]>=0?1:-1)*Math.sin(t)*.9+.1,0,1); c.lerp(cu,low*low*(3-2*low)); } const j=.97+Math.random()*.06; C.push(c.r*j,c.g*j,c.b*j); UV.push(k/seg*1.2,i/n*1.2); } });
  for(let i=0;i<n-1;i++) for(let k=0;k<seg;k++){ const a=i*seg+k,b=i*seg+(k+1)%seg,d=a+seg,e=b+seg; I.push(a,d,b,b,d,e); }
  for(const [end,flip] of [[0,0],[n-1,1]]){ const r=rings[end], idx=P.length/3; c.set(r[5]); P.push(r[0],r[1],r[2]); C.push(c.r,c.g,c.b); UV.push(.5,.5); for(let k=0;k<seg;k++){ const a=end*seg+k,b=end*seg+(k+1)%seg; flip?I.push(a,idx,b):I.push(b,idx,a); } }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('color',new THREE.Float32BufferAttribute(C,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2)); g.setIndex(I); g.computeVertexNormals(); return g;
}
const mesh=(g,fur=true,shell=false)=>{ const m=new THREE.Mesh(g,fur?furM:plainM); m.castShadow=true; m.userData.shell=shell; return m; };
const ball=(x,y,z,r,col,sy=1)=>{ const g=new THREE.SphereGeometry(r,12,10); g.scale(1,sy,1); g.translate(x,y,z); const c=hex(col), n=g.attributes.position.count, a=new Float32Array(n*3); for(let i=0;i<n;i++) a.set([c.r,c.g,c.b],i*3); g.setAttribute('color',new THREE.BufferAttribute(a,3)); return mesh(g,false); };
/* an eye that looks alive: iris, pupil, a brow to sit under, and one catch of light */
function eye(par,x,y,z,r,s,iris=0x3a2212){ const G=new THREE.Group(); G.position.set(x,y,z); const b=ball(0,0,0,r,iris); b.castShadow=false; G.add(b); const p=ball(s*r*.2,0,r*.42,r*.68,0x0a0806); p.castShadow=false; G.add(p); const l=ball(s*r*.34+r*.2,r*.42,r*.8,r*.26,0xfff8ee); l.castShadow=false; l.material=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}); G.add(l); par.add(G); return G; }

/* ---------- quadruped ---------- */
function leg(hipY,len,r,col,foot,fat=1){
  const hip=new THREE.Group(), knee=new THREE.Group(), L1=len*.52, L2=len*.48;
  hip.add(mesh(loft([[0,.04,0,r*.9*fat,r*1.1*fat,col],[0,-L1*.5,.01,r*1.05*fat,r*1.05*fat,col],[0,-L1,.01,r*.72,r*.8,col]],7),true,true));
  knee.position.y=-L1; hip.add(knee);
  knee.add(mesh(loft([[0,0,0,r*.72,r*.76,col],[0,-L2*.6,0,r*.56,r*.6,col],[0,-L2+.02,.01,r*.62,r*.5,foot],[0,-L2,r*.5,r*.56,r*.3,foot]],7)));
  for(const dx of [-.5,0,.5]) knee.add(ball(dx*r*1.05,-L2+.005,r*(.72-Math.abs(dx)*.28),r*.2,foot,.7));          // toes
  hip.position.y=hipY; return {hip,knee,L:len};
}
export function quadruped(o){
  mats();
  const root=new THREE.Group(), body=new THREE.Group(); root.add(body);
  const {len=.9,height=.62,girth=.2,legLen=.58,back,belly,foot,neckLen=.3,neckUp=.75,headR=.15,muzzle=.14,muzzleR=.07,nose=0x1a1414,legR=.055,hump=0,tail='plume',tailLen=.44,ear='flop',earSize=.14,earCol,scale=1,fatLeg=1}=o;
  const Y=legLen+girth*.24;
  body.position.y=Y; const z0=-len/2, z1=len/2, c0=back, c1=belly;
  body.add(mesh(loft([[0,.0,z0-.05,girth*.28,girth*.28,c0],[0,.02,z0+.05*len,girth*.78,girth*.82,c0],[0,.03+hump*.16,z0+.3*len,girth*.96,girth*.95+hump*.2,c0],[0,.02+hump*.3,z0+.56*len,girth*.9,girth*.92+hump*.3,c0],[0,.05+hump*.2,z0+.8*len,girth*1.02,girth*1.04+hump*.1,c1],[0,.1,z1,girth*.82,girth*.84,c1],[0,.14,z1+.08,girth*.46,girth*.5,c1]],11,o.under??belly),true,true));
  // neck and head are a chain so the head can look around and bob against the stride
  const neck=new THREE.Group(); neck.position.set(0,.12,z1-.02); body.add(neck);
  const ny=Math.sin(neckUp)*neckLen, nz=Math.cos(neckUp)*neckLen;
  neck.add(mesh(loft([[0,-.06,-.03,girth*.62,girth*.66,c1],[0,ny*.5,nz*.5,girth*.46,girth*.48,c1],[0,ny,nz,girth*.4,girth*.42,c1]],8,o.under??belly),true,true));
  const head=new THREE.Group(); head.position.set(0,ny,nz); neck.add(head);
  head.add(mesh(loft([[0,-.02,-headR*.9,headR*.62,headR*.62,c1],[0,.015,-headR*.1,headR,headR*.96,c1],[0,.01,headR*.62,headR*.84,headR*.8,c1],[0,-.02,headR+muzzle*.35,muzzleR*1.25,muzzleR*1.1,o.muzzleCol||c1],[0,-.03,headR+muzzle,muzzleR,muzzleR*.8,o.muzzleCol||c1]],9,o.under??o.muzzleCol??belly),true,true));
  { const j=mesh(loft([[0,-.03,headR*.5,muzzleR*.8,muzzleR*.3,o.muzzleCol||c1],[0,-.06,headR+muzzle*.75,muzzleR*.72,muzzleR*.2,o.muzzleCol||c1]],7)); head.add(j); }                  // lower jaw
  head.add(ball(0,-.012,headR+muzzle+.005,muzzleR*.42,nose,.8)); { const g=ball(muzzleR*.1,.0,headR+muzzle+muzzleR*.3,muzzleR*.1,0xd8d0d0); g.castShadow=false; head.add(g); }
  const eyes=[-1,1].map(s=>{ const b=ball(s*headR*.6,.085,headR*.58,headR*.2,c1,.5); head.add(b); return eye(head,s*headR*.66,.052,headR*.66,headR*.135,s,o.iris); });
  let tongue=null; if(o.tongue){ tongue=mesh(loft([[0,0,0,muzzleR*.5,.012,0xd86a70],[0,-.02,muzzle*.35,muzzleR*.46,.012,0xe07a7c],[0,-.07,muzzle*.5,muzzleR*.34,.01,0xe07a7c]],6),false); tongue.position.set(0,-.05,headR+muzzle*.5); tongue.scale.setScalar(.01); head.add(tongue); }
  // ears hang from a hinge and swing with momentum
  const ears=[];
  [-1,1].forEach(s=>{ const e=new THREE.Group(); e.position.set(s*headR*.72,headR*.68,-headR*.1); const col=earCol||c0;
    if(ear==='flop'){ e.add(mesh(loft([[0,0,0,earSize*.32,earSize*.14,col],[s*.02,-earSize*.45,0,earSize*.5,earSize*.14,col],[s*.03,-earSize*.95,0,earSize*.34,earSize*.1,col]],7),true,true)); e.rotation.z=s*.34; }
    else { e.add(mesh(loft([[0,0,0,earSize*.24,earSize*.24,col],[s*earSize*.1,earSize*.5,0,earSize*.3,earSize*.16,col],[s*earSize*.16,earSize*(ear==='long'?1.15:.8),0,earSize*.08,earSize*.05,col]],7))); e.rotation.z=-s*.3; }
    head.add(e); ears.push({g:e,s,base:e.rotation.z,v:0,a:e.rotation.z}); });
  if(o.antlers) [-1,1].forEach(s=>{ const c=0x8c6e4c, mk=(pts,r)=>mesh(loft(pts.map((p,i)=>[p[0]*s,p[1],p[2],r*(1-i/pts.length*.7),r*(1-i/pts.length*.7),c]),5),false);
    head.add(mk([[headR*.4,headR*.8,-.02],[headR*.8,headR*1.8,-.08],[headR*1.3,headR*2.9,-.02],[headR*1.3,headR*3.8,.1]],.024)); head.add(mk([[headR*.86,headR*1.9,-.08],[headR*1.5,headR*2.2,.08]],.016)); head.add(mk([[headR*1.2,headR*2.8,-.03],[headR*1.9,headR*3.2,.06]],.014)); });
  if(o.horns) [-1,1].forEach(s=>head.add(mesh(loft([[s*headR*.6,headR*.7,0,.03,.03,0xd8ccb0],[s*headR*1.1,headR*.95,.02,.024,.024,0xd8ccb0],[s*headR*1.35,headR*1.3,.05,.01,.01,0x4a3c30]],5),false)));
  // tail: a short chain, each link trailing the one before
  const tailLinks=[]; { let par=new THREE.Group(); par.position.set(0,.05,z0-.03); body.add(par); const n=tail==='stub'?2:4, seg=tailLen/n;
    for(let i=0;i<n;i++){ const f=1-i/n, wide=tail==='plume'?.05+.075*Math.sin((i+.5)/n*Math.PI):.035*f+.012, col=i>n/2&&o.tailTip?o.tailTip:c0; const l=new THREE.Group(); l.position.z=i?-seg:0; par.add(l);
      l.add(mesh(loft([[0,0,0,wide*.7,wide*.7,col],[0,0,-seg*.5,wide,wide,col],[0,0,-seg-.01,wide*.74,wide*.74,col]],6),true,true)); tailLinks.push({g:l,v:0,a:0}); par=l; } tailLinks[0].g.rotation.x=o.tailLift??.72; }
  if(o.patches) [[.12,.14,-.2,.2],[-.16,.1,.14,.17],[.1,.02,.32,.14]].forEach(([x,y,z,r])=>{ const b=ball(x,y,z,r,0x2e2824,.62); b.material=furM; b.scale.x=1.2; body.add(b); });
  // legs
  const legs=[]; const c=[[.13,-1,z0+.14*len,0],[.13,1,z0+.14*len,.5],[.12,-1,z1-.14*len,.5],[.12,1,z1-.14*len,0]];
  c.forEach(([x,s,z,ph],i)=>{ const front=i>1, l=leg(0,legLen+(front?-.0:.0),legR*(front?1:1.1),front?(o.legCol||c1):(o.legCol||c0),foot,fatLeg); l.hip.position.set(s*x*(1+girth*1.4),-.04,z); body.add(l.hip); legs.push({...l,ph,front}); });
  const shells=o.fur?addFur(root,o.fur,o.furD||70):null;
  const A={ root,body,neck,head,ears,tail:tailLinks,legs,Y,o, shells, shellOn:true, eyes, tongue, blinkT:1+Math.random()*4, phase:0, speed:0, yaw:0, yawV:0, pitch:0, sit:0, lying:0, x:0,z:0,y:0, sw:0, wag:0, look:0, lookP:0, blink:0, breath:Math.random()*6, strideLen:o.stride||legLen*2.05, tuck:o.tuck||.5, pant:0 };
  root.scale.setScalar(scale); return A;
}
/* gait: speed in world units/s, sit 0..1 */
export function poseQuadruped(A,dt,opts={}){
  const {speed,sit=0,lookYaw=0,lookPitch=0,excite=0,graze=0}=opts, s=A.root.scale.x, o=A.o;
  A.speed=damp(A.speed,speed,10,dt); A.sit=damp(A.sit,sit,6,dt); A.graze=damp(A.graze||0,graze,5,dt); A.breath+=dt*(1.5+excite*3);
  const v=A.speed, g=clamp(v/(A.strideLen*s*1.4),0,1), on=Math.min(1,g*5);
  A.phase=(A.phase+v*dt/(A.strideLen*s))%1;                   // distance walked turns the legs, so feet do not slide
  const P=A.phase*tau, swing=(.38+.3*g)*on, tilt=.62*A.sit, frontZ=len(o);
  // a positive rotation swings a hanging limb backward, a negative one forward
  A.legs.forEach((l,i)=>{ const p=P+l.ph*tau+(l.front?.5:0), sw=Math.sin(p), lift=Math.max(0,Math.cos(p))*on;
    if(l.front){ l.hip.rotation.x=lerp(sw*swing,tilt,A.sit); l.knee.rotation.x=lerp(.05+lift*.95,.02,A.sit); }
    else { l.hip.rotation.x=lerp(sw*swing-.1,-1.3,A.sit); l.knee.rotation.x=lerp(.22+lift*.72,2.15,A.sit); } });
  const bob=(Math.abs(Math.sin(P*2))-.5)*.03*g*s;
  A.body.position.y=A.Y+bob-Math.sin(tilt)*frontZ+Math.sin(A.breath)*.0035;
  A.body.rotation.x=-tilt+Math.sin(P*2+.8)*.03*g; A.body.rotation.z=Math.sin(P)*.024*g;
  const br=Math.sin(A.breath); A.body.scale.set(1+br*.012,1+br*.016,1);
  A.neck.rotation.x=lerp(.07*g-Math.sin(P*2+.4)*.05*g,.5,A.sit)+A.graze*1.15;
  A.look=angDamp(A.look,clamp(lookYaw,-1.1,1.1),6,dt); A.lookP=damp(A.lookP,lookPitch,6,dt);
  A.head.rotation.y=A.look; A.head.rotation.x=Math.sin(P*2+1.1)*.05*g+A.lookP+A.sit*.14+A.graze*.5;
  A.blinkT-=dt; if(A.blinkT<-.13) A.blinkT=1.6+Math.random()*4.5; { const y=A.blinkT<0?.14:1; for(const e of A.eyes) e.scale.y=y; }
  if(A.tongue){ const t=clamp((g-.5)*3,0,1); A.tongue.scale.setScalar(.01+t*(1+Math.sin(A.breath*4)*.1)); }
  // ears: a damped spring kicked by the stride and by turning
  for(const e of A.ears){ const f=-(e.a-e.base)*90-e.v*9+Math.sin(P*2)*g*(o.ear==='flop'?20:6)*e.s+A.yawV*2.4*e.s; e.v+=f*dt; e.a+=e.v*dt; e.g.rotation.z=e.a; }
  // tail links chase the wag, each lagging the one before
  A.wag+=dt*(4.5+excite*8+g*3); let drive=Math.sin(A.wag)*(.26+excite*.46+g*.1)-A.yawV*.2;
  A.tail.forEach((t,i)=>{ const f=(drive-t.a)*70-t.v*11; t.v+=f*dt; t.a+=t.v*dt; t.g.rotation.y=t.a; drive=t.a*1.25; if(i) t.g.rotation.x=-.08-.04*Math.sin(A.wag*.5+i)*(.5+g); });
}
const len=o=>(o.len||.9)/2-(o.len||.9)*.14;

export const makeDog=()=>quadruped({fur:.03,furD:64,tongue:true,len:.8,girth:.23,legLen:.4,legR:.078,fatLeg:1.12,back:0xc08a3a,belly:0xdcae62,foot:0xe6c48a,legCol:0xcc9a4c,neckLen:.2,neckUp:.92,headR:.175,muzzle:.12,muzzleR:.082,muzzleCol:0xe8c88e,earCol:0x9c6a2a,earSize:.21,tailLen:.46,tailTip:0xd2a256,stride:.86,tailLift:.42,tuck:.6});
export const makeBear=()=>quadruped({fur:.055,furD:46,len:1.5,girth:.46,legLen:.62,legR:.13,fatLeg:1.05,back:0x4e3020,belly:0x6e4a30,foot:0x2e1c12,neckLen:.34,neckUp:.2,headR:.27,muzzle:.2,muzzleR:.12,muzzleCol:0x8e6846,ear:'round',earSize:.15,earCol:0x3a2416,hump:.42,tail:'stub',tailLen:.14,scale:1,stride:1.5,tuck:.9,tailLift:.3});
export const makeDeer=()=>quadruped({fur:.014,furD:90,under:0xf0e8d8,len:1.1,girth:.2,legLen:.92,legR:.042,back:0x9a7448,belly:0xc8a878,foot:0x2a1e16,legCol:0xa88258,neckLen:.56,neckUp:1.0,headR:.13,muzzle:.15,muzzleR:.055,muzzleCol:0xdcc8a4,ear:'long',earSize:.2,earCol:0xa88258,tail:'stub',tailLen:.16,tailTip:0xf0e8d8,antlers:true,stride:1.6});
export const makeCow=()=>quadruped({fur:.012,furD:80,len:1.3,girth:.34,legLen:.7,legR:.08,back:0xf2efe8,belly:0xe6e0d4,foot:0x2a2622,neckLen:.3,neckUp:.34,headR:.2,muzzle:.15,muzzleR:.1,muzzleCol:0xe8b8a8,ear:'long',earSize:.16,earCol:0x3a322c,tail:'thin',tailLen:.6,tailTip:0x2a2622,horns:true,stride:1.3,tailLift:-1.2,patches:true});

export const makeSheep=()=>quadruped({fur:.075,furD:30,len:.9,girth:.36,legLen:.4,legR:.05,back:0xeee6d8,belly:0xe4dac8,foot:0x2a2622,legCol:0x4a4038,neckLen:.2,neckUp:.7,headR:.15,muzzle:.12,muzzleR:.07,muzzleCol:0x4a4038,ear:'flop',earSize:.13,earCol:0x4a4038,tail:'stub',tailLen:.14,stride:.9});
export const makeGoat=()=>quadruped({fur:.022,furD:60,len:.9,girth:.22,legLen:.56,legR:.05,back:0xd8cdb8,belly:0xeae0cc,foot:0x3a3028,neckLen:.3,neckUp:.86,headR:.13,muzzle:.14,muzzleR:.06,ear:'long',earSize:.15,tail:'stub',tailLen:.14,horns:true,stride:1});
export const makePig=()=>quadruped({len:1,girth:.32,legLen:.36,legR:.07,back:0xeaaea0,belly:0xf0bcae,foot:0x8a5a50,neckLen:.14,neckUp:.3,headR:.2,muzzle:.1,muzzleR:.1,muzzleCol:0xe09a8c,ear:'long',earSize:.12,tail:'thin',tailLen:.16,stride:.8,tailLift:1.1});

/* ---------- birds ---------- */
export function bird(o){
  mats();
  const {bodyL=.5,bodyR=.16,col,wing,legLen=.3,neck=[[0,.06,.2],[0,.2,.24],[0,.32,.2]],neckR=.05,neckCol,headR=.07,beakL=.12,beakCol=0xe0a030,legCol=0xd88a30,tailUp=.1,scale=1,comb,float:fl=false}=o;
  const root=new THREE.Group(), body=new THREE.Group(); root.add(body); const Y=fl?.02:legLen+bodyR*.9; body.position.y=Y;
  body.add(mesh(loft([[0,tailUp*1.3,-bodyL*.72,.02,.02,wing],[0,tailUp*.5,-bodyL*.5,bodyR*.5,bodyR*.4,wing],[0,0,-bodyL*.15,bodyR*.95,bodyR*.92,col],[0,0,bodyL*.2,bodyR,bodyR,col],[0,.02,bodyL*.45,bodyR*.6,bodyR*.62,neckCol||col]],9,o.under??hex(col).lerp(hex(0xffffff),.3).getHex()),true,true));
  const wings=[]; [-1,1].forEach(s=>{ const w=new THREE.Group(); w.position.set(s*bodyR*.86,.05,bodyL*.12); w.add(mesh(loft([[0,0,.05,.012,bodyR*.5,wing],[s*.01,-.02,-bodyL*.3,.014,bodyR*.62,wing],[s*.02,0,-bodyL*.72,.008,bodyR*.2,wing]],6)));
    const dk=hex(wing).multiplyScalar(.72).getHex(), lt=hex(wing).lerp(hex(col),.4).getHex(), fs=[]; for(let i=0;i<6;i++){ const z=-bodyL*(.02+i*.13), l=bodyL*(.3+.05*i), y=-.03-bodyR*(.1+i*.05); fs.push(loft([[s*.014,y+.02,z+.03,.005,bodyR*.09,i%2?dk:lt],[s*.022,y,z-l*.5,.006,bodyR*.15,i%2?dk:lt],[s*.026,y-.012,z-l,.003,bodyR*.02,dk]],4,null,2)); } w.add(mesh(mergeGeometries(fs),false)); body.add(w); wings.push({g:w,s}); });
  { const fs=[], dk=hex(wing).multiplyScalar(.66).getHex(); for(let i=-3;i<=3;i++){ const a=i*.17, l=bodyL*.36; fs.push(loft([[0,tailUp*.9,-bodyL*.56,bodyR*.05,.005,wing],[Math.sin(a)*l*.5,tailUp*1.3,-bodyL*.56-l*.5,bodyR*.11,.005,wing],[Math.sin(a)*l,tailUp*1.7,-bodyL*.56-l,bodyR*.03,.003,dk]],4,null,2)); } body.add(mesh(mergeGeometries(fs),false)); }
  const nk=new THREE.Group(); nk.position.set(0,.04,bodyL*.34); body.add(nk);
  const links=[]; let par=nk, prev=[0,0,0];
  neck.forEach((p,i)=>{ const g=new THREE.Group(); g.position.set(p[0]-prev[0],p[1]-prev[1],p[2]-prev[2]); par.add(g); const nc=neckCol||col; g.add(mesh(loft([[0,-(p[1]-prev[1]),-(p[2]-prev[2]),neckR*(1.1-i*.1),neckR*(1.1-i*.1),nc],[0,0,0,neckR*(1-i*.1),neckR*(1-i*.1),nc]],6))); links.push(g); par=g; prev=p; });
  const head=new THREE.Group(); par.add(head);
  head.add(mesh(loft([[0,0,-headR,headR*.5,headR*.5,o.headCol||neckCol||col],[0,.01,0,headR,headR*.92,o.headCol||neckCol||col],[0,0,headR*.8,headR*.56,headR*.5,o.headCol||neckCol||col]],8)));
  head.add(mesh(loft([[0,-.004,headR*.6,headR*.4,headR*.3,beakCol],[0,-.008,headR+beakL*.6,headR*.2,headR*.12,beakCol],[0,-.012,headR+beakL,.004,.004,beakCol]],6),false));
  const eyes=[-1,1].map(s=>eye(head,s*headR*.68,.018,headR*.28,headR*.17,s,o.iris||0xc89a30));
  if(o.plume) head.add(mesh(loft([[0,.03,-headR*.6,.012,.016,o.plume],[0,.02,-headR*2.2,.01,.012,o.plume],[0,-.03,-headR*3.4,.003,.003,o.plume]],5),false));
  if(comb) for(let i=0;i<3;i++) head.add(ball(0,headR*.96+(i===1?.01:0),-headR*.5+i*headR*.45,headR*.3,comb));
  if(o.wattle) head.add(ball(0,-headR*.75,headR*.55,headR*.24,comb,1.3));
  const legs=[]; if(!fl) [-1,1].forEach((s,i)=>{ const h=new THREE.Group(), k=new THREE.Group(), L=legLen*.52, r=.012+legLen*.012; h.position.set(s*bodyR*.42,-bodyR*.72,-.02); h.add(mesh(loft([[0,0,0,r*1.4,r*1.4,o.thighCol||col],[0,-L,0,r,r,legCol]],5),false)); k.position.y=-L; h.add(k);
      k.add(mesh(loft([[0,0,0,r,r,legCol],[0,-L*.92,0,r*.8,r*.8,legCol]],5),false)); [-.5,0,.5].forEach(a=>k.add(mesh(loft([[0,-L*.92,0,r*.7,r*.4,legCol],[Math.sin(a)*legLen*.26,-L*.96,Math.cos(a)*legLen*.26,r*.3,r*.2,legCol]],4),false))); body.add(h); legs.push({h,k,ph:i*.5}); });
  root.scale.setScalar(scale);
  const shells=o.fur===0?null:addFur(root,.018,120);
  return { root,body,links,head,wings,legs,Y,o,shells,shellOn:true,eyes,blinkT:1+Math.random()*4,phase:0,speed:0,peck:0,flap:0,float:fl,strideLen:o.stride||legLen*1.8,yaw:0,x:0,z:0,y:0,idle:Math.random()*9 };
}
export function poseBird(B,dt,{speed=0,peck=0,flap=0}={}){
  const s=B.root.scale.x; B.speed=damp(B.speed,speed,8,dt); B.peck=damp(B.peck,peck,9,dt); B.flap=damp(B.flap,flap,6,dt); B.idle+=dt;
  B.phase=(B.phase+B.speed*dt/(B.strideLen*s))%1; const P=B.phase*tau, g=clamp(B.speed/(B.strideLen*s*2),0,1);
  B.legs.forEach(l=>{ const p=P+l.ph*tau, sw=Math.sin(p), lift=Math.max(0,Math.cos(p)); l.h.rotation.x=sw*.62*Math.min(1,g*3); l.k.rotation.x=-.22-lift*.9*Math.min(1,g*3)+.22; });
  B.blinkT-=dt; if(B.blinkT<-.1) B.blinkT=1.2+Math.random()*4; for(const e of B.eyes) e.scale.y=B.blinkT<0?.14:1;
  B.body.position.y=B.Y+Math.abs(Math.sin(P))*.025*g*s; B.body.rotation.z=Math.sin(P)*.05*g;
  const h=Math.sin(P*2)*.09*g, look=Math.sin(B.idle*.43)*.5+Math.sin(B.idle*1.1)*.2;
  B.links.forEach((l,i)=>{ l.rotation.x=lerp(h*(i?-1:1),.95-i*.14,B.peck); });
  B.head.rotation.y=look*(1-B.peck); B.head.rotation.x=B.peck*.3;
  const fl=Math.sin(B.idle*(14+B.flap*6))*B.flap; B.wings.forEach(w=>{ w.g.rotation.z=w.s*(fl*1.1+B.flap*.5); });
}
export const makeHeron=()=>bird({bodyL:.7,bodyR:.2,col:0x7c8ca0,wing:0x566478,neckCol:0xc4d0d8,headCol:0xe8eef0,legLen:.92,legCol:0x4e4034,thighCol:0x6c7c90,neck:[[0,.2,.14],[0,.42,.02],[0,.66,.13],[0,.82,.26]],neckR:.04,headR:.06,beakL:.26,beakCol:0xe0a030,plume:0x1e1a1e,tailUp:-.08,stride:.7});
export const makeDuck=()=>bird({bodyL:.42,bodyR:.15,col:0xa89a8a,wing:0x6e6054,neckCol:0x18543e,headCol:0x186048,neck:[[0,.08,.1],[0,.18,.1]],neckR:.05,headR:.07,beakL:.1,beakCol:0xe0a838,float:true,tailUp:.12});
export const makeChicken=()=>bird({bodyL:.34,bodyR:.17,col:0xf2ece0,wing:0xdcd2c0,neck:[[0,.1,.1],[0,.2,.13]],neckR:.06,headR:.07,beakL:.07,beakCol:0xe8a030,comb:0xd83838,wattle:true,legLen:.2,legCol:0xe0a030,tailUp:.22,stride:.3,scale:.92});
export const makeWalkDuck=()=>bird({bodyL:.4,bodyR:.16,col:0xf4f0e6,wing:0xe0dacc,neck:[[0,.1,.1],[0,.2,.12]],neckR:.055,headR:.07,beakL:.1,beakCol:0xe8a838,legLen:.16,legCol:0xe8a030,tailUp:.14,stride:.3});
export function makeFish(col=0x8a9a6a,belly=0xd8d4b0,L=.6){
  mats(); const G=new THREE.Group(), tail=new THREE.Group();
  G.add(mesh(loft([[0,0,L*.5,.008,.012,col],[0,0,L*.34,L*.1,L*.13,col],[0,.008,L*.02,L*.12,L*.18,col],[0,0,-L*.26,L*.07,L*.11,col],[0,0,-L*.42,L*.016,L*.04,col]],8,belly)));
  G.add(mesh(loft([[0,L*.16,L*.14,.003,.001,col],[0,L*.25,-.0,.003,L*.04,col],[0,L*.17,-L*.2,.003,.001,col]],4,null,2))); [-1,1].forEach(s=>{ G.add(mesh(loft([[s*L*.1,-L*.05,L*.2,.003,.003,col],[s*L*.17,-L*.1,L*.1,.003,L*.04,col],[s*L*.2,-L*.12,L*.05,.002,.002,col]],4,null,2))); eye(G,s*L*.075,L*.045,L*.33,L*.03,s,0xd8c070); });
  tail.position.z=-L*.42; tail.add(mesh(loft([[0,0,0,.004,L*.03,col],[0,0,-L*.15,.004,L*.14,col],[0,0,-L*.2,.003,L*.16,col]],4))); G.add(tail);
  return { root:G,tail,ph:Math.random()*9 };
}

/* butterfly and small birds overhead keep their own tiny cycles in index.html */
export { damp, angDamp, clamp };
