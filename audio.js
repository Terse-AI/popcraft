/* The sound of the valley. Nothing here is a recording: every sound is synthesised live in Web Audio, so it
   never loops audibly and always answers the game. Ambience is built from layers that follow hour, season,
   weather and where you stand; one-shots sit in 3D around the listener and ring in the space you are in
   (mountains answer outdoors, stone rings in the mine, the cabin stays close); the score is written as it
   plays, phrase by phrase, and rests often enough to let the valley be heard. */

const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, rand=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)];
const smooth=(a,b,x)=>{ const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
const VKEY='sv_audio_v1';
let V={master:.85,music:.5,amb:.85,sfx:.9,mute:false}; try{ Object.assign(V,JSON.parse(localStorage.getItem(VKEY)||'{}')); }catch(e){}
let ctx=null, B={}, noise={}, started=false, beds={}, hidden=false, offline=false;
const bedT={wind:0,rustle:0,rain:0,lap:0,creek:0,falls:0,fire:0,cave:0,cricket:0,frog:0,lava:0};

/* ---------- raw material ---------- */
function noiseBuf(kind,sec=6){ const n=Math.floor(ctx.sampleRate*sec), b=ctx.createBuffer(2,n,ctx.sampleRate);
  for(let ch=0;ch<2;ch++){ const d=b.getChannelData(ch); let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,last=0;
    for(let i=0;i<n;i++){ const w=Math.random()*2-1; if(kind==='white') d[i]=w*.5; else if(kind==='pink'){ b0=.99886*b0+w*.0555179; b1=.99332*b1+w*.0750759; b2=.969*b2+w*.153852; b3=.8665*b3+w*.3104856; b4=.55*b4+w*.5329522; b5=-.7616*b5-w*.016898; d[i]=(b0+b1+b2+b3+b4+b5+w*.5362)*.09; } else { last=(last+.02*w)/1.02; d[i]=last*3; } } }
  return b; }
/* a room in numbers: early reflections, then a tail that darkens as it dies */
function impulse(dur,decay,bright,early=[]){ const sr=ctx.sampleRate, n=Math.floor(sr*dur), b=ctx.createBuffer(2,n,sr);
  for(let ch=0;ch<2;ch++){ const d=b.getChannelData(ch); let lp=0; for(let i=0;i<n;i++){ const t=i/sr, k=clamp(bright*Math.exp(-t*1.6),.03,1); lp+=(Math.random()*2-1-lp)*k; d[i]=lp*Math.exp(-t/decay)*smooth(0,.012,t); }
    for(const [t,g,w] of early){ const c=Math.floor((t+(ch?.009:0))*sr), W=Math.floor((w||.03)*sr); for(let i=0;i<W;i++) if(c+i<n) d[c+i]+=(Math.random()*2-1)*g*(1-i/W); } }
  return b; }
function cricketBuf(sec=4){ const sr=ctx.sampleRate, n=Math.floor(sr*sec), b=ctx.createBuffer(2,n,sr), L=b.getChannelData(0), R=b.getChannelData(1);
  for(let c=0;c<6;c++){ const f=rand(3900,4900), rate=Math.round(rand(2.2,4)*sec)/sec, pan=Math.random(), off=Math.random()/rate, amp=rand(.05,.14);
    for(let i=0;i<n;i++){ const t=i/sr, ph=((t*rate+off)%1); if(ph>.3) continue; const pulse=Math.max(0,Math.sin(ph/.3*Math.PI*6))*Math.sin(ph/.3*Math.PI), s=Math.sin(tauf(f,t))*pulse*amp; L[i]+=s*(1-pan); R[i]+=s*pan; } }
  return b; }
const tauf=(f,t)=>Math.PI*2*f*t;
function frogBuf(sec=6){ const sr=ctx.sampleRate, n=Math.floor(sr*sec), b=ctx.createBuffer(2,n,sr), L=b.getChannelData(0), R=b.getChannelData(1);
  for(let c=0;c<9;c++){ const t0=Math.random()*(sec-.4), f=rand(520,1100), pan=Math.random(), dur=rand(.18,.34), amp=rand(.1,.22), s0=Math.floor(t0*sr), m=Math.floor(dur*sr);
    for(let i=0;i<m;i++){ const t=i/sr, env=Math.sin(t/dur*Math.PI), gate=(Math.sin(tauf(38,t))>0?1:.25), s=(Math.sin(tauf(f*(1-t*.5),t))+.4*Math.sin(tauf(f*2.02,t)))*env*gate*amp; L[s0+i]+=s*(1-pan); R[s0+i]+=s*pan; } }
  return b; }

/* ---------- graph ---------- */
function bed(buf,chain,bus){ const s=ctx.createBufferSource(); s.buffer=buf; s.loop=true; let n=s; for(const f of chain){ n.connect(f); n=f; } const g=ctx.createGain(); g.gain.value=0; n.connect(g); g.connect(bus); s.start(0,Math.random()*Math.max(.01,buf.duration-.1)); return {g,s,chain}; }
const biq=(type,freq,Q=.7,gain=0)=>{ const f=ctx.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=Q; f.gain.value=gain; return f; };
function build(){
  noise.white=noiseBuf('white'); noise.pink=noiseBuf('pink',8); noise.brown=noiseBuf('brown',8);
  const comp=ctx.createDynamicsCompressor(); comp.threshold.value=-16; comp.ratio.value=3.5; comp.attack.value=.006; comp.release.value=.22; comp.knee.value=14;
  const limit=ctx.createDynamicsCompressor(); limit.threshold.value=-2.5; limit.ratio.value=20; limit.attack.value=.001; limit.release.value=.08; limit.knee.value=0;
  B.master=ctx.createGain(); B.master.connect(comp); comp.connect(limit); limit.connect(ctx.destination); B.meter=ctx.createAnalyser(); B.meter.fftSize=8192; limit.connect(B.meter);
  B.muf=biq('lowpass',20000,.3); B.muf.connect(B.master);                 // walls and water close over the world
  B.world=ctx.createGain(); B.world.connect(B.muf);
  B.amb=ctx.createGain(); B.amb.connect(B.world);
  B.fx=ctx.createGain(); B.fx.connect(B.master);
  B.mus=ctx.createGain(); B.mus.connect(B.master);
  B.rev={}; const rev=(name,ir)=>{ const c=ctx.createConvolver(); c.buffer=ir; const g=ctx.createGain(); g.gain.value=0; c.connect(g); g.connect(B.master); B.rev[name]={c,g}; };
  rev('valley',impulse(3.4,.85,.42,[[.21,.24,.05],[.38,.16,.07],[.63,.11,.1],[1.05,.07,.14]]));
  rev('cave',impulse(4.8,1.5,.3,[[.04,.34],[.07,.28],[.11,.22],[.17,.16],[.26,.12,.05]]));
  rev('room',impulse(.55,.13,.5,[[.012,.3],[.021,.24],[.034,.16]]));
  B.send=ctx.createGain(); B.send.gain.value=.7; for(const k in B.rev) B.send.connect(B.rev[k].c);
  B.musRev=ctx.createGain(); B.musRev.gain.value=.7; B.musRev.connect(B.rev.valley.c);
  B.pan=[];                                                                 // voices for the 3D one-shots
  const w=noise.white, p=noise.pink, br=noise.brown;
  beds.wind=bed(p,[biq('bandpass',340,.55),biq('highpass',90)],B.amb);
  beds.gust=bed(br,[biq('lowpass',260,.4)],B.amb);
  beds.rustle=bed(w,[biq('highpass',2300,.5),biq('peaking',5200,1,5)],B.amb);
  beds.rain=bed(w,[biq('bandpass',2600,.3),biq('highshelf',6000,.7,-5)],B.amb);
  beds.rainLow=bed(p,[biq('lowpass',900,.5)],B.amb);
  beds.lap=bed(br,[biq('bandpass',240,.8)],B.amb);
  beds.creek=bed(p,[biq('peaking',1300,.8,7),biq('highpass',260),biq('highshelf',5000,.7,3)],B.amb);
  beds.falls=bed(p,[biq('lowshelf',260,.7,9),biq('highshelf',4000,.7,4)],B.amb);
  beds.fire=bed(br,[biq('bandpass',420,.6)],B.world);
  beds.cave=bed(br,[biq('lowpass',130,.7)],B.amb);
  beds.lava=bed(br,[biq('bandpass',160,1.2)],B.amb);
  setTimeout(()=>{ if(offline) return; beds.cricket=bed(cricketBuf(),[biq('highpass',2600)],B.amb); beds.frog=bed(frogBuf(),[biq('highpass',300)],B.amb); },300);
  applyVol();
}
function applyVol(){ if(!B.master) return; const t=ctx.currentTime, m=V.mute?0:V.master; B.master.gain.setTargetAtTime(m,t,.05); B.mus.gain.setTargetAtTime(V.music*.62*duck,t,.12); B.amb.gain.setTargetAtTime(V.amb,t,.1); B.fx.gain.setTargetAtTime(V.sfx,t,.03); }
export function setVolumes(o){ Object.assign(V,o); try{ localStorage.setItem(VKEY,JSON.stringify(V)); }catch(e){} applyVol(); }
export const volumes=()=>V;
/* a level meter on the final mix, in decibels, for checking the balance without ears */
export function audioLevel(){ if(!B.meter) return {state:ctx?ctx.state:'none'}; const d=new Float32Array(B.meter.fftSize); B.meter.getFloatTimeDomainData(d); let s=0, p=0; for(const v of d){ s+=v*v; p=Math.max(p,Math.abs(v)); } return {state:ctx.state,rmsDb:+(10*Math.log10(s/d.length+1e-9)).toFixed(1),peak:+p.toFixed(3),mood:musicMood,beds:Object.fromEntries(Object.entries(beds).map(([k,b])=>[k,+b.g.gain.value.toFixed(3)]))}; }
let duck=1; export function duckMusic(k){ duck=k; applyVol(); }
export function startAudio(){ if(started){ if(ctx.state==='suspended') ctx.resume(); return; } const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return; ctx=new AC({latencyHint:'interactive'}); started=true; build(); ctx.resume(); nextBird=ctx.currentTime+2; musicClock=setInterval(scheduleMusic,320); }
document.addEventListener('visibilitychange',()=>{ if(!ctx) return; hidden=document.hidden; hidden?ctx.suspend():ctx.resume(); });

/* ---------- atoms ---------- */
function out(x,y,z,send=.45,bus=B.fx){ const g=ctx.createGain(); if(x===undefined){ g.connect(bus); } else { const p=ctx.createPanner(); p.panningModel=B.hrtfBusy>5?'equalpower':'HRTF'; p.distanceModel='inverse'; p.refDistance=5; p.rolloffFactor=1.05; p.maxDistance=900; p.positionX.value=x; p.positionY.value=y; p.positionZ.value=z; g.connect(p); p.connect(bus); B.hrtfBusy=(B.hrtfBusy||0)+1; g.__p=p; } const s=ctx.createGain(); s.gain.value=send; g.connect(s); s.connect(B.send); g.__s=s; return g; }
const free=(g,after)=>setTimeout(()=>{ try{ g.disconnect(); if(g.__p){ g.__p.disconnect(); B.hrtfBusy--; } if(g.__s) g.__s.disconnect(); }catch(e){} },(after+.3)*1000);
function env(g,t,a,peak,d,tail=.0001){ g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(Math.max(peak,.0002),t+Math.max(a,.001)); g.gain.exponentialRampToValueAtTime(tail,t+a+d); }
function osc(dest,t,dur,type,f0,f1,vol,a=.004,o={}){ const s=ctx.createOscillator(), g=ctx.createGain(); s.type=type; s.frequency.setValueAtTime(f0,t); if(f1&&f1!==f0) s.frequency.exponentialRampToValueAtTime(f1,t+dur); if(o.vib){ const l=ctx.createOscillator(), lg=ctx.createGain(); l.frequency.value=o.vib; lg.gain.value=o.depth||6; l.connect(lg); lg.connect(s.frequency); l.start(t); l.stop(t+dur+.1); } env(g,t,a,vol,dur); s.connect(g); g.connect(dest); s.start(t); s.stop(t+dur+.05); return s; }
function hit(dest,t,dur,kind,type,freq,Q,vol,a=.002,f2=null){ const s=ctx.createBufferSource(); s.buffer=noise[kind]; const f=biq(type,freq,Q), g=ctx.createGain(); if(f2) f.frequency.exponentialRampToValueAtTime(f2,t+dur); env(g,t,a,vol,dur); s.connect(f); f.connect(g); g.connect(dest); s.start(t,Math.random()*5,dur+.1); }
function modes(dest,t,fs,vol,dec=.2,jit=.03){ fs.forEach(([f,g,d],i)=>osc(dest,t,(d||1)*dec,'sine',f*rand(1-jit,1+jit),0,vol*g,.001)); }

/* ---------- one-shots ---------- */
let stepSide=1;
const SND={
 step(o,s){ const t=ctx.currentTime, k=clamp(o.run?1.2:.9,.5,1.3), g=out(undefined,undefined,undefined,s==='stone'?.8:s==='wood'?.3:.14); stepSide=-stepSide; const sp=ctx.createStereoPanner(); sp.pan.value=stepSide*.09; sp.connect(g);
   if(s==='grass'){ hit(sp,t,.09,'white','bandpass',rand(2600,4200),.7,.14*k,.006); hit(sp,t+.05,.08,'pink','bandpass',rand(1300,2200),.8,.16*k,.012); osc(sp,t,.06,'sine',95,60,.09*k); }
   else if(s==='dirt'){ osc(sp,t,.07,'sine',rand(82,104),58,.2*k); hit(sp,t,.05,'pink','bandpass',rand(900,1400),.8,.11*k); hit(sp,t+.02,.09,'white','highpass',3200,.5,.03*k,.01); }
   else if(s==='pebble'){ for(let i=0;i<5;i++) hit(sp,t+i*.018+rand(0,.01),.03,'white','bandpass',rand(1800,4400),2.2,.17*k); osc(sp,t,.05,'sine',120,70,.08*k); }
   else if(s==='wood'){ osc(sp,t,.09,'sine',rand(118,142),80,.26*k); modes(sp,t,[[212,.5],[346,.34,.8],[612,.16,.5]],.09*k,.13,.05); hit(sp,t,.025,'white','bandpass',2100,1,.05*k); if(Math.random()<.07) osc(sp,t+.08,.2,'sawtooth',rand(180,260),rand(300,420),.012); }
   else if(s==='stone'){ hit(sp,t,.022,'white','bandpass',rand(2400,3800),1.4,.14*k); osc(sp,t,.05,'sine',150,90,.13*k); hit(sp,t+.012,.05,'pink','highpass',1600,.6,.04*k); }
   else if(s==='snow'){ for(let i=0;i<9;i++) hit(sp,t+i*.013+rand(0,.008),.02,'white','bandpass',rand(1500,3600),1.6,.055*k); osc(sp,t,.07,'sine',80,52,.08*k); }
   else if(s==='rug'){ osc(sp,t,.08,'sine',90,60,.11*k); hit(sp,t,.06,'pink','lowpass',700,.6,.05*k); }
   if(o.wet){ hit(sp,t+.012,.1,'white','bandpass',rand(2800,4600),1.1,.05); osc(sp,t+.02,.05,'sine',rand(500,800),rand(900,1300),.022); }
   free(g,.5); },
 hoe(){ const t=ctx.currentTime, g=out(undefined,0,0,.2); osc(g,t,.1,'sine',112,52,.5); hit(g,t,.1,'pink','bandpass',760,.9,.36); hit(g,t+.03,.16,'white','bandpass',2400,.8,.1,.01); for(let i=0;i<6;i++) hit(g,t+.08+i*.022,.03,'pink','bandpass',rand(1100,2600),1.6,.05); free(g,.6); },
 water(){ const t=ctx.currentTime, g=out(undefined,0,0,.2); const dur=.9; hit(g,t,dur,'white','bandpass',3200,.6,.24,.08,1800); hit(g,t+.1,dur*.8,'pink','bandpass',900,.8,.3,.1); for(let i=0;i<22;i++){ const q=t+i*.04+rand(0,.03); osc(g,q,.05,'sine',rand(600,1500),rand(1500,2800),rand(.012,.03)); } free(g,1.3); },
 refill(){ const t=ctx.currentTime, g=out(undefined,0,0,.25); for(let i=0;i<14;i++){ const q=t+i*.055; osc(g,q,.09,'sine',260+i*38,520+i*62,.05); } hit(g,t,.9,'pink','bandpass',700,.8,.36,.05,1600); free(g,1.2); },
 axe(){ const t=ctx.currentTime, g=out(undefined,0,0,.5); hit(g,t,.012,'white','highpass',3000,.7,.5); osc(g,t,.08,'sine',170,84,.6); modes(g,t,[[290,.7],[470,.5,.8],[760,.32,.6],[1230,.16,.4]],.3,.17,.06); hit(g,t+.01,.1,'pink','bandpass',1700,1,.16); for(let i=0;i<4;i++) hit(g,t+.04+i*.03,.03,'white','bandpass',rand(2000,5000),2,.05); free(g,.9); },
 pick(){ const t=ctx.currentTime, g=out(undefined,0,0,.62); hit(g,t,.008,'white','highpass',4200,.7,.5); modes(g,t,[[2640,.5,1],[3910,.32,.8],[5270,.22,.55],[6820,.1,.4]],.19,.3,.03); osc(g,t,.06,'sine',210,98,.36); for(let i=0;i<7;i++) hit(g,t+.03+i*.028,.035,'white','bandpass',rand(900,3400),1.5,.08); free(g,1); },
 scythe(){ const t=ctx.currentTime, g=out(undefined,0,0,.15); hit(g,t,.19,'white','bandpass',1400,1.4,.36,.05,5200); hit(g,t+.08,.12,'white','highpass',4800,.7,.14,.01); free(g,.5); },
 swing(){ const t=ctx.currentTime, g=out(undefined,0,0,.1); hit(g,t,.17,'pink','bandpass',520,1.8,.5,.05,1900); free(g,.4); },
 sword(){ const t=ctx.currentTime, g=out(undefined,0,0,.3); hit(g,t,.16,'white','bandpass',1300,3,.6,.04,5400); modes(g,t+.03,[[4200,.2,1],[6100,.1,.7]],.03,.22); free(g,.5); },
 thud(){ const t=ctx.currentTime, g=out(undefined,0,0,.4); osc(g,t,.13,'sine',130,50,.6); hit(g,t,.06,'pink','lowpass',900,.7,.3); free(g,.5); },
 treefall(o,x,y,z){ const t=ctx.currentTime, g=out(x,y,z,.8), cr=biq('bandpass',360,6); cr.frequency.exponentialRampToValueAtTime(1400,t+1.3); cr.connect(g); for(let i=0;i<30;i++){ const q=t+i*i*.0016+rand(0,.015); osc(cr,q,.03,'sawtooth',rand(60,130),0,.2); }
   hit(g,t+1.1,1.1,'white','highpass',2400,.5,.11,.5); hit(g,t+1.9,.8,'brown','lowpass',220,.7,1.1,.01); osc(g,t+1.9,.7,'sine',74,30,.85,.004); hit(g,t+1.92,.5,'pink','bandpass',600,.6,.34); for(let i=0;i<12;i++) hit(g,t+1.95+rand(0,.7),.05,'white','bandpass',rand(1000,3400),1.5,.1); free(g,3.4); },
 rockbreak(o,x,y,z){ const t=ctx.currentTime, g=out(x,y,z,.65); hit(g,t,.014,'white','highpass',3000,.7,.6); osc(g,t,.22,'sine',118,44,.8); hit(g,t,.36,'brown','lowpass',620,.7,.8); for(let i=0;i<16;i++) hit(g,t+.03+rand(0,.42),.05,'white','bandpass',rand(700,3600),1.3,rand(.05,.16)); free(g,1); },
 harvest(){ const t=ctx.currentTime, g=out(undefined,0,0,.15); hit(g,t,.14,'white','bandpass',2600,.8,.11,.02); osc(g,t+.05,.08,'sine',240,520,.2); osc(g,t+.1,.06,'sine',800,420,.1); free(g,.5); },
 plant(){ const t=ctx.currentTime, g=out(undefined,0,0,.1); osc(g,t,.07,'sine',120,70,.2); hit(g,t+.03,.08,'pink','bandpass',1100,1,.09); free(g,.4); },
 cast(){ const t=ctx.currentTime, g=out(undefined,0,0,.3); hit(g,t,.32,'white','bandpass',900,4,.62,.1,4000); for(let i=0;i<18;i++) hit(g,t+.1+i*.016,.012,'white','bandpass',4200,6,.2); free(g,.8); },
 plop(o,x,y,z){ const t=ctx.currentTime, g=out(x,y,z,.7); osc(g,t,.12,'sine',360,860,.3,.002); hit(g,t,.13,'white','bandpass',1500,.8,.16); osc(g,t+.1,.06,'sine',620,1250,.1); free(g,.7); },
 splash(o,x,y,z){ const t=ctx.currentTime, g=out(x,y,z,.7); hit(g,t,.55,'white','bandpass',1800,.5,.32,.012,700); hit(g,t,.3,'brown','lowpass',380,.7,.5); for(let i=0;i<10;i++) osc(g,t+rand(.03,.45),.05,'sine',rand(420,1100),rand(1100,2400),.05); free(g,1.2); },
 bite(){ const t=ctx.currentTime, g=out(undefined,0,0,.5); osc(g,t,.09,'triangle',1320,1320,.32); osc(g,t+.09,.26,'triangle',1760,1760,.3); hit(g,t,.12,'white','bandpass',2800,1.2,.14); free(g,.8); },
 reelTick(){ const t=ctx.currentTime, g=out(undefined,0,0,.05); hit(g,t,.009,'white','bandpass',3400,4,.4); osc(g,t,.012,'square',1500,900,.05); free(g,.2); },
 catch(){ const t=ctx.currentTime; SND.splash({}); const g=out(undefined,0,0,.6); [76,79,83,88,91].forEach((m,i)=>harp(g,t+.14+i*.075,m,.17)); free(g,3); },
 lost(){ const t=ctx.currentTime, g=out(undefined,0,0,.3); osc(g,t,.24,'triangle',440,330,.1); osc(g,t+.2,.38,'triangle',330,247,.09); free(g,.9); },
 coin(){ const t=ctx.currentTime, g=out(undefined,0,0,.3); modes(g,t,[[2093,.5],[3136,.3,.8],[5274,.14,.5]],.12,.35,.004); modes(g,t+.07,[[2637,.5],[3951,.3,.8],[6644,.12,.5]],.12,.5,.004); free(g,1); },
 ship(){ const t=ctx.currentTime, g=out(undefined,0,0,.3); osc(g,t,.1,'sine',120,70,.4); modes(g,t,[[230,.6],[380,.4,.7]],.16,.16); setTimeout(()=>SND.coin(),160); free(g,.6); },
 pickup(){ const t=ctx.currentTime, g=out(undefined,0,0,.2); osc(g,t,.09,'sine',520,1040,.15,.003); osc(g,t+.05,.13,'sine',780,1560,.1,.003); free(g,.5); },
 eat(){ const t=ctx.currentTime, g=out(undefined,0,0,.1); for(let i=0;i<4;i++){ hit(g,t+i*.13,.07,'pink','bandpass',rand(700,1400),1,.6,.01); } free(g,.8); },
 door(){ const t=ctx.currentTime, g=out(undefined,0,0,.3), cr=biq('bandpass',620,9); cr.frequency.exponentialRampToValueAtTime(980,t+.5); cr.connect(g); for(let i=0;i<20;i++) osc(cr,t+i*.022,.02,'sawtooth',rand(70,120),0,.09); osc(g,t+.56,.12,'sine',104,60,.4); modes(g,t+.56,[[190,.5],[310,.3]],.14,.15); free(g,1.1); },
 ladder(){ const t=ctx.currentTime, g=out(undefined,0,0,.7); [0,.22,.44].forEach(q=>{ osc(g,t+q,.07,'sine',160,90,.26); modes(g,t+q,[[320,.4],[540,.2]],.09,.1); }); free(g,1); },
 hurt(){ const t=ctx.currentTime, g=out(undefined,0,0,.3); osc(g,t,.16,'sawtooth',230,110,.15); hit(g,t,.11,'pink','lowpass',800,.7,.32); osc(g,t,.13,'sine',120,60,.44); free(g,.5); },
 squish(o,x,y,z){ const t=ctx.currentTime, g=out(x,y,z,.5); osc(g,t,.15,'sine',rand(180,240),rand(520,760),.3,.008); hit(g,t,.12,'pink','bandpass',850,1.6,.3); free(g,.6); },
 monsterDie(o,x,y,z){ const t=ctx.currentTime, g=out(x,y,z,.7); osc(g,t,.4,'sawtooth',340,70,.14); hit(g,t,.26,'pink','bandpass',900,1,.32,.01,240); free(g,.9); },
 squeak(o,x,y,z){ const t=ctx.currentTime, g=out(x,y,z,.8); osc(g,t,.07,'sine',rand(3200,4200),rand(4600,5600),.09); osc(g,t+.1,.05,'sine',rand(3600,4400),rand(5000,6000),.06); free(g,.5); },
 blob(o,x,y,z){ const t=ctx.currentTime, g=out(x,y,z,.7); osc(g,t,.1,'sine',rand(110,170),rand(220,360),.14,.01); free(g,.4); },
 bark(o,x,y,z){ const t=ctx.currentTime, g=out(x,y,z,.5), n=Math.random()<.5?2:1; for(let i=0;i<n;i++){ const q=t+i*.2, f=biq('bandpass',rand(780,1050),1.6); f.connect(g); osc(f,q,.1,'sawtooth',rand(340,420),rand(220,270),.48,.006); hit(g,q,.06,'white','bandpass',2100,1,.06); } free(g,.8); },
 cluck(o,x,y,z){ const t=ctx.currentTime, g=out(x,y,z,.3), f=biq('bandpass',1050,3); f.connect(g); for(let i=0;i<rand(2,5);i++) osc(f,t+i*.12+rand(0,.03),.06,'sawtooth',rand(560,740),rand(420,520),.26,.004); free(g,1); },
 moo(o,x,y,z){ const t=ctx.currentTime, g=out(x,y,z,.55), f=biq('bandpass',520,1.5); f.frequency.linearRampToValueAtTime(800,t+.4); f.frequency.linearRampToValueAtTime(420,t+1.1); f.connect(g); osc(f,t,1.15,'sawtooth',116,92,.38,.2,{vib:5,depth:3}); free(g,1.6); },
 baa(o,x,y,z){ const t=ctx.currentTime, g=out(x,y,z,.4), f=biq('bandpass',880,2); f.connect(g); osc(f,t,.62,'sawtooth',245,216,.3,.05,{vib:11,depth:16}); free(g,1); },
 oink(o,x,y,z){ const t=ctx.currentTime, g=out(x,y,z,.3), f=biq('bandpass',640,3); f.connect(g); osc(f,t,.16,'square',150,230,.2); osc(f,t+.2,.13,'square',170,110,.15); free(g,.6); },
 quack(o,x,y,z){ const t=ctx.currentTime, g=out(x,y,z,.45), f=biq('bandpass',1250,5); f.connect(g); for(let i=0;i<3;i++) osc(f,t+i*.17,.11,'sawtooth',rand(230,280),190,.34,.01); free(g,.8); },
 rooster(o,x,y,z){ const t=ctx.currentTime, g=out(x,y,z,.7), f=biq('bandpass',1500,2.4); f.connect(g); [[0,.12,520,720],[.15,.14,720,900],[.32,.5,940,1050],[.84,.32,1050,620]].forEach(([q,d,a,b])=>osc(f,t+q,d,'sawtooth',a,b,.2,.02)); free(g,1.6); },
 talk(o,pitch=1){ const t=ctx.currentTime, g=out(undefined,0,0,.1); for(let i=0;i<4;i++){ const f=biq('bandpass',rand(620,1250),3); f.connect(g); osc(f,t+i*.062,.05,'sawtooth',rand(170,250)*pitch,0,.42,.004); setTimeout(()=>{ try{ f.disconnect(); }catch(e){} },900); } free(g,.7); },
 click(){ const t=ctx.currentTime, g=out(undefined,0,0,.05,B.fx); hit(g,t,.008,'white','bandpass',4200,1,.1); osc(g,t,.018,'sine',1500,1000,.05); free(g,.2); },
 tick(){ const t=ctx.currentTime, g=out(undefined,0,0,.03); osc(g,t,.016,'triangle',1100,800,.05); free(g,.2); },
 panelOpen(){ const t=ctx.currentTime, g=out(undefined,0,0,.2); hit(g,t,.08,'pink','bandpass',1600,.8,.07,.012,3200); osc(g,t+.01,.09,'sine',640,960,.05); free(g,.4); },
 panelClose(){ const t=ctx.currentTime, g=out(undefined,0,0,.2); hit(g,t,.07,'pink','bandpass',2400,.8,.05,.008,1100); osc(g,t,.08,'sine',780,520,.04); free(g,.4); },
 levelup(){ const t=ctx.currentTime, g=out(undefined,0,0,.8); [72,76,79,84,88,91,96].forEach((m,i)=>harp(g,t+i*.09,m,.17)); free(g,3.2); },
 quest(){ const t=ctx.currentTime, g=out(undefined,0,0,.7); [79,84,88].forEach((m,i)=>harp(g,t+i*.11,m,.17)); free(g,2.6); },
 sleep(){ const t=ctx.currentTime, g=out(undefined,0,0,.9); [60,67,72,76,79].forEach((m,i)=>pianoNote(g,t+i*.34,m,.12,3)); free(g,5); },
 thunder(o,dist=1){ const t=ctx.currentTime+dist*.9, g=out(undefined,0,0,.9,B.world), v=lerp(1.2,.45,dist); hit(g,t,.14,'white','bandpass',1900,.5,.3*v,.005); for(let i=0;i<7;i++) hit(g,t+.05+i*rand(.1,.26),rand(.5,1.1),'brown','lowpass',rand(110,260),.7,rand(.6,1.2)*v,.05); osc(g,t,1.8,'sine',46,28,.5*v,.08); free(g,5); },
 boatRow(){ const t=ctx.currentTime, g=out(undefined,0,0,.5); hit(g,t,.32,'white','bandpass',900,.8,.28,.05,2200); osc(g,t+.12,.09,'sine',300,640,.12); modes(g,t,[[180,.3],[280,.2]],.14,.1); free(g,.7); }
};
function harp(dest,t,m,v){ const f=440*Math.pow(2,(m-69)/12); for(const [k,g,d] of [[1,1,1.4],[2,.34,.9],[3,.12,.5],[4,.05,.3]]) osc(dest,t,d,'sine',f*k,0,v*g,.003); }
export function play(name,...a){ if(!ctx||hidden||!SND[name]) return; try{ if(name==='step') SND.step(a[0],a[1]); else SND[name](...a); }catch(e){ console.warn('sound',name,e); } }
export const playAt=(name,x,y,z)=>{ if(!ctx||hidden||!SND[name]) return; try{ SND[name]({},x,y,z); }catch(e){ console.warn('sound',name,e); } };

/* ---------- the valley's voices, placed in the trees ---------- */
let nextBird=0, nextEvent=0, nextDrip=0, nextCrack=0, nextOwl=0, nextLoon=0, nextPeck=0, lastWeather='', thunderT=0;
function birdSong(dest,t,kind){ const w=dest;
  if(kind==='robin'){ let q=t; const n=Math.floor(rand(4,9)); for(let i=0;i<n;i++){ const f=rand(2200,3800), d=rand(.09,.2); osc(w,q,d,'sine',f,f*rand(.8,1.3),rand(.06,.11),.012); q+=d+rand(.02,.09); } return q-t; }
  if(kind==='warbler'){ let q=t, f=rand(4200,5200); for(let i=0;i<14;i++){ osc(w,q,.05,'sine',f,f*.86,.05,.004); q+=.06; f*=.985; } osc(w,q,.22,'sine',f*1.3,f*.8,.07,.01); return 1.2; }
  if(kind==='tit'){ for(let i=0;i<4;i++){ osc(w,t+i*.3,.13,'sine',4300,4300,.07,.01); osc(w,t+i*.3+.15,.12,'sine',3100,3100,.07,.01); } return 1.3; }
  if(kind==='thrush'){ const base=rand(1500,2100); [1,1.25,1.5,1.33,1.12].forEach((k,i)=>{ const f=base*k; osc(w,t+i*.22,.2,'sine',f,f*1.02,.07,.03); osc(w,t+i*.22,.2,'sine',f*2.02,f*2.05,.016,.03); }); return 1.4; }
  if(kind==='cuckoo'){ osc(w,t,.22,'sine',680,650,.1,.02); osc(w,t+.32,.34,'sine',540,520,.1,.02); osc(w,t+1.3,.22,'sine',680,650,.09,.02); osc(w,t+1.62,.34,'sine',540,520,.09,.02); return 2.2; }
  if(kind==='dove'){ [0,.42,.72,1.08].forEach((q,i)=>osc(w,t+q,i===1?.26:.32,'sine',i===1?520:440,i===1?470:415,.1,.05)); return 1.6; }
  if(kind==='crow'){ const f=biq('bandpass',1100,1.6); f.connect(w); for(let i=0;i<3;i++) osc(f,t+i*.4,.26,'sawtooth',rand(320,380),rand(240,270),.16,.02); setTimeout(()=>{ try{ f.disconnect(); }catch(e){} },3000); return 1.6; }
  return 1; }
const DAY=['robin','robin','warbler','tit','thrush','thrush','dove','crow'], DAWN=['robin','warbler','thrush','tit','cuckoo','dove'], DUSK=['thrush','dove','robin'];
function loon(x,y,z){ const t=ctx.currentTime, g=out(x,y,z,1.15); osc(g,t,.9,'sine',520,1040,.15,.2,{vib:5,depth:6}); osc(g,t+.82,1.3,'sine',1040,780,.16,.05,{vib:6,depth:9}); osc(g,t,1.9,'sine',1040,1560,.018,.3); free(g,5); }
function owl(x,y,z){ const t=ctx.currentTime, g=out(x,y,z,1); [0,.46,.74,1.02,1.6].forEach((q,i)=>osc(g,t+q,i===4?.6:.28,'sine',i===0?340:i===4?300:330,i===4?270:320,.13,.04)); free(g,3.4); }
function woodpecker(x,y,z){ const t=ctx.currentTime, g=out(x,y,z,.8); for(let i=0;i<14;i++){ hit(g,t+i*.055,.018,'white','bandpass',1500,4,.12*(1-i/20)); osc(g,t+i*.055,.03,'sine',620,420,.05); } free(g,1.4); }
function drip(x,y,z){ const t=ctx.currentTime, g=out(x,y,z,1.3), f=rand(1300,2600); osc(g,t,.09,'sine',f,f*1.9,.08,.002); if(Math.random()<.6) osc(g,t+.1,.06,'sine',f*.8,f*1.4,.04); free(g,1); }
function crackle(g0,big){ const t=ctx.currentTime, g=out(undefined,0,0,.1,B.world); hit(g,t,big?.03:.012,'white','bandpass',rand(1800,5200),1.4,big?.18:.07); free(g,.3); }

/* ---------- each frame: what can be heard from here ---------- */
const set=(b,v,tc=.5)=>{ if(b) b.g.gain.setTargetAtTime(v,ctx.currentTime,tc); };
export function updateAudio(st){ if(!ctx||hidden) return; const now=ctx.currentTime, L=ctx.listener, p=st.cam, f=st.fwd;
  if(L.positionX){ L.positionX.value=p.x; L.positionY.value=p.y; L.positionZ.value=p.z; L.forwardX.value=f.x; L.forwardY.value=f.y; L.forwardZ.value=f.z; L.upX.value=0; L.upY.value=1; L.upZ.value=0; } else { L.setPosition(p.x,p.y,p.z); L.setOrientation(f.x,f.y,f.z,0,1,0); }
  const out_=!st.inMine&&!st.inHouse, h=st.t, day=smooth(320,420,h)*(1-smooth(1170,1260,h)), night=1-day, rain=st.weather==='rain'||st.weather==='storm', storm=st.weather==='storm', snow=st.season===3, wind=st.wind;
  // the room you are in
  const T=now, rv=B.rev; rv.valley.g.gain.setTargetAtTime(out_?(snow?.3:.55):0,T,.4); rv.cave.g.gain.setTargetAtTime(st.inMine?1:0,T,.4); rv.room.g.gain.setTargetAtTime(st.inHouse?.65:0,T,.2);
  B.muf.frequency.setTargetAtTime(st.inHouse?620:st.under?520:st.inMine?1400:20000,T,.2);
  // air
  const gust=st.gust; set(beds.wind,(out_?1:st.inHouse?.5:.05)*(.05+.13*wind+.14*gust)*(snow?1.25:1)); beds.wind.chain[0].frequency.setTargetAtTime(280+gust*340+wind*120,T,.6);
  set(beds.gust,(out_?.1+.2*gust:0)*wind); set(beds.rustle,out_?(st.trees*.8+.2)*(.012+.034*wind+.05*gust)*(snow?.2:1):0,.4);
  // water
  set(beds.rain,rain?(out_?.17:st.inHouse?.07:0):0,1.5); set(beds.rainLow,rain?(out_?.1:st.inHouse?.1:0):0,1.5); const lapM=.5+.5*Math.sin(now*.7)*Math.sin(now*.31+1); set(beds.lap,st.lake*(.14+.14*lapM)*(st.inHouse?.3:1),.7); set(beds.creek,st.creek*.26); set(beds.falls,st.falls*.44);
  // life
  const warm=!snow&&!rain; if(beds.cricket) set(beds.cricket,out_&&warm&&st.season!==3?night*(.34+.1*Math.sin(now*.2))*(1-st.lake*.3):0,2); if(beds.frog) set(beds.frog,out_&&warm&&st.season<2?night*st.lake*.5:0,2);
  // rooms
  set(beds.fire,st.inHouse?.17:0,.3); set(beds.cave,st.inMine?.5:0,1); set(beds.lava,st.inMine&&st.deep===2?.3:0,1);
  if(st.inHouse&&now>nextCrack){ nextCrack=now+rand(.05,.55); crackle(0,Math.random()<.12); }
  if(st.inMine&&now>nextDrip){ nextDrip=now+rand(.6,3.4); const a=rand(0,6.28), r=rand(4,16); drip(Math.cos(a)*r,rand(2,8),Math.sin(a)*r); }
  if(out_&&now>nextBird){ const pool=(h<540?DAWN:h>1020?DUSK:DAY), chance=rain?.15:snow?.2:h<540?1:.8, gate=day>.4; const gap=h<540?rand(.8,2.6):rand(2.5,8); nextBird=now+gap; if(gate&&Math.random()<chance){ const a=rand(0,6.28), r=rand(14,70), x=st.pos.x+Math.cos(a)*r, z=st.pos.z+Math.sin(a)*r, g=out(x,rand(4,16),z,.75,B.amb), d=birdSong(g,now+.02,pick(pool)); free(g,d+1); } }
  if(out_&&now>nextLoon){ nextLoon=now+rand(50,130); const dusk=(h<470||(h>1120&&h<1400)); if(dusk&&st.lake>.1&&!rain&&!snow) loon(st.pos.x+rand(-90,90),2,st.pos.z+rand(60,180)); }
  if(out_&&now>nextOwl){ nextOwl=now+rand(30,80); if(night>.8&&!rain) owl(st.pos.x+rand(-60,60),14,st.pos.z+rand(-60,60)); }
  if(out_&&now>nextPeck){ nextPeck=now+rand(25,70); if(day>.6&&!rain&&st.trees>.3) woodpecker(st.pos.x+rand(-50,50),9,st.pos.z+rand(-50,50)); }
  lastWeather=st.weather;
  musicMood=st.inMine?'deep':st.inHouse?'home':rain?'rain':night>.7?'night':['spring','summer','fall','winter'][st.season]; musicDeep=st.deep||0;
}

/* ---------- the score, written as it plays ---------- */
const MOODS={ // key root, scale, chords as [degree root in semitones, intervals], tempo, voices
 spring:{key:62,scale:[0,2,4,7,9],prog:[[0,[0,7,14,16]],[5,[0,7,14,16]],[9,[0,7,12,15]],[7,[0,7,14,17]]],bpm:74,hand:'guitar',lead:'flute'},
 summer:{key:67,scale:[0,2,4,7,9],prog:[[0,[0,7,14,16]],[2,[0,7,12,15]],[5,[0,7,14,16]],[7,[0,7,10,14]]],bpm:80,hand:'guitar',lead:'piano'},
 fall:{key:57,scale:[0,2,3,7,9],prog:[[0,[0,7,12,15]],[5,[0,7,10,16]],[3,[0,7,14,16]],[10,[0,7,14,16]]],bpm:66,hand:'piano',lead:'flute'},
 winter:{key:64,scale:[0,2,3,7,10],prog:[[0,[0,7,14,15]],[8,[0,7,14,16]],[3,[0,7,14,16]],[10,[0,7,14,16]]],bpm:58,hand:'piano',lead:'bell'},
 night:{key:60,scale:[0,2,4,7,11],prog:[[0,[0,7,14,16]],[9,[0,7,12,15]],[5,[0,7,14,16]],[7,[0,7,14,17]]],bpm:54,hand:'piano',lead:'bell'},
 rain:{key:61,scale:[0,2,3,7,8],prog:[[0,[0,7,12,15]],[8,[0,7,14,16]],[5,[0,7,12,15]],[7,[0,7,10,14]]],bpm:56,hand:'piano',lead:'piano'},
 home:{key:65,scale:[0,2,4,7,9],prog:[[0,[0,7,14,16]],[5,[0,7,14,16]],[7,[0,7,14,17]],[0,[0,7,12,16]]],bpm:68,hand:'guitar',lead:'piano'},
 deep:{key:50,scale:[0,1,3,7,8],prog:[[0,[0,7,12]],[1,[0,7,12]],[0,[0,7,12]],[8,[0,7,12]]],bpm:46,hand:'bell',lead:'bell'} };
let musicMood='spring', musicDeep=0, musicClock=null, music={step:0,bar:0,phrase:null,rest:6,next:0,mood:null,motif:null,notes:[]};
const mtof=m=>440*Math.pow(2,(m-69)/12);
function pianoNote(dest,t,m,v,dur=2.6){ const f=mtof(m), lp=biq('lowpass',Math.min(5200,f*7),.3); lp.connect(dest); for(const [k,g,d] of [[1,1,1],[2.004,.42,.72],[3.01,.16,.5],[4.02,.06,.34],[5.03,.02,.22]]) osc(lp,t,dur*d,'sine',f*k,0,v*g,.005); hit(lp,t,.03,'pink','bandpass',f*3,1,v*.12); setTimeout(()=>{ try{ lp.disconnect(); }catch(e){} },(t-ctx.currentTime+dur+.5)*1000); }
const KS=new Map();
function ksBuf(m){ if(KS.has(m)) return KS.get(m); const sr=ctx.sampleRate, f=mtof(m), n=Math.floor(sr*2.6), P=Math.floor(sr/f), b=ctx.createBuffer(1,n,sr), d=b.getChannelData(0), line=new Float32Array(P); let lp=0; for(let i=0;i<P;i++){ lp+=(Math.random()*2-1-lp)*.6; line[i]=lp; } let k=0, prev=0; for(let i=0;i<n;i++){ const x=line[k]; const y=(x+prev)*.4985; prev=x; line[k]=y; d[i]=x; k=(k+1)%P; } KS.set(m,b); return b; }
function guitarNote(dest,t,m,v){ const s=ctx.createBufferSource(); s.buffer=ksBuf(m); const g=ctx.createGain(); g.gain.setValueAtTime(v*1.5,t); g.gain.setValueAtTime(v*1.5,t+2.1); g.gain.linearRampToValueAtTime(.0001,t+2.55); const b=biq('peaking',260,.9,3); s.connect(b); b.connect(g); g.connect(dest); s.start(t); s.stop(t+2.6); s.onended=()=>{ try{ g.disconnect(); b.disconnect(); }catch(e){} }; }
function fluteNote(dest,t,m,v,dur){ const f=mtof(m); osc(dest,t,dur,'sine',f,0,v*.9,.09,{vib:5.2,depth:f*.005}); osc(dest,t,dur*.9,'sine',f*2,0,v*.1,.12); hit(dest,t,dur*.5,'white','bandpass',f*2,3,v*.09,.1); }
function bellNote(dest,t,m,v){ const f=mtof(m); for(const [k,g,d] of [[1,1,3.4],[2.76,.32,1.8],[5.4,.1,.9]]) osc(dest,t,d,'sine',f*k,0,v*g*.55,.004); }
function padChord(dest,t,notes,v,dur){ const lp=biq('lowpass',900,.4); lp.frequency.setValueAtTime(520,t); lp.frequency.linearRampToValueAtTime(1050,t+dur*.5); lp.frequency.linearRampToValueAtTime(420,t+dur); lp.connect(dest); for(const m of notes) for(const dt of [-5,5]){ const s=ctx.createOscillator(), g=ctx.createGain(); s.type='triangle'; s.frequency.value=mtof(m); s.detune.value=dt; g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(v,t+dur*.34); g.gain.setValueAtTime(v,t+dur*.66); g.gain.linearRampToValueAtTime(.0001,t+dur*1.05); s.connect(g); g.connect(lp); s.start(t); s.stop(t+dur*1.1); } setTimeout(()=>{ try{ lp.disconnect(); }catch(e){} },(t-ctx.currentTime+dur*1.2)*1000); }
function makeMotif(M){ const notes=[]; let i=Math.floor(rand(4,8)); const steps=Math.random()<.5?[0,3,6,8,12,14]:[0,2,4,8,10,14]; for(const s of steps){ i=clamp(i+pick([-2,-1,-1,1,1,2]),0,11); notes.push([s,i,pick([2,2,3,4])]); } return notes; }
const scaleNote=(M,i)=>{ const n=M.scale.length; return M.key+M.scale[i%n]+12*Math.floor(i/n)+12; };
function startPhrase(){ const M=MOODS[musicMood]; music.mood=musicMood; music.M=M; music.bars=8; music.bar=0; music.step=0; music.motif=makeMotif(M); music.prog=M.prog; if(Math.random()<.35) music.prog=[...M.prog].reverse(); music.phrase=true; music.next=ctx.currentTime+.2; }
function scheduleMusic(){ if(!ctx||hidden||V.music<=.001||ctx.state!=='running') return; const now=ctx.currentTime;
  if(!music.phrase){ if(now<music.next&&music.mood===musicMood) return; if(now<music.next) { music.next=Math.min(music.next,now+4); return; } startPhrase(); }
  if(music.phrase&&music.mood!==musicMood&&(musicMood==='deep'||music.mood==='deep'||musicMood==='home'||music.mood==='home')){ music.phrase=false; music.next=now+2.5; return; }
  const M=music.M, step8=60/M.bpm/2, dry=B.mus, wet=B.musRev; if(!B.musOut){ B.musOut=ctx.createGain(); B.musOut.connect(dry); B.musOut.connect(wet); }
  const D=B.musOut;
  while(music.phrase&&music.next<now+1.2){ const t=music.next, bar=music.bar, s=music.step%16, ch=music.prog[bar%music.prog.length], root=M.key-12+ch[0];
    if(s===0) padChord(D,t,[root,root+ch[1][1]+12,root+(ch[1][3]??ch[1][2])+12],M.hand==='bell'?.05:.032,step8*16);
    const v=M.hand==='bell'?.05:.1;
    if(M.hand==='guitar'){ const pat=[0,null,1,2,null,3,2,null,1,null,3,2,null,1,2,null]; const q=pat[s]; if(q!==null&&q!==undefined){ const n=q===0?root-0:root+12+(ch[1][q]||0); guitarNote(D,t+rand(0,.012),n,v*(q===0?1.1:.8)*rand(.8,1)); } }
    else if(M.hand==='piano'){ if(s===0||s===6||s===10){ const q=s===0?0:s===6?2:3; const n=q===0?root:root+12+(ch[1][q]||ch[1][1]); pianoNote(D,t+rand(0,.015),n,v*(q===0?.9:.66)*rand(.85,1)); } }
    else if(s===0||s===10){ bellNote(D,t,root+24,v); }
    if(bar%2===0||bar>=4){ const mel=(bar%4===3&&Math.random()<.6)?null:music.motif; if(mel) for(const [ms,idx,len] of mel){ if(ms===s&&Math.random()<.92){ const n=scaleNote(M,idx+(bar>=6?2:0)), vl=.08*rand(.75,1); if(M.lead==='flute') fluteNote(D,t,n,vl*.8,step8*len*1.3); else if(M.lead==='bell') bellNote(D,t,n+12,vl); else pianoNote(D,t,n,vl*1.1,3.2); } } }
    music.next+=step8; music.step++; if(music.step%16===0){ music.bar++; if(music.bar>=music.bars){ music.phrase=false; const gap=musicMood==='deep'?rand(25,60):rand(18,50); music.next=t+step8+gap; if(music.mood!==musicMood) music.next=t+step8+rand(2,5); } } }
}
/* the sound designer's check: renders named sounds silently and reports their level, so a build can be tested without ears */
export async function auditSounds(names){ const res={}; for(const n of names){ const oc=new OfflineAudioContext(2,44100*5,44100), ctx0=ctx, B0=B, hid=hidden; ctx=oc; hidden=false; offline=true; const nb=noise; noise={white:noiseBuf('white'),pink:noiseBuf('pink'),brown:noiseBuf('brown')}; B={fx:oc.destination,world:oc.destination,send:oc.createGain(),amb:oc.destination,rev:{}}; let err=null; try{ if(n==='step:grass') SND.step({},'grass'); else if(n.startsWith('step:')) SND.step({},n.slice(5)); else SND[n]({}); }catch(e){ err=String(e); } ctx=ctx0; noise=nb; B=B0; hidden=hid; offline=false; const r=await oc.startRendering(), d=r.getChannelData(0); let pk=0, sum=0, last=0, zc=0; for(let i=0;i<d.length;i++){ const a=Math.abs(d[i]); if(a>pk) pk=a; sum+=d[i]*d[i]; if(a>.001) last=i; if(d[i]*(d[i-1]||0)<0) zc++; } res[n]={peak:+pk.toFixed(3),rms:+Math.sqrt(sum/d.length).toFixed(4),sec:+(last/44100).toFixed(2),zcHz:Math.round(zc/2/5),nan:Number.isNaN(pk),err}; } return res; }
