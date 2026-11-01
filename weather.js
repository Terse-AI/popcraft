/* Rain and snow carried by the GPU: every drop's path is worked out in the vertex shader from time alone, inside a box that travels with the camera, so a dense sky costs the CPU nothing.
   Only the main camera sees them, or the lake's mirror would show streaks hanging still. */
import * as THREE from 'three';

const rnd=(a,b)=>a+Math.random()*(b-a);
export function buildWeather(scene,U,groundAt){
  const uK={ rain:{value:0}, snow:{value:0}, splash:{value:0} };

  const R=5400, rg=new THREE.BufferGeometry(), rp=new Float32Array(R*6), rE=new Float32Array(R*2), rS=new Float32Array(R*2);
  for(let i=0;i<R;i++){ const x=rnd(0,48), y=rnd(0,28), z=rnd(0,48), s=Math.random(); for(let k=0;k<2;k++){ rp.set([x,y,z],(i*2+k)*3); rE[i*2+k]=k; rS[i*2+k]=s; } }
  rg.setAttribute('position',new THREE.BufferAttribute(rp,3)); rg.setAttribute('aE',new THREE.BufferAttribute(rE,1)); rg.setAttribute('aS',new THREE.BufferAttribute(rS,1));
  const rain=new THREE.LineSegments(rg,new THREE.ShaderMaterial({ transparent:true, depthWrite:false, fog:false, toneMapped:false, uniforms:{ uT:U.uTime, uWind:U.uWindDir, uK:uK.rain, uCol:U.uFog },
    vertexShader:`attribute float aE,aS; uniform float uT; uniform vec2 uWind; varying float vA;
      void main(){ vec3 B=vec3(48.,28.,48.), p=position, c=cameraPosition; p.y=mod(p.y-uT*(21.+aS*9.),B.y); p.xz+=uWind*uT*2.4; vec3 q; q.xz=mod(p.xz-c.xz+B.xz*.5,B.xz)-B.xz*.5+c.xz; q.y=c.y-9.+p.y; float len=.6+aS*.7; q.y-=aE*len; q.xz+=uWind*aE*len*.13; float d=length(q-c); vA=(1.-aE*.92)*(.3+.7*aS)*smoothstep(1.2,5.,d)*(1.-smoothstep(16.,25.,d)); gl_Position=projectionMatrix*viewMatrix*vec4(q,1.); }`,
    fragmentShader:`precision highp float; uniform float uK; uniform vec3 uCol; varying float vA; void main(){ gl_FragColor=vec4(mix(uCol,vec3(1.),.6),vA*uK*.62); }` }));
  rain.frustumCulled=false; rain.layers.set(1); rain.visible=false; rain.renderOrder=30; scene.add(rain);

  const N=3400, sg=new THREE.BufferGeometry(), sp=new Float32Array(N*3), sS=new Float32Array(N);
  for(let i=0;i<N;i++){ sp.set([rnd(0,44),rnd(0,20),rnd(0,44)],i*3); sS[i]=Math.random(); }
  sg.setAttribute('position',new THREE.BufferAttribute(sp,3)); sg.setAttribute('aS',new THREE.BufferAttribute(sS,1));
  const snow=new THREE.Points(sg,new THREE.ShaderMaterial({ transparent:true, depthWrite:false, fog:false, toneMapped:false, uniforms:{ uT:U.uTime, uWind:U.uWindDir, uK:uK.snow, uPx:{value:1} },
    vertexShader:`attribute float aS; uniform float uT,uPx; uniform vec2 uWind; varying float vA;
      void main(){ vec3 B=vec3(44.,20.,44.), p=position, c=cameraPosition; float ph=aS*40.; p.y=mod(p.y-uT*(.9+aS*1.1),B.y); p.x+=sin(uT*.6+ph)*1.3+uWind.x*uT*.9; p.z+=cos(uT*.47+ph*1.3)*1.3+uWind.y*uT*.9; vec3 q; q.xz=mod(p.xz-c.xz+B.xz*.5,B.xz)-B.xz*.5+c.xz; q.y=c.y-6.+p.y; float d=length(q-c); vA=(.55+.45*aS)*smoothstep(.3,1.6,d)*(1.-smoothstep(15.,22.,d)); gl_Position=projectionMatrix*viewMatrix*vec4(q,1.); gl_PointSize=clamp((1.2+aS*2.)*uPx*16./max(d,.6),1.2,11.*uPx); }`,
    fragmentShader:`precision highp float; uniform float uK; varying float vA; void main(){ float r=length(gl_PointCoord-.5)*2.; float a=(1.-smoothstep(.25,1.,r))*vA*uK; if(a<.004) discard; gl_FragColor=vec4(1.,.99,.97,a); }` }));
  snow.frustumCulled=false; snow.layers.set(1); snow.visible=false; snow.renderOrder=30; scene.add(snow);

  const H=260, hg=new THREE.BufferGeometry(), hp=new Float32Array(H*3), hT=new Float32Array(H);
  for(let i=0;i<H;i++){ hp.set([0,-500,0],i*3); hT[i]=Math.random(); }
  hg.setAttribute('position',new THREE.BufferAttribute(hp,3).setUsage(THREE.DynamicDrawUsage)); hg.setAttribute('aT',new THREE.BufferAttribute(hT,1));
  const splash=new THREE.Points(hg,new THREE.ShaderMaterial({ transparent:true, depthWrite:false, fog:false, toneMapped:false, uniforms:{ uT:U.uTime, uK:uK.splash, uPx:{value:1} },
    vertexShader:`attribute float aT; uniform float uT,uPx; varying float vL; void main(){ vL=fract(uT*2.6+aT*7.); vec4 mv=viewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=(3.+vL*15.)*uPx*5./max(-mv.z,1.); }`,
    fragmentShader:`precision highp float; uniform float uK; varying float vL; void main(){ float r=length(gl_PointCoord-.5)*2., a=(1.-smoothstep(.0,.2,abs(r-.74)))*(1.-vL)*uK*.55; if(a<.004) discard; gl_FragColor=vec4(.9,.94,1.,a); }` }));
  splash.frustumCulled=false; splash.layers.set(1); splash.visible=false; splash.renderOrder=29; scene.add(splash);

  let next=0, rk=0, sk=0;
  return {
    setPixelRatio(pr){ snow.material.uniforms.uPx.value=pr; splash.material.uniforms.uPx.value=pr; },
    /* how thick the air is, for the far curtain of rain or snow */
    veil:()=>Math.max(rk*.82,sk*.42),
    update(dt,wantRain,wantSnow,pos){ rk+=(wantRain-rk)*Math.min(1,dt*.7); sk+=(wantSnow-sk)*Math.min(1,dt*.7); uK.rain.value=rk; uK.snow.value=sk; uK.splash.value=rk;
      rain.visible=rk>.01; snow.visible=sk>.01; splash.visible=rk>.05;
      if(splash.visible){ const a=hg.attributes.position; for(let i=0;i<16;i++){ const d=2+Math.sqrt(Math.random())*15, t=Math.random()*6.283, x=pos.x+Math.cos(t)*d, z=pos.z+Math.sin(t)*d; a.setXYZ(next,x,groundAt(x,z)+.05,z); next=(next+1)%H; } a.needsUpdate=true; } } };
}
