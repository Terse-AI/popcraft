/* The mine. One continuous cave shell instead of a floor and a wall: rock runs up from the floor into
   strata and over into the dark, lit by lanterns whose warmth is baked into the stone. Three depths share
   the shape and differ in stone, crystal and light. Ore, geodes and monsters are modelled here too. */
import * as THREE from 'three';
import { TEX, U, toonOf, vnoise } from './scenery.js';
import { Kit, buildMats, BM } from './buildings.js';
import { loft } from './creatures.js';

const tau=Math.PI*2, lerp=(a,b,t)=>a+(b-a)*t, clamp=(v,a,b)=>v<a?a:v>b?b:v;
const THEMES=[
 {s:0x1a1412,m:0x4e3f36,h:0x9a8470,glow:0xffb060,cry:0xffb45a,cry2:0xe88a3a,lava:0,ice:0},
 {s:0x0e1826,m:0x34506e,h:0x9cc0d8,glow:0x9fd8ff,cry:0x8fe4ff,cry2:0x5ab0e8,lava:0,ice:1},
 {s:0x140808,m:0x4a2018,h:0x8e4a30,glow:0xff7030,cry:0xff6a2a,cry2:0xffb040,lava:1,ice:0}];
const u={ uCS:{value:new THREE.Color()}, uCM:{value:new THREE.Color()}, uCH:{value:new THREE.Color()}, uGlowC:{value:new THREE.Color()}, uLava:{value:0}, uIce:{value:0}, uDetail:{value:null}, uBits:{value:null}, uTimeC:U.uTime };
const n3=(x,y,z)=>(vnoise(x+z*.7,y-z*.4)+vnoise(y*1.3+5,z*1.3-x*.5))*.5;

