/* Real 3D plants. Up close every tree is built from bent bough cards or fluffy leaf clumps around a
   true trunk, so it has depth from any angle and casts a real shadow; past the LOD ring the painted
   sprites take over with a dithered crossfade. Everything shares one wind field, gusts rolling across
   the valley, and grass bends away from whoever walks through it. */
import * as THREE from 'three';
import { U, TEX, ATLAS, rowV, RAMP_GLSL, WATER_Y, terrainH, splatTex, blockTex } from './scenery.js';

const tau=Math.PI*2;
function rng(seed){ let s=seed>>>0; return ()=>{ s=(s+0x6D2B79F5)|0; let t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

/* ---------- geometry builders: unit height, y up ---------- */
class Mesh3{ constructor(){ this.p=[]; this.uv=[]; this.n=[]; this.w=[]; this.o=[]; this.i=[]; }
  v(px,py,pz,u,v,nx,ny,nz,trunk,ph,tip,shade,ox=0,oy=0,os=0){ this.p.push(px,py,pz); this.uv.push(u,v); this.n.push(nx,ny,nz); this.w.push(trunk,ph,tip,shade); this.o.push(ox,oy,os); return this.p.length/3-1; }
  q(a,b,c,d){ this.i.push(a,b,c,a,c,d); }
  geo(){ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(this.uv,2));
    g.setAttribute('aNorm',new THREE.Float32BufferAttribute(this.n,3)); g.setAttribute('aWind',new THREE.Float32BufferAttribute(this.w,4)); g.setAttribute('aOff',new THREE.Float32BufferAttribute(this.o,3)); g.setIndex(this.i); return g; }
}
function trunkPart(m,a,b,ra,rb,sides=6){            // tapered prism from a to b
  const d=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]).normalize(), s=new THREE.Vector3(1,0,0); if(Math.abs(d.x)>.9) s.set(0,0,1); const u=new THREE.Vector3().crossVectors(d,s).normalize(), v=new THREE.Vector3().crossVectors(d,u);
  const base=m.p.length/3;
  for(let e=0;e<2;e++){ const c=e?b:a, r=e?rb:ra; for(let k=0;k<sides;k++){ const t=k/sides*tau, x=Math.cos(t), y=Math.sin(t), nx=u.x*x+v.x*y, ny=u.y*x+v.y*y, nz=u.z*x+v.z*y;
      m.v(c[0]+nx*r,c[1]+ny*r,c[2]+nz*r,k/sides*2,c[1]*14,nx,ny,nz,1,0,e?c[1]*.5:a[1]*.5,.5); } }
  for(let k=0;k<sides;k++){ const k2=(k+1)%sides; m.q(base+k,base+sides+k,base+sides+k2,base+k2); }
}
function conifer(seed,{width=.17,whorls=30,droop=.7,fill=1}={}){
  const r=rng(seed), m=new Mesh3(), rects=['bough_a','bough_b','bough_c'].map(n=>ATLAS[n]);
  for(let l=0;l<5;l++){ const y0=l/5*.97, y1=(l+1)/5*.97; trunkPart(m,[0,y0,0],[0,y1,0],.016*(1-y0)+.0015,.016*(1-y1)+.0015); }
  // dark heart: an opaque cone inside the boughs, the deep shade you see between them in a real spruce
  for(let l=0;l<5;l++){ const y0=.06+l/5*.82, y1=.06+(l+1)/5*.82, r0=width*.34*Math.pow(1-(y0-.06)/.86,.9), r1=width*.34*Math.pow(1-(y1-.06)/.86,.9)+.001, b=m.p.length/3;
    for(let e=0;e<2;e++) for(let k=0;k<7;k++){ const a=k/7*tau+l, cr=e?r1:r0, yy=e?y1:y0; m.v(Math.cos(a)*cr,yy,Math.sin(a)*cr,0,0,Math.cos(a),.3,Math.sin(a),2,0,0,.1); }
    for(let k=0;k<7;k++){ const k2=(k+1)%7; m.q(b+k,b+7+k,b+7+k2,b+k2); } }
  for(let i=0;i<whorls;i++){ const t=(i+.15)/whorls, Rm=width*Math.pow(1-t,.82)*(1+.13*Math.sin(i*1.3+seed))+.014, cnt=t>.84?4:t>.55?6:8;
    for(let j=0;j<cnt;j++){ const ang=i*2.399+j/cnt*tau+(r()-.5)*.9, y=.07+.92*(t+(r()-.5)*1.5/whorls), L=Rm*(.62+r()*.66), dp=droop*(.9+r()*.9)*(.6+.4*(1-t)), a=rects[Math.floor(r()*3)], ph=r();
      const ca=Math.cos(ang), sa=Math.sin(ang), W=(.56+.16*r())*L*fill, segs=3, base=m.p.length/3, top=a.v1-(a.v1-a.v0)*.2, bot=a.v0+(a.v1-a.v0)*.03;
      for(let k=0;k<=segs;k++){ const s=k/segs, cx=ca*L*s, cz=sa*L*s, cy=y-dp*L*s*s+.1*L*Math.sin(s*Math.PI), w=W*(1-s*.56)+.002, qx=-sa*w, qz=ca*w, u=a.u0+(a.u1-a.u0)*(.02+s*.96), sh=(.3+.7*s)*(.72+.28*t);
        const nx=ca*.7, ny=.72, nz=sa*.7, tip=s*(.5+.5*(1-t*.4));
        m.v(cx+qx,cy-w*.72,cz+qz,u,bot,nx-sa*.4,ny*.8,nz+ca*.4,0,ph,tip,sh*.82);
        m.v(cx,cy+w*.1,cz,u,top,nx,ny,nz,0,ph,tip,sh);
        m.v(cx-qx,cy-w*.72,cz-qz,u,bot,nx+sa*.4,ny*.8,nz-ca*.4,0,ph,tip,sh*.82); }
      for(let k=0;k<segs;k++){ const b=base+k*3; m.q(b,b+3,b+4,b+1); m.q(b+1,b+4,b+5,b+2); } } }
  return m.geo();
}
function clumps(m,r,pts,sizeFn,center){ const rects=['clump_a','clump_b','clump_c','clump_d'].map(n=>ATLAS[n]);
  for(const c of pts){ const a=rects[Math.floor(r()*4)], s=sizeFn(c), n=new THREE.Vector3(c[0]-center[0],(c[1]-center[1])*1.2,c[2]-center[2]).normalize(), ph=r(), sh=.45+.55*Math.min(1,(n.y+.8)/1.4), rot=r()*tau, co=Math.cos(rot), si=Math.sin(rot), base=m.p.length/3;
    [[-1,-1,a.u0,a.v0],[1,-1,a.u1,a.v0],[1,1,a.u1,a.v1],[-1,1,a.u0,a.v1]].forEach(([x,y,u,v])=>m.v(c[0],c[1],c[2],u,v,n.x,n.y,n.z,0,ph,c[3],sh,x*co-y*si,x*si+y*co,s));
    m.q(base,base+1,base+2,base+3); } }
