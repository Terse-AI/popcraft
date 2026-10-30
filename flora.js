/* Real 3D plants. Up close every tree is built from bent bough cards or fluffy leaf clumps around a
   true trunk, so it has depth from any angle and casts a real shadow; past the LOD ring the painted
   sprites take over with a dithered crossfade. Everything shares one wind field, gusts rolling across
   the valley, and grass bends away from whoever walks through it. */
import * as THREE from 'three';
import { U, TEX, ATLAS, rowV, RAMP_GLSL, CLOUD_GLSL, WATER_Y, heightAt, splatAt, blockedAt, blockHook, lakeField, vnoise } from './scenery.js';

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
function conifer(seed,{width=.17,whorls=36,droop=.42,fill=1}={}){
  const r=rng(seed), m=new Mesh3(), rects=['bough_a','bough_b','bough_c'].map(n=>ATLAS[n]);
  for(let l=0;l<5;l++){ const y0=l/5*.97, y1=(l+1)/5*.97; trunkPart(m,[0,y0,0],[0,y1,0],.016*(1-y0)+.0015,.016*(1-y1)+.0015); }
  // dark heart: an opaque cone inside the boughs, the deep shade you see between them in a real spruce
  for(let l=0;l<5;l++){ const y0=.06+l/5*.82, y1=.06+(l+1)/5*.82, r0=width*.26*Math.pow(1-(y0-.06)/.86,1.1), r1=width*.26*Math.pow(1-(y1-.06)/.86,1.1)+.001, b=m.p.length/3;
    for(let e=0;e<2;e++) for(let k=0;k<7;k++){ const a=k/7*tau+l, cr=e?r1:r0, yy=e?y1:y0; m.v(Math.cos(a)*cr,yy,Math.sin(a)*cr,0,0,Math.cos(a),.3,Math.sin(a),2,0,0,.1); }
    for(let k=0;k<7;k++){ const k2=(k+1)%7; m.q(b+k,b+7+k,b+7+k2,b+k2); } }
  for(let i=0;i<whorls;i++){ const t=(i+.15)/whorls, Rm=width*Math.pow(1-t,.82)*(1+.13*Math.sin(i*1.3+seed))+.014, cnt=t>.84?4:t>.55?7:9;
    for(let j=0;j<cnt;j++){ const ang=i*2.399+j/cnt*tau+(r()-.5)*.9, y=.07+.92*(t+(r()-.5)*1.5/whorls), L=Rm*(.62+r()*.66), dp=droop*(.9+r()*.9)*(.6+.4*(1-t)), a=rects[Math.floor(r()*3)], ph=r();
      const ca=Math.cos(ang), sa=Math.sin(ang), W=(.56+.16*r())*L*fill, segs=3, base=m.p.length/3, top=a.v1-(a.v1-a.v0)*.2, bot=a.v0+(a.v1-a.v0)*.03;
      for(let k=0;k<=segs;k++){ const s=k/segs, cx=ca*L*s, cz=sa*L*s, cy=y-dp*L*s*s+.1*L*Math.sin(s*Math.PI)+.2*L*s*s*s*s, w=W*(1-s*.56)+.002, qx=-sa*w, qz=ca*w, u=a.u0+(a.u1-a.u0)*(.02+s*.96), sh=(.3+.7*s)*(.72+.28*t);
        const nx=ca*.7, ny=.72, nz=sa*.7, tip=s*(.5+.5*(1-t*.4));
        m.v(cx+qx,cy-w*.72,cz+qz,u,bot,nx-sa*.4,ny*.8,nz+ca*.4,0,ph,tip,sh*.82);
        m.v(cx,cy+w*.1,cz,u,top,nx,ny,nz,0,ph,tip,sh);
        m.v(cx-qx,cy-w*.72,cz-qz,u,bot,nx+sa*.4,ny*.8,nz-ca*.4,0,ph,tip,sh*.82); }
      for(let k=0;k<segs;k++){ const b=base+k*3; m.q(b,b+3,b+4,b+1); m.q(b+1,b+4,b+5,b+2); } } }
  return m.geo();
}
const CLUMPS=['clump_a','clump_b','clump_c','clump_d','clump_e','clump_f','clump_g','clump_h'];
function clumps(m,r,pts,sizeFn,center){ const rects=CLUMPS.map(n=>ATLAS[n]);
  for(const c of pts){ const a=rects[Math.floor(r()*8)], s=sizeFn(c), n=c[4]!==undefined?new THREE.Vector3(c[4],c[5],c[6]):new THREE.Vector3(c[0]-center[0],(c[1]-center[1])*1.2,c[2]-center[2]).normalize(), ph=r(), sh=c[7]<.3?c[7]:.34+.66*Math.min(1,(n.y+.8)/1.4)*(c[7]===undefined?1:c[7]), rot=r()*tau, co=Math.cos(rot), si=Math.sin(rot), base=m.p.length/3;
    [[-1,-1,a.u0,a.v0],[1,-1,a.u1,a.v0],[1,1,a.u1,a.v1],[-1,1,a.u0,a.v1]].forEach(([x,y,u,v])=>m.v(c[0],c[1],c[2],u,v,n.x,n.y,n.z,0,ph,c[3],sh,x*co-y*si,x*si+y*co,s));
    m.q(base,base+1,base+2,base+3); } }
function blob(m,r,c,rx,ry,rz){ const LAT=5, LON=8, b=m.p.length/3;       // dark mass inside a billow of leaves, so the light has something to fall into
  for(let j=0;j<=LAT;j++) for(let i=0;i<LON;i++){ const t=j/LAT*Math.PI, a=i/LON*tau+j, q=.86+r()*.24, x=Math.sin(t)*Math.cos(a), y=Math.cos(t), z=Math.sin(t)*Math.sin(a); m.v(c[0]+x*rx*q,c[1]+y*ry*q,c[2]+z*rz*q,0,0,x,y,z,2,0,0,.1); }
  for(let j=0;j<LAT;j++) for(let i=0;i<LON;i++){ const i2=(i+1)%LON; m.q(b+j*LON+i,b+(j+1)*LON+i,b+(j+1)*LON+i2,b+j*LON+i2); } }
