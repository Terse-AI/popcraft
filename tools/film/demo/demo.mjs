// Records a REAL gameplay demo of StarVale: the live game with its HUD panels, driven by real
// input events and the game's own action API, captured full-page (CDP screencast) with the game's
// real synthesized audio tapped straight off the WebAudio graph. Nothing is faked or re-drawn.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { execSync } from 'child_process';

const OUT = process.argv[2] || 'out';
const SECS = +(process.argv[3] || 8);
const W = 1280, H = 720;   // capture light for a smooth real-time frame rate; upscaled to 1080p at build
const DIR = OUT; fs.rmSync('frames', { recursive: true, force: true }); fs.mkdirSync('frames', { recursive: true });

const therm = () => { try { return +(/CPU_Speed_Limit\s*=\s*(\d+)/.exec(execSync('pmset -g therm').toString()) || [0, 100])[1]; } catch (e) { return 100; } };

// injected before any page script: keep the page "visible" so audio + rAF stay live, and fork
// everything that reaches the speakers into a MediaStream we can record.
const TAP = `(()=>{
  try { Object.defineProperty(document,'hidden',{get:()=>false,configurable:true});
        Object.defineProperty(document,'visibilityState',{get:()=>'visible',configurable:true}); } catch(e){}
  const OrigAC = window.AudioContext || window.webkitAudioContext;
  if(!OrigAC) return;
  function Wrapped(...a){
    const ctx = new OrigAC(...a);
    try{ const tap = ctx.createMediaStreamDestination(); ctx.destination.__tap = tap; window.__audioStream = tap.stream; }
    catch(e){ window.__audioErr = String(e); }
    return ctx;
  }
  Wrapped.prototype = OrigAC.prototype;
  try{ Object.defineProperty(Wrapped,'name',{value:'AudioContext'}); }catch(e){}
  window.AudioContext = Wrapped; window.webkitAudioContext = Wrapped;
  const oc = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function(t,...r){
    if(t && t.__tap){ try{ oc.call(this, t.__tap); }catch(e){} }
    return oc.call(this, t, ...r);
  };
})();`;

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', protocolTimeout: 1800000, userDataDir: process.env.HOME + '/Library/Caches/sv_demo_prof',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--window-size=' + W + ',' + H, '--force-device-scale-factor=1']
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });
await page.evaluateOnNewDocument(TAP);
page.on('pageerror', e => console.log('pageerror', String(e).slice(0, 200)));

// audio blob comes back over the pipe
const audioParts = [];
await page.exposeFunction('__achunk', b64 => audioParts.push(Buffer.from(b64, 'base64')));

