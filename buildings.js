/* Log cabins, the dock, the rowboat and other built things: real joinery in low-poly,
   surfaced with the painted tiles so they sit in the same picture as the trees. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toonOf, TEX, U, CLOUD_GLSL, terrainH, lakeField, WATER_Y, addBoxObstacle, addObstacle, DOCK, stampBlock, PATHS } from './scenery.js';

const M={}, nightLamps=[];
export { M as BM, mats as buildMats };
function mats(){
  if(M.log) return;
  const tile=t=>{ t.wrapS=t.wrapT=THREE.RepeatWrapping; t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=8; return t; };
  // every built surface gets the same close detail: grain and chips from the rock tile, damp and moss rising from the ground, cloud shadow passing over
  const worn=(m,out=true)=>{ m.onBeforeCompile=sh=>{ Object.assign(sh.uniforms,{uDetail:{value:TEX.mt_detail},uCloud:U.uCloud,uCloudOff:U.uCloudOff,uCloudAmt:U.uCloudAmt,uCloudTint:U.uCloudTint});
      sh.vertexShader='varying vec3 vWP2,vWN2; varying float vUp;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n vWP2=(modelMatrix*vec4(transformed,1.)).xyz; vWN2=normalize(mat3(modelMatrix)*objectNormal); vUp=transformed.y;');
      sh.fragmentShader=`varying vec3 vWP2,vWN2; varying float vUp; uniform sampler2D uDetail; ${CLOUD_GLSL}\n`+sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        vec3 an=abs(vWN2); vec2 duv=an.y>.6?vWP2.xz:(an.x>an.z?vWP2.zy:vWP2.xy); vec3 dd1=texture2D(uDetail,duv*.23).rgb, dd2=texture2D(uDetail,duv*.83+.3).rgb; float crk=(dd1.b-.5)+(dd2.b-.5)*.8;
        diffuseColor.rgb*=1.+crk*.62; ${out?'float dmp=1.-smoothstep(.0,1.25,vUp+crk*.7); diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.58,.66,.46),dmp*.72); diffuseColor.rgb*=cloudShade(vWP2.xz);':''}`).replace('#include <normal_fragment_maps>',`normal=normalize(normal+mat3(viewMatrix)*(vec3(dd1.r-.5,dd1.g-.5,dd2.r-.5)*.7));`); }; return m; };
  M.log=toonOf({map:tile(TEX.surf_log)}); M.boards=toonOf({map:tile(TEX.surf_boards),side:THREE.DoubleSide}); M.shingle=toonOf({map:tile(TEX.surf_shingle)}); M.stone=toonOf({map:tile(TEX.surf_stone)});
  M.deck=toonOf({map:TEX.surf_boards,color:0xc8b8a0}); M.dark=toonOf({color:0x241b17}); M.trim=toonOf({color:0x3b2a20}); M.frame=toonOf({color:0xd8c8a4});
  M.door=toonOf({color:0x74702e}); M.rust=toonOf({color:0x8c4a2c}); M.moss=toonOf({color:0x5c6a34}); M.white=toonOf({map:TEX.surf_boards,color:0xf4efe2,side:THREE.DoubleSide}); M.green=toonOf({color:0x38584a});
  M.cream=toonOf({color:0xe8dcc0}); M.red=toonOf({color:0xa8402e}); M.iron=toonOf({color:0x3a3c42});
  for(const k of ['log','boards','shingle','stone','deck','white']){ M['i'+k]=worn(M[k].clone(),false); worn(M[k]); }
  M.glass=new THREE.MeshBasicMaterial({color:0x334050,toneMapped:false,fog:false});
  M.lantern=new THREE.MeshBasicMaterial({color:0x4a3a28,toneMapped:false,fog:false}); M.hay=toonOf({color:0xc8a84c}); M.sack=toonOf({color:0xc0ac84}); M.pink=toonOf({color:0xd86a8c}); M.yellow=toonOf({color:0xe8c040}); M.blue=toonOf({color:0x6a7ac8}); M.leaf=toonOf({color:0x4e7038}); M.cloth=toonOf({color:0xd8ccb0,side:THREE.DoubleSide}); M.cloth2=toonOf({color:0x7c9aa8,side:THREE.DoubleSide});
  M.lamp=new THREE.MeshBasicMaterial({color:0xffc870,toneMapped:false,fog:false});
}

// world-scale UVs: picks the plane a face lies in, so tiles keep their size on any surface
function wuv(g,s){ const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){ const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));
    if(ay>=ax&&ay>=az) uv.setXY(i,p.getX(i)/s,p.getZ(i)/s); else if(ax>az) uv.setXY(i,p.getZ(i)/s,p.getY(i)/s); else uv.setXY(i,p.getX(i)/s,p.getY(i)/s); }
  return g; }
export class Kit{
  constructor(){ this.parts={}; }
  add(mat,g,px=0,py=0,pz=0,rx=0,ry=0,rz=0){ if(!g.attributes.uv) g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2)); if(rx) g.rotateX(rx); if(ry) g.rotateY(ry); if(rz) g.rotateZ(rz); g.translate(px,py,pz); (this.parts[mat]=this.parts[mat]||[]).push(g.index?g.toNonIndexed():g); return this; }
  box(mat,w,h,d,px,py,pz,o={}){ const g=new THREE.BoxGeometry(w,h,d); if(o.rx) g.rotateX(o.rx); if(o.ry) g.rotateY(o.ry); if(o.rz) g.rotateZ(o.rz); g.translate(px,py,pz); wuv(g,o.s||2.4); return this.add(mat,g); }
  log(mat,len,r,px,py,pz,ry=0,o={}){ const g=new THREE.CylinderGeometry(r,r*(o.taper||1),len,o.seg||7,1); const uv=g.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getY(i)*len/2.2,uv.getX(i)*1.4);
    g.rotateZ(Math.PI/2); if(ry) g.rotateY(ry); g.translate(px,py,pz); return this.add(mat,g); }
  post(mat,r,h,px,py,pz){ const g=new THREE.CylinderGeometry(r*.9,r,h,7,1); const uv=g.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getY(i)*h/2.2,uv.getX(i)*1.2); g.translate(px,py+h/2,pz); return this.add(mat,g); }
  bake(group){ for(const k in this.parts){ const m=new THREE.Mesh(mergeGeometries(this.parts[k],false),M[k]); m.castShadow=k!=='glass'&&k!=='lamp'; m.receiveShadow=true; group.add(m); } return group; }
}

function tri(w,h,dz){ const s=new THREE.Shape(); s.moveTo(-w/2,0); s.lineTo(w/2,0); s.lineTo(0,h); s.closePath(); const g=new THREE.ExtrudeGeometry(s,{depth:dz,bevelEnabled:false}); g.translate(0,0,-dz/2); return g; }

function windowAt(k,x,y,z,w=1.1,h=1.2,ry=0){
  const put=(mat,bw,bh,bd,ox,oy,oz)=>{ const g=new THREE.BoxGeometry(bw,bh,bd); g.translate(ox,oy,oz); if(ry) g.rotateY(ry); g.translate(x,y,z); wuv(g,2); k.add(mat,g); };
  put('frame',w+.22,h+.22,.1,0,0,0); put('glass',w,h,.14,0,0,0);
  put('frame',.06,h,.17,0,0,0); put('frame',w,.06,.17,0,0,0);
  put('trim',w+.46,.1,.3,0,-h/2-.14,.08);                                         // sill
}

/* a log building: front is +z */
export function logHouse(o){
  mats();
  const {x,z,w=7,d=5.4,h=2.9,rh=2.3,porch=true,chimney=true,ry=0,roof='shingle',wins=2,door=true}=o;
  const G=new THREE.Group(), K=new Kit(), r=.215, n=Math.round(h/(r*1.86));
  K.box('dark',w-.25,h,d-.25,0,h/2,0);
  for(let i=0;i<n;i++){ const y=r+i*r*1.86+.05;
    K.log('log',w+.72,r,0,y,d/2-.04,0,{taper:.97}); K.log('log',w+.72,r,0,y,-d/2+.04,0,{taper:1.03});
    K.log('log',d+.72,r,w/2-.04,y+r*.9,0,Math.PI/2); K.log('log',d+.72,r,-w/2+.04,y+r*.9,0,Math.PI/2);
    for(const [ex,ez] of [[w/2+.36,d/2-.04],[-w/2-.36,d/2-.04],[w/2+.36,-d/2+.04],[-w/2-.36,-d/2+.04]]){ const e=new THREE.CircleGeometry(r*.92,8); if(ex<0) e.rotateY(-Math.PI/2); else e.rotateY(Math.PI/2); e.translate(ex+Math.sign(ex)*.005,y,ez); K.add('frame',e); }
  }
  K.box('boards',w+.02,.34,d+.02,0,.17,0);                                        // sill log/foundation
  K.box('stone',w+.7,.3,d+.7,0,.1,0,{s:1.6});
  // gables + roof
  const eave=.58, slope=Math.hypot(w/2+eave,rh*(w/2+eave)/(w/2)), ang=Math.atan2(rh,w/2), top=h+.25;
  [d/2-.02,-d/2+.02].forEach(zz=>{ const g=tri(w+.2,rh,.14); g.translate(0,top-.06,zz); wuv(g,2.4); K.add('boards',g); });
  K.box('boards',w+.6,.26,d+.05,0,top-.12,0);
  const L=d+eave*2+.2;
  K.box(roof,slope,.2,L,-(w/2+eave)/2,top-.05+rh*.5*(1-eave/(w/2))+.2,0,{rz:ang,s:2.6});
  K.box(roof,slope,.2,L,(w/2+eave)/2,top-.05+rh*.5*(1-eave/(w/2))+.2,0,{rz:-ang,s:2.6});
  K.box('trim',.3,.26,L+.1,0,top+rh+.2,0);                                        // ridge
  [L/2-.02,-L/2+.02].forEach(zz=>{                                                 // barge boards
    K.box('trim',slope+.1,.34,.1,-(w/2+eave)/2,top-.1+rh*.5*(1-eave/(w/2))+.14,zz,{rz:ang});
    K.box('trim',slope+.1,.34,.1,(w/2+eave)/2,top-.1+rh*.5*(1-eave/(w/2))+.14,zz,{rz:-ang}); });
  K.box('trim',.14,rh*.7,.12,0,top+rh*.4,d/2+.1);                                  // king post on the gable
  K.box('trim',w*.34,.12,.12,0,top+.32,d/2+.1);
  // openings
  if(door){ K.box('trim',1.34,2.36,.12,0,1.26,d/2+.2); K.box('door',1.1,2.14,.16,0,1.18,d/2+.22,{s:9});
    K.box('glass',.56,.56,.2,0,1.72,d/2+.22); K.box('frame',.03,.56,.22,0,1.72,d/2+.22); K.box('frame',.56,.03,.22,0,1.72,d/2+.22);
    const kn=new THREE.SphereGeometry(.05,6,5); kn.translate(.4,1.1,d/2+.34); K.add('iron',kn); }
  const off=wins===1?[w*.28]:[-w*.3,w*.3];
  off.forEach(ox=>windowAt(K,ox,1.6,d/2+.2));
  windowAt(K,w/2+.2,1.6,0,.9,1.1,Math.PI/2); windowAt(K,-w/2-.2,1.6,-.4,.9,1.1,-Math.PI/2);
  if(porch){ const pd=2.5, dz=d/2+pd/2;
    K.box('deck',w+.8,.18,pd,0,.42,dz,{s:3}); for(let i=0;i<3;i++) K.box('deck',2.1-i*.0,.14,.34,0,.3-i*.13,d/2+pd+.2+i*.32,{s:3});
    [-w/2-.2,-1.25,1.25,w/2+.2].forEach(px=>{ K.post('log',.11,2.6,px,.5,d/2+pd-.15); K.box('stone',.32,.34,.32,px,.2,d/2+pd-.15,{s:1}); });
    K.log('log',w+1.2,.14,0,3.04,d/2+pd-.15);
    const pl=pd+.8, pa=Math.atan2(.72,pd);
    K.box(roof,w+1.5,.16,pl,0,3.42,dz+.1,{rx:pa,s:2.6});
    K.box('trim',w+1.5,.2,.1,0,3.1,d/2+pd+.52);
    [-1,1].forEach(s=>{ for(let i=0;i<2;i++) K.log('log',w/2-1.05,.06,s*(w/2+1.25)/2,.92+i*.3,d/2+pd-.15); K.box('trim',.08,.8,.08,s*(w/2-.9),.9,d/2+pd-.15); });
    // rocking chair and a stack of firewood
    K.box('boards',.62,.08,.6,-w*.3,.86,d/2+1.1,{s:1.5}); K.box('boards',.62,.86,.08,-w*.3,1.28,d/2+.82,{rx:-.16,s:1.5}); K.box('trim',.07,.5,.6,-w*.3-.3,.68,d/2+1.1); K.box('trim',.07,.5,.6,-w*.3+.3,.68,d/2+1.1);
    for(let i=0;i<5;i++) for(let j=0;j<4-i%2;j++) K.log('log',.9,.11,w*.34+j*.23+(i%2)*.11-.3,.62+i*.19,d/2+.42,Math.PI/2,{seg:6});
  }
  if(chimney){ const cx=-w/2-.05, cz=-d*.16;
    K.box('stone',1.3,h+.6,1.15,cx-.3,(h+.6)/2,cz,{s:1.9}); K.box('stone',.92,rh+1.6,.92,cx-.26,h+.6+(rh+1.6)/2,cz,{s:1.9}); K.box('trim',1.06,.14,1.06,cx-.26,h+rh+2.26,cz); }
  K.bake(G); G.position.set(x,terrainH(x,z),z); G.rotation.y=ry;
  if(!ry) for(const q of [-.3,.3]) addGlow(x+w*q,terrainH(x,z)+1.55,z+d/2+.34,2.8);       // lit windows spill a little warmth at dusk
  G.userData.smoke=chimney?new THREE.Vector3(x-w/2-.31,terrainH(x,z)+h+rh+2.5,z-d*.16):null;
  if(o.world) o.world.add(G);
  const hx=(Math.abs(Math.sin(ry))>.5?d:w)/2+.3, hz=(Math.abs(Math.sin(ry))>.5?w:d)/2+.3;
  addBoxObstacle(x,z,hx,hz); if(porch) stampBlock(x,z+d/2+1.6,w/2+1,2.2);
  return G;
}