function broadleaf(seed,n=520){
  const r=rng(seed), m=new Mesh3(), C=[0,.6,0], RX=.36, RY=.33, lobes=[];
  // the crown is a heap of billows on forked limbs, each lit on its own, not one ball
  for(let i=0;i<13;i++){ const a=i*2.399+r()*.6, up=i<3?.8+r()*.2:r()*.75-.12, q=Math.sqrt(Math.max(0,1-up*up)), rad=i<3?.11+r()*.05:.1+r()*.075; lobes.push([Math.cos(a)*q*RX*.76,C[1]+up*RY*.76,Math.sin(a)*q*RX*.76,rad]); }
  // a real frame: flared roots, a leaning trunk, four main limbs, and side branches out to each billow
  const bent=(a,b,ra,rb,sides,sag)=>{ const q=[(a[0]+b[0])*.5+(r()-.5)*sag,(a[1]+b[1])*.5+(r()-.3)*sag,(a[2]+b[2])*.5+(r()-.5)*sag]; trunkPart(m,a,q,ra,(ra+rb)*.5,sides); trunkPart(m,q,b,(ra+rb)*.5,rb,sides); return q; };
  for(let i=0;i<6;i++){ const a=i/6*tau+r(), o=.085+r()*.05; trunkPart(m,[Math.cos(a)*o,-.012,Math.sin(a)*o],[Math.cos(a)*.024,.075,Math.sin(a)*.024],.01,.024,4); }
  const top=[.012,.3,.008]; trunkPart(m,[0,-.01,0],[.004,.1,.003],.042,.031,9); trunkPart(m,[.004,.1,.003],[.01,.2,.007],.031,.027,9); trunkPart(m,[.01,.2,.007],top,.027,.022,8);
  const prim=[0,1,2,3].map(i=>{ const a=i/4*tau+seed+r()*.5, p=[Math.cos(a)*.13,.45+r()*.08,Math.sin(a)*.13]; bent(top,p,.018,.011,6,.05); return p; });
  lobes.forEach(l=>{ let best=prim[0], bd=9; for(const p of prim){ const d=Math.hypot(p[0]-l[0],p[1]-l[1],p[2]-l[2]); if(d<bd){ bd=d; best=p; } } bent(best,[l[0],l[1],l[2]],.0085,.0028,4,.06); blob(m,r,l,l[3]*.46,l[3]*.4,l[3]*.46); });
  const pts=[];
  lobes.forEach(l=>{ for(let i=0;i<9;i++){ const a=r()*tau, u=r()*1.6-.8, q=Math.sqrt(Math.max(0,1-u*u)), R=l[3]*.55; pts.push([l[0]+Math.cos(a)*q*R,l[1]+u*R,l[2]+Math.sin(a)*q*R,.3,Math.cos(a)*q,u,Math.sin(a)*q,.15]); } });   // deep leaves, in shade, so gaps show foliage and not sky
  for(let i=0;i<n;i++){ const l=lobes[i%lobes.length], u=r()*2-1, a=r()*tau, q=Math.sqrt(1-u*u), rad=l[3]*(.74+.34*Math.cbrt(r())), nx=Math.cos(a)*q, ny=u, nz=Math.sin(a)*q; if(ny<-.7&&r()<.7) continue;
    const gn=new THREE.Vector3(l[0],(l[1]-C[1])*1.2,l[2]).normalize(), N=new THREE.Vector3(nx*.7+gn.x*.3,ny*.7+gn.y*.3,nz*.7+gn.z*.3).normalize();
    pts.push([l[0]+nx*rad,l[1]+ny*rad*.86,l[2]+nz*rad,.4+.6*(ny*.5+.5),N.x,N.y,N.z,.72+.28*(ny*.5+.5)]); }
  clumps(m,r,pts,()=>.042+r()*.034,C);
  return m.geo();
}
function shrub(seed){ const r=rng(seed), m=new Mesh3(), pts=[]; const lobes=[[0,.34,0,.3],[.3,.26,.14,.24],[-.28,.26,.12,.24],[.1,.26,-.3,.24],[-.14,.42,-.1,.2]];
  lobes.forEach(l=>blob(m,r,l,l[3]*.48,l[3]*.4,l[3]*.48));
  for(let i=0;i<46;i++){ const l=lobes[i%5], u=r()*1.5-.5, a=r()*tau, q=Math.sqrt(1-Math.min(1,u*u)), R=l[3]*(.8+r()*.34); pts.push([l[0]+Math.cos(a)*q*R,l[1]+u*R,l[2]+Math.sin(a)*q*R,.8,Math.cos(a)*q,u,Math.sin(a)*q,.8+.2*(u*.5+.5)]); }
  clumps(m,r,pts,()=>.14+r()*.09,[0,.1,0]); return m.geo(); }
