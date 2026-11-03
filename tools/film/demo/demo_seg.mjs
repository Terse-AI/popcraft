// Smooth, bilingual capture: one game session, recorded in short segments with a cool-down between
// each so every segment stays ~30fps. The game HUD follows ?lang; the hint captions come from TXT.
// Usage: node demo_seg.mjs <en|zh>
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { execSync } from 'child_process';

const LANG = (process.argv[2] === 'zh') ? 'zh' : 'en';
const W = 1280, H = 720;
const therm = () => { try { return +(/CPU_Speed_Limit\s*=\s*(\d+)/.exec(execSync('pmset -g therm').toString()) || [0, 100])[1]; } catch (e) { return 100; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const coolTo = async v => { let n = 0; while (therm() < v) { if (++n > 90) break; await sleep(8000); } };

const KEY = s => `<span class="key">${s}</span>`;
const TXT = {
  en: {
    t1: 'StarVale', s1: 'a whole cozy valley — right in your browser',
    walk: 'Walk the valley', walkS: `${KEY('W')}${KEY('A')}${KEY('S')}${KEY('D')} to move · ${KEY('Space')} to jump`,
    farm: "Tend the star's farm", farmS: 'till the soil · plant seeds · water the rows',
    fish: 'Cast a line', fishS: 'fish the lake, the river, the sea',
    gather: 'Chop · mine · forage', gatherS: 'gather wood, ore and wild food',
    pack: 'Your pack & tools', packS: `${KEY('Tab')} opens the backpack · ${KEY('1')}–${KEY('6')} switch tools`,
    town: 'Visit the town', townS: 'shops, neighbours, festivals through the year',
    craft: 'Craft, cook & fight', craftS: 'build machines, cook recipes, delve the mines',
    weather: 'Real weather', weatherS: 'sun · rain · storms · snow',
    seasons: 'Four seasons', seasonsS: 'the whole valley turns with them',
    night: 'Nights & northern lights', nightS: 'fireflies, aurora, a sky full of stars',
    coop: 'Play together', coopS: 'invite a friend with one link',
    t2: 'StarVale', s2: 'play free · nova-games.up.railway.app'
  },
  zh: {
    t1: '星星人露谷', s1: '一整座温暖山谷 · 打开网页就能玩',
    walk: '自由漫步', walkS: `${KEY('W')}${KEY('A')}${KEY('S')}${KEY('D')} 移动 · ${KEY('空格')} 跳跃`,
    farm: '打理你的农场', farmS: '锄地 · 播种 · 浇水',
    fish: '湖边垂钓', fishS: '湖泊、河流、大海都能钓',
    gather: '砍树 · 挖矿 · 采集', gatherS: '收集木头、矿石和野味',
    pack: '背包与工具', packS: `${KEY('Tab')} 打开背包 · ${KEY('1')}–${KEY('6')} 切换工具`,
    town: '逛逛小镇', townS: '商店、邻居、四季节日',
    craft: '制作 · 烹饪 · 战斗', craftS: '造机器、做料理、下矿洞',
    weather: '真实天气', weatherS: '晴 · 雨 · 暴风雨 · 飘雪',
    seasons: '四季流转', seasonsS: '整座山谷随之变换',
    night: '夜晚与极光', nightS: '萤火、极光、满天繁星',
    coop: '多人同玩', coopS: '一个链接就能邀请好友',
    t2: '星星人露谷', s2: '免费游玩 · nova-games.up.railway.app'
  }
}[LANG];

const TAP = `(()=>{ try{ Object.defineProperty(document,'hidden',{get:()=>false,configurable:true}); Object.defineProperty(document,'visibilityState',{get:()=>'visible',configurable:true}); }catch(e){}
  const O=window.AudioContext||window.webkitAudioContext; if(!O) return;
  function Wp(...a){ const c=new O(...a); try{ const t=c.createMediaStreamDestination(); c.destination.__tap=t; window.__audioStream=t.stream; }catch(e){ window.__audioErr=String(e); } return c; }
  Wp.prototype=O.prototype; window.AudioContext=Wp; window.webkitAudioContext=Wp;
  const oc=AudioNode.prototype.connect; AudioNode.prototype.connect=function(t,...r){ if(t&&t.__tap){ try{ oc.call(this,t.__tap); }catch(e){} } return oc.call(this,t,...r); };
})();`;

const SEGS = [
  { name: 'a_intro', pre: `__hintOff(); __season(1,540); __teleport(-2,18,0.1); __sv.cam.pitch=.12;`,
    body: `__title(L.t1,L.s1,3200); __pan(-0.28,0.26,4400); await wait(3600);
      __hint(L.walk,L.walkS); await __walk(1600); __press('Space'); await wait(900); __hintOff(); await wait(400);` },
  { name: 'b_farm', pre: `__hintOff(); __season(1,560); __teleport(0,6,Math.PI); __sv.cam.pitch=.17;`,
    body: `__hint(L.farm,L.farmS);
      __tool(0); __tgt(0,1.4); __sv.G.useTool(); await wait(650); __tgt(1,1.4); __sv.G.useTool(); await wait(650);
      __tool(1); __tgt(0,1.4); __sv.G.useTool(); await wait(680); await wait(700); __hintOff(); await wait(400);` },
  { name: 'c_fish', pre: `__hintOff(); __season(1,560); __teleport(__sv.DOCK.x,__sv.DOCK.z1-2,-0.97); __sv.cam.pitch=.1;`,
    body: `__hint(L.fish,L.fishS);
      try{ __sv.G.tryFish(); }catch(e){} await wait(1800); try{ __sv.G.fishPress(true); }catch(e){} await wait(500); try{ __sv.G.fishPress(false); }catch(e){}
      await wait(1300); try{ __sv.G.cancelFish&&__sv.G.cancelFish(); }catch(e){} __hintOff(); await wait(400);` },
  { name: 'd_gather', pre: `__hintOff(); __season(1,580); __teleport(-20,15,0.6); __sv.cam.pitch=.14;`,
    body: `__hint(L.gather,L.gatherS);
      __tool(2); __sv.G.useTool(); await wait(650); __sv.G.useTool(); await wait(720);
      __tool(3); __sv.G.useTool(); await wait(760); __hintOff(); await wait(350);
      __teleport(0,6,0.2); await wait(450);
      __hint(L.pack,L.packS); __press('Tab'); await wait(2200); __press('Tab'); await wait(450); __hintOff(); await wait(400);` },
  { name: 'e_town', pre: `__hintOff(); __season(1,600); __teleport(26,-30,Math.PI*0.92); __sv.cam.pitch=.12;`,
    body: `__hint(L.town,L.townS);
      try{ __sv.G.openStore(); }catch(e){} await wait(2400); __clearModal(); __hintOff(); await wait(350);
      __teleport(-6,4,0.4); await wait(400);
      __hint(L.craft,L.craftS); try{ __sv.G.openCraft(); }catch(e){} await wait(1900); __clearModal(); await wait(250);
      __tool(5); __sv.G.useTool(); await wait(650); __hintOff(); await wait(400);` },
  { name: 'f_seasons', pre: `__hintOff(); __season(1,1000,'storm'); __teleport(15,41,-0.97); __sv.cam.pitch=.08;`,
    body: `__hint(L.weather,L.weatherS); await wait(2000); __hintOff(); await wait(300);
      __hint(L.seasons,L.seasonsS); __season(0,900,'clear'); await wait(1600); __season(2,1030,'clear'); await wait(1600); __season(3,800,'snow'); await wait(1700); __hintOff(); await wait(300);
      __hint(L.night,L.nightS); __season(2,1380,'clear'); await wait(2100); __hintOff(); await wait(400);` },
  { name: 'g_coop', pre: `__hintOff(); __season(1,620); __teleport(-2,18,0.1); __sv.cam.pitch=.12;`,
    body: `__hint(L.coop,L.coopS); try{ __sv.G.openCoop(); }catch(e){} await wait(2400); __clearModal(); __hintOff(); await wait(400);
      __pan(0.1,-0.16,3000); __title(L.t2,L.s2,3400); await wait(3600);` },
];

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
page.on('pageerror', e => { const s = String(e); if (!/favicon/.test(s)) console.log('pageerror', s.slice(0, 160)); });
const audio = {};
await page.exposeFunction('__achunk', (name, b64) => { (audio[name] = audio[name] || []).push(Buffer.from(b64, 'base64')); });

await page.goto('https://nova-games.up.railway.app/play/starvale/?demo=1&lang=' + LANG, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction('window.__sv && document.querySelector("#load.hidden")', { timeout: 300000, polling: 500 });
console.log('loaded', LANG, await page.evaluate(() => [!!window.__audioStream, window.__audioErr || 'ok']));

await page.evaluate((TXT) => {
  const d = document, S = __sv.S, G = __sv.G, P = __sv.player, cam = __sv.cam;
  window.L = TXT;
  const st = d.createElement('style');
  st.textContent = `#dz{position:fixed;inset:0;z-index:200;pointer-events:none;font-family:'Avenir Next','PingFang SC',system-ui,sans-serif}
   #dz .title{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);text-align:center;opacity:0;transition:opacity .5s}
   #dz .title h1{margin:0;color:#fff;font-size:68px;font-weight:600;letter-spacing:1px;text-shadow:0 3px 24px rgba(0,0,0,.6)}
   #dz .title p{margin:10px 0 0;color:#f0ead8;font-size:26px;text-shadow:0 2px 14px rgba(0,0,0,.6)}
   #dz .hint{position:absolute;left:50%;bottom:11%;transform:translate(-50%,16px);background:rgba(18,16,22,.62);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:13px 22px;opacity:0;transition:opacity .35s,transform .35s;max-width:72vw}
   #dz .hint b{color:#fff;font-size:27px;font-weight:600;display:block;text-align:center}
   #dz .hint span.s{color:#cfc8dc;font-size:18px;display:block;text-align:center;margin-top:3px}
   #dz .hint.on{opacity:1;transform:translate(-50%,0)}
   #dz .key{display:inline-block;background:rgba(255,255,255,.16);border-radius:6px;padding:1px 9px;margin:0 3px;font-weight:700;color:#fff;font-size:16px}`;
  d.head.appendChild(st);
  const z = d.createElement('div'); z.id = 'dz';
  z.innerHTML = '<div class="title"><h1></h1><p></p></div><div class="hint"><b></b><span class="s"></span></div>';
  d.body.appendChild(z);
  const T = z.querySelector('.title'), Hh = z.querySelector('.hint');
  window.__title = (h, p, ms = 2600) => { T.querySelector('h1').textContent = h; T.querySelector('p').innerHTML = p || ''; T.style.opacity = 1; setTimeout(() => T.style.opacity = 0, ms); };
  window.__hint = (b, s) => { Hh.querySelector('b').textContent = b; Hh.querySelector('span').innerHTML = s || ''; Hh.classList.add('on'); };
  window.__hintOff = () => Hh.classList.remove('on');
  const kv = { W: 'KeyW', A: 'KeyA', S: 'KeyS', D: 'KeyD', Space: 'Space', Tab: 'Tab' };
  window.__down = k => dispatchEvent(new KeyboardEvent('keydown', { code: kv[k] || k, key: k.length === 1 ? k.toLowerCase() : k, bubbles: true }));
  window.__up = k => dispatchEvent(new KeyboardEvent('keyup', { code: kv[k] || k, key: k.length === 1 ? k.toLowerCase() : k, bubbles: true }));
  window.__press = k => { window.__down(k); setTimeout(() => window.__up(k), 90); };
  window.__teleport = (x, zz, yaw) => { P.pos.x = x; P.pos.z = zz; P.pos.y = __sv.walkH(x, zz); if (yaw !== undefined) { cam.yaw = yaw; P.yaw = yaw; } };
  window.__season = (s, t, w = 'clear') => { if (S.inHouse) __sv.leaveHouse(); S.season = s; __sv.setSeason(s); S.time = t; S.weather = w; __sv.applyWeather(); G.weatherSnap && G.weatherSnap(w === 'rain' || w === 'storm' ? 1 : 0, w === 'snow' ? 1 : 0); };
  window.__tool = n => { S.tool = n; S.heldSeed = S.heldPlace = S.heldFert = null; __sv.renderStatus(); G.renderHotbar && G.renderHotbar(); };
  window.__pan = (a, b, ms) => { const t0 = performance.now(); const step = () => { const u = Math.min(1, (performance.now() - t0) / ms); cam.yaw = a + (b - a) * (u * u * (3 - 2 * u)); if (u < 1) requestAnimationFrame(step); }; step(); };
  window.__walk = async ms => { window.__down('W'); await new Promise(r => setTimeout(r, ms)); window.__up('W'); };
  window.__tgt = (dx, dz) => { try { __sv.setTarget({ x: Math.round(P.pos.x + dx), z: Math.round(P.pos.z + dz) }); } catch (e) {} };
  window.__clearModal = () => { try { G.closeModal && G.closeModal(); } catch (e) {} const m = d.querySelector('#dynmodal'); if (m) m.remove(); };
  try { G.pickFarm = () => {}; } catch (e) {}
  d.querySelectorAll('#dynmodal,#guide,#todo').forEach(e => e.remove());
  if (G.startFarm && !S.farmType) G.startFarm('standard');
  d.querySelector('#fps') && (d.querySelector('#fps').style.display = 'none');
  d.querySelector('#help') && (d.querySelector('#help').style.display = 'none');
  for (let x = -6; x <= 6; x++) for (let zz = 2; zz <= 11; zz++) { S.tiles.set(x + ',' + zz, { tilled: true, watered: (x + zz) % 3 !== 0, crop: { id: ['melon', 'corn', 'tomato', 'radish', 'pepper', 'blueberry'][Math.abs(x) % 6], stage: Math.min(9, 6 + Math.abs(zz) % 4), watered: true, acc: 0 } }); try { G.refreshTileMesh(x, zz); G.rebuildCrop(x, zz); } catch (e) {} }
  try { ['melon', 'corn', 'tomato'].forEach(c => G.give('crop', c, 9, true)); G.give('seed', 'melon', 12, true); G.give('fish', 'bass', 3, true); G.give('mat', 'wood', 40, true); G.give('mat', 'stone', 24, true); S.gold = 2450; __sv.renderStatus(); } catch (e) {}
}, TXT);

const client = await page.target().createCDPSession();
const ROOT = 'seg_' + LANG;
fs.rmSync(ROOT, { recursive: true, force: true }); fs.mkdirSync(ROOT, { recursive: true });

for (const seg of SEGS) {
  await coolTo(92);
  await page.evaluate(`(async()=>{ const wait=ms=>new Promise(r=>setTimeout(r,ms)); ${seg.pre} })()`);
  await sleep(500);
  const dir = ROOT + '/' + seg.name; fs.mkdirSync(dir, { recursive: true });
  const stamps = []; let fi = 0; const T0 = performance.now();
  const onFrame = async ({ data, sessionId }) => { const t = (performance.now() - T0) / 1000; fs.writeFileSync(dir + '/' + String(fi++).padStart(5, '0') + '.jpg', Buffer.from(data, 'base64')); stamps.push(t); try { await client.send('Page.screencastFrameAck', { sessionId }); } catch (e) {} };
  client.on('Page.screencastFrame', onFrame);
  await page.evaluate(nm => new Promise(res => { if (!window.__audioStream) return res(); const rec = new MediaRecorder(window.__audioStream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 160000 }); rec.ondataavailable = e => { if (e.data.size) e.data.arrayBuffer().then(b => { const u = new Uint8Array(b); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); window.__achunk(nm, btoa(s)); }); }; window.__arec = rec; rec.start(1000); res(); }), seg.name);
  await client.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  await page.evaluate(`new Promise(async(resolve)=>{ const wait=ms=>new Promise(r=>setTimeout(r,ms)); ${seg.body}\n; resolve(); })`);
  await client.send('Page.stopScreencast');
  client.off('Page.screencastFrame', onFrame);
  await sleep(300);
  await page.evaluate(() => new Promise(res => { const r = window.__arec; if (!r) return res(); r.onstop = () => res(); r.stop(); }));
  await sleep(300);
  fs.writeFileSync(dir + '/stamps.json', JSON.stringify(stamps));
  if (audio[seg.name]) fs.writeFileSync(dir + '/audio.webm', Buffer.concat(audio[seg.name]));
  const fps = stamps.length / (stamps[stamps.length - 1] || 1);
  console.log('seg', seg.name, 'frames', fi, 'fps', fps.toFixed(0), 'audioKB', audio[seg.name] ? Math.round(Buffer.concat(audio[seg.name]).length / 1024) : 0, 'therm', therm());
}
await browser.close();
console.log('DONE', LANG);