function broadleaf(seed,n=340){
  const r=rng(seed), m=new Mesh3(), C=[0,.6,0], RX=.36, RY=.33, tips=[];
  const limb=(a,dir,len,rad,depth)=>{ const b=[a[0]+dir[0]*len,a[1]+dir[1]*len,a[2]+dir[2]*len]; trunkPart(m,a,b,rad,rad*.68,depth>1?6:4); if(!depth){ tips.push(b); return; }
    for(let i=0;i<2+(r()<.4?1:0);i++){ const d=[dir[0]+(r()-.5)*1.1,dir[1]+(r()-.3)*.6,dir[2]+(r()-.5)*1.1], l=Math.hypot(...d); limb(b,d.map(x=>x/l),len*.68,rad*.66,depth-1); } };
  trunkPart(m,[0,0,0],[0,.08,0],.05,.036); limb([0,.08,0],[0,1,0],.2,.036,3);
  const pts=[];
  for(let i=0;i<n*6&&pts.length<n;i++){ const u=r()*2-1, a=r()*tau, q=Math.sqrt(1-u*u), rad=.5+.5*Math.cbrt(r()), x=Math.cos(a)*q*rad, y=u*rad, z=Math.sin(a)*q*rad;
    if(y<-.74) continue; pts.push([x*RX+(r()-.5)*.02,C[1]+y*RY,z*RX,.4+.6*(y*.5+.5)]); }
  clumps(m,r,pts,c=>.04+r()*.034,C);
  return m.geo();
}
function shrub(seed){ const r=rng(seed), m=new Mesh3(), pts=[]; for(let i=0;i<14;i++){ const a=r()*tau, q=r()*.55; pts.push([Math.cos(a)*q,.2+r()*.55,Math.sin(a)*q,.8]); } clumps(m,r,pts,()=>.3+r()*.16,[0,.1,0]); return m.geo(); }
function fern(seed){ const r=rng(seed), m=new Mesh3(), a0=ATLAS.frond_a, n=10;
  for(let f=0;f<n;f++){ const ang=f/n*tau+r()*.4, L=.72+r()*.4, a=(f%2?ATLAS.frond_b:a0), ca=Math.cos(ang), sa=Math.sin(ang), rise=.75+r()*.35, base=m.p.length/3, ph=r(), segs=5;
    for(let k=0;k<=segs;k++){ const s=k/segs, h=L*s, x=ca*h, z=sa*h, y=rise*s-(rise*.92)*s*s*s, w=.16*(1-s*.8)+.01, u=a.u0+(a.u1-a.u0)*(.02+s*.96);
      m.v(x-sa*w,y-.02,z+ca*w,u,a.v0,0,1,0,0,ph,s,.5+.5*s); m.v(x+sa*w,y-.02,z-ca*w,u,a.v1,0,1,0,0,ph,s,.5+.5*s); }
    for(let k=0;k<segs;k++){ const b=base+k*2; m.q(b,b+1,b+3,b+2); } }
  return m.geo();
}