function fern(seed){ const r=rng(seed), m=new Mesh3(), a0=ATLAS.frond_a, n=14;
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
const WIND=`uniform float uTime,uWindAmp; uniform vec2 uWindDir;
  float gustAt(vec2 p){ float a=dot(p,uWindDir)*.036-uTime*.55, b=dot(p,vec2(-uWindDir.y,uWindDir.x))*.023, s=sin(a+1.9*sin(b))*.5+.5, t=sin(a*2.1+1.3+1.4*sin(b*1.7+uTime*.13))*.5+.5; return smoothstep(.3,.85,s*.66+t*.4); }`;
const WIND_U=()=>({ uWindAmp:U.uWindAmp, uWindDir:U.uWindDir, uTime:U.uTime });

function floraMaterial(depth,plantsR,leafy){
  const vs=`attribute vec3 iPos; attribute vec4 iMisc; attribute vec3 aNorm; attribute vec4 aWind; attribute vec3 aOff;
    uniform float uFogD; ${WIND}
    varying vec2 vUv,vP; varying vec3 vN,vV; varying float vRow,vTone,vShade,vTrunk,vFog,vD,vY,vF;
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
      vUv=uv; vN=n; vP=iPos.xz; vV=normalize(w-cameraPosition); vRow=iMisc.y; vTone=iMisc.z; vShade=aWind.w; vTrunk=aWind.x; vY=H;
      float d=length(cameraPosition-iPos); vD=d; vF=length(cameraPosition-w); vFog=1.-exp(-d*d*uFogD*uFogD); }`;
  const dith=`float dith(vec2 p){ return fract(52.9829189*fract(dot(floor(p)+.5,vec2(.06711056,.00583715)))); }`;
  if(depth) return new THREE.ShaderMaterial({ side:THREE.DoubleSide, uniforms:{ ...U, uMap:{value:TEX.sheet_near} }, vertexShader:vs,
    fragmentShader:`#include <packing>\n precision highp float; uniform sampler2D uMap; uniform float uLodT; varying vec2 vUv; varying float vTrunk;
      void main(){ if(vTrunk<.5&&texture2D(uMap,vUv).a<.4) discard; gl_FragColor=packDepthToRGBA(gl_FragCoord.z); }` });
  return new THREE.ShaderMaterial({ fog:false, toneMapped:false, side:THREE.DoubleSide, alphaToCoverage:true,
    uniforms:{ ...U, uLodT:plantsR?U.uLodP:U.uLodT, uDetail:{value:leafy?.78:.9}, uMipBias:{value:leafy?-1.2:-.6}, uMap:{value:TEX.sheet_near}, uBark:{value:TEX.mt_detail}, uWoodRow:{value:rowV('wood')}, uIceRow:{value:rowV('ice')} }, vertexShader:vs,
    fragmentShader:`precision highp float; uniform sampler2D uMap,uRamps,uBark; uniform vec3 uShade,uLit,uFog,uSunDirW,uFogSun; uniform float uSnow,uWoodRow,uIceRow,uLodT,uDetail,uMipBias,uGlow; uniform vec4 uReveal; uniform vec2 uRes;
      varying vec2 vUv,vP; varying vec3 vN,vV; varying float vRow,vTone,vShade,vTrunk,vFog,vD,vY,vF; ${RAMP_GLSL} ${CLOUD_GLSL} ${dith}
      void main(){ float fade=smoothstep(uLodT-10.,uLodT-1.,vD); if(fade>dith(gl_FragCoord.xy)+.001) discard; if(vF<3.4&&(vF-1.2)/2.2<dith(gl_FragCoord.xy)) discard;
        if(vD<uReveal.z){ vec2 sp=(gl_FragCoord.xy/uRes-uReveal.xy)*vec2(uReveal.w,1.); float rr=length(sp); if(rr<.26){ if(dith(gl_FragCoord.xy*.5)>rr/.26*1.1-.08) discard; } }
        vec3 c; float a=1.; float lam=dot(normalize(vN),uSunDirW);
        if(vTrunk>1.5){ c=ramp(.22+vTone,vRow)*mix(uShade,uLit,.36); }
        else if(vTrunk>.5){ vec2 bq=vUv*vec2(.62,.3); vec3 b=texture2D(uBark,bq).rgb, b2=texture2D(uBark,bq*3.3).rgb; vec3 nb=normalize(vN+vec3(b.r-.5,0.,b.g-.5)*1.6+vec3(b2.r-.5,0.,b2.g-.5)*.9); float l2=dot(nb,uSunDirW); float v=.4+.36*(l2*.5+.5)+(b.b-.5)*.95+(b2.b-.5)*.6; c=ramp(v,uWoodRow)*mix(uShade,uLit,.5+.45*max(l2,0.)); }
        else { vec4 t=texture2D(uMap,vUv,uMipBias); if(t.a<.32) discard; a=clamp((t.a-.5)/max(fwidth(t.a),.0001)+.5,0.,1.);
          float v=mix(.42,t.r,uDetail)+(t.g-.5)*.2+vTone+lam*.3*(.6+.4*vShade)+(vShade-.5)*.34;
          c=ramp(v,vRow);
          if(uSnow>.01) c=mix(c,ramp(.45+v*.6,uIceRow),uSnow*smoothstep(.1,.6,t.b)*smoothstep(-.3,.35,normalize(vN).y));
          c*=mix(uShade,uLit,smoothstep(.08,.7,v));
          float back=pow(max(dot(vV,uSunDirW),0.),4.); c=mix(c,ramp(v+.3,vRow)*uLit*1.6,back*uGlow*(.26+.74*vShade)); }           // sun through the leaves
        c*=cloudShade(vP);
        c=mix(c,uFog+uFogSun*pow(max(dot(vV,uSunDirW),0.),6.),vFog);
        gl_FragColor=vec4(c,a); }` });
}

/* Lambert blades: they take the same light and shadows as the ground they grow from */
const BLADE_COMMON=`uniform sampler2D uRamps; uniform float uSnow,uGroundRow,uTuftRow,uSpan,uGlow,uSeason; uniform vec4 uPush,uPush2; uniform vec3 uSunDirW; ${WIND} ${RAMP_GLSL}
  varying vec3 vCol; varying vec2 vG; varying float vBack;
  vec2 pushAway(vec2 g,float s,inout float sink){ vec2 o=vec2(0.); for(int i=0;i<2;i++){ vec4 P=i==0?uPush:uPush2; vec2 d=g-P.xy; float l=length(d), k=1.-smoothstep(.15,P.z,l); o+=d/max(l,.01)*k*.46*s; sink+=k*.3; } return o; }`;
function bladeMaterial(kind){
  const m=new THREE.MeshLambertMaterial({color:0xffffff,side:THREE.DoubleSide});
  m.defines={ ...(m.defines||{}), [kind]:1 };
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,WIND_U(),{ uRamps:U.uRamps, uSnow:U.uSnow, uGroundRow:{value:rowV('ground')}, uTuftRow:{value:rowV('tuft')}, uSpan:{value:bladeSpan}, uPush:U.uPush, uPush2:U.uPush2, uSunDirW:U.uSunDirW, uGlow:U.uGlow, uSeason:U.uSeason, uLitC:U.uLit, uCloud:U.uCloud, uCloudOff:U.uCloudOff, uCloudAmt:U.uCloudAmt, uCloudTint:U.uCloudTint });
    sh.vertexShader=`attribute vec3 aBlade; attribute vec4 iA; attribute vec4 iB; attribute vec3 aCol; attribute float aSeason;\n${BLADE_COMMON}\n`+sh.vertexShader
     .replace('#include <beginnormal_vertex>',kind==='DECO'?'vec3 objectNormal=normal;':'vec3 objectNormal=vec3(0.,1.,0.);')
     .replace('#include <begin_vertex>',`
      float s=max(aBlade.x,0.); vec2 g; float h, size, rot=0.;
      #ifdef DECO
       g=position.xz; h=position.y; size=1.; vec3 p=vec3(0.);
       float hide=1.-mod(floor(aSeason/pow(2.,uSeason)),2.);
      #else
       g=iA.xz; h=iA.y; size=iA.w*(1.-smoothstep(uSpan*.36,uSpan*.49,distance(g,cameraPosition.xz))); rot=iB.x;
       #ifdef CARPET
        size*=1.-uSnow*.9;
       #endif
       float c0=cos(rot), s0=sin(rot); vec3 p=position*size; p.xz=mat2(c0,-s0,s0,c0)*p.xz;
      #endif
      float gust=gustAt(g), amp=uWindAmp*(.3+1.2*gust), sink=0.;
      vec2 sway=uWindDir*(.04+.32*amp)*s*s*size*1.6+vec2(-uWindDir.y,uWindDir.x)*sin(uTime*2.7+g.x*1.6+g.y*1.1+aBlade.y*6.)*.05*amp*s*size*1.6;
      sway+=uWindDir*sin(uTime*3.4-dot(g,uWindDir)*.9+aBlade.y*3.)*.1*amp*s*s*size;
      sway+=pushAway(g,s,sink); p.y*=1.-sink*s;
      vec3 transformed=vec3(g.x+p.x+sway.x,h+p.y-.03,g.y+p.z+sway.y);
      vG=g; vBack=s*s*pow(max(dot(normalize(transformed-cameraPosition),uSunDirW),0.),4.)*uGlow*1.15;
      #ifdef DECO
       transformed.y+=0.; if(hide>.5) transformed=vec3(0.,-900.,0.);
       vCol=aBlade.z<.5?ramp(.26+s*.5,uTuftRow)*.9:aCol; vBack*=aBlade.z<.5?1.:1.4;
      #elif defined(CARPET)
       vCol=ramp(iB.y+s*.26+aBlade.z*.1,uGroundRow)*(.5+.72*s)*1.2*(1.-iB.z*.24);
      #else
       vCol=aBlade.x<0.?vec3(.05,.03,.02):ramp(.2+s*.62+aBlade.z*.16+iB.y,uTuftRow)*(.62+.6*s)*1.2;
      #endif
    `);
    let f=`varying vec3 vCol; varying vec2 vG; varying float vBack; uniform vec3 uLitC; ${CLOUD_GLSL}\n`+sh.fragmentShader.replace('#include <map_fragment>','diffuseColor.rgb*=vCol*cloudShade(vG);').replace('#include <opaque_fragment>','outgoingLight+=vCol*uLitC*vBack;\n#include <opaque_fragment>');
    if(kind!=='DECO') f=f.replace('#include <normal_fragment_begin>','vec3 normal=normalize(vNormal);');
    sh.fragmentShader=f;
  };
  return m;
}

