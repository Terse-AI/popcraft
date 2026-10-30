/* The small life of the valley: dust caught in the sun, leaves and petals tumbling down, dragonflies working
   the shallows, rings where fish rise. Everything here wraps around the camera, so it costs the same anywhere. */
import * as THREE from 'three';
import { U, lakeField, WATER_Y, terrainH } from './scenery.js';

const tau=Math.PI*2;
let motes=null, leaves=null, leafD=[], flies=null, flyD=[], rings=[], dummy=new THREE.Object3D(), col=new THREE.Color(), active=true;
const SEASONC=[[0xf6c6d6,0xfbe4ea,0xf0b0c8],[0x7c9c44,0x96a850,0x6e8c3c],[0xd2642a,0xe49a30,0xb43c1e],[0xffffff,0xffffff,0xffffff]];

function buildMotes(root){
  const N=220, g=new THREE.BufferGeometry(), P=new Float32Array(N*3), A=new Float32Array(N); for(let i=0;i<N;i++){ P.set([Math.random()*30,Math.random()*9,Math.random()*30],i*3); A[i]=Math.random(); }
  g.setAttribute('position',new THREE.BufferAttribute(P,3)); g.setAttribute('aPh',new THREE.BufferAttribute(A,1));
  const m=new THREE.ShaderMaterial({ transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false, toneMapped:false, uniforms:{ uTime:U.uTime, uLit:U.uLit, uSun:U.uSunDirW, uGlow:U.uGlow, uAmt:{value:1} },
    vertexShader:`attribute float aPh; uniform float uTime; uniform vec3 uSun; varying float vA;
      void main(){ vec3 q=position+vec3(sin(uTime*.13+aPh*9.)*1.3+uTime*.16,sin(uTime*.21+aPh*20.)*.7,cos(uTime*.11+aPh*14.)*1.3+uTime*.09); vec3 box=vec3(30.,9.,30.); vec3 p=mod(q-cameraPosition+box*.5,box)-box*.5+cameraPosition; p.y=cameraPosition.y-2.+mod(q.y,9.);
        vec3 v=p-cameraPosition; float d=length(v); vA=(.25+.75*pow(max(dot(v/d,uSun),0.),3.))*smoothstep(2.,4.,d)*(1.-smoothstep(11.,15.,d)); vec4 mv=viewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=(1.+aPh*1.8)*15./max(d,2.); }`,
    fragmentShader:`precision highp float; uniform vec3 uLit; uniform float uGlow,uAmt; varying float vA; void main(){ float r=length(gl_PointCoord-.5)*2.; float a=(1.-smoothstep(.1,1.,r))*vA*uGlow*uAmt*.55; if(a<.004) discard; gl_FragColor=vec4(uLit*a,1.); }` });
  motes=new THREE.Points(g,m); motes.frustumCulled=false; motes.layers.set(1); root.add(motes);
}
function buildLeaves(root){
  const N=110, g=new THREE.BufferGeometry(), P=[0,0,-.5, .22,.05,-.1, 0,0,.5, -.22,.05,-.1], I=[0,1,2,0,2,3]; g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setIndex(I); g.computeVertexNormals();
  leaves=new THREE.InstancedMesh(g,new THREE.MeshLambertMaterial({color:0xffffff,side:THREE.DoubleSide}),N); leaves.frustumCulled=false; leaves.layers.set(1); leaves.castShadow=false; root.add(leaves);
  for(let i=0;i<N;i++){ leafD.push({x:Math.random()*44,y:Math.random()*15,z:Math.random()*44,v:.5+Math.random()*.6,ph:Math.random()*tau,rx:1.5+Math.random()*2.5,ry:1+Math.random()*2,s:.11+Math.random()*.1}); leaves.setColorAt(i,col.set(0xffffff)); }
}
function buildFlies(root){
  const P=[], W=[], Cc=[], add=(a,b,c,w,cl)=>{ for(const q of [a,b,c]){ P.push(...q); W.push(w); Cc.push(...cl); } };
  const body=[.05,.09,.1], tail=[.04,.2,.28];
  for(let i=0;i<6;i++){ const a=i/6*tau, a2=(i+1)/6*tau, r=.016; add([Math.cos(a)*r,Math.sin(a)*r,.08],[Math.cos(a2)*r,Math.sin(a2)*r,.08],[0,0,-.34],0,tail); add([Math.cos(a)*r*1.5,Math.sin(a)*r*1.5,.05],[Math.cos(a2)*r*1.5,Math.sin(a2)*r*1.5,.05],[0,0,.13],0,body); }
  const wing=[.78,.84,.9]; for(const s of [-1,1]) for(const z of [.05,-.02]){ add([0,.01,z],[s*.27,.02,z+.05],[s*.28,.02,z-.03],s,wing); add([0,.01,z],[s*.28,.02,z-.03],[s*.1,.015,z-.07],s,wing); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('aW',new THREE.Float32BufferAttribute(W,1)); g.setAttribute('aC',new THREE.Float32BufferAttribute(Cc,3));
  const m=new THREE.ShaderMaterial({ side:THREE.DoubleSide, transparent:true, depthWrite:false, fog:false, toneMapped:false, uniforms:{ uTime:U.uTime, uLit:U.uLit },
    vertexShader:`attribute float aW; attribute vec3 aC; uniform float uTime; varying vec3 vC; varying float vA;
      void main(){ vec3 p=position; float fl=sin(uTime*72.+float(gl_InstanceID)*2.)*.14*aW; p.y+=fl*abs(p.x)*5.; vC=aC; vA=aW==0.?1.:.42; gl_Position=projectionMatrix*viewMatrix*instanceMatrix*vec4(p,1.); }`,
    fragmentShader:`precision highp float; uniform vec3 uLit; varying vec3 vC; varying float vA; void main(){ gl_FragColor=vec4(vC*uLit*.8,vA); }` });
  flies=new THREE.InstancedMesh(g,m,14); flies.frustumCulled=false; flies.layers.set(1); root.add(flies);
  for(let i=0;i<14;i++){ let x=0,z=0; for(let k=0;k<400;k++){ x=(Math.random()-.5)*300; z=20+Math.random()*190; const f=lakeField(x,z); if(f>-.01&&f<.03) break; } flyD.push({hx:x,hz:z,x,y:WATER_Y+.6,z,tx:x,ty:WATER_Y+.7,tz:z,wait:Math.random()*2,yaw:0}); }
}
function buildRings(root){ const g=new THREE.RingGeometry(.86,1,40); g.rotateX(-Math.PI/2); for(let i=0;i<6;i++){ const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false,fog:false,toneMapped:false})); m.layers.set(1); m.visible=false; root.add(m); rings.push({m,t:-Math.random()*6}); } }