/* a clump of tapered blades, y up to 1: vertex colour is computed in the shader from height */
function bladeClump(seed,count,spread,curl,heads=false,wide=1){
  const r=rng(seed), P=[], W=[], I=[];
  for(let b=0;b<count;b++){ const a=r()*tau, bx=Math.cos(a)*r()*spread, bz=Math.sin(a)*r()*spread, h=.55+r()*.45, lean=(.1+r()*curl)*h, da=a+(r()-.5)*1.6, lx=Math.cos(da), lz=Math.sin(da), w=(.03+r()*.018)*wide, px=-lz, pz=lx, base=P.length/3, segs=3, ph=r();
    for(let k=0;k<segs;k++){ const s=k/segs, ww=w*(1-s*.75), x=bx+lx*lean*s*s, z=bz+lz*lean*s*s, y=h*s*(1-.1*s*curl); P.push(x-px*ww,y,z-pz*ww, x+px*ww,y,z+pz*ww); W.push(s,ph,r(), s,ph,r()); }
    P.push(bx+lx*lean,h*(1-.1*curl),bz+lz*lean); W.push(1,ph,r());
    for(let k=0;k<segs-1;k++){ const q=base+k*2; I.push(q,q+1,q+3,q,q+3,q+2); }
    const q=base+(segs-1)*2; I.push(q,q+1,q+2);
    if(heads&&r()<.5){ const hb=P.length/3, tx=bx+lx*lean, ty=h*.98, tz=bz+lz*lean; [[-.02,0],[.02,0],[.02,.14],[-.02,.14]].forEach(([dx,dy])=>{ P.push(tx+dx,ty+dy-.1,tz); W.push(-1,ph,0); }); I.push(hb,hb+1,hb+2,hb,hb+2,hb+3); } }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('aBlade',new THREE.Float32BufferAttribute(W,3)); g.setIndex(I); return g;
}

/* ---------- shared GLSL ---------- */
const WIND=`uniform float uTime,uWindAmp; uniform vec2 uWindDir; uniform sampler2D uNoise;
  float gustAt(vec2 p){ vec2 q=p*.0042-uWindDir*uTime*.03; float a=texture2D(uNoise,q).b, b=texture2D(uNoise,q*2.3+vec2(.31,.17)).b; return smoothstep(.34,.8,a*.72+b*.42); }`;
const WIND_U=()=>({ uWindAmp:U.uWindAmp, uWindDir:U.uWindDir, uNoise:U.uNoise, uTime:U.uTime });