/* ---------- ground chunks: grass and small things, baked on the CPU once and kept ---------- */
const CH=14, chunks=new Map(), ckey=(i,j)=>i*20011+j;
let carpetBase=null, carpetMat=null, decoMat=null, chunkRoot=null, chunkDens=3, chunkQueue=[], tileR=null, chunkFrame=0;
function readTile(){ const c=document.createElement('canvas'); c.width=c.height=512; const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(TEX.ground_tile.image,0,0,512,512); const d=x.getImageData(0,0,512,512).data; tileR=new Uint8Array(512*512); for(let i=0;i<tileR.length;i++) tileR[i]=d[i*4]; }
const tileAt=(x,z,sc)=>{ const u=x/sc, v=z/sc, i=Math.floor((u-Math.floor(u))*512)%512, j=Math.floor((v-Math.floor(v))*512)%512; return tileR[j*512+i]/255; };
/* little modelled things. Each proto: P position, N normal, W sway/part, I index; a part of 0 takes the stem colour */
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
function proto(){ return {P:[],N:[],W:[],I:[],C:[],
  tri(a,b,c,col,part=1,sway=[1,1,1]){ const n=b.clone().sub(a).cross(c.clone().sub(a)).normalize(), o=this.P.length/3; [a,b,c].forEach((p,i)=>{ this.P.push(p.x,p.y,p.z); this.N.push(n.x,n.y,n.z); this.W.push(sway[i],part); this.C.push(...col); }); this.I.push(o,o+1,o+2); },
  quad(a,b,c,d,col,part=1,sway=[1,1,1,1]){ this.tri(a,b,c,col,part,[sway[0],sway[1],sway[2]]); this.tri(a,c,d,col,part,[sway[0],sway[2],sway[3]]); } }; }
