/* Log cabins, the dock, the rowboat and other built things: real joinery in low-poly,
   surfaced with the painted tiles so they sit in the same picture as the trees. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toonOf, TEX, terrainH, lakeField, WATER_Y, addBoxObstacle, addObstacle, DOCK } from './scenery.js';

const M={};
function mats(){
  if(M.log) return;
  const tile=t=>{ t.wrapS=t.wrapT=THREE.RepeatWrapping; t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=8; return t; };
  M.log=toonOf({map:tile(TEX.surf_log)}); M.boards=toonOf({map:tile(TEX.surf_boards),side:THREE.DoubleSide}); M.shingle=toonOf({map:tile(TEX.surf_shingle)}); M.stone=toonOf({map:tile(TEX.surf_stone)});
  M.deck=toonOf({map:TEX.surf_boards,color:0xc8b8a0}); M.dark=toonOf({color:0x241b17}); M.trim=toonOf({color:0x3b2a20}); M.frame=toonOf({color:0xd8c8a4});
  M.door=toonOf({color:0x74702e}); M.rust=toonOf({color:0x8c4a2c}); M.moss=toonOf({color:0x5c6a34}); M.white=toonOf({map:TEX.surf_boards,color:0xf4efe2,side:THREE.DoubleSide}); M.green=toonOf({color:0x38584a});
  M.cream=toonOf({color:0xe8dcc0}); M.red=toonOf({color:0xa8402e}); M.iron=toonOf({color:0x3a3c42});
  M.glass=new THREE.MeshBasicMaterial({color:0x334050,toneMapped:false,fog:false});
  M.lamp=new THREE.MeshBasicMaterial({color:0xffc870,toneMapped:false,fog:false});
}

// world-scale UVs: picks the plane a face lies in, so tiles keep their size on any surface
function wuv(g,s){ const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){ const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));
    if(ay>=ax&&ay>=az) uv.setXY(i,p.getX(i)/s,p.getZ(i)/s); else if(ax>az) uv.setXY(i,p.getZ(i)/s,p.getY(i)/s); else uv.setXY(i,p.getX(i)/s,p.getY(i)/s); }
  return g; }
class Kit{
  constructor(){ this.parts={}; }
  add(mat,g,px=0,py=0,pz=0,rx=0,ry=0,rz=0){ if(rx) g.rotateX(rx); if(ry) g.rotateY(ry); if(rz) g.rotateZ(rz); g.translate(px,py,pz); (this.parts[mat]=this.parts[mat]||[]).push(g.index?g.toNonIndexed():g); return this; }
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
  G.userData.smoke=chimney?new THREE.Vector3(x-w/2-.31,terrainH(x,z)+h+rh+2.5,z-d*.16):null;
  if(o.world) o.world.add(G);
  const hx=(Math.abs(Math.sin(ry))>.5?d:w)/2+.3, hz=(Math.abs(Math.sin(ry))>.5?w:d)/2+.3;
  addBoxObstacle(x,z,hx,hz);
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
  const glow=new THREE.SphereGeometry(.12,8,6); glow.translate(w/2+.8,y+1.62,z1+1.7); K.add('lamp',glow); K.box('iron',.16,.04,.16,w/2+.8,y+1.77,z1+1.7);
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

/* villagers: toy-proportioned, one hat or hair each */
export function makeVillager(col,style=0){
  mats(); const G=new THREE.Group(), cloth=toonOf({color:col}), skin=toonOf({color:0xeec7a0}), dark=toonOf({color:[0x4a3324,0x2c2c34,0xa86a3c,0x8c8c90][style%4]});
  const add=(g,m,x=0,y=0,z=0)=>{ const o=new THREE.Mesh(g,m); o.position.set(x,y,z); o.castShadow=true; G.add(o); return o; };
  add(new THREE.CylinderGeometry(.2,.36,.86,10),cloth,0,.84); add(new THREE.CapsuleGeometry(.09,.32,3,6),dark,-.13,.26); add(new THREE.CapsuleGeometry(.09,.32,3,6),dark,.13,.26);
  [-1,1].forEach(s=>{ const a=add(new THREE.CapsuleGeometry(.07,.42,3,6),cloth,s*.3,.92); a.rotation.z=s*.16; add(new THREE.SphereGeometry(.07,6,5),skin,s*.35,.66); });
  add(new THREE.SphereGeometry(.26,14,10),skin,0,1.52);
  if(style%4===0) add(new THREE.SphereGeometry(.28,12,8,0,6.3,0,1.7),dark,0,1.56);
  if(style%4===1){ add(new THREE.CylinderGeometry(.46,.46,.03,14),dark,0,1.68); add(new THREE.CylinderGeometry(.24,.27,.2,12),dark,0,1.78); }
  if(style%4===2){ add(new THREE.SphereGeometry(.28,12,8,0,6.3,0,1.6),dark,0,1.56); add(new THREE.SphereGeometry(.15,8,6),dark,0,1.44).position.z=-.24; }
  if(style%4===3){ add(new THREE.SphereGeometry(.275,12,8,0,6.3,0,1.3),cloth,0,1.58); const b=add(new THREE.SphereGeometry(.2,8,6),dark,0,1.36); b.position.z=.17; b.scale.set(1,1.3,.6); }
  [-1,1].forEach(s=>add(new THREE.SphereGeometry(.03,5,4),M.dark,s*.1,1.54,.24));
  return G;
}

/* lights that wake at dusk, window glass, chimney smoke */
const nightLamps=[]; const smokes=[]; let puffs=null;
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
  if(puffs&&smokes.length){ const p=puffs.geometry.attributes.position, T=puffs.userData.t;
    for(let i=0;i<T.length;i++){ T[i]+=dt*.09; if(T[i]>1) T[i]-=1; const s=smokes[i%smokes.length], q=T[i]; p.setXYZ(i,s.x+Math.sin(q*6+i)*.5*q+q*3,s.y+q*9,s.z+Math.cos(q*5+i)*.4*q); }
    p.needsUpdate=true; }
}