function floraMaterial(depth,plantsR,leafy){
  const vs=`attribute vec3 iPos; attribute vec4 iMisc; attribute vec3 aNorm; attribute vec4 aWind; attribute vec3 aOff;
    uniform float uFogD; ${WIND}
    varying vec2 vUv; varying vec3 vN; varying float vRow,vTone,vShade,vTrunk,vFog,vD,vY;
    void main(){ float c=cos(iMisc.w), s=sin(iMisc.w); vec3 p=position; p.xz=mat2(c,-s,s,c)*p.xz; vec3 n=aNorm; n.xz=mat2(c,-s,s,c)*n.xz;
      float sc=iMisc.x, H=p.y; p*=sc; vec3 w=iPos+p;
      float g=gustAt(iPos.xz);
      float amp=uWindAmp*(.35+1.1*g);
      w.xz+=uWindDir*(.006+.03*amp)*H*H*sc;                                                                     // the whole tree leans with the gust
      w.xz+=uWindDir*sin(uTime*1.25+iPos.x*.21+iPos.z*.17)*.0065*amp*H*sc;                                        // and rocks back
      float ph=aWind.y*6.283, f=sin(uTime*(1.7+fract(aWind.y*7.)*1.3)+ph+iPos.x*.3), f2=sin(uTime*4.6+ph*3.);
      w.y+=f*aWind.z*.012*amp*sc+f2*aWind.z*.003*amp*sc;                                                           // each bough nods on its own beat
      w.xz+=vec2(cos(ph),sin(ph))*f2*aWind.z*.0035*amp*sc;
      vec4 mv=viewMatrix*vec4(w,1.);
      if(aOff.z>0.) mv.xy+=aOff.xy*aOff.z*sc*(1.+f2*.02*amp);
      gl_Position=projectionMatrix*mv;
      vUv=uv; vN=n; vRow=iMisc.y; vTone=iMisc.z; vShade=aWind.w; vTrunk=aWind.x; vY=H;
      float d=length(cameraPosition-iPos); vD=d; vFog=1.-exp(-d*d*uFogD*uFogD); }`;
  const dith=`float dith(vec2 p){ vec2 q=mod(floor(p),4.); return (mod(q.x+q.y*2.,4.)+mod(q.y,2.)*.5)/4.5; }`;
  if(depth) return new THREE.ShaderMaterial({ side:THREE.DoubleSide, uniforms:{ ...U, uMap:{value:TEX.sheet_near} }, vertexShader:vs,
    fragmentShader:`#include <packing>\n precision highp float; uniform sampler2D uMap; uniform float uLodT; varying vec2 vUv; varying float vTrunk;
      void main(){ if(vTrunk<.5&&texture2D(uMap,vUv).a<.4) discard; gl_FragColor=packDepthToRGBA(gl_FragCoord.z); }` });
  return new THREE.ShaderMaterial({ fog:false, toneMapped:false, side:THREE.DoubleSide, alphaToCoverage:true,
    uniforms:{ ...U, uLodT:plantsR?U.uLodP:U.uLodT, uDetail:{value:leafy?.26:.9}, uMipBias:{value:leafy?-1.6:-.6}, uMap:{value:TEX.sheet_near}, uWoodRow:{value:rowV('wood')}, uIceRow:{value:rowV('ice')} }, vertexShader:vs,
    fragmentShader:`precision highp float; uniform sampler2D uMap,uRamps; uniform vec3 uShade,uLit,uFog,uSunDirW; uniform float uSnow,uWoodRow,uIceRow,uLodT,uDetail,uMipBias; uniform vec4 uReveal; uniform vec2 uRes;
      varying vec2 vUv; varying vec3 vN; varying float vRow,vTone,vShade,vTrunk,vFog,vD,vY; ${RAMP_GLSL} ${dith}
      void main(){ float fade=smoothstep(uLodT-10.,uLodT-1.,vD); if(fade>dith(gl_FragCoord.xy)+.001) discard;
        if(vD<uReveal.z){ vec2 sp=(gl_FragCoord.xy/uRes-uReveal.xy)*vec2(uReveal.w,1.); float rr=length(sp); if(rr<.26){ if(dith(gl_FragCoord.xy*.5)>rr/.26*1.1-.08) discard; } }
        vec3 c; float a=1.; float lam=dot(normalize(vN),uSunDirW);
        if(vTrunk>1.5){ c=ramp(.17+vTone,vRow)*mix(uShade,uLit,.32); }
        else if(vTrunk>.5){ float g=fract(sin(floor(vUv.y*5.)+floor(vUv.x*5.)*7.)*43758.5); float v=.22+.34*(lam*.5+.5)+g*.14; c=ramp(v,uWoodRow); c*=mix(uShade,uLit,.45); }
        else { vec4 t=texture2D(uMap,vUv,uMipBias); if(t.a<.32) discard; a=clamp((t.a-.5)/max(fwidth(t.a),.0001)+.5,0.,1.);
          float v=mix(.42,t.r,uDetail)+(t.g-.5)*.2+vTone+lam*.3*(.6+.4*vShade)+(vShade-.5)*.34;
          c=ramp(v,vRow);
          if(uSnow>.01) c=mix(c,ramp(.45+v*.6,uIceRow),uSnow*smoothstep(.1,.6,t.b)*smoothstep(-.3,.35,normalize(vN).y));
          c*=mix(uShade,uLit,smoothstep(.08,.7,v)); }
        c=mix(c,uFog,vFog);
        gl_FragColor=vec4(c,a); }` });
}