const STEM=[0,0,0];
function stem(p,h,w=.022,bend=.06){ p.quad(V3(-w,0,0),V3(w,0,0),V3(w*.7+bend,h,0),V3(-w*.7+bend,h,0),STEM,0,[0,0,1,1]); p.quad(V3(0,0,-w),V3(0,0,w),V3(bend,h,w*.7),V3(bend,h,-w*.7),STEM,0,[0,0,1,1]); return V3(bend,h,0); }
function leafOn(p,y,a,l,w){ const ca=Math.cos(a), sa=Math.sin(a), b=V3(0,y,0), m=V3(ca*l*.5-sa*w,y+l*.34,sa*l*.5+ca*w), e=V3(ca*l,y+l*.3,sa*l), m2=V3(ca*l*.5+sa*w,y+l*.34,sa*l*.5-ca*w); p.quad(b,m,e,m2,STEM,0,[.3,.6,.9,.6]); }
function petals(p,c,n,L,W,lift,col,center,cy=.02){ for(let i=0;i<n;i++){ const a=i/n*tau, ca=Math.cos(a), sa=Math.sin(a), b=V3(c.x+ca*.015,c.y,c.z+sa*.015), e=V3(c.x+ca*L,c.y+lift,c.z+sa*L), s1=V3(c.x+ca*L*.55-sa*W,c.y+lift*.8,c.z+sa*L*.55+ca*W), s2=V3(c.x+ca*L*.55+sa*W,c.y+lift*.8,c.z+sa*L*.55-ca*W); p.quad(b,s1,e,s2,col,1); }
  if(center){ const r=L*.3; for(let i=0;i<6;i++){ const a=i/6*tau, a2=(i+1)/6*tau; p.tri(V3(c.x,c.y+cy+r*.5,c.z),V3(c.x+Math.cos(a)*r,c.y+cy,c.z+Math.sin(a)*r),V3(c.x+Math.cos(a2)*r,c.y+cy,c.z+Math.sin(a2)*r),center,2); } } }
function capOn(p,c,R,H,col,under,spots){ const LAT=3, LON=8, ring=j=>{ const t=j/LAT*Math.PI*.5; return [Math.sin(t)*R,Math.cos(t)*H]; };
  for(let j=0;j<LAT;j++) for(let i=0;i<LON;i++){ const a=i/LON*tau, a2=(i+1)/LON*tau, [r0,y0]=ring(j), [r1,y1]=ring(j+1), cc=spots&&((i*3+j*5)%7===0)?spots:col; p.quad(V3(c.x+Math.cos(a)*r0,c.y+y0,c.z+Math.sin(a)*r0),V3(c.x+Math.cos(a2)*r0,c.y+y0,c.z+Math.sin(a2)*r0),V3(c.x+Math.cos(a2)*r1,c.y+y1,c.z+Math.sin(a2)*r1),V3(c.x+Math.cos(a)*r1,c.y+y1,c.z+Math.sin(a)*r1),cc,1,[0,0,0,0]); }
  for(let i=0;i<LON;i++){ const a=i/LON*tau, a2=(i+1)/LON*tau; p.tri(V3(c.x,c.y+.01,c.z),V3(c.x+Math.cos(a2)*R,c.y,c.z+Math.sin(a2)*R),V3(c.x+Math.cos(a)*R,c.y,c.z+Math.sin(a)*R),under,1,[0,0,0]); } }