const STONE_V=`varying vec3 vWP,vWN; varying float vGlow; attribute float aGlow;\n`;
function stoneMat(opts={}){
  const m=new THREE.MeshLambertMaterial({color:0xffffff,...opts});
  m.onBeforeCompile=sh=>{ Object.assign(sh.uniforms,u);
    sh.vertexShader=STONE_V+sh.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      { vec4 wq=vec4(transformed,1.); vec3 wn=objectNormal; 
      #ifdef USE_INSTANCING
       wq=instanceMatrix*wq; wn=mat3(instanceMatrix)*wn;
      #endif
      vWP=(modelMatrix*wq).xyz; vWN=normalize(mat3(modelMatrix)*wn); vGlow=aGlow; }`);
    sh.fragmentShader=`varying vec3 vWP,vWN; varying float vGlow; uniform vec3 uCS,uCM,uCH,uGlowC; uniform float uLava,uIce,uTimeC; uniform sampler2D uDetail,uBits;\n`+sh.fragmentShader
     .replace('#include <map_fragment>',`
      vec3 wn0=normalize(vWN); float ang=atan(vWP.z,vWP.x), wall=smoothstep(.45,.75,1.-abs(wn0.y)); vec2 duv=abs(wn0.y)>.62?vWP.xz:vec2(ang*17.,vWP.y);
      vec3 cd1=texture2D(uDetail,duv*.085).rgb, cd2=texture2D(uDetail,duv*.27+.3).rgb, cd3=texture2D(uDetail,duv*.93+.11).rgb;
      float crack=(cd1.b-.5)*.9+(cd2.b-.5)*.7+(cd3.b-.5)*.4;
      float strata=sin(vWP.y*2.6+sin(ang*5.)*1.6+cd1.b*5.)*.5+.5;
      float v=.44+crack*.8+(smoothstep(.55,.95,strata)-.3)*.2*wall;
      vec3 c=v<.5?mix(uCS,uCM,clamp(v*2.,0.,1.)):mix(uCM,uCH,clamp(v*2.-1.,0.,1.));
      float flr=1.-wall; vec3 bt=texture2D(uBits,vWP.xz/4.1).rgb; float pb=bt.g*flr*smoothstep(.42,.6,cd1.b); c=mix(c,mix(uCM,uCH,bt.r*1.1),pb*.8);
      float wet=smoothstep(.5,.66,cd1.g*.7+cd2.r*.34)*flr; c*=1.-wet*.42;
      diffuseColor.rgb*=c;`)
     .replace('#include <normal_fragment_maps>',`{ vec2 q=(cd1.rg-.5)*1.5+(cd2.rg-.5)*.95+(cd3.rg-.5)*.45; normal=normalize(mat3(viewMatrix)*normalize(wn0+vec3(q.x,q.y*.4,q.y))); }`)
     .replace('#include <opaque_fragment>',`
      outgoingLight+=diffuseColor.rgb*uGlowC*vGlow*1.9;
      if(uLava>.5){ float cr=smoothstep(.1,.02,abs(cd1.b-.46)+abs(cd2.b-.5)*.32)*flr; float p=.72+.28*sin(uTimeC*1.7+vWP.x*.7+vWP.z*.5); outgoingLight+=vec3(1.,.36,.08)*cr*p*1.5; }
      if(uIce>.5){ float g=pow(max(dot(reflect(normalize(vWP-cameraPosition),normal*mat3(viewMatrix)),vec3(0.,1.,0.)),0.),12.); outgoingLight+=vec3(.5,.74,.95)*g*.14*flr; }
      #include <opaque_fragment>`); };
  return m;
}
function shell(){
  const N=220, M=86, P=[], G=[], I=[], lanterns=[]; for(let i=0;i<6;i++){ const a=i/6*tau+.3; lanterns.push([Math.cos(a)*15.5,4,Math.sin(a)*15.5]); }
  for(let a=0;a<=N;a++) for(let j=0;j<=M;j++){ const t=j/M, ang=a/N*tau, ca=Math.cos(ang), sa=Math.sin(ang); let r,y;
    if(t<.55){ r=18*t/.55; y=0; } else { const q=(t-.55)/.45, ph=q*Math.PI*.9; r=18+Math.sin(ph)*3.6-Math.pow(q,2.4)*16; y=Math.pow(q,.8)*12.5; }
    const X=ca*18, Z=sa*18, up=Math.min(1,y/2), rip=n3(X*.09+ang*.0,y*.09,Z*.09), det=n3(X*.34,y*.3,Z*.34), fine=n3(X*1.1,y*1.2,Z*1.1), cols=Math.abs(Math.sin(ang*17+y*.3+rip*7))*.8;
    if(t>=.55){ r+=(rip-.5)*7*up+(det-.5)*2.4*up+(fine-.5)*.7*up-cols*up; r=Math.max(r,y<2?17.5:1); y+=(det-.5)*.8*up; } else if(r>9){ y=(det-.5)*.16*(r-9)/9+(fine-.5)*.06; }
    const x=ca*r, z=sa*r; P.push(x,y,z); let g=0; for(const l of lanterns){ const dx=x-l[0], dy=y-l[1], dz=z-l[2]; g+=Math.exp(-(dx*dx+dy*dy+dz*dz)/34); } G.push(Math.min(1.3,g)); }
  for(let a=0;a<N;a++) for(let j=0;j<M;j++){ const p=a*(M+1)+j, q=p+M+1; I.push(p,q,p+1,q,q+1,p+1); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('aGlow',new THREE.Float32BufferAttribute(G,1)); g.setIndex(I); g.computeVertexNormals(); return g;
}
function spike(seed,sides=9,rows=8){ const P=[], I=[]; for(let j=0;j<=rows;j++){ const t=j/rows, r=Math.pow(1-t,1.5)*.5+.012; for(let i=0;i<sides;i++){ const a=i/sides*tau, k=1+(n3(Math.cos(a)*1.5+seed,t*4,Math.sin(a)*1.5)-.5)*.8; P.push(Math.cos(a)*r*k+Math.sin(t*5+seed)*.04,t,Math.sin(a)*r*k); } } for(let j=0;j<rows;j++) for(let i=0;i<sides;i++){ const a=j*sides+i, b=j*sides+(i+1)%sides, c=a+sides, d=b+sides; I.push(a,c,b,b,c,d); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('aGlow',new THREE.Float32BufferAttribute(new Float32Array(P.length/3),1)); g.setIndex(I); g.computeVertexNormals(); return g; }
function crystalGeo(){ const P=[], I=[], s=6, h=[[0,.17],[.72,.22],[1,0]]; h.forEach(([y,r])=>{ for(let i=0;i<s;i++){ const a=i/s*tau; P.push(Math.cos(a)*r,y,Math.sin(a)*r); } }); for(let j=0;j<2;j++) for(let i=0;i<s;i++){ const a=j*s+i, b=j*s+(i+1)%s, c=a+s, d=b+s; I.push(a,c,b,b,c,d); } const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setIndex(I); const q=g.toNonIndexed(); q.computeVertexNormals(); return q; }
const CRY=crystalGeo();
function crystalMat(col,emi=.55){ return toonOf({color:col,emissive:col,emissiveIntensity:emi}); }

let crystal=null, crystal2=null, glowPts=null, dust=null;
export function buildCave(group){
  buildMats(); u.uDetail.value=TEX.mt_detail; u.uBits.value=TEX.ground_bits;
  const stone=stoneMat(), cave=new THREE.Mesh(shell(),stone); cave.receiveShadow=true; cave.frustumCulled=false; group.add(cave);
  const o=new THREE.Object3D(), seeded=(i)=>{ const x=Math.sin(i*12.9898)*43758.5453; return x-Math.floor(x); };
  // hanging stone, and stone rising to meet it
  for(const [count,down,geoSeed] of [[70,true,1],[70,true,4],[46,false,2],[46,false,6]]){ const im=new THREE.InstancedMesh(spike(geoSeed),stone,count); for(let i=0;i<count;i++){ const q=i*7.3+geoSeed*31, a=seeded(q)*tau, r=down?4+seeded(q+1)*13:13.8+seeded(q+1)*3.4, s=down?.6+seeded(q+2)*1.5:.5+seeded(q+2)*1.1, L=down?1.4+seeded(q+3)*4:1+seeded(q+3)*3;
      if(down){ o.position.set(Math.cos(a)*r,Math.min(11.4,9.8+r*.06),Math.sin(a)*r); o.rotation.set(Math.PI,seeded(q+4)*6,0); } else { o.position.set(Math.cos(a)*r,-.1,Math.sin(a)*r); o.rotation.set(0,seeded(q+4)*6,0); } o.scale.set(s,L,s); o.updateMatrix(); im.setMatrixAt(i,o.matrix); } im.frustumCulled=false; im.receiveShadow=true; im.castShadow=!down; group.add(im); }
  // veins of crystal in the walls
  const cm=crystalMat(0xffffff), cm2=crystalMat(0xffffff,.4); crystal=cm; crystal2=cm2; const gl=[];
  for(const [mat,count,sh] of [[cm,64,0],[cm2,64,9]]){ const im=new THREE.InstancedMesh(CRY,mat,count); for(let i=0;i<count;i++){ const q=i*3.7+sh, cl=Math.floor(i/5), a=(seeded(cl+sh)*tau)+seeded(q)*.16, h=.1+seeded(cl+7+sh)*5.4, r=17.2-h*.02+seeded(q+1)*.4, s=.5+seeded(q+2)*1.1; o.position.set(Math.cos(a)*r,h+seeded(q+3)*.6,Math.sin(a)*r); o.rotation.set((seeded(q+4)-.5)*1.5,seeded(q+5)*6,(seeded(q+6)-.5)*1.5+(.5)); o.scale.set(s*.7,s*1.25,s*.7); o.updateMatrix(); im.setMatrixAt(i,o.matrix); if(i%5===0) gl.push([o.position.x*.97,o.position.y+.4,o.position.z*.97,5]); } im.frustumCulled=false; group.add(im); }
  // timber sets, a lantern at each, and the old cart road round the gallery
  const K=new Kit(); for(let i=0;i<6;i++){ const a=i/6*tau+.3, c=Math.cos(a), s=Math.sin(a), R=15.5, tx=-s, tz=c, P=(d,rr=R)=>[c*rr+tx*d,s*rr+tz*d], ry=-a+Math.PI/2;
    for(const d of [-1.15,1.15]){ const [x,z]=P(d); K.post('log',.15,4.3,x,0,z); K.box('trim',.46,.16,.46,x,.08,z); }
    { const [x,z]=P(0); K.log('log',3,.16,x,4.32,z,ry,{seg:8}); K.box('iron',.4,.06,.06,x,4.05,z,{ry}); const [lx,lz]=P(0,R-.14); K.box('iron',.05,.26,.05,lx,3.92,lz); K.box('iron',.3,.03,.3,lx,3.8,lz); K.box('lamp',.21,.27,.21,lx,3.64,lz); K.box('iron',.3,.03,.3,lx,3.49,lz); gl.push([lx,3.64,lz,9]); }
    for(const d of [-1.3,1.3]){ const [x,z]=P(d*.6,R+.9); const b=new THREE.BoxGeometry(.13,3.4,.13); b.rotateX(.34); b.rotateY(ry); b.translate(x,1.9,z); K.add('log',b); } }
  const rail=(r)=>{ for(let i=0;i<72;i++){ const a0=i/72*tau*.86+1, a1=(i+1)/72*tau*.86+1, x0=Math.cos(a0)*r, z0=Math.sin(a0)*r, x1=Math.cos(a1)*r, z1=Math.sin(a1)*r, l=Math.hypot(x1-x0,z1-z0); K.box('iron',l+.02,.05,.06,(x0+x1)/2,.09,(z0+z1)/2,{ry:-Math.atan2(z1-z0,x1-x0)}); } };
  rail(13.9); rail(14.7); for(let i=0;i<54;i++){ const a=i/54*tau*.86+1, r=14.3; K.box('boards',.32,.07,1.25,Math.cos(a)*r,.04,Math.sin(a)*r,{ry:-a+Math.PI/2+Math.PI/2,s:1.6}); }
  { const a=3.9, x=Math.cos(a)*14.3, z=Math.sin(a)*14.3, ry=-a+Math.PI; K.box('boards',1.7,.75,1.05,x,.72,z,{ry,s:1.4}); K.box('trim',1.76,.07,1.1,x,1.08,z,{ry}); K.box('trim',1.76,.07,1.1,x,.4,z,{ry}); for(const [p,q] of [[-.55,.56],[.55,.56],[-.55,-.56],[.55,-.56]]){ const t=new THREE.TorusGeometry(.22,.05,6,14), c=Math.cos(ry), s=Math.sin(ry); t.rotateY(ry); t.translate(x+p*c+q*s,.27,z-p*s+q*c); K.add('iron',t); } for(let i=0;i<14;i++){ const g=new THREE.IcosahedronGeometry(.17+(i%3)*.05,0); g.translate(x+Math.sin(i*2.1)*.55,1.1+(i%4)*.09,z+Math.cos(i*1.7)*.32); K.add('stone',g); } }
  K.bake(group);
  const g=new THREE.BufferGeometry(), Pos=new Float32Array(gl.length*3), Sz=new Float32Array(gl.length); gl.forEach((q,i)=>{ Pos.set(q.slice(0,3),i*3); Sz[i]=q[3]; }); g.setAttribute('position',new THREE.BufferAttribute(Pos,3)); g.setAttribute('aS',new THREE.BufferAttribute(Sz,1));
  glowPts=new THREE.Points(g,new THREE.ShaderMaterial({ transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false, toneMapped:false, uniforms:{ uC:u.uGlowC },
    vertexShader:`attribute float aS; void main(){ vec4 mv=viewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=min(320.,aS*520./max(-mv.z,1.)); }`,
    fragmentShader:`precision highp float; uniform vec3 uC; void main(){ float r=length(gl_PointCoord-.5)*2.; float a=pow(max(1.-r,0.),2.4)*.6; if(a<.004) discard; gl_FragColor=vec4(uC*a,1.); }` })); glowPts.frustumCulled=false; group.add(glowPts);
  const N=160, dg=new THREE.BufferGeometry(), dp=new Float32Array(N*3); for(let i=0;i<N;i++){ const a=Math.random()*tau, r=Math.sqrt(Math.random())*15; dp.set([Math.cos(a)*r,Math.random()*7,Math.sin(a)*r],i*3); } dg.setAttribute('position',new THREE.BufferAttribute(dp,3));
  dust=new THREE.Points(dg,new THREE.ShaderMaterial({ transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false, toneMapped:false, uniforms:{ uC:u.uGlowC, uTime:U.uTime },
    vertexShader:`uniform float uTime; void main(){ vec3 p=position; p.x+=sin(uTime*.2+p.z)*.8; p.y=mod(p.y+uTime*.06,7.); p.z+=cos(uTime*.17+p.x)*.8; vec4 mv=viewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=9./max(-mv.z,1.)+1.; }`,
    fragmentShader:`precision highp float; uniform vec3 uC; void main(){ float r=length(gl_PointCoord-.5)*2.; float a=(1.-smoothstep(.2,1.,r))*.32; gl_FragColor=vec4(uC*a,1.); }` })); dust.frustumCulled=false; group.add(dust);
  setCaveTheme(0);
}
export function setCaveTheme(i){ const t=THEMES[i]; u.uCS.value.setHex(t.s); u.uCM.value.setHex(t.m); u.uCH.value.setHex(t.h); u.uGlowC.value.setHex(t.glow); u.uLava.value=t.lava; u.uIce.value=t.ice; if(crystal){ crystal.color.setHex(t.cry); crystal.emissive.setHex(t.cry); crystal2.color.setHex(t.cry2); crystal2.emissive.setHex(t.cry2); } }

/* ---------- ore ---------- */
const rockMats=new Map(), oreMats=new Map();
function rockMat(th){ if(!rockMats.has(th)){ const m=stoneMat(); rockMats.set(th,m); } return rockMats.get(th); }
function oreMat(c,glow){ const k=c+'_'+glow; if(!oreMats.has(k)) oreMats.set(k,glow?crystalMat(c,.7):toonOf({color:c})); return oreMats.get(k); }
const nugget=(()=>{ const g=new THREE.IcosahedronGeometry(1,1), p=g.attributes.position; for(let i=0;i<p.count;i++){ const x=p.getX(i),y=p.getY(i),z=p.getZ(i), k=1+Math.sin(x*4+y*3)*.14+Math.cos(z*5-y*2)*.12; p.setXYZ(i,x*k,y*k*.8,z*k); } g.computeVertexNormals(); return g; })();
const GLOWY={gem:1,iridium:1,geode:1};
export function oreNode(k,s,theme,geo,col){
  const g=new THREE.Group(), rm=new THREE.Mesh(geo,rockMat(theme)); if(!geo.attributes.aGlow) geo.setAttribute('aGlow',new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count),1)); rm.scale.setScalar(s); rm.castShadow=true; g.add(rm);
  if(k==='stone') return g;
  const crystal=GLOWY[k], n=crystal?9:13, mat=oreMat(k==='geode'?0x9a6ae0:col,crystal), hi=!crystal&&k!=='coal'?oreMat(new THREE.Color(col).lerp(new THREE.Color(0xffffff),.5).getHex(),false):null;
  for(let i=0;i<n;i++){ const a=i*2.399+s*7, b=.25+(i%5)*.24, nx=Math.cos(a)*Math.cos(b), ny=Math.sin(b), nz=Math.sin(a)*Math.cos(b);
    if(crystal){ const d=new THREE.Mesh(CRY,mat), L=s*(.4+(i%3)*.2); d.position.set(nx*s*.6,ny*s*.46,nz*s*.6); d.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(nx,ny+.5,nz).normalize()); d.scale.set(L*.5,L,L*.5); g.add(d); }
    else { const d=new THREE.Mesh(nugget,i%4===0&&hi?hi:mat), q=s*(.08+(i%3)*.035); d.position.set(nx*s*.8,ny*s*.56+.02,nz*s*.8); d.scale.setScalar(q); d.rotation.set(i,i*2,0); g.add(d); } }
  return g;
}