/* Lambert blades: they take the same light and shadows as the ground they grow from */
const BLADE_COMMON=`uniform sampler2D uRamps,uSplat,uBlock,uHeight,uTile; uniform float uSnow,uGroundRow,uTuftRow,uHSpan,uBSpan,uSpan; uniform vec4 uPush,uPush2; ${WIND} ${RAMP_GLSL}
  varying vec3 vCol;
  vec2 pushAway(vec2 g,float s,inout float sink){ vec2 o=vec2(0.); for(int i=0;i<2;i++){ vec4 P=i==0?uPush:uPush2; vec2 d=g-P.xy; float l=length(d), k=1.-smoothstep(.15,P.z,l); o+=d/max(l,.01)*k*.46*s; sink+=k*.3; } return o; }`;
function bladeMaterial(kind){
  const m=new THREE.MeshLambertMaterial({color:0xffffff,side:THREE.DoubleSide});
  m.defines={ ...(m.defines||{}), [kind]:1 };
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,WIND_U(),{ uRamps:U.uRamps, uSnow:U.uSnow, uSplat:{value:splatTex()}, uBlock:{value:blockTex()}, uHeight:U.uHeight, uTile:{value:TEX.ground_tile}, uGroundRow:{value:rowV('ground')}, uTuftRow:{value:rowV('tuft')},
      uHSpan:{value:U.uHeightSpan.value}, uBSpan:{value:256}, uSpan:{value:bladeSpan}, uPush:U.uPush, uPush2:U.uPush2 });
    sh.vertexShader=`attribute vec3 aBlade; attribute vec4 iA; attribute vec4 iB;\n${BLADE_COMMON}\n`+sh.vertexShader
     .replace('#include <beginnormal_vertex>','vec3 objectNormal=vec3(0.,1.,0.);')
     .replace('#include <begin_vertex>',`
      float s=max(aBlade.x,0.); vec3 tr; float keep=1.; vec2 g; float h, size;
      #ifdef CARPET
       vec2 cam=cameraPosition.xz; g=mod(iA.xy*uSpan-cam+uSpan*.5,uSpan)-uSpan*.5+cam;
       h=texture2D(uHeight,g/uHSpan+.5).r; vec4 sp=texture2D(uSplat,g/840.+.5); float block=texture2D(uBlock,g/uBSpan+.5).r; float dc=length(g-cam);
       keep=(1.-smoothstep(.2,.55,sp.g))*(1.-smoothstep(.3,.8,sp.b))*smoothstep(-.75,-.45,h)*(1.-step(.02,block))*(1.-smoothstep(uSpan*.34,uSpan*.47,dc))*(1.-uSnow*.9);
       size=keep*(.34+.3*iA.z); float rot=iA.w*6.283;
      #else
       g=iA.xz; h=iA.y; size=iB.x*(1.-smoothstep(uSpan*.38,uSpan*.49,distance(g,cameraPosition.xz))); float rot=iB.y;
      #endif
      float c0=cos(rot), s0=sin(rot); vec3 p=position*size; p.xz=mat2(c0,-s0,s0,c0)*p.xz;
      float gust=gustAt(g), amp=uWindAmp*(.3+1.2*gust), sink=0.;
      vec2 sway=uWindDir*(.04+.32*amp)*s*s*size*1.6+vec2(-uWindDir.y,uWindDir.x)*sin(uTime*2.7+g.x*1.6+g.y*1.1+aBlade.y*6.)*.05*amp*s*size*1.6;
      sway+=uWindDir*sin(uTime*3.4-dot(g,uWindDir)*.9+aBlade.y*3.)*.1*amp*s*s*size;
      sway+=pushAway(g,s,sink); p.y*=1.-sink*s;
      vec3 transformed=vec3(g.x+p.x+sway.x,h+p.y-.03,g.y+p.z+sway.y);
      vec3 t1=texture2D(uTile,g/9.).rgb, t2=texture2D(uTile,g/31.).rgb;
      float gv=(t1.r*.72+t2.r*.34-.1)*1.1;
      #ifdef CARPET
       vCol=ramp(gv+s*.26+aBlade.z*.1,uGroundRow)*(.5+.72*s)*1.2*(1.-sp.r*.24);
      #else
       vCol=aBlade.x<0.?vec3(.05,.03,.02):ramp(.2+s*.62+aBlade.z*.16+iB.z,uTuftRow)*(.62+.6*s)*1.2;
      #endif
    `);
    sh.fragmentShader='varying vec3 vCol;\n'+sh.fragmentShader.replace('#include <map_fragment>','diffuseColor.rgb*=vCol;').replace('#include <normal_fragment_begin>','vec3 normal=normalize(vNormal);');
  };
  return m;
}