export function buildLife(root){ buildMotes(root); buildLeaves(root); buildFlies(root); buildRings(root); }
export function updateLife(t,dt,cam,season,rig,inside){
  const on=!inside; if(on!==active){ active=on; motes.visible=leaves.visible=flies.visible=on; for(const r of rings) r.m.visible=false; }
  if(!on) return;
  const sc=SEASONC[season], count=[70,14,110,0][season], dayK=1-rig.night;
  motes.material.uniforms.uAmt.value=season===3?.25:rig.rain?.1:1;
  leaves.count=rig.rain?0:count;
  for(let i=0;i<leaves.count;i++){ const l=leafD[i]; l.y-=l.v*dt; l.x+=(U.uWindDir.value.x*U.uWindAmp.value*1.1+Math.sin(t*.9+l.ph)*.5)*dt; l.z+=(U.uWindDir.value.y*U.uWindAmp.value*1.1+Math.cos(t*.7+l.ph)*.5)*dt; if(l.y<0){ l.y=14+Math.random()*3; }
    const wrap=(v,c,s)=>c-s/2+(((v-c+s/2)%s)+s)%s, x=wrap(l.x,cam.x,44), z=wrap(l.z,cam.z,44), gy=terrainHFast(x,z);
    dummy.position.set(x,gy+l.y*.8+.2,z); dummy.rotation.set(t*l.rx+l.ph,t*l.ry,Math.sin(t*2+l.ph)*.8); dummy.scale.setScalar(l.s*(season===0?.6:1)); dummy.updateMatrix(); leaves.setMatrixAt(i,dummy.matrix); if(season!==leaves.userData.s) leaves.setColorAt(i,col.set(sc[i%3])); }
  if(season!==leaves.userData.s){ leaves.userData.s=season; if(leaves.instanceColor) leaves.instanceColor.needsUpdate=true; }
  leaves.instanceMatrix.needsUpdate=true;
  flies.visible=(season===0||season===1)&&dayK>.6&&!rig.rain;
  if(flies.visible) flyD.forEach((f,i)=>{ f.wait-=dt; if(f.wait<0){ const k=Math.random(); f.wait=k<.5?.5+Math.random()*2:.15; f.tx=f.hx+(Math.random()-.5)*7; f.tz=f.hz+(Math.random()-.5)*7; f.ty=WATER_Y+.35+Math.random()*1.1; }
      const q=1-Math.exp(-dt*7); f.x+=(f.tx-f.x)*q; f.y+=(f.ty-f.y)*q; f.z+=(f.tz-f.z)*q; const dx=f.tx-f.x, dz=f.tz-f.z; if(dx*dx+dz*dz>.04) f.yaw=Math.atan2(dx,dz);
      dummy.position.set(f.x,f.y+Math.sin(t*9+i)*.015,f.z); dummy.rotation.set(0,f.yaw,0); dummy.scale.setScalar(.72); dummy.updateMatrix(); flies.setMatrixAt(i,dummy.matrix); });
  flies.instanceMatrix.needsUpdate=true;
  for(const r of rings){ r.t+=dt; if(r.t<0) continue; if(r.t<dt*1.5){ let ok=false; for(let k=0;k<8&&!ok;k++){ const a=Math.random()*tau, d=7+Math.random()*34, x=cam.x+Math.cos(a)*d, z=cam.z+Math.sin(a)*d; if(lakeField(x,z)>.03){ r.m.position.set(x,WATER_Y+.03,z); ok=true; } } r.m.visible=ok&&dayK>.15&&season!==3; }
    const q=r.t/3.2; r.m.scale.setScalar(.1+q*2.3); r.m.material.opacity=.42*(1-q)*(1-q); if(q>=1){ r.t=-2-Math.random()*7; r.m.visible=false; } }
}
const terrainHFast=(x,z)=>Math.max(terrainH(x,z),WATER_Y);