/* ---------- monsters ---------- */
function eyes(par,r,y,z,gap,size,sc=0xf8f4ec,pupil=0x14100e){ const white=new THREE.MeshBasicMaterial({color:sc,toneMapped:false}), dark=new THREE.MeshBasicMaterial({color:pupil,toneMapped:false}), spark=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}), geo=new THREE.SphereGeometry(1,12,10);
  [-1,1].forEach(s=>{ const e=new THREE.Mesh(geo,white); e.position.set(s*gap,y,z); e.scale.set(size,size*1.15,size*.5); par.add(e); const p=new THREE.Mesh(geo,dark); p.position.set(s*gap*.92,y-size*.1,z+size*.4); p.scale.set(size*.58,size*.68,size*.3); par.add(p); const c=new THREE.Mesh(geo,spark); c.position.set(s*gap*.92+size*.2,y+size*.2,z+size*.62); c.scale.setScalar(size*.2); par.add(c); }); }
function slime(m,opts={}){ const G=new THREE.Group(), r=m.r, geo=new THREE.SphereGeometry(r,30,22), p=geo.attributes.position; for(let i=0;i<p.count;i++){ const x=p.getX(i), y=p.getY(i), z=p.getZ(i), q=y/r, sq=q<-.25?.64+(q+.25)*-.1:1; p.setXYZ(i,x*(1+(q<0?.14:0))*(1+.04*Math.sin(x*9)),Math.max(y*sq,-r*.62)+Math.max(0,q-.5)*r*.32,z*(1+(q<0?.14:0))); } geo.computeVertexNormals();
  const mt=toonOf({color:m.col,transparent:!opts.solid,opacity:opts.solid?1:.8,emissive:opts.emissive||0,emissiveIntensity:opts.emissive?.8:1}), b=new THREE.Mesh(geo,mt); b.position.y=r*.62; b.castShadow=true; G.add(b);
  if(!opts.solid){ const c=new THREE.Mesh(new THREE.SphereGeometry(r*.4,14,10),toonOf({color:new THREE.Color(m.col).multiplyScalar(.5)})); c.position.set(0,-r*.08,0); b.add(c); for(const [x,y,z,q] of [[.3,-.2,.22,.1],[-.34,.08,.2,.07],[.1,.26,-.2,.08]]){ const s=new THREE.Mesh(new THREE.SphereGeometry(r*q,8,6),toonOf({color:new THREE.Color(m.col).lerp(new THREE.Color(0xffffff),.5),transparent:true,opacity:.7})); s.position.set(x*r,y*r,z*r); b.add(s); } }
  const sh=new THREE.Mesh(new THREE.SphereGeometry(r*.16,10,8),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.75,toneMapped:false})); sh.position.set(-r*.42,r*.58,r*.5); sh.scale.set(1.2,.62,.5); sh.rotation.z=.5; b.add(sh);
  eyes(b,r,r*.2,r*.8,r*.32,r*.2); const mo=new THREE.Mesh(new THREE.TorusGeometry(r*.12,r*.018,5,12,Math.PI),new THREE.MeshBasicMaterial({color:0x14100e})); mo.position.set(0,-r*.1,r*.88); mo.rotation.z=Math.PI; b.add(mo);
  if(opts.spikes) for(let i=0;i<9;i++){ const a=i*2.4, q=.4+(i%3)*.22, d=new THREE.Mesh(CRY,crystalMat(0xbfeeff,.35)); d.position.set(Math.cos(a)*q*r*.8,r*.5+(1-q)*r*.3,Math.sin(a)*q*r*.8-r*.1); d.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(Math.cos(a)*q,1,Math.sin(a)*q).normalize()); const L=r*(.4+(i%2)*.3); d.scale.set(L*.5,L,L*.5); b.add(d); }
  if(opts.crust) for(let i=0;i<14;i++){ const a=i*2.399, y=.76-(i/14)*1.2, q=Math.sqrt(Math.max(0,1-y*y)), d=new THREE.Mesh(nugget,oreMat(0x2a1614,false)); d.position.set(Math.cos(a)*q*r*.92,y*r*.62+r*.05,Math.sin(a)*q*r*.92); d.scale.set(r*.28,r*.13,r*.28); d.lookAt(d.position.clone().multiplyScalar(2)); if(Math.sin(a)*q>.6&&Math.abs(y)<.4) continue; b.add(d); }
  G.userData.body=b; G.userData.baseE=opts.emissive||0; return G; }