/* ---------- LOD set ---------- */
const CELL=16, cells=new Map(), key=(x,z)=>Math.floor(x/CELL)*8192+Math.floor(z/CELL);
const VAR={}; let bladeSpan=46;
function variant(root,name,geo,cap,mat,dep){
  const g=new THREE.InstancedBufferGeometry(); g.index=geo.index; for(const k in geo.attributes) g.setAttribute(k,geo.attributes[k]);
  const a=new THREE.InstancedBufferAttribute(new Float32Array(cap*3),3), b=new THREE.InstancedBufferAttribute(new Float32Array(cap*4),4); a.setUsage(THREE.DynamicDrawUsage); b.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('iPos',a); g.setAttribute('iMisc',b); g.instanceCount=0;
  const o=new THREE.Mesh(g,mat); o.frustumCulled=false; o.layers.set(1); if(dep){ o.customDepthMaterial=dep; o.castShadow=true; } root.add(o);
  VAR[name]={g,a,b,cap,n:0,o,kind:'flora'};
}
function bladeVariant(root,name,geo,cap,mat){
  const g=new THREE.InstancedBufferGeometry(); g.index=geo.index; for(const k in geo.attributes) g.setAttribute(k,geo.attributes[k]);
  const a=new THREE.InstancedBufferAttribute(new Float32Array(cap*4),4), b=new THREE.InstancedBufferAttribute(new Float32Array(cap*4),4); a.setUsage(THREE.DynamicDrawUsage); b.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('iA',a); g.setAttribute('iB',b); g.instanceCount=0;
  const o=new THREE.Mesh(g,mat); o.frustumCulled=false; o.layers.set(1); o.receiveShadow=true; root.add(o);
  VAR[name]={g,a,b,cap,n:0,o,kind:'blade'};
}
const pickVar=it=>{ const n=it.name, h=Math.abs(Math.floor(it.x*3+it.z*7));
  if(n.startsWith('spruce')) return 'con'+(h%3); if(n.startsWith('larch')) return 'lar'+(h%2); if(n.startsWith('broad')) return 'bro'+(h%2); if(n.startsWith('shrub')) return 'shr';
  if(n.startsWith('fern')) return 'fer'; if(n.startsWith('reed')) return 'ree'; if(n.startsWith('tuft')) return 'tuf'+(h%2); return null; };