/* market stall with a striped awning */
export function marketStall(world,x,z){
  mats(); const K=new Kit(), G=new THREE.Group();
  K.box('boards',3.2,1,1.2,0,.5,0,{s:1.6}); K.box('deck',3.4,.1,1.4,0,1.04,0,{s:2});
  [[-1.55,.6],[1.55,.6],[-1.55,-.7],[1.55,-.7]].forEach(([a,b])=>K.post('log',.08,b>0?2.7:2.2,a,0,b));
  for(let i=0;i<8;i++){ const g=new THREE.BoxGeometry(3.7/8+.01,.06,2); g.rotateX(.26); g.translate(-3.7/2+3.7/16+i*3.7/8,2.54,-.05); K.add(i%2?'cream':'red',g); }
  for(let i=0;i<3;i++){ K.box('boards',.72,.42,.72,-1+i,1.3,0,{s:1.2}); const cols=['rust','moss','cream']; for(let j=0;j<7;j++){ const s=new THREE.IcosahedronGeometry(.13,1); s.translate(-1.2+i+(j%3)*.2,1.56+(j%2)*.1,-.2+(j%3)*.2); K.add(cols[i],s); } }
  K.bake(G); G.position.set(x,terrainH(x,z),z); world.add(G); addBoxObstacle(x,z,1.8,.9); return G;
}
export function shippingBin(world,x,z){
  mats(); const K=new Kit(), G=new THREE.Group();
  K.box('boards',1.9,1,1.2,0,.5,0,{s:1.6}); K.box('trim',2,.1,1.3,0,.1,0); K.box('trim',2,.1,1.3,0,.92,0); K.box('deck',2,.12,1.3,0,1.14,-.1,{rx:-.1,s:2}); K.box('iron',.1,.3,.06,0,.95,.63);
  K.bake(G); G.position.set(x,terrainH(x,z),z); world.add(G); addBoxObstacle(x,z,1.05,.7); return G;
}
export function anvilBlock(world,x,z){
  mats(); const K=new Kit(), G=new THREE.Group();
  K.post('log',.38,.62,0,0,0); K.box('iron',.5,.14,.3,0,.7,0); K.box('iron',.26,.2,.22,0,.86,0); K.box('iron',.9,.18,.32,0,1.02,0); const c=new THREE.ConeGeometry(.15,.5,6); c.rotateZ(-Math.PI/2); c.translate(.66,1.02,0); K.add('iron',c);
  K.bake(G); G.position.set(x,terrainH(x,z),z); world.add(G); addObstacle(x,z,.6); return G;
}
export function hearth(world,x,z){
  mats(); const K=new Kit(), G=new THREE.Group();
  K.box('stone',1.3,.9,1,0,.45,0,{s:1.4}); K.box('stone',1,.5,.8,0,1.1,0,{s:1.4}); K.box('dark',.62,.5,.1,0,.46,.51); K.box('lamp',.5,.26,.12,0,.34,.5); K.box('stone',.34,.9,.34,.2,1.7,-.1,{s:1.4});
  K.bake(G); G.position.set(x,terrainH(x,z),z); world.add(G); addObstacle(x,z,.85); return G;
}
export function fenceRun(world,pts){
  mats(); const K=new Kit(), G=new THREE.Group();
  for(let i=0;i<pts.length-1;i++){ const [ax,az]=pts[i],[bx,bz]=pts[i+1], dx=bx-ax, dz=bz-az, l=Math.hypot(dx,dz), ry=-Math.atan2(dz,dx), n=Math.max(1,Math.round(l/2.2));
    for(let j=0;j<=n;j++) K.post('log',.075,1,ax+dx*j/n,terrainH(ax+dx*j/n,az+dz*j/n)-.05,az+dz*j/n);
    K.log('log',l,.05,(ax+bx)/2,terrainH((ax+bx)/2,(az+bz)/2)+.75,(az+bz)/2,ry); K.log('log',l,.05,(ax+bx)/2,terrainH((ax+bx)/2,(az+bz)/2)+.42,(az+bz)/2,ry);
    for(let j=0;j<n;j++){ const t=(j+.5)/n; addObstacle(ax+dx*t,az+dz*t,.5); } }
  K.bake(G); world.add(G); return G;
}
export function mineMouth(world,x,z){
  mats(); const K=new Kit(), G=new THREE.Group();
  K.post('log',.24,3.3,-1.7,0,.2); K.post('log',.24,3.3,1.7,0,.2); K.log('log',4.1,.26,0,3.4,.2); K.box('dark',3.2,3.3,.3,0,1.65,-.05);
  for(let i=0;i<3;i++) K.box('trim',.2,.08,2,(i-1)*.0,.05,1+i*.6,{ry:Math.PI/2}); K.box('iron',.06,.06,3.6,-.5,.1,1.8); K.box('iron',.06,.06,3.6,.5,.1,1.8);
  K.bake(G); G.position.set(x,terrainH(x,z),z); world.add(G); addBoxObstacle(x,z-.4,2.4,.6); return G;
}