function bug(m){ const G=new THREE.Group(), r=m.r, c=m.col, c2=new THREE.Color(c).multiplyScalar(.55).getHex(), g=loft([[0,.0,-r*1.2,.01,.01,c2],[0,.02,-r*.9,r*.5,r*.42,c],[0,.05,-r*.4,r*.68,r*.56,c2],[0,.06,r*.1,r*.62,r*.52,c],[0,.05,r*.55,r*.46,r*.4,c2],[0,.03,r*.95,r*.3,r*.26,c]],10,new THREE.Color(c).lerp(new THREE.Color(0xe8d0a0),.5).getHex()), b=new THREE.Mesh(g,toonOf({vertexColors:true})); b.position.y=r*.6; b.castShadow=true; G.add(b);
  eyes(b,r,r*.22,r*1.02,r*.17,r*.15,0xf0e8d8); [-1,1].forEach(s=>{ const a=new THREE.Mesh(loft([[s*r*.14,r*.26,r*1.0,.012,.012,c2],[s*r*.3,r*.72,r*1.3,.008,.008,c2],[s*r*.56,r*.82,r*1.6,.004,.004,c2]],4,null,2),toonOf({vertexColors:true})); b.add(a); });
  const legs=[]; [-1,1].forEach(s=>[-.5,.1,.6].forEach((z,i)=>{ const h=new THREE.Group(); h.position.set(s*r*.5,r*.05,z*r); const l=new THREE.Mesh(loft([[0,0,0,.022,.022,c2],[s*r*.45,r*.22,0,.018,.018,c2],[s*r*.82,-r*.42,0,.006,.006,c2]],5,null,2),toonOf({vertexColors:true})); h.add(l); b.add(h); legs.push({h,ph:i*2.1+(s>0?1.5:0)}); }));
  G.userData.body=b; G.userData.tick=t=>{ for(const l of legs) l.h.rotation.y=Math.sin(t*2.4+l.ph)*.42; }; return G; }