function cyl(p,a,b,r0,r1,col,col2,sides=6){ const d=b.clone().sub(a).normalize(), s=Math.abs(d.y)>.9?V3(1,0,0):V3(0,1,0), u=d.clone().cross(s).normalize(), v=d.clone().cross(u); for(let i=0;i<sides;i++){ const t=i/sides*tau, t2=(i+1)/sides*tau, e=(q,r)=>u.clone().multiplyScalar(Math.cos(q)*r).add(v.clone().multiplyScalar(Math.sin(q)*r)), top=e(t,1).y>.25; p.quad(a.clone().add(e(t,r0)),a.clone().add(e(t2,r0)),b.clone().add(e(t2,r1)),b.clone().add(e(t,r1)),top&&col2?col2:col,1,[0,0,0,0]); } }
const lin=h=>{ const c=new THREE.Color(h); return [c.r,c.g,c.b]; };
let PROTO=null;
function protos(){ if(PROTO) return PROTO; const r=rng(77), P={};
  const fl=(name,fn)=>{ const p=proto(); fn(p); P[name]=p; };
  fl('daisy',p=>{ const c=stem(p,.62,.016); leafOn(p,.14,1,.3,.07); leafOn(p,.22,3.6,.26,.06); petals(p,c,11,.17,.034,.03,lin(0xf6f2e4),lin(0xe8b230)); });
  fl('poppy',p=>{ const c=stem(p,.78,.014,.08); leafOn(p,.2,.5,.34,.07); leafOn(p,.3,3.1,.3,.08); petals(p,c,5,.17,.12,.09,lin(0xd24e2a),lin(0x2a2018)); });
  fl('cup',p=>{ const c=stem(p,.56,.018,.03); leafOn(p,.02,2,.42,.1); leafOn(p,.04,5,.4,.09); petals(p,c,6,.1,.07,.17,lin(0xe6a4b8),lin(0xe8cc60),.05); });
  fl('bell',p=>{ const c=stem(p,.7,.012,.18); for(let i=0;i<3;i++){ const k=.55+i*.2, q=V3(.18*k*k+.04,.7*k-.07,(i-1)*.05); petals(p,q,5,.05,.03,-.09,lin(0x6a78c8)); } leafOn(p,.06,1,.34,.05); leafOn(p,.06,4,.32,.05); void c; });
  fl('aster',p=>{ const c=stem(p,.66,.015,.04); const d=stem(p,.5,.012,-.1); leafOn(p,.2,2.4,.24,.05); petals(p,c,14,.13,.022,.02,lin(0x9a66c0),lin(0xe8c040)); petals(p,d,14,.1,.02,.02,lin(0x8656ae),lin(0xe8c040)); });
  fl('buttercup',p=>{ for(let i=0;i<3;i++){ const b=proto(); const c=stem(b,.32+i*.1,.012,.03); const ox=[-.09,.08,.0][i], oz=[.04,.05,-.08][i]; petals(b,c,5,.07,.05,.04,lin(0xecc22c),lin(0xd89a20)); b.P.forEach((v,k)=>{ p.P.push(v+(k%3===0?ox:k%3===2?oz:0)); }); const o=p.W.length/2; p.N.push(...b.N); p.W.push(...b.W); p.C.push(...b.C); b.I.forEach(q=>p.I.push(q+o)); } leafOn(p,.02,1,.2,.06); });
  fl('mush',p=>{ cyl(p,V3(0,0,0),V3(.02,.26,0),.05,.04,lin(0xe8dcc0),null,6); capOn(p,V3(.02,.24,0),.17,.12,lin(0xa83a24),lin(0xe0d0b0),lin(0xf4ecd8)); cyl(p,V3(.2,0,.1),V3(.2,.14,.1),.03,.025,lin(0xe8dcc0),null,5); capOn(p,V3(.2,.13,.1),.09,.06,lin(0xb84a2c),lin(0xe0d0b0),lin(0xf4ecd8)); });
  fl('cep',p=>{ cyl(p,V3(0,0,0),V3(0,.2,0),.075,.055,lin(0xdcc8a0),null,6); capOn(p,V3(0,.19,0),.16,.1,lin(0x7a4c2a),lin(0xc8ac78)); });
  fl('twig',p=>{ cyl(p,V3(-.6,.03,0),V3(0,.05,.05),.03,.024,lin(0x4a3628),lin(0x5c4632),5); cyl(p,V3(0,.05,.05),V3(.55,.03,-.04),.024,.012,lin(0x4a3628),lin(0x5c4632),5); cyl(p,V3(.05,.05,.05),V3(.3,.08,.26),.014,.006,lin(0x4a3628),null,4); });
  fl('log',p=>{ const b=lin(0x4e3a2c), m=lin(0x5c6e30); for(let i=0;i<3;i++){ const x0=-1.5+i, x1=x0+1, y0=.26-.02*i, y1=.24-.02*i; cyl(p,V3(x0,y0,(i%2)*.05),V3(x1,y1,((i+1)%2)*.05),.28-.03*i,.25-.03*i,b,m,9); } for(let i=0;i<9;i++){ const a=i/9*tau, a2=(i+1)/9*tau; p.tri(V3(-1.5,.26,0),V3(-1.5,.26+Math.sin(a2)*.28,Math.cos(a2)*.28),V3(-1.5,.26+Math.sin(a)*.28,Math.cos(a)*.28),lin(0xb08a60),1,[0,0,0]); p.tri(V3(-1.5,.26,0),V3(-1.5,.26+Math.sin(a2)*.14,Math.cos(a2)*.14),V3(-1.5,.26+Math.sin(a)*.14,Math.cos(a)*.14),lin(0x8c6840),1,[0,0,0]); } });
  fl('stump',p=>{ const b=lin(0x4e3a2c); cyl(p,V3(0,-.1,0),V3(0,.46,0),.42,.34,b,lin(0x5c6e30),10); for(let i=0;i<10;i++){ const a=i/10*tau, a2=(i+1)/10*tau, q=(k,R)=>V3(Math.cos(k)*R,.46,Math.sin(k)*R); p.tri(V3(0,.47,0),q(a2,.34),q(a,.34),lin(0xb8966c),1,[0,0,0]); p.tri(V3(0,.475,0),q(a2,.2),q(a,.2),lin(0xa07c52),1,[0,0,0]); } });
  fl('lily',p=>{ const g=lin(0x3c6e3a), g2=lin(0x508a44); for(let i=0;i<11;i++){ const a=.3+i/11*(tau-.5), a2=.3+(i+1)/11*(tau-.5), R=.46; p.tri(V3(0,.005,0),V3(Math.cos(a2)*R,0,Math.sin(a2)*R),V3(Math.cos(a)*R,0,Math.sin(a)*R),i%3?g:g2,1,[0,0,0]); } });
  fl('lilyf',p=>{ const c=V3(0,.03,0); petals(p,c,9,.26,.07,.07,lin(0xf6e6ea),null); petals(p,V3(0,.05,0),7,.17,.055,.13,lin(0xf8d4dc),lin(0xecc030)); });
  fl('cat',p=>{ for(let i=0;i<4;i++){ const ox=[0,.12,-.1,.04][i], oz=[0,.06,.08,-.1][i], h=1.5+i*.18; p.quad(V3(ox-.016,0,oz),V3(ox+.016,0,oz),V3(ox+.04+.012,h,oz),V3(ox+.04-.012,h,oz),STEM,0,[0,0,1,1]); if(i<3){ const q=proto(); cyl(q,V3(ox+.04,h-.42,oz),V3(ox+.04,h-.06,oz),.05,.05,lin(0x4c2e1c),null,6); const o=p.P.length/3; p.P.push(...q.P); p.N.push(...q.N); q.W.forEach((v,k)=>p.W.push(k%2?v:1)); p.C.push(...q.C); q.I.forEach(k=>p.I.push(k+o)); } } });
  const peb=(nm,sy)=>{ let g=new THREE.IcosahedronGeometry(1,1); const p=proto(), a=g.attributes.position, c=lin(0x8a7a70); for(let i=0;i<a.count;i+=3){ const v=[0,1,2].map(k=>{ const x=a.getX(i+k),y=a.getY(i+k),z=a.getZ(i+k), n=1+Math.sin(x*3.1+y*4.3+z*2.7)*.16; return V3(x*n,Math.max(y*sy,-.06),z*n); }); p.tri(v[0],v[1],v[2],c,1,[0,0,0]); } P[nm]=p; };
  peb('peb',.62); peb('peb2',.42);
  return P; }