/* dock + rowboat */
export function buildDock(world){
  mats(); const K=new Kit(), G=new THREE.Group(), {x,z0,z1,w,y}=DOCK, L=z1-z0;
  const n=Math.round(L/.42);
  for(let i=0;i<n;i++) K.box('deck',w*(.97+.03*((i*7)%3)/2),.1,.36,((i*5)%3-1)*.03,y,z0+(i+.5)*L/n,{s:2.6});
  K.box('trim',.18,.2,L,-w/2+.2,y-.14,(z0+z1)/2); K.box('trim',.18,.2,L,w/2-.2,y-.14,(z0+z1)/2);
  for(let i=0;i<=Math.floor(L/3.4);i++){ const pz=z0+1+i*3.4; [-1,1].forEach(s=>K.post('log',.16,y+6,s*(w/2-.05),-6+.25,pz)); }
  K.box('deck',w+3,.1,2.2,0,y,z1+.9,{s:2.6}); [[-1,1],[1,1],[-1,-1],[1,-1]].forEach(([a,b])=>K.post('log',.17,y+6.4,a*(w/2+1.4),-6+.3,z1+.9+b*1));
  K.post('trim',.05,1.8,w/2+1.2,y,z1+1.7); K.box('trim',.5,.06,.06,w/2+1,y+1.8,z1+1.7);          // lantern arm
  const glow=new THREE.SphereGeometry(.12,8,6); glow.translate(w/2+.8,y+1.62,z1+1.7); K.add('lantern',glow); K.box('iron',.16,.04,.16,w/2+.8,y+1.77,z1+1.7);
  K.bake(G); world.add(G);
  const lamp=new THREE.PointLight(0xffb060,0,16,1.8); lamp.position.set(x+w/2+.8,y+1.5,z1+1.7); world.add(lamp); nightLamps.push({l:lamp,i:6});
  G.position.x=x;
  return makeBoat(world);
}
function hull(L,W,D){
  const seg=16, ring=7, P=[], idx=[], uv=[];
  for(let i=0;i<=seg;i++){ const t=i/seg, s=t*2-1, hw=W/2*Math.pow(Math.max(0,1-Math.pow(Math.abs(s),2.6)),.72), sheer=D*.55*s*s, keel=-D*(1-Math.pow(Math.abs(s),3)*.65);
    for(let j=0;j<=ring;j++){ const a=j/ring*Math.PI, c=Math.cos(a), q=Math.sin(a);
      P.push(c*hw*(1-.05*q),lerp(sheer,keel+sheer*.3,Math.pow(q,.8)),(t-.5)*L); uv.push(t*2.6,j/ring*1.2); } }
  for(let i=0;i<seg;i++) for(let j=0;j<ring;j++){ const a=i*(ring+1)+j,b=a+1,c=a+ring+1,d=c+1; idx.push(a,c,b,b,c,d); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const lerp=(a,b,t)=>a+(b-a)*t;
function makeBoat(world){
  mats(); const G=new THREE.Group(), K=new Kit();
  const L=4.8,W=1.64,D=.72, outer=hull(L,W,D), inner=hull(L*.97,W*.92,D*.94); inner.scale(-1,1,1);
  K.add('white',outer); inner.translate(0,.03,0); K.add('boards',inner);
  // gunwale
  for(let i=0;i<16;i++){ const t=i/16, s=t*2-1, s2=(i+1)/16*2-1, hw=f=>W/2*Math.pow(Math.max(0,1-Math.pow(Math.abs(f),2.6)),.72), y=f=>D*.55*f*f;
    [-1,1].forEach(side=>{ const ax=side*hw(s),az=s*L/2,bx=side*hw(s2),bz=s2*L/2,l=Math.hypot(bx-ax,bz-az)+.02; const g=new THREE.BoxGeometry(.09,.09,l); g.rotateY(Math.atan2(bx-ax,bz-az)); g.rotateX(0); g.translate((ax+bx)/2,(y(s)+y(s2))/2+.02,(az+bz)/2); K.add('green',g); }); }
  K.box('deck',W*.86,.06,.34,0,-.1,.9,{s:2}); K.box('deck',W*.92,.06,.34,0,-.08,-.5,{s:2}); K.box('deck',W*.7,.06,.3,0,-.02,-1.6,{s:2});
  [-1,1].forEach(s=>{ const o=new THREE.CylinderGeometry(.03,.03,2.5,5); o.rotateZ(s*1.38); o.rotateY(s*.16); o.translate(s*.72,.16,.3); K.add('trim',o); });
  K.bake(G); G.traverse(o=>{ if(o.isMesh) o.material=o.material; }); world.add(G); return G;
}

/* villagers: stylised and hand-painted, with jointed legs and arms so they can walk */
const SKIN=[0xeec7a0,0xd8a880,0xb88058,0xf0d0b0], HAIR=[0x4a3324,0x2c2c34,0xa86a3c,0x8c8c90,0xc89a4a,0x6a3a2a];
/* cloth that hangs: a lathe with soft vertical folds that deepen toward the hem */
function folded(radAt,h,folds=9,amp=.02,seg=30,rows=10){ const pts=[]; for(let i=0;i<=rows;i++){ const t=i/rows; pts.push(new THREE.Vector2(radAt(t),t*h)); } const g=new THREE.LatheGeometry(pts,seg), p=g.attributes.position;
  for(let i=0;i<p.count;i++){ const x=p.getX(i), y=p.getY(i), z=p.getZ(i), th=Math.atan2(z,x), t=y/h, k=1+(Math.sin(th*folds+Math.sin(t*3.4)*1.3)+.4*Math.sin(th*folds*2.3+1))*amp*Math.pow(1-t,1.3)/Math.max(.15,radAt(t)*3); p.setX(i,x*k); p.setZ(i,z*k); } g.computeVertexNormals(); return g; }
function hairCap(R,end,rough=.012){ const g=new THREE.SphereGeometry(R,30,14,0,Math.PI*2,0,end), p=g.attributes.position; for(let i=0;i<p.count;i++){ const x=p.getX(i), y=p.getY(i), z=p.getZ(i), th=Math.atan2(z,x), k=1+(Math.sin(th*23+y*9)*.5+Math.sin(th*41-y*14)*.3)*rough/R; p.setXYZ(i,x*k,y*k,z*k); } g.computeVertexNormals(); return g; }
export function makeVillager(col,style=0,idx=0){
  mats(); const G=new THREE.Group(), P=TEX.surf_fur; P.wrapS=P.wrapT=THREE.RepeatWrapping;
  const cloth=toonOf({color:col,map:P}), trim=toonOf({color:new THREE.Color(col).multiplyScalar(.6),map:P}), skin=toonOf({color:SKIN[idx%4]}), skin2=toonOf({color:new THREE.Color(SKIN[idx%4]).multiplyScalar(.82).lerp(new THREE.Color(0xd86a58),.16)}), dark=toonOf({color:HAIR[(idx+style)%6],map:P}), boot=toonOf({color:0x2e241e}), sole=toonOf({color:0x17110e}), metal=toonOf({color:0xc8a860}), white=new THREE.MeshBasicMaterial({color:0xfff8ee,toneMapped:false}), apron=toonOf({color:0xe8dcc0,side:THREE.DoubleSide,map:P}), lip=toonOf({color:0x6a3428});
  const add=(p,g,m,x=0,y=0,z=0)=>{ const o=new THREE.Mesh(g,m); o.position.set(x,y,z); o.castShadow=true; p.add(o); return o; };
  const torso=new THREE.Group(); torso.position.y=.62; G.add(torso);
  add(torso,folded(t=>THREE.MathUtils.lerp(.315,.175,Math.pow(t,.72))+.02*Math.sin(t*3.14),.82),cloth,0,-.13);                 // long coat
  add(torso,new THREE.CylinderGeometry(.215,.222,.055,20),trim,0,.3); add(torso,new THREE.BoxGeometry(.075,.075,.02),metal,0,.3,.222);   // belt and buckle
  [.42,.52,.13].forEach(y=>add(torso,new THREE.SphereGeometry(.014,6,5),metal,0,y,.215-(y<.3?-.05:(y-.42)*.34)));
  add(torso,new THREE.SphereGeometry(.2,14,10),cloth,0,.66); const col2=add(torso,new THREE.TorusGeometry(.115,.03,7,18),trim,0,.8); col2.rotation.x=Math.PI/2; add(torso,new THREE.CylinderGeometry(.075,.085,.12,10),skin,0,.86);
  if(style%3===1){ const a=new THREE.Mesh(new THREE.CylinderGeometry(.262,.325,.62,16,1,true,-.8,1.6),apron); a.position.set(0,-.02,0); a.castShadow=true; torso.add(a); add(torso,new THREE.BoxGeometry(.2,.26,.02),apron,0,.44,.205); }
  if(style%3===2){ const sc=add(torso,new THREE.TorusGeometry(.14,.05,8,18),dark,0,.8); sc.rotation.x=Math.PI/2; const t=add(torso,new THREE.BoxGeometry(.1,.34,.04),dark,.08,.62,.2); t.rotation.z=-.12; }
  const head=new THREE.Group(); head.position.y=.94; torso.add(head); const sk=add(head,new THREE.SphereGeometry(.25,22,16),skin); sk.scale.set(1,.97,.98);
  if(style%4===0){ add(head,hairCap(.268,1.7),dark,0,.04,-.02); for(let i=0;i<5;i++){ const f=add(head,new THREE.ConeGeometry(.05,.13,6),dark,(i-2)*.07,.13-Math.abs(i-2)*.012,.235-Math.abs(i-2)*.016); f.rotation.x=Math.PI+.25; } }
  if(style%4===1){ add(head,new THREE.CylinderGeometry(.44,.45,.03,24),dark,0,.14); add(head,new THREE.CylinderGeometry(.23,.26,.2,20),dark,0,.25); const b=add(head,new THREE.CylinderGeometry(.262,.262,.04,20),trim,0,.17); b.castShadow=false; add(head,hairCap(.262,1.9),dark,0,.0,-.03); }
  if(style%4===2){ add(head,hairCap(.27,1.62),dark,0,.04,-.02); const b=add(head,new THREE.SphereGeometry(.16,14,10),dark,0,-.04,-.25); b.scale.y=1.3; const t=add(head,new THREE.TorusGeometry(.06,.02,6,12),trim,0,.08,-.24); t.rotation.y=.2; }
  if(style%4===3){ add(head,hairCap(.266,1.34,.006),cloth,0,.05); const b=add(head,new THREE.SphereGeometry(.2,14,10),dark,0,-.17,.15); b.scale.set(1,1.2,.6); for(const s of [-1,1]) add(head,new THREE.SphereGeometry(.05,8,6),dark,s*.21,.04,.1); }
  [-1,1].forEach(s=>{ const e=add(head,new THREE.SphereGeometry(.036,10,8),M.dark,s*.098,.024,.224); e.scale.set(1,1.3,.55); e.castShadow=false; const c=add(head,new THREE.SphereGeometry(.0115,6,5),white,s*.09+.012,.044,.243); c.castShadow=false;
    const br=add(head,new THREE.CapsuleGeometry(.009,.055,2,5),dark,s*.1,.092,.222); br.rotation.z=Math.PI/2+s*.14; br.castShadow=false; add(head,new THREE.SphereGeometry(.05,8,6),skin,s*.25,.0,-.01); const bl=add(head,new THREE.SphereGeometry(.042,8,6),skin2,s*.155,-.058,.178); bl.scale.set(1,.6,.3); bl.castShadow=false; });
  { const n=add(head,new THREE.SphereGeometry(.027,8,6),skin2,0,-.024,.25); n.castShadow=false; const m=add(head,new THREE.TorusGeometry(.04,.007,4,10,Math.PI),lip,0,-.075,.233); m.rotation.z=Math.PI; m.castShadow=false; }
  const limb=(x,y,len,r,m,end,cuff)=>{ const j=new THREE.Group(); j.position.set(x,y,0); G.add(j); add(j,new THREE.CapsuleGeometry(r,len,4,10),m,0,-len/2-r*.4); if(cuff) add(j,new THREE.CylinderGeometry(r*1.24,r*1.3,.06,12),cuff,0,-len-r*.2); if(end){ add(j,end,end.userData.mat,0,-len-r*1.5,.03); if(end.userData.mat===boot) add(j,new THREE.BoxGeometry(.16,.03,.27),sole,0,-len-r*1.5-.055,.03); else add(j,new THREE.SphereGeometry(.03,6,5),skin,r*.9*Math.sign(x),-len-r*1.2,.05); } return j; };
  const foot=new THREE.SphereGeometry(.09,12,8); foot.scale(1,.72,1.5); foot.userData.mat=boot; const hand=new THREE.SphereGeometry(.07,10,8); hand.userData.mat=skin;
  const legL=limb(-.13,.62,.42,.085,trim,foot,boot), legR=limb(.13,.62,.42,.085,trim,foot,boot), armL=limb(-.31,1.14,.38,.065,cloth,hand,trim), armR=limb(.31,1.14,.38,.065,cloth,hand,trim); armL.rotation.z=-.1; armR.rotation.z=.1;
  G.userData.limbs={legL,legR,armL,armR,torso}; return G;
}

/* a shop sign, lettered on a canvas */
export function signBoard(world,x,y,z,text,ry=0){
  mats(); const c=document.createElement('canvas'); c.width=512; c.height=128; const g=c.getContext('2d'); g.fillStyle='#4a3020'; g.fillRect(0,0,512,128); g.strokeStyle='#c8a468'; g.lineWidth=8; g.strokeRect(8,8,496,112); g.font='600 58px "PingFang SC",system-ui,sans-serif'; g.textAlign='center'; g.textBaseline='middle';
  const paint=s=>{ g.fillStyle='#4a3020'; g.fillRect(14,14,484,100); g.fillStyle='#f1e4c8'; const w=g.measureText(s).width, k=Math.min(1,456/w); g.save(); g.translate(256,68); g.scale(k,k); g.fillText(s,0,0); g.restore(); }; paint(text);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; const m=new THREE.Mesh(new THREE.BoxGeometry(3.2,.8,.1),[M.trim,M.trim,M.trim,M.trim,new THREE.MeshBasicMaterial({map:t,toneMapped:false}),M.trim]); m.position.set(x,y,z); m.rotation.y=ry; m.castShadow=true; m.userData.setText=s=>{ paint(s); t.needsUpdate=true; }; world.add(m); return m;
}
export function mailbox(world,x,z){ mats(); const K=new Kit(), G=new THREE.Group(); K.post('log',.06,1.1,0,0,0); K.box('red',.5,.34,.74,0,1.24,0); K.box('dark',.4,.2,.02,0,1.26,.38); K.bake(G); G.position.set(x,terrainH(x,z),z); world.add(G); addObstacle(x,z,.4); return G; }
export function greenhouse(world,x,z,w=11,d=10){ mats(); const K=new Kit(), G=new THREE.Group(); const glass=new THREE.MeshBasicMaterial({color:0xcfe6e8,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}); M.gl=glass;
  [[-w/2,-d/2],[w/2,-d/2],[-w/2,d/2],[w/2,d/2],[0,-d/2],[-w/2,0],[w/2,0]].forEach(([a,b])=>K.box('frame',.14,3,.14,a,1.5,b)); [-d/2,d/2].forEach(b=>{ K.box('frame',w,.12,.12,0,3,b); K.box('frame',w,.12,.12,0,.14,b); }); [-w/2,w/2].forEach(a=>K.box('frame',.12,.12,d,a,3,0)); K.box('frame',.16,.16,d+.2,0,4.4,0); [-1,1].forEach(s=>{ K.box('frame',.1,.1,d,s*w/4,3.7,0); });
  K.bake(G); const tent=new THREE.Mesh(new THREE.BoxGeometry(w,3,d),glass); tent.position.y=1.5; G.add(tent); const r=tri(w,1.4,d); r.translate(0,3,0); G.add(new THREE.Mesh(r,glass)); G.position.set(x,terrainH(x,z),z); world.add(G); return G; }
/* the inside of the cabin, a warm room apart from the world */
const painted=(w,h,draw,extra={})=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'),w,h); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=8; t.generateMipmaps=true; return toonOf({map:t,...extra}); };
const rnd=(i)=>{ const x=Math.sin(i*91.7+3.1)*43758.5; return x-Math.floor(x); };
function rugArt(x,W,H){ x.fillStyle='#7a2a20'; x.fillRect(0,0,W,H); const band=(m,c)=>{ x.strokeStyle=c; x.lineWidth=m[1]; x.strokeRect(m[0],m[0],W-m[0]*2,H-m[0]*2); }; x.fillStyle='#24303a'; x.fillRect(38,38,W-76,H-76); x.fillStyle='#8e3426'; x.fillRect(70,70,W-140,H-140); band([26,8],'#d8b878'); band([56,5],'#d8b878'); band([66,3],'#c26a3c');
  const dia=(cx,cy,r,c)=>{ x.fillStyle=c; x.beginPath(); x.moveTo(cx,cy-r*.7); x.lineTo(cx+r,cy); x.lineTo(cx,cy+r*.7); x.lineTo(cx-r,cy); x.closePath(); x.fill(); };
  for(let i=0;i<3;i++){ const cx=W*(.25+i*.25); dia(cx,H/2,104,'#24303a'); dia(cx,H/2,82,'#d8b878'); dia(cx,H/2,62,'#8e3426'); dia(cx,H/2,36,'#c26a3c'); dia(cx,H/2,14,'#f0dfb0'); }
  for(let i=0;i<34;i++){ const u=(i+.5)/34*(W-120)+60; dia(u,48,9,i%2?'#d8b878':'#c26a3c'); dia(u,H-48,9,i%2?'#d8b878':'#c26a3c'); } for(let i=0;i<18;i++){ const v=(i+.5)/18*(H-120)+60; dia(48,v,9,i%2?'#d8b878':'#c26a3c'); dia(W-48,v,9,i%2?'#d8b878':'#c26a3c'); }
  x.globalAlpha=.1; for(let i=0;i<9000;i++){ x.fillStyle=i%2?'#fff':'#000'; x.fillRect(rnd(i)*W,rnd(i+.5)*H,2,1); } x.globalAlpha=1; }
function quiltArt(x,W,H){ const cols=['#b04a38','#d8b878','#4e6e5a','#e8dcc0','#7a4a30','#6a84a0'], n=8, s=W/n; for(let j=0;j<Math.ceil(H/s);j++) for(let i=0;i<n;i++){ x.fillStyle=cols[Math.floor(rnd(i*3+j*7)*6)]; x.fillRect(i*s,j*s,s,s); x.fillStyle=cols[Math.floor(rnd(i*5+j*2+.3)*6)]; x.beginPath(); x.moveTo(i*s,j*s); x.lineTo(i*s+s,j*s); x.lineTo(i*s+s,j*s+s); x.closePath(); x.fill(); x.strokeStyle='rgba(248,240,220,.65)'; x.setLineDash([5,4]); x.lineWidth=2; x.strokeRect(i*s+3,j*s+3,s-6,s-6); x.setLineDash([]); } }
function booksArt(x,W,H){ x.fillStyle='#1c1410'; x.fillRect(0,0,W,H); let u=0, i=0; const cols=['#7a2a20','#2e4a52','#a8843c','#4e5a2e','#5a3a5a','#c8b890','#8a4a2a','#30384e']; while(u<W){ const w=12+rnd(i)*20, h=H*(.72+rnd(i+.2)*.26); x.fillStyle=cols[i%8]; x.fillRect(u,H-h,w,h); x.fillStyle='rgba(240,214,150,.8)'; x.fillRect(u+2,H-h+10,w-4,2); x.fillRect(u+2,H-h+15,w-4,1); x.fillRect(u+3,H-h*.5,w-6,6); x.fillStyle='rgba(0,0,0,.28)'; x.fillRect(u+w-2,H-h,2,h); u+=w+1; i++; } }
function lakeArt(x,W,H){ const g=x.createLinearGradient(0,0,0,H*.6); g.addColorStop(0,'#e8a878'); g.addColorStop(1,'#f4dcae'); x.fillStyle=g; x.fillRect(0,0,W,H); x.fillStyle='#fff0c0'; x.beginPath(); x.arc(W*.68,H*.38,H*.09,0,6.3); x.fill(); const m=(y,a,c)=>{ x.fillStyle=c; x.beginPath(); x.moveTo(0,H*.62); for(let i=0;i<=24;i++){ const u=i/24; x.lineTo(u*W,H*(y-a*Math.abs(Math.sin(u*9+y*9)+.4*Math.sin(u*23)))); } x.lineTo(W,H*.62); x.closePath(); x.fill(); }; m(.5,.2,'#a87c84'); m(.56,.15,'#6a4a58'); m(.6,.07,'#2c3a2e'); x.fillStyle='#b8846c'; x.fillRect(0,H*.62,W,H*.38); x.fillStyle='rgba(255,236,190,.7)'; for(let i=0;i<40;i++) x.fillRect(rnd(i)*W,H*(.64+rnd(i+.4)*.34),8+rnd(i+.8)*20,2); }
function cowArt(x,W,H){ x.fillStyle='#d8ccb0'; x.fillRect(0,0,W,H); x.fillStyle='#4e6e5a'; x.fillRect(0,H*.66,W,H*.34); x.fillStyle='#7c4a30'; x.fillRect(W*.2,H*.36,W*.56,H*.26); x.beginPath(); x.arc(W*.8,H*.4,H*.1,0,6.3); x.fill(); x.fillRect(W*.26,H*.6,W*.05,H*.16); x.fillRect(W*.64,H*.6,W*.05,H*.16); x.fillStyle='#f4eede'; x.beginPath(); x.ellipse(W*.42,H*.44,W*.1,H*.09,0,0,6.3); x.fill(); }
function lathe(pr,seg=12){ return new THREE.LatheGeometry(pr.map(p=>new THREE.Vector2(p[0],p[1])),seg); }
export function cabinRoom(scene){
  mats(); const G=new THREE.Group(), K=new Kit(), W=9, D=7, H=3.2;
  Object.assign(M,{ rug:painted(1024,720,rugArt), quilt:painted(512,768,quiltArt), books:painted(512,120,booksArt), pic1:painted(420,280,lakeArt), pic2:painted(280,280,cowArt), curtain:toonOf({color:0xb8a080,side:THREE.DoubleSide}), brass:toonOf({color:0xc8a050}), wax:toonOf({color:0xf0e6cc}), chrome:toonOf({color:0xc8ccd0}), crock:toonOf({color:0x8a5a3c}), crock2:toonOf({color:0x4e6e7c}), pillow:toonOf({color:0xefe6d4}), herb:toonOf({color:0x6e8a44}), herb2:toonOf({color:0xc8a84c}), ember:new THREE.MeshBasicMaterial({color:0xff7a2a,toneMapped:false}), hood:toonOf({color:0xe8e4d8}) });
  K.box('ideck',W,.1,D,0,-.05,0,{s:2.4}); [-D/2,D/2].forEach(z=>{ for(let i=0;i<8;i++) K.log('ilog',W+.1,.22,0,.22+i*.42,z,0,{seg:10}); }); [-W/2,W/2].forEach(x=>{ for(let i=0;i<8;i++) K.log('ilog',D+.1,.22,x,.22+i*.42,0,Math.PI/2,{seg:10}); }); K.box('iboards',W+.2,.1,D+.2,0,H+.1,0,{s:2.4});
  for(let i=-2;i<=2;i++) K.log('ilog',D,.11,i*1.7,H-.06,0,Math.PI/2,{seg:8}); K.log('ilog',W,.14,0,H-.26,0,0,{seg:8}); for(const x of [-4.2,4.2]) K.post('ilog',.14,H,x,0,-3.2);
  // rug with a knotted fringe
  { const g=new THREE.PlaneGeometry(3.6,2.5,1,1); g.rotateX(-Math.PI/2); g.translate(.6,.016,.5); K.add('rug',g); for(let i=0;i<46;i++){ for(const sx of [-1,1]){ const f=new THREE.BoxGeometry(.13,.008,.02); f.translate(.6+sx*1.86,.012,-.72+i/45*2.44); K.add('wax',f); } } }
  // bed: carved headboard, mattress, patchwork, pillows
  K.box('ilog',2.1,.1,3.1,-3.1,.32,-1.7); for(const [x,z] of [[-4.08,-3.2],[-2.12,-3.2],[-4.08,-.2],[-2.12,-.2]]) K.post('ilog',.09,.34,x,0,z);
  K.add('pillow',new RoundedBoxGeometry(1.92,.26,2.9,4,.1),-3.1,.5,-1.7); K.add('quilt',new RoundedBoxGeometry(2.02,.2,1.95,4,.08),-3.1,.61,-1.1); K.add('wax',new RoundedBoxGeometry(2.04,.1,.32,3,.04),-3.1,.71,-2.02);
  for(const x of [-3.58,-2.62]){ const p=new THREE.SphereGeometry(.42,14,10); p.scale(1,.34,.66); p.rotateX(-.2); p.translate(x,.78,-2.72); K.add('pillow',p); }
  { const s=new THREE.Shape(); s.moveTo(-1.08,0); s.lineTo(-1.08,1); s.quadraticCurveTo(-.5,1.24,0,1.42); s.quadraticCurveTo(.5,1.24,1.08,1); s.lineTo(1.08,0); s.closePath(); const g=new THREE.ExtrudeGeometry(s,{depth:.09,bevelEnabled:true,bevelSize:.02,bevelThickness:.02,bevelSegments:2}); wuv(g,2); g.translate(-3.1,.12,-3.3); K.add('iboards',g); }
  K.box('ilog',.56,.52,.56,-1.72,.26,-2.86,{s:1.4}); { const c=lathe([[0,0],[.1,0],[.1,.02],[.03,.05],[.025,.1],[.045,.11],[.045,.24],[0,.24]]); c.translate(-1.72,.52,-2.86); K.add('brass',c); const w=new THREE.CylinderGeometry(.03,.03,.12,8); w.translate(-1.72,.8,-2.86); K.add('wax',w); }
  // table and chairs: turned legs, a loaf, mugs, a jar of wild flowers
  K.add('iboards',new RoundedBoxGeometry(1.8,.08,1.06,2,.03),.8,.74,.6); for(const [a,b] of [[-.74,-.42],[.74,-.42],[-.74,.42],[.74,.42]]){ const l=lathe([[.055,0],[.04,.08],[.062,.2],[.035,.34],[.05,.48],[.06,.6],[.05,.7]],10); l.translate(.8+a,0,.6+b); K.add('ilog',l); }
  for(const [cx,cz,ry] of [[-.32,.6,Math.PI/2],[1.95,.6,-Math.PI/2]]){ const c=Math.cos(ry), s=Math.sin(ry); K.add('iboards',new RoundedBoxGeometry(.56,.05,.56,2,.02),cx,.46,cz); for(const [a,b] of [[-.22,-.22],[.22,-.22],[-.22,.22],[.22,.22]]) K.post('ilog',.03,.46,cx+a,0,cz+b); for(const q of [-.22,.22]) K.post('ilog',.03,.56,cx+(q*c-.24*s),.46,cz+(-q*s-.24*c)); for(const y of [.8,.94]) K.box('iboards',.5,.07,.03,cx-.24*s,y,cz-.24*c,{ry}); }
  { const c=lathe([[0,0],[.34,0],[.38,.05],[.34,.07],[0,.03]],18); c.translate(.8,.78,.6); K.add('crock2',c); const b=new THREE.SphereGeometry(.2,12,8); b.scale(1.3,.62,.8); b.translate(.8,.9,.6); K.add('crock',b); for(const [x,z] of [[.25,.32],[1.3,.84]]){ const m=lathe([[0,0],[.06,0],[.065,.13],[.058,.13],[.05,.02],[0,.02]],10); m.translate(x,.78,z); K.add('wax',m); const h=new THREE.TorusGeometry(.04,.012,5,10); h.translate(x+.08,.85,z); K.add('wax',h); }
    const j=lathe([[0,0],[.07,0],[.085,.09],[.05,.18],[.055,.22]],10); j.translate(1.42,.78,.3); K.add('crock',j); for(let i=0;i<7;i++){ const a=i*2.4, f=new THREE.IcosahedronGeometry(.045,0), st=new THREE.CylinderGeometry(.006,.006,.3,4); st.rotateZ(Math.cos(a)*.2); st.translate(1.42+Math.cos(a)*.02,1.1,.3+Math.sin(a)*.03); K.add('herb',st); f.translate(1.42+Math.cos(a)*.08,1.25+i*.012,.3+Math.sin(a)*.08); K.add(i%2?'herb2':'rust',f); } }
  // hearth: dressed stone, an arch, a mantel, a pot on the crane
  K.box('istone',.7,1.5,.8,2.0,.75,-3.05,{s:1.5}); K.box('istone',.7,1.5,.8,3.8,.75,-3.05,{s:1.5}); K.box('istone',2.5,.9,.8,2.9,1.86,-3.05,{s:1.5}); K.box('istone',1.1,1.2,.7,2.9,2.7,-3.12,{s:1.5}); K.box('istone',2.9,.1,1.3,2.9,.05,-2.8,{s:1.5}); K.box('dark',1.2,1.5,.5,2.9,.76,-3.26);
  K.log('ilog',2.9,.12,2.9,1.56,-2.66,0,{seg:8}); K.box('iboards',3,.08,.46,2.9,1.46,-2.66,{s:2});
  for(const [x,z,r] of [[2.65,-2.98,.1],[3.12,-2.98,.1],[2.9,-3.1,.09]]) K.log('ilog',.78,r,x,.17+(x===2.9?.15:0),z,x===2.9?.2:(x<2.9?.3:-.3),{seg:7});
  { const p=lathe([[0,0],[.2,.02],[.27,.14],[.25,.3],[.2,.34],[.22,.36]],14); p.translate(2.9,.55,-2.96); K.add('iron',p); K.box('iron',.03,.5,.03,2.9,1.14,-2.96); K.box('iron',.03,.03,.36,2.9,1.38,-3.12); for(const [x,mat,sc] of [[2.2,'crock',1],[2.62,'crock2',.8],[3.3,'brass',.7],[3.66,'crock',.9]]){ const j=lathe([[0,0],[.09*sc,0],[.11*sc,.13*sc],[.07*sc,.24*sc],[.08*sc,.28*sc]],10); j.translate(x,1.5,-2.66); K.add(mat,j); } }
  // shelves and books
  for(const [y,x0] of [[1.55,-.1],[2.1,-.1]]){ K.box('iboards',1.9,.05,.26,x0,y,-3.24,{s:2}); for(const a of [-.8,.8]) K.box('ilog',.04,.1,.2,x0+a,y-.07,-3.24); K.box('books',1.74,.34,.14,x0,y+.2,-3.26); }
  // television set in a wooden cabinet
  K.add('iboards',new RoundedBoxGeometry(1.5,.9,.54,3,.04),-.3,.5,-3.06); K.add('dark',new RoundedBoxGeometry(1.0,.68,.12,3,.05),-.46,.5,-2.78); K.add('glass',new RoundedBoxGeometry(.84,.54,.1,3,.08),-.46,.5,-2.74); for(const y of [.68,.46,.28]){ const b=new THREE.CylinderGeometry(.04,.04,.03,10); b.rotateX(Math.PI/2); b.translate(.26,y,-2.78); K.add('brass',b); }
  // icebox
  K.add('hood',new RoundedBoxGeometry(.92,1.82,.72,4,.08),4.0,.92,1.2); K.box('dark',.86,.018,.02,4.0,1.3,1.57); K.add('chrome',new RoundedBoxGeometry(.04,.34,.06,2,.015),3.62,1.56,1.6); K.add('chrome',new RoundedBoxGeometry(.04,.28,.06,2,.015),3.62,1,1.6);
  // pictures, clock, herbs, a hanging lamp
  const frame=(x,y,z,w,h,ry,mat)=>{ K.box('ilog',w+.14,h+.14,.05,x,y,z,{ry}); const g=new THREE.PlaneGeometry(w,h); g.rotateY(ry); g.translate(x+Math.sin(ry)*.03,y,z+Math.cos(ry)*.03); K.add(mat,g); };
  frame(-4.26,1.95,.9,1.1,.74,Math.PI/2,'pic1'); frame(-4.26,1.85,2.3,.6,.6,Math.PI/2,'pic2'); frame(4.26,1.95,-.6,.9,.6,-Math.PI/2,'pic1');
  { const c=new THREE.CylinderGeometry(.2,.2,.05,18); c.rotateX(Math.PI/2); c.translate(-1.62,2.3,-3.26); K.add('ilog',c); const f=new THREE.CircleGeometry(.17,18); f.translate(-1.62,2.3,-3.23); K.add('wax',f); K.box('dark',.018,.13,.01,-1.62,2.35,-3.225); K.box('dark',.1,.016,.01,-1.58,2.3,-3.225); }
  for(let i=0;i<4;i++){ const x=-2.8+i*.56, st=new THREE.CylinderGeometry(.006,.006,.28,4); st.translate(x,2.9,1.9); K.add('dark',st); for(let k=0;k<9;k++){ const l=new THREE.IcosahedronGeometry(.07,0); l.scale(.6,1.3,.6); l.translate(x+Math.sin(k*2)*.07,2.66+k*.018,1.9+Math.cos(k*2)*.07); K.add(i%2?'herb':'herb2',l); } }
  { const ch=new THREE.CylinderGeometry(.008,.008,.7,4); ch.translate(1,2.86,0); K.add('dark',ch); const sh=lathe([[.34,0],[.32,.04],[.1,.2],[.03,.24]],16); sh.translate(1,2.26,0); K.add('brass',sh); const gl=new THREE.SphereGeometry(.09,10,8); gl.translate(1,2.27,0); K.add('lamp',gl); }
  // windows with curtains
  windowAt(K,-1,1.7,3.3,1.1,1.1,Math.PI); windowAt(K,2,1.7,3.3,1.1,1.1,Math.PI); K.box('door',1.1,2.1,.12,0,1.05,3.32,{s:9}); K.box('brass',.08,.08,.1,-.42,1.02,3.24);
  for(const wx of [-1,2]){ K.log('ilog',1.6,.02,wx,2.42,3.2); for(const sd of [-1,1]){ const g=new THREE.PlaneGeometry(.46,1.5,8,6), p=g.attributes.position; for(let i=0;i<p.count;i++) p.setZ(i,Math.sin(p.getX(i)*30)*.03); g.computeVertexNormals(); g.rotateY(Math.PI); g.translate(wx+sd*.66,1.66,3.17); K.add('curtain',g); } }
  K.bake(G);
  // daylight falling in through the windows, and a live fire
  const dayM=new THREE.ShaderMaterial({ transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, toneMapped:false, fog:false, uniforms:{uK:{value:1}},
    vertexShader:`varying vec2 vQ; void main(){ vQ=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`, fragmentShader:`precision highp float; uniform float uK; varying vec2 vQ; void main(){ vec2 q=abs(vQ-.5)*2.; float a=(1.-smoothstep(.45,1.,q.x))*(1.-smoothstep(.45,1.,q.y)); float cross=smoothstep(.02,.06,abs(vQ.x-.5))*smoothstep(.02,.06,abs(vQ.y-.5)); gl_FragColor=vec4(vec3(1.,.84,.6)*a*cross*.13*uK,1.); }` });
  for(const wx of [-1,2]){ const p=new THREE.Mesh(new THREE.PlaneGeometry(1.5,2.2),dayM); p.rotation.x=-Math.PI/2; p.rotation.z=.32; p.position.set(wx-.5,.02,1.5); p.renderOrder=3; G.add(p); const w=new THREE.Mesh(new THREE.PlaneGeometry(1.04,1.04),dayM); w.position.set(wx,1.7,3.235); w.rotation.y=Math.PI; G.add(w); }
  const flameM=new THREE.ShaderMaterial({ transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, toneMapped:false, fog:false, uniforms:{uT:U.uTime},
    vertexShader:`varying vec2 vQ; void main(){ vQ=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`precision highp float; uniform float uT; varying vec2 vQ; float n(vec2 p){ return sin(p.x*6.+uT*5.+sin(p.y*7.-uT*9.)*1.6)*.5+.5; } void main(){ vec2 q=vQ; float w=.5-abs(q.x-.5); float t=q.y; float h=n(vec2(q.x*2.,t*1.5))*.42+n(vec2(q.x*5.+3.,t*3.))*.28+.3; float f=smoothstep(t,t+.34,h*(.3+w*2.2)); vec3 c=mix(vec3(1.,.28,.05),vec3(1.,.82,.34),smoothstep(.3,.9,f)*(1.-t)); gl_FragColor=vec4(c*f*.5,1.); }` });
  [[0,0],[.1,.6],[-.12,-.6]].forEach(([o,r])=>{ const f=new THREE.Mesh(new THREE.PlaneGeometry(1.05,.95),flameM); f.position.set(2.9+o,.72,-2.92); f.rotation.y=r; f.renderOrder=4; G.add(f); });
  const lamp=new THREE.PointLight(0xffc888,13,18,1.5); lamp.position.set(1,2.1,0); G.add(lamp); const fire=new THREE.PointLight(0xff8840,9,10,1.6); fire.position.set(2.9,.8,-2.2); G.add(fire); G.add(new THREE.AmbientLight(0x7a6858,1.7));
  const cm=G.children.find(c=>c.material===flameM); cm.onBeforeRender=()=>{ const t=performance.now()*.001; fire.intensity=8+Math.sin(t*9)*1.4+Math.sin(t*23)*.9; };
  G.userData.setDay=k=>{ dayM.uniforms.uK.value=k; };
  G.scale.set(1.4,1.25,1.4); G.visible=false; scene.add(G); G.userData.spots={bed:{x:-4.3,z:-.6},tv:{x:-.4,z:-3.4},door:{x:0,z:3.8},fridge:{x:4.6,z:1.7},stove:{x:4,z:-2.9}}; return G;
}

/* the lighthouse on its skerry, with a keeper's hut and a slow beam after dark */
let beam=null;
export function buildLighthouse(world,x,z){
  mats(); const K=new Kit(), G=new THREE.Group(), base=terrainH(x,z);
  const seg=(y0,y1,r0,r1,mat)=>{ const g=new THREE.CylinderGeometry(r1,r0,y1-y0,14,1,false); g.translate(0,(y0+y1)/2,0); K.add(mat,g); };
  seg(0,1.2,2.6,2.3,'stone'); [[1.2,4.4,'cream'],[4.4,7.2,'red'],[7.2,10.4,'cream'],[10.4,13.2,'red']].forEach(([a,c,m],i)=>seg(a,c,2-i*.28,2-(i+1)*.28,m));
  seg(13.2,13.5,1.7,1.7,'trim'); seg(13.5,15,.86,.86,'glass'); seg(15,15.3,1.05,1.05,'trim'); const c=new THREE.ConeGeometry(1,1.2,12); c.translate(0,15.9,0); K.add('red',c);
  for(let i=0;i<8;i++){ const a=i/8*6.283; K.post('iron',.03,.8,Math.cos(a)*1.6,13.5,Math.sin(a)*1.6); } [-.9,.9].forEach(()=>{}); K.box('door',.9,1.8,.2,0,.9+1.1,2.18);
  windowAt(K,0,6.2,1.62,.5,.7); windowAt(K,0,10.2,1.32,.5,.7);
  K.bake(G); G.position.set(x,base,z); world.add(G); addObstacle(x,z,2.8);
  logHouse({world,x:x+7.5,z:z+2,w:4.6,d:3.6,h:2.1,rh:1.5,porch:false,chimney:true,roof:'shingle',wins:1,ry:0});
  const m=new THREE.MeshBasicMaterial({color:0xfff0c0,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false,fog:false});
  const g=new THREE.ConeGeometry(16,120,16,1,true); g.translate(0,-60,0); g.rotateX(-Math.PI/2+.0); beam=new THREE.Mesh(g,m); beam.position.set(x,base+14.2,z); beam.frustumCulled=false; world.add(beam);
  const lamp=new THREE.PointLight(0xffe0a0,0,70,1.6); lamp.position.set(x,base+14.4,z); world.add(lamp); nightLamps.push({l:lamp,i:40});
}

/* ---------- the lived-in valley: what people leave lying about ---------- */
const glows=[]; let glowPts=null, poolMesh=null;
function addGlow(x,y,z,s){ glows.push([x,y,z,s]); }
export function barrel(K,x,y,z,r=.42,h=1){ const pts=[]; for(let i=0;i<=8;i++){ const t=i/8; pts.push(new THREE.Vector2(r*(.82+.18*Math.sin(t*Math.PI)),t*h)); } const g=new THREE.LatheGeometry(pts,14); g.translate(x,y,z); K.add('boards',g); for(const q of [.18,.82]){ const t=new THREE.TorusGeometry(r*(.82+.18*Math.sin(q*Math.PI))+.006,.018,5,18); t.rotateX(Math.PI/2); t.translate(x,y+h*q,z); K.add('iron',t); } const c=new THREE.CircleGeometry(r*.8,14); c.rotateX(-Math.PI/2); c.translate(x,y+h-.03,z); K.add('deck',c); }
function crate(K,x,y,z,s=.8,ry=0){ K.box('boards',s,s*.8,s,x,y+s*.4,z,{ry,s:1.4}); const c=Math.cos(ry), n=Math.sin(ry); for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,1]]) K.box('trim',.07,s*.84,.07,x+(a*c+b*n)*s*.5,y+s*.42,z+(-a*n+b*c)*s*.5,{ry}); K.box('trim',s+.1,.06,.07,x+n*s*.5,y+s*.78,z+c*s*.5,{ry}); K.box('trim',s+.1,.06,.07,x-n*s*.5,y+s*.78,z-c*s*.5,{ry}); }
function sack(K,x,y,z,mat='sack'){ const g=new THREE.SphereGeometry(.34,10,8); const p=g.attributes.position; for(let i=0;i<p.count;i++){ const yy=p.getY(i); p.setXYZ(i,p.getX(i)*(1-yy*.5),yy*1.3,p.getZ(i)*(.8-yy*.4)); } g.computeVertexNormals(); g.translate(x,y+.36,z); K.add(mat,g); const n=new THREE.CylinderGeometry(.05,.1,.12,8); n.translate(x,y+.78,z); K.add(mat,n); }
function woodpile(K,x,y,z,ry=0,rows=4){ const L=1.5, r=.13; for(let j=0;j<rows;j++) for(let i=0;i<rows+2-j;i++){ const off=(i-(rows+1-j)/2)*r*2.05, q=[x+Math.cos(ry)*off,y+r+j*r*1.76,z-Math.sin(ry)*off]; K.log('log',L,r,q[0],q[1],q[2],ry+Math.PI/2,{seg:7}); for(const e of [-1,1]){ const c=new THREE.CircleGeometry(r*.93,8); c.rotateY(e>0?0:Math.PI); c.rotateY(ry); c.translate(q[0]+Math.sin(ry)*e*L/2,q[1],q[2]+Math.cos(ry)*e*L/2); K.add('frame',c); } } }
function lampPost(K,x,z){ const y=terrainH(x,z); K.post('log',.08,2.9,x,y-.05,z); K.box('trim',.46,.05,.05,x+.18,y+2.72,z); K.box('iron',.05,.2,.05,x+.36,y+2.6,z); K.box('iron',.27,.03,.27,x+.36,y+2.5,z); K.box('lantern',.19,.24,.19,x+.36,y+2.36,z); K.box('iron',.27,.03,.27,x+.36,y+2.22,z); const c=new THREE.ConeGeometry(.2,.13,4); c.rotateY(Math.PI/4); c.translate(x+.36,y+2.58,z); K.add('iron',c); addGlow(x+.36,y+2.36,z,4.2); addObstacle(x,z,.22); }
function bench(K,x,z,ry=0){ const y=terrainH(x,z), c=Math.cos(ry), s=Math.sin(ry), P=(a,b)=>[x+a*c+b*s,z-a*s+b*c]; for(const a of [-.8,.8]) for(const b of [-.17,.17]){ const [px,pz]=P(a,b); K.post('log',.04,.44,px,y,pz); } for(const b of [-.14,0,.14]){ const [px,pz]=P(0,b); K.box('deck',1.9,.05,.12,px,y+.46,pz,{ry,s:2}); } for(const h of [.66,.82]){ const [px,pz]=P(0,-.22); K.box('deck',1.9,.09,.04,px,y+h,pz,{ry,s:2}); } addObstacle(x,z,.8); }
function well(K,x,z){ const y=terrainH(x,z), pts=[[.74,0],[.8,.05],[.8,.82],[.74,.9],[.62,.9],[.6,.1]].map(p=>new THREE.Vector2(p[0],p[1])), g=new THREE.LatheGeometry(pts,16); g.translate(x,y,z); K.add('stone',g); const w=new THREE.CircleGeometry(.6,16); w.rotateX(-Math.PI/2); w.translate(x,y+.3,z); K.add('dark',w);
  for(const a of [-.86,.86]) K.post('log',.08,2.1,x+a,y,z); K.log('log',1.9,.06,x,y+1.72,z); const t=new THREE.CylinderGeometry(.015,.015,.8,5); t.translate(x,y+1.32,z); K.add('dark',t); barrel(K,x,y+.76,z,.16,.24);
  [-1,1].forEach(s=>{ const r=new THREE.BoxGeometry(2.4,.07,1.1); r.rotateX(s*.62); r.translate(x,y+2.26,z+s*.42); K.add('shingle',r); }); addObstacle(x,z,1.05); }
function flowerBox(K,x,y,z,w=1.1){ K.box('trim',w,.16,.24,x,y,z); const cols=['pink','yellow','blue','cream']; for(let i=0;i<7;i++){ const ox=(i/6-.5)*(w-.12), s=new THREE.IcosahedronGeometry(.075+(i%3)*.012,1); s.translate(x+ox,y+.17+(i%2)*.06,z+(i%3-1)*.05); K.add(cols[i%4],s); const l=new THREE.IcosahedronGeometry(.09,0); l.translate(x+ox+.03,y+.1,z-.02); K.add('leaf',l); } }
function hayBale(K,x,y,z,ry){ const g=new THREE.CylinderGeometry(.62,.62,1.05,12,1); g.rotateZ(Math.PI/2); g.rotateY(ry); g.translate(x,y+.62,z); K.add('hay',g); for(const q of [-.3,.3]){ const t=new THREE.TorusGeometry(.625,.012,4,16); t.rotateY(Math.PI/2+ry); t.translate(x+Math.cos(ry)*q,y+.62,z-Math.sin(ry)*q); K.add('trim',t); } addObstacle(x,z,.8); }
function cart(K,x,z,ry){ const y=terrainH(x,z); K.box('boards',1.8,.1,1.1,x,y+.62,z,{ry,s:1.6}); K.box('boards',1.8,.34,.06,x-Math.sin(ry)*.54,y+.82,z-Math.cos(ry)*.54,{ry,s:1.6}); K.box('boards',1.8,.34,.06,x+Math.sin(ry)*.54,y+.82,z+Math.cos(ry)*.54,{ry,s:1.6}); for(const s of [-1,1]){ const t=new THREE.TorusGeometry(.42,.04,6,16); t.rotateY(ry); t.translate(x+Math.sin(ry)*s*.66,y+.42,z+Math.cos(ry)*s*.66); K.add('trim',t); for(let i=0;i<4;i++){ const b=new THREE.CylinderGeometry(.02,.02,.84,5); b.rotateZ(i/4*Math.PI); b.rotateY(ry); b.translate(x+Math.sin(ry)*s*.66,y+.42,z+Math.cos(ry)*s*.66); K.add('trim',b); } } K.log('log',1.5,.035,x+Math.cos(ry)*1.5,y+.4,z-Math.sin(ry)*1.5,ry); for(let i=0;i<3;i++) sack(K,x+(i-1)*.5*Math.cos(ry),y+.67,z-(i-1)*.5*Math.sin(ry)); addObstacle(x,z,1.2); }
function clothesLine(K,x,z,ry=0){ const y=terrainH(x,z), c=Math.cos(ry), s=Math.sin(ry), L=3.2; K.post('log',.05,2,x-c*L/2,y,z+s*L/2); K.post('log',.05,2,x+c*L/2,y,z-s*L/2); const r=new THREE.CylinderGeometry(.008,.008,L,4); r.rotateZ(Math.PI/2); r.rotateY(ry); r.translate(x,y+1.9,z); K.add('dark',r); for(let i=0;i<4;i++){ const t=(i+.5)/4-.5, h=.7+(i%2)*.2; const g=new THREE.PlaneGeometry(.52,h,4,4); const p=g.attributes.position; for(let k=0;k<p.count;k++) p.setZ(k,Math.sin(p.getX(k)*7+i)*.04+(.5-p.getY(k)/h)*.06); g.computeVertexNormals(); g.rotateY(ry); g.translate(x+c*L*t,y+1.9-h/2,z-s*L*t); K.add(i%2?'cloth2':'cloth',g); } }
function netRack(K,x,z,ry=0){ const y=terrainH(x,z), c=Math.cos(ry), s=Math.sin(ry); K.post('log',.05,1.9,x-c*1.2,y,z+s*1.2); K.post('log',.05,1.9,x+c*1.2,y,z-s*1.2); K.log('log',2.6,.035,x,y+1.85,z,ry); const g=new THREE.PlaneGeometry(2.2,1.25,8,6), p=g.attributes.position; for(let k=0;k<p.count;k++) p.setZ(k,Math.sin(p.getX(k)*2.4)*.08*(1-(p.getY(k)+.6))); g.computeVertexNormals(); g.rotateY(ry); g.translate(x,y+1.2,z); K.add('net',g); addObstacle(x,z,.4); }
function stepStones(K,pts,n){ for(let i=0;i<n;i++){ const t=i/n, a=pts[0], b=pts[1], x=a[0]+(b[0]-a[0])*t+Math.sin(i*2.1)*.45, z=a[1]+(b[1]-a[1])*t+Math.cos(i*1.7)*.45, g=new THREE.CylinderGeometry(.32+((i*3)%4)*.05,.38+((i*3)%4)*.05,.1,7); g.rotateY(i); g.scale(1,1,.8); wuv(g,5); g.translate(x,terrainH(x,z)+.02,z); K.add('stone',g); } }
export function dressValley(world,town){
  mats(); M.net=toonOf({color:0xc8bea0,side:THREE.DoubleSide,alphaTest:.5,alphaMap:(()=>{ const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'); x.fillStyle='#000'; x.fillRect(0,0,64,64); x.strokeStyle='#fff'; x.lineWidth=2; for(let i=0;i<64;i+=10){ x.beginPath(); x.moveTo(i,0); x.lineTo(i+20,64); x.moveTo(i+20,0); x.lineTo(i,64); x.stroke(); } const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(3,2); return t; })()});
  const K=new Kit(), G=new THREE.Group();
  const b=Object.fromEntries(town.map(t=>[t.id,t])), yy=(x,z)=>terrainH(x,z), front=t=>t.z+t.d/2;
  const barrels=(x,z,n=2)=>{ for(let i=0;i<n;i++){ const px=x+[0,.85,.42][i], pz=z+[0,.1,.72][i]; barrel(K,px,yy(px,pz),pz); } addObstacle(x+.4,z+.3,.9); };
  // general store: produce out front
  { const s=b.store, f=front(s); crate(K,s.x-s.w/2+.7,yy(s.x-3,f+.8),f+.8,.9,.2); crate(K,s.x-s.w/2+1.2,yy(s.x-3,f+.8)+.72,f+.8,.62,.7); sack(K,s.x+s.w/2-.6,yy(s.x+3,f+.8),f+.7); sack(K,s.x+s.w/2-1.1,yy(s.x+3,f+.8),f+.9); addObstacle(s.x-s.w/2+.9,f+.8,.8); addObstacle(s.x+s.w/2-.8,f+.8,.7); flowerBox(K,s.x-s.w*.3,yy(s.x,f)+1,f+.14); flowerBox(K,s.x+s.w*.3,yy(s.x,f)+1,f+.14); }
  { const s=b.smith, f=front(s); woodpile(K,s.x+s.w/2+.9,yy(s.x+4,s.z),s.z+.4,Math.PI/2,4); addObstacle(s.x+s.w/2+.9,s.z+.4,1.1); barrels(s.x-s.w/2+.4,f+.8,1); crate(K,s.x+s.w/2-.7,yy(s.x,f),f+.9,.7,.4); addObstacle(s.x+s.w/2-.7,f+.9,.6); }
  { const s=b.saloon, f=front(s); barrels(s.x-s.w/2+.3,f+.9,3); barrels(s.x+s.w/2-1.1,f+.9,2); bench(K,s.x-1.9,f+1.2,0); flowerBox(K,s.x-s.w*.3,yy(s.x,f)+1,f+.14); flowerBox(K,s.x+s.w*.3,yy(s.x,f)+1,f+.14); }
  { const s=b.cc, f=front(s); bench(K,s.x-3.2,f+1.5); bench(K,s.x+3.2,f+1.5); flowerBox(K,s.x-s.w*.3,yy(s.x,f)+1,f+.14,1.5); flowerBox(K,s.x+s.w*.3,yy(s.x,f)+1,f+.14,1.5); }
  { const s=b.museum, f=front(s); bench(K,s.x+3,f+1.4); flowerBox(K,s.x-s.w*.3,yy(s.x,f)+1,f+.14); }
  { const s=b.clinic, f=front(s); bench(K,s.x-2.4,f+1.2); flowerBox(K,s.x+s.w*.3,yy(s.x,f)+1,f+.14); flowerBox(K,s.x-s.w*.3,yy(s.x,f)+1,f+.14); }
  { const s=b.carpenter, f=front(s); woodpile(K,s.x-s.w/2-1.1,yy(s.x-4,s.z),s.z+.6,Math.PI/2,5); addObstacle(s.x-s.w/2-1.1,s.z+.6,1.2); woodpile(K,s.x+s.w/2-.8,yy(s.x,f),f+1.1,0,3); addObstacle(s.x+s.w/2-.8,f+1.1,1); }
  { const s=b.ranch, f=front(s); hayBale(K,s.x+s.w/2+1,yy(s.x+4,f),f-1,.4); hayBale(K,s.x+s.w/2+1.2,yy(s.x+4,f),f+.8,1.3); cart(K,s.x-s.w/2-1.6,f+1,.5); barrels(s.x+s.w/2-1,f+1,1); }
  { const s=b.fishshop, f=front(s); netRack(K,s.x-s.w/2-1.6,s.z+1,Math.PI/2); barrels(s.x+s.w/2-.9,f+.9,2); crate(K,s.x-s.w/2+.8,yy(s.x,f),f+.8,.7,.5); addObstacle(s.x-s.w/2+.8,f+.8,.6); }
  well(K,44,-27.5); bench(K,38,-20.5,Math.PI); cart(K,70,-20,2.4);
  clothesLine(K,-10,-14,0); woodpile(K,7.4,yy(7.4,-18.5),-18.5,Math.PI/2,5); addObstacle(7.4,-18.5,1.2); barrels(-6.6,-12.2,1); flowerBox(K,-2.8,yy(-2.8,-13)+1.02,-12.86); flowerBox(K,2.8,yy(2.8,-13)+1.02,-12.86);
  stepStones(K,[[34,-24],[36,-34]],7); stepStones(K,[[-13,4],[-30,8]],11);
  // lamps along the paths through town and down to the water
  let n=0; for(const seg of PATHS.slice(1,11)) for(let i=0;i<seg.length-1;i++){ const a=seg[i], c=seg[i+1], l=Math.hypot(c[0]-a[0],c[1]-a[1]), m=Math.floor(l/11); for(let j=1;j<=m;j++){ const t=j/(m+1), nx=-(c[1]-a[1])/l, nz=(c[0]-a[0])/l, sd=(n++%2)*2-1; lampPost(K,a[0]+(c[0]-a[0])*t+nx*sd*2.4,a[1]+(c[1]-a[1])*t+nz*sd*2.4); } }
  lampPost(K,3.2,-9.5); lampPost(K,-3.2,-9.5); lampPost(K,13,22); lampPost(K,38,-29);
  K.bake(G); world.add(G); buildGlows(world);
}
function buildGlows(world){
  const g=new THREE.BufferGeometry(), P=new Float32Array(glows.length*3), S=new Float32Array(glows.length); glows.forEach((q,i)=>{ P.set(q.slice(0,3),i*3); S[i]=q[3]; }); g.setAttribute('position',new THREE.BufferAttribute(P,3)); g.setAttribute('aS',new THREE.BufferAttribute(S,1));
  const m=new THREE.ShaderMaterial({ transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false, toneMapped:false, uniforms:{ uK:{value:0} },
    vertexShader:`attribute float aS; void main(){ vec4 mv=viewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=min(240.,aS*520./max(-mv.z,1.)); }`,
    fragmentShader:`precision highp float; uniform float uK; void main(){ float r=length(gl_PointCoord-.5)*2.; float a=pow(max(1.-r,0.),2.2)*uK; if(a<.004) discard; gl_FragColor=vec4(vec3(1.,.72,.38)*a,1.); }` });
  glowPts=new THREE.Points(g,m); glowPts.frustumCulled=false; glowPts.layers.set(1); world.add(glowPts);
  // pools of light on the ground under the lamps
  const lamps=glows.filter(q=>q[3]>3.5), pg=new THREE.CircleGeometry(1,20); pg.rotateX(-Math.PI/2); const pm=new THREE.ShaderMaterial({ transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false, toneMapped:false, polygonOffset:true, polygonOffsetFactor:-2, uniforms:{ uK:{value:0} },
    vertexShader:`varying vec2 vQ; void main(){ vQ=position.xz; gl_Position=projectionMatrix*viewMatrix*instanceMatrix*vec4(position,1.); }`, fragmentShader:`precision highp float; uniform float uK; varying vec2 vQ; void main(){ float a=pow(max(1.-length(vQ),0.),1.7)*uK*.34; gl_FragColor=vec4(vec3(1.,.66,.32)*a,1.); }` });
  poolMesh=new THREE.InstancedMesh(pg,pm,lamps.length); const o=new THREE.Object3D(); lamps.forEach((q,i)=>{ o.position.set(q[0],terrainH(q[0],q[2])+.06,q[2]); o.scale.set(5.2,1,5.2); o.updateMatrix(); poolMesh.setMatrixAt(i,o.matrix); }); poolMesh.frustumCulled=false; poolMesh.layers.set(1); world.add(poolMesh);
}

/* lights that wake at dusk, window glass, chimney smoke */
const smokes=[]; let puffs=null;
export function addSmoke(p){ if(p) smokes.push(p); }
export function buildSmoke(world){
  const N=26, g=new THREE.BufferGeometry(), pos=new Float32Array(N*3);
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const c=document.createElement('canvas'); c.width=c.height=48; const x=c.getContext('2d'), r=x.createRadialGradient(24,24,3,24,24,23); r.addColorStop(0,'rgba(255,255,255,.75)'); r.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=r; x.fillRect(0,0,48,48);
  const m=new THREE.PointsMaterial({color:0xd8d4d0,size:2.2,map:new THREE.CanvasTexture(c),transparent:true,opacity:.34,depthWrite:false});
  puffs=new THREE.Points(g,m); puffs.frustumCulled=false; puffs.userData.t=Array.from({length:N},(_,i)=>i/N); world.add(puffs);
}
export function updateBuildings(t,dt,night,dusk){
  const k=Math.min(1,night+dusk); if(M.glass) M.glass.color.setRGB(lerp(.13,1,k),lerp(.17,.72,k),lerp(.22,.34,k),THREE.SRGBColorSpace);
  for(const l of nightLamps) l.l.intensity=l.i*k;
  if(M.lantern) M.lantern.color.setRGB(lerp(.1,1,k),lerp(.07,.74,k),lerp(.05,.36,k),THREE.SRGBColorSpace); if(glowPts) glowPts.material.uniforms.uK.value=k; if(poolMesh) poolMesh.material.uniforms.uK.value=k;
  if(beam){ beam.rotation.y=t*.32; beam.material.opacity=.075*k; }
  if(puffs&&smokes.length){ const p=puffs.geometry.attributes.position, T=puffs.userData.t;
    for(let i=0;i<T.length;i++){ T[i]+=dt*.09; if(T[i]>1) T[i]-=1; const s=smokes[i%smokes.length], q=T[i]; p.setXYZ(i,s.x+Math.sin(q*6+i)*.5*q+q*3,s.y+q*9,s.z+Math.cos(q*5+i)*.4*q); }
    p.needsUpdate=true; }
}