function crab(m,rock){ const G=new THREE.Group(), r=m.r, c=m.col, geo=rock.clone(); geo.scale(r*1.05,r*.72,r*1.05); const b=new THREE.Mesh(geo,toonOf({color:c})); b.position.y=r*.68; b.castShadow=true; G.add(b); const leg=toonOf({vertexColors:true}), lc=0x8a4a34, legs=[];
  [-1,1].forEach(s=>{ [-.55,0,.55].forEach((z,i)=>{ const h=new THREE.Group(); h.position.set(s*r*.7,-r*.14,z*r); h.add(new THREE.Mesh(loft([[0,0,0,.04,.04,lc],[s*r*.5,r*.3,0,.03,.03,lc],[s*r*.95,-r*.46,0,.008,.008,lc]],5,null,2),leg)); b.add(h); legs.push({h,ph:i*2+(s>0?1.6:0)}); });
    const arm=new THREE.Group(); arm.position.set(s*r*.74,-r*.04,r*.6); arm.add(new THREE.Mesh(loft([[0,0,0,.05,.05,lc],[s*r*.34,r*.1,r*.3,.055,.055,lc]],6,null,2),leg)); const cl=new THREE.Group(); cl.position.set(s*r*.34,r*.1,r*.3); cl.add(new THREE.Mesh(loft([[0,0,0,.05,.05,lc],[0,r*.08,r*.24,r*.14,r*.08,lc],[0,r*.1,r*.5,.01,.01,0xd8a890]],6,null,2),leg)); const j=new THREE.Mesh(loft([[0,0,0,.04,.04,lc],[0,-r*.06,r*.22,r*.08,r*.05,lc],[0,-r*.02,r*.42,.006,.006,0xd8a890]],6,null,2),leg); cl.add(j); arm.add(cl); b.add(arm); legs.push({h:cl,ph:s,claw:1}); });
  [-1,1].forEach(s=>{ const st=new THREE.Mesh(loft([[s*r*.2,r*.3,r*.74,.018,.018,lc],[s*r*.24,r*.62,r*.8,.014,.014,lc]],4,null,2),leg); b.add(st); const e=new THREE.Group(); e.position.set(s*r*.24,r*.66,r*.8); b.add(e); const w=new THREE.Mesh(new THREE.SphereGeometry(r*.09,10,8),new THREE.MeshBasicMaterial({color:0xf0e8d8,toneMapped:false})); e.add(w); const q=new THREE.Mesh(new THREE.SphereGeometry(r*.05,8,6),new THREE.MeshBasicMaterial({color:0x100c0a})); q.position.z=r*.06; e.add(q); });
  G.userData.body=b; G.userData.tick=t=>{ for(const l of legs){ if(l.claw) l.h.rotation.x=Math.sin(t*1.1+l.ph)*.2; else l.h.rotation.y=Math.sin(t*2+l.ph)*.3; } }; return G; }