const RAD={ low:[30,20,3000], med:[46,28,9000], high:[62,36,15000] };
let radT=46, radP=28, lastX=1e9, lastZ=1e9;
export function setupFlora(root,trees,plants,qual){
  const [rt,rp,carpetN]=RAD[qual]||RAD.med; radT=rt; radP=rp; U.uLodT.value=rt; U.uLodP.value=rp;
  const mat=floraMaterial(false), dep=floraMaterial(true);
  [[0,.16,30,.7],[1,.15,27,.8],[2,.18,32,.62]].forEach(([i,w,n,d])=>variant(root,'con'+i,conifer(11+i,{width:w,whorls:n,droop:d}),170,mat,dep));
  [[0,.125,28,.95],[1,.135,26,.85]].forEach(([i,w,n,d])=>variant(root,'lar'+i,conifer(31+i,{width:w,whorls:n,droop:d,fill:.9}),110,mat,dep));
  const lm=floraMaterial(false,false,true); [0,1].forEach(i=>variant(root,'bro'+i,broadleaf(51+i),110,lm,dep));
  const pm=floraMaterial(false,true,true); variant(root,'shr',shrub(3),260,pm); variant(root,'fer',fern(4),320,pm);
  const tm=bladeMaterial('TUFT');
  bladeVariant(root,'tuf0',bladeClump(5,38,.2,.55),1400,tm); bladeVariant(root,'tuf1',bladeClump(6,32,.25,1),1400,tm); bladeVariant(root,'ree',bladeClump(7,14,.14,.14,true),520,tm);
  // the carpet: short grass that wraps around the camera
  const carpet=bladeClump(8,12,.85,.8,false,1.7), cg=new THREE.InstancedBufferGeometry(); cg.index=carpet.index; for(const k in carpet.attributes) cg.setAttribute(k,carpet.attributes[k]);
  bladeSpan=rp*2; const r=rng(9), A=new Float32Array(carpetN*4); for(let i=0;i<carpetN*4;i++) A[i]=r();
  cg.setAttribute('iA',new THREE.InstancedBufferAttribute(A,4)); cg.setAttribute('iB',new THREE.InstancedBufferAttribute(new Float32Array(carpetN*4),4)); cg.instanceCount=carpetN;
  const co=new THREE.Mesh(cg,bladeMaterial('CARPET')); co.frustumCulled=false; co.layers.set(1); co.receiveShadow=true; root.add(co);
  for(const list of [trees,plants]) for(const it of list){ it.v=pickVar(it); if(!it.v) continue; if(it.trueH===undefined) it.trueH=it.h; const k=key(it.x,it.z); if(!cells.has(k)) cells.set(k,[]); cells.get(k).push(it); }
}
export const refreshFlora=()=>{ lastX=1e9; };
export function updateFlora(cam){
  const cx=cam.x, cz=cam.z; if(Math.hypot(cx-lastX,cz-lastZ)<2.6) return; lastX=cx; lastZ=cz;
  for(const k in VAR) VAR[k].n=0;
  const Rc=Math.ceil(radT/CELL), mx=Math.floor(cx/CELL), mz=Math.floor(cz/CELL);
  for(let i=mx-Rc;i<=mx+Rc;i++) for(let j=mz-Rc;j<=mz+Rc;j++){ const l=cells.get(i*8192+j); if(!l) continue;
    for(const it of l){ if(it.gone) continue; const V=VAR[it.v], lim=V.kind==='blade'||it.v==='shr'||it.v==='fer'?radP:radT, dx=it.x-cx, dz=it.z-cz; if(dx*dx+dz*dz>lim*lim||V.n>=V.cap) continue; const n=V.n++;
      if(V.kind==='flora'){ V.a.setXYZ(n,it.x,it.y,it.z); V.b.setXYZW(n,it.v==='shr'?it.trueH*1.1:it.v==='fer'?it.trueH*1.5:it.trueH,rowV(it.row),it.tone||0,(it.x*7.3+it.z*3.1)%6.28); }
      else { V.a.setXYZW(n,it.x,it.y,it.z,0); V.b.setXYZW(n,it.trueH*1.05,(it.x*7.3+it.z*3.1)%6.28,it.tone||0,0); } } }
  for(const k in VAR){ const V=VAR[k]; V.g.instanceCount=V.n; V.a.needsUpdate=true; V.b.needsUpdate=true; }
}