const put=(a,pr,x,y,z,sc,rot,col,seas,ph,sy=1)=>{ const c=Math.cos(rot), s=Math.sin(rot), o=a.P.length/3; for(let i=0;i<pr.P.length;i+=3){ const px=pr.P[i]*sc, py=pr.P[i+1]*sc*sy, pz=pr.P[i+2]*sc, nx=pr.N[i], ny=pr.N[i+1], nz=pr.N[i+2]; a.P.push(x+px*c+pz*s,y+py,z-px*s+pz*c); a.N.push(nx*c+nz*s,ny,-nx*s+nz*c); const k=i/3; a.B.push(pr.W[k*2],ph,pr.W[k*2+1]); const q=col?col:1; if(col&&pr.W[k*2+1]>.5&&pr.W[k*2+1]<1.5) a.C.push(pr.C[k*3]*q[0],pr.C[k*3+1]*q[1],pr.C[k*3+2]*q[2]); else a.C.push(pr.C[k*3],pr.C[k*3+1],pr.C[k*3+2]); a.S.push(seas); } for(const q of pr.I) a.I.push(q+o); };
const SP=1,SU=2,FA=4,WI=8,GROW=SP|SU|FA, ALL=15;
const MEADOW=[['daisy',SP|SU],['cup',SP],['buttercup',SP|SU],['poppy',SU],['bell',SP],['aster',FA|SU],['aster',FA]];
function bakeChunk(ci,cj){
  const x0=ci*CH, z0=cj*CH, r=rng((ci*73856093^cj*19349663)>>>0), N=Math.round(CH*CH*chunkDens), A=new Float32Array(N*4), B=new Float32Array(N*4); let n=0;
  for(let i=0;i<N;i++){ const x=x0+r()*CH, z=z0+r()*CH, sp=splatAt(x,z), h=heightAt(x,z); let keep=(1-sstep(.2,.55,sp[1]))*(1-sstep(.3,.8,sp[2]))*sstep(-.75,-.45,h); if(keep<.04||blockedAt(x,z)) { r();r();r(); continue; }
    const gv=(tileAt(x,z,9)*.72+tileAt(x,z,31)*.34-.1)*1.1; A[n*4]=x; A[n*4+1]=h; A[n*4+2]=z; A[n*4+3]=keep*(.34+.3*r()); B[n*4]=r()*tau; B[n*4+1]=gv; B[n*4+2]=sp[0]; B[n*4+3]=r(); n++; }
  const D={P:[],N:[],B:[],C:[],S:[],I:[]}, PR=protos();
  const m=Math.round(CH*CH*.5);
  for(let i=0;i<m;i++){ const x=x0+r()*CH, z=z0+r()*CH, f=lakeField(x,z), kind=r(), sc=r(), rot=r()*tau, ph=r();
    if(f>.004){ if(f<.07&&vnoise(x*.07+4,z*.07)>.56&&i%2===0){ const pad=kind<.86; put(D,PR[pad?'lily':'lilyf'],x,WATER_Y+.03,z,pad?.8+sc*.9:.9+sc*.4,rot,null,pad?GROW:SU|SP,ph); } continue; }
    const sp=splatAt(x,z), h=heightAt(x,z); if(blockedAt(x,z)||h<WATER_Y+.1) continue;
    if(f>-.012&&kind<.3&&vnoise(x*.09,z*.09)>.42){ put(D,PR.cat,x,h,z,.9+sc*.5,rot,null,GROW,ph); continue; }
    if(sp[2]>.45||sp[1]>.4){ if(kind<.2) put(D,PR[sc<.5?'peb':'peb2'],x,h,z,.05+sc*sc*.15,rot,[.8+ph*.5,.8+ph*.45,.8+ph*.42],ALL,0); continue; }
    if(sp[0]>.4){ const q=vnoise(x*.13+9,z*.13); if(kind<.05) put(D,PR[sc<.6?'mush':'cep'],x,h,z,.8+sc*.8,rot,null,sc<.3?SU|FA:FA|SP,0); else if(kind<.11) put(D,PR.twig,x,h,z,.8+sc*.9,rot,null,ALL,0); else if(kind<.112&&q>.5) put(D,PR.log,x,h,z,1+sc*.6,rot,null,ALL,0); else if(kind<.114) put(D,PR.stump,x,h,z,1+sc*.5,rot,null,ALL,0); continue; }
    const pat=vnoise(x*.09+21,z*.09+3); if(pat<.46||kind>(pat-.4)*2.8) continue;
    const sp2=MEADOW[Math.floor(vnoise(x*.05+2,z*.05+8)*MEADOW.length*.999)]; put(D,PR[sp2[0]],x,h-.02,z,.7+sc*.75,rot,[.86+ph*.28,.86+ph*.28,.86+ph*.28],sp2[1],ph);
  }
  return {A:A.subarray(0,n*4),B:B.subarray(0,n*4),n,D};
}
const sstep=(a,b,x)=>{ const t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };
function makeChunk(i,j,old){
  const b=bakeChunk(i,j), cx=(i+.5)*CH, cz=(j+.5)*CH, g=new THREE.InstancedBufferGeometry(); g.index=carpetBase.index; g.setAttribute('position',carpetBase.attributes.position); g.setAttribute('aBlade',carpetBase.attributes.aBlade);
  g.setAttribute('iA',new THREE.InstancedBufferAttribute(b.A,4)); g.setAttribute('iB',new THREE.InstancedBufferAttribute(b.B,4)); g.instanceCount=b.n; const y=heightAt(cx,cz); g.boundingSphere=new THREE.Sphere(new THREE.Vector3(cx,y,cz),CH*.78+Math.abs(y)*.2+2);
  const o=new THREE.Mesh(g,carpetMat); o.layers.set(1); o.receiveShadow=true; chunkRoot.add(o);
  const dg=new THREE.BufferGeometry(); let dm=null;
  if(b.D.I.length){ dg.setAttribute('position',new THREE.Float32BufferAttribute(b.D.P,3)); dg.setAttribute('normal',new THREE.Float32BufferAttribute(b.D.N,3)); dg.setAttribute('aBlade',new THREE.Float32BufferAttribute(b.D.B,3)); dg.setAttribute('aCol',new THREE.Float32BufferAttribute(b.D.C,3)); dg.setAttribute('aSeason',new THREE.Float32BufferAttribute(b.D.S,1)); dg.setIndex(b.D.I); dg.boundingSphere=g.boundingSphere.clone();
    dm=new THREE.Mesh(dg,decoMat); dm.layers.set(1); dm.receiveShadow=true; chunkRoot.add(dm); }
  if(old){ chunkRoot.remove(old.o); old.o.geometry.dispose(); if(old.dm){ chunkRoot.remove(old.dm); old.dm.geometry.dispose(); } }
  const c={i,j,o,dm,n:b.n,cx,cz}; chunks.set(ckey(i,j),c); return c;
}
const dirty=new Set();
function updateChunks(cam,budget){
  const R=radP+CH*.8, mi=Math.floor(cam.x/CH), mj=Math.floor(cam.z/CH), Rc=Math.ceil(R/CH); chunkQueue.length=0;
  for(const c of chunks.values()){ const d=Math.hypot(c.cx-cam.x,c.cz-cam.z), on=d<R; c.o.visible=on; if(c.dm) c.dm.visible=on&&d<radP; c.o.geometry.instanceCount=d<radP*.56?c.n:Math.floor(c.n*.62); }
  for(let i=mi-Rc;i<=mi+Rc;i++) for(let j=mj-Rc;j<=mj+Rc;j++){ const x=(i+.5)*CH, z=(j+.5)*CH, d=Math.hypot(x-cam.x,z-cam.z), k=ckey(i,j); if(d<R&&(!chunks.has(k)||dirty.has(k))) chunkQueue.push([d,i,j,k]); }
  chunkQueue.sort((a,b)=>a[0]-b[0]);
  for(let q=0;q<Math.min(budget,chunkQueue.length);q++){ const [,i,j,k]=chunkQueue[q]; dirty.delete(k); makeChunk(i,j,chunks.get(k)); }
  if(chunks.size>260){ const far=[...chunks.values()].sort((a,b)=>Math.hypot(b.cx-cam.x,b.cz-cam.z)-Math.hypot(a.cx-cam.x,a.cz-cam.z)).slice(0,chunks.size-220); for(const c of far){ chunkRoot.remove(c.o); c.o.geometry.dispose(); if(c.dm){ chunkRoot.remove(c.dm); c.dm.geometry.dispose(); } chunks.delete(ckey(c.i,c.j)); } }
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
const RAD={ low:[30,20,2], med:[46,28,3.2], high:[62,36,4.2] };
let radT=46, radP=28, lastX=1e9, lastZ=1e9;
export function setupFlora(root,trees,plants,qual){
  const [rt,rp,dens]=RAD[qual]||RAD.med; radT=rt; radP=rp; U.uLodT.value=rt; U.uLodP.value=rp; bladeSpan=rp*2; chunkDens=dens; chunkRoot=root; readTile();
  const mat=floraMaterial(false), dep=floraMaterial(true);
  [[0,.16,36,.42],[1,.15,32,.5],[2,.18,38,.36]].forEach(([i,w,n,d])=>variant(root,'con'+i,conifer(11+i,{width:w,whorls:n,droop:d}),170,mat,dep));
  [[0,.125,32,.56],[1,.135,30,.5]].forEach(([i,w,n,d])=>variant(root,'lar'+i,conifer(31+i,{width:w,whorls:n,droop:d,fill:.9}),110,mat,dep));
  const lm=floraMaterial(false,false,true); [0,1].forEach(i=>variant(root,'bro'+i,broadleaf(51+i),110,lm,dep));
  const pm=floraMaterial(false,true,true); variant(root,'shr',shrub(3),260,pm); variant(root,'fer',fern(4),320,pm);
  const tm=bladeMaterial('TUFT');
  bladeVariant(root,'tuf0',bladeClump(5,48,.2,.55,false,.7),1400,tm); bladeVariant(root,'tuf1',bladeClump(6,42,.25,1,false,.7),1400,tm); bladeVariant(root,'ree',bladeClump(7,18,.14,.14,true,.8),520,tm);
  // the carpet: short grass baked chunk by chunk around the camera, plus the small things that grow in it
  carpetBase=bladeClump(8,12,.85,.8,false,1.7); carpetMat=bladeMaterial('CARPET'); decoMat=bladeMaterial('DECO');
  blockHook.fn=(x,z,hx,hz)=>{ for(let i=Math.floor((x-hx)/CH);i<=Math.floor((x+hx)/CH);i++) for(let j=Math.floor((z-hz)/CH);j<=Math.floor((z+hz)/CH);j++){ const k=ckey(i,j); if(chunks.has(k)) dirty.add(k); } };
  for(const list of [trees,plants]) for(const it of list){ it.v=pickVar(it); if(!it.v) continue; if(it.trueH===undefined) it.trueH=it.h; const k=key(it.x,it.z); if(!cells.has(k)) cells.set(k,[]); cells.get(k).push(it); }
}
export const refreshFlora=()=>{ lastX=1e9; };
export function updateFlora(cam){
  if(chunkFrame++%6===0||dirty.size) updateChunks(cam,chunkFrame<3?999:2);
  const cx=cam.x, cz=cam.z; if(Math.hypot(cx-lastX,cz-lastZ)<2.6) return; lastX=cx; lastZ=cz;
  for(const k in VAR) VAR[k].n=0;
  const Rc=Math.ceil(radT/CELL), mx=Math.floor(cx/CELL), mz=Math.floor(cz/CELL);
  for(let i=mx-Rc;i<=mx+Rc;i++) for(let j=mz-Rc;j<=mz+Rc;j++){ const l=cells.get(i*8192+j); if(!l) continue;
    for(const it of l){ if(it.gone) continue; const V=VAR[it.v], lim=V.kind==='blade'||it.v==='shr'||it.v==='fer'?radP:radT, dx=it.x-cx, dz=it.z-cz; if(dx*dx+dz*dz>lim*lim||V.n>=V.cap) continue; const n=V.n++;
      if(V.kind==='flora'){ V.a.setXYZ(n,it.x,it.y,it.z); V.b.setXYZW(n,it.v==='shr'?it.trueH*1.1:it.v==='fer'?it.trueH*1.5:it.trueH,rowV(it.row),it.tone||0,(it.x*7.3+it.z*3.1)%6.28); }
      else { V.a.setXYZW(n,it.x,it.y,it.z,it.trueH*1.05); V.b.setXYZW(n,(it.x*7.3+it.z*3.1)%6.28,it.tone||0,0,0); } } }
  for(const k in VAR){ const V=VAR[k]; V.g.instanceCount=V.n; V.a.needsUpdate=true; V.b.needsUpdate=true; }
}