function bat(m){ const G=new THREE.Group(), r=m.r, c=m.col, dk=new THREE.Color(c).multiplyScalar(.6).getHex(), wingM=toonOf({color:new THREE.Color(c).lerp(new THREE.Color(0x401830),.45),side:THREE.DoubleSide}), b=new THREE.Mesh(loft([[0,-r*.52,-r*.12,r*.1,r*.1,dk],[0,-r*.22,-r*.02,r*.42,r*.4,c],[0,r*.14,.03,r*.5,r*.46,c],[0,r*.46,r*.03,r*.42,r*.4,c],[0,r*.66,r*.02,r*.16,r*.14,c]],10,dk),toonOf({vertexColors:true})); b.position.y=r*.9; b.castShadow=true; G.add(b);
  eyes(b,r,r*.34,r*.38,r*.16,r*.13,0xffd850,0x201008);
  [-1,1].forEach(s=>{ const e=new THREE.Mesh(new THREE.ConeGeometry(r*.17,r*.42,6),toonOf({color:dk})); e.position.set(s*r*.28,r*.74,0); e.rotation.z=-s*.28; b.add(e); const f=new THREE.Mesh(new THREE.ConeGeometry(r*.03,r*.11,5),new THREE.MeshBasicMaterial({color:0xf8f4ec})); f.rotation.x=Math.PI; f.position.set(s*r*.07,r*.11,r*.44); b.add(f); });
  const wing=s=>{ const sh=new THREE.Shape(), W=r*2.2, H=r*1.05; sh.moveTo(0,H*.42); sh.quadraticCurveTo(W*.45,H*.82,W*.62,H*.72); sh.lineTo(W,H*.25); sh.quadraticCurveTo(W*.84,H*.04,W*.74,-H*.1); sh.quadraticCurveTo(W*.6,H*.0,W*.48,-H*.32); sh.quadraticCurveTo(W*.34,-H*.14,W*.22,-H*.42); sh.quadraticCurveTo(W*.1,-H*.2,0,-H*.3); sh.closePath(); const g=new THREE.ShapeGeometry(sh,8); if(s<0) g.scale(-1,1,1); const w=new THREE.Mesh(g,wingM); const root=new THREE.Group(); root.position.set(s*r*.34,r*.2,0); root.add(w); for(const [x,y] of [[.74,-.1],[.48,-.32],[.22,-.42],[1,.25]]){ const q=new THREE.Mesh(loft([[0,H*.42,.005,.012,.012,dk],[s*W*x,H*y,.005,.005,.005,dk]],4,null,1),toonOf({vertexColors:true})); root.add(q); } b.add(root); return root; };
  const wl=wing(-1), wr=wing(1); G.userData.body=b; G.userData.tick=t=>{ const f=Math.sin(t*3.2)*.72; wl.rotation.y=f; wr.rotation.y=-f; }; return G; }