await page.goto('https://nova-games.up.railway.app/play/starvale/?demo=1&lang=en', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction('window.__sv && document.querySelector("#load.hidden")', { timeout: 300000, polling: 500 });
console.log('loaded', await page.evaluate(() => [!!window.__audioStream, window.__audioErr || 'tap-ok']));

// settle the opening: dismiss the farm picker / guide cards, give a starter kit, pick a known state
await page.evaluate(() => {
  const G = __sv.G, S = __sv.S;
  try { document.querySelectorAll('#dynmodal,#guide,#todo').forEach(e => e.remove()); } catch (e) {}   // onboarding only — keep the .panel HUD elements (inventory, shop…)
  if (G.startFarm && !S.farmType) G.startFarm('standard');
  G.closeModal && G.closeModal();
});

// the director + overlay live in-page so their clock matches the audio clock
await page.evaluate(() => {
  const d = document, S = __sv.S, G = __sv.G, P = __sv.player, cam = __sv.cam;
  const st = d.createElement('style');
  st.textContent = `
   #dz{position:fixed;inset:0;z-index:200;pointer-events:none;font-family:'Avenir Next','PingFang SC',system-ui,sans-serif}
   #dz .title{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);text-align:center;opacity:0;transition:opacity .5s}
   #dz .title h1{margin:0;color:#fff;font-size:68px;font-weight:600;letter-spacing:1px;text-shadow:0 3px 24px rgba(0,0,0,.6)}
   #dz .title p{margin:10px 0 0;color:#f0ead8;font-size:26px;text-shadow:0 2px 14px rgba(0,0,0,.6)}
   #dz .hint{position:absolute;left:50%;bottom:11%;transform:translate(-50%,16px);background:rgba(18,16,22,.62);backdrop-filter:blur(8px);
     border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:13px 22px;opacity:0;transition:opacity .35s,transform .35s;max-width:72vw}
   #dz .hint b{color:#fff;font-size:27px;font-weight:600;display:block;text-align:center}
   #dz .hint span{color:#cfc8dc;font-size:18px;display:block;text-align:center;margin-top:3px}
   #dz .hint.on{opacity:1;transform:translate(-50%,0)}
   #dz .key{display:inline-block;background:rgba(255,255,255,.16);border-radius:6px;padding:1px 9px;margin:0 3px;font-weight:700;color:#fff;font-size:16px}`;
  d.head.appendChild(st);
  const z = d.createElement('div'); z.id = 'dz';
  z.innerHTML = '<div class="title"><h1></h1><p></p></div><div class="hint"><b></b><span></span></div>';
  d.body.appendChild(z);
  const T = z.querySelector('.title'), Hh = z.querySelector('.hint');
  window.__title = (h, p, ms = 2600) => { T.querySelector('h1').textContent = h; T.querySelector('p').innerHTML = p || ''; T.style.opacity = 1; setTimeout(() => T.style.opacity = 0, ms); };
  window.__hint = (b, s) => { Hh.querySelector('b').textContent = b; Hh.querySelector('span').innerHTML = s || ''; Hh.classList.add('on'); };
  window.__hintOff = () => Hh.classList.remove('on');

  // real key events the game's own handlers pick up
  const kv = { W: 'KeyW', A: 'KeyA', S: 'KeyS', D: 'KeyD', Space: 'Space', Shift: 'ShiftLeft', Tab: 'Tab', E: 'KeyE', M: 'KeyM', C: 'KeyC', J: 'KeyJ', F: 'KeyF' };
  window.__down = k => dispatchEvent(new KeyboardEvent('keydown', { code: kv[k] || k, key: k.length === 1 ? k.toLowerCase() : k, bubbles: true }));
  window.__up = k => dispatchEvent(new KeyboardEvent('keyup', { code: kv[k] || k, key: k.length === 1 ? k.toLowerCase() : k, bubbles: true }));
  window.__press = k => { window.__down(k); setTimeout(() => window.__up(k), 90); };

  window.__teleport = (x, zz, yaw) => { P.pos.x = x; P.pos.z = zz; P.pos.y = __sv.walkH(x, zz); if (yaw !== undefined) { cam.yaw = yaw; P.yaw = yaw; } };
  window.__season = (s, t, w = 'clear') => { if (S.inHouse) __sv.leaveHouse(); S.season = s; __sv.setSeason(s); S.time = t; S.weather = w; __sv.applyWeather(); G.weatherSnap && G.weatherSnap(w === 'rain' || w === 'storm' ? 1 : 0, w === 'snow' ? 1 : 0); };
  window.__tool = n => { S.tool = n; S.heldSeed = S.heldPlace = S.heldFert = null; __sv.renderStatus(); G.renderHotbar && G.renderHotbar(); };
  // keep the frame clean: no onboarding modal, no fps counter, no controls cheat-sheet
  try { G.pickFarm = () => {}; } catch (e) {}   // the onboarding modal fires late via reveal(); keep it off
  window.__clearUI = () => { try { d.querySelectorAll('#dynmodal,#guide,#todo').forEach(e => e.remove()); G.closeModal && G.closeModal(); if (G.startFarm && !S.farmType) G.startFarm('standard'); } catch (e) {} };
  try { d.querySelector('#fps') && (d.querySelector('#fps').style.display = 'none'); } catch (e) {}
  try { d.querySelector('#help') && (d.querySelector('#help').style.display = 'none'); } catch (e) {}
  window.__clearUI();
  window.__ready = true;
});

// start audio recording in-page, synced to the director clock
await page.evaluate(() => new Promise(res => {
  if (!window.__audioStream) { window.__arec = null; return res(); }
  const rec = new MediaRecorder(window.__audioStream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 160000 });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data.size) e.data.arrayBuffer().then(b => { const u = new Uint8Array(b); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); window.__achunk(btoa(s)); }); };
  window.__arec = rec; rec.start(1000); res();
}));

// screencast: whole page incl. HUD
const client = await page.target().createCDPSession();
const T0 = performance.now();
const stamps = [];
let fi = 0;
client.on('Page.screencastFrame', async ({ data, sessionId }) => {
  const t = (performance.now() - T0) / 1000;
  const n = fi++; fs.writeFileSync('frames/' + String(n).padStart(6, '0') + '.jpg', Buffer.from(data, 'base64'));
  stamps.push(t);
  try { await client.send('Page.screencastFrameAck', { sessionId }); } catch (e) {}
});
await client.send('Page.startScreencast', { format: 'jpeg', quality: 56, maxWidth: W, maxHeight: H, everyNthFrame: 1 });

// ---- run the timeline (the director is passed in as a string of page code) ----
const timeline = fs.readFileSync(process.env.TL || 'timeline.js', 'utf8');
await page.evaluate(`new Promise(async(resolve)=>{ const wait=ms=>new Promise(r=>setTimeout(r,ms)); ${timeline}\n; resolve(); })`);

await client.send('Page.stopScreencast');
await new Promise(r => setTimeout(r, 400));
await page.evaluate(() => new Promise(res => { const r = window.__arec; if (!r) return res(); r.onstop = () => res(); r.stop(); }));
await new Promise(r => setTimeout(r, 600));
await browser.close();

fs.writeFileSync('frames/stamps.json', JSON.stringify(stamps));
if (audioParts.length) fs.writeFileSync(OUT + '.audio.webm', Buffer.concat(audioParts));
console.log('frames', fi, 'dur', stamps.length ? stamps[stamps.length - 1].toFixed(1) : 0, 'audioKB', audioParts.length ? Math.round(Buffer.concat(audioParts).length / 1024) : 0, 'therm', therm());