function ghost(m){ const G=new THREE.Group(), r=m.r, pts=[]; for(let i=0;i<=16;i++){ const t=i/16; pts.push(new THREE.Vector2(r*(.38+.64*Math.pow(1-t,.6))*Math.sqrt(Math.max(.001,1-Math.pow(t,6))),t*r*2.4)); } const geo=new THREE.LatheGeometry(pts,28); geo.translate(0,-r*.9,0);
  const mt=toonOf({color:m.col,transparent:true,opacity:.74,side:THREE.DoubleSide,emissive:m.col,emissiveIntensity:.22}); mt.onBeforeCompile=sh=>{ sh.uniforms.uT=U.uTime; sh.vertexShader='uniform float uT;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n float lw=clamp(1.-(transformed.y+${(r*.9).toFixed(3)})/${(r*1.5).toFixed(3)},0.,1.); float th=atan(transformed.z,transformed.x); transformed.xz*=1.+lw*.16*sin(th*6.+uT*3.); transformed.y+=lw*${(r*.2).toFixed(3)}*sin(th*6.+uT*2.6);`); };
  const b=new THREE.Mesh(geo,mt); b.position.y=r*.7; G.add(b); const dark=new THREE.MeshBasicMaterial({color:0x100c1c,toneMapped:false}), glow=new THREE.MeshBasicMaterial({color:0xcfe8ff,toneMapped:false});
  [-1,1].forEach(s=>{ const e=new THREE.Mesh(new THREE.SphereGeometry(r*.17,12,10),dark); e.position.set(s*r*.3,r*.78,r*.58); e.scale.set(1,1.4,.4); b.add(e); const c=new THREE.Mesh(new THREE.SphereGeometry(r*.05,8,6),glow); c.position.set(s*r*.3,r*.82,r*.66); b.add(c); const a=new THREE.Mesh(loft([[s*r*.54,r*.42,r*.1,r*.15,r*.15,m.col],[s*r*.8,r*.16,r*.42,r*.11,r*.11,m.col],[s*r*.86,r*.0,r*.7,r*.04,r*.04,m.col]],6),toonOf({vertexColors:true,transparent:true,opacity:.72})); b.add(a); });
  const mo=new THREE.Mesh(new THREE.SphereGeometry(r*.14,10,8),dark); mo.position.set(0,r*.42,r*.64); mo.scale.set(1,1.3,.4); b.add(mo);
  G.userData.body=b; return G; }
export function monsterModel(t,m,rock){ switch(t){ case 'bug': return bug(m); case 'crab': return crab(m,rock); case 'bat': return bat(m); case 'ghost': return ghost(m); case 'frost': return slime(m,{spikes:true}); case 'lava': return slime(m,{solid:true,emissive:0xe84a2a,crust:true}); default: return slime(m); } }
