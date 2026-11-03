// Smooth, bilingual, high-res gameplay demo. One game session, recorded in short segments with a
// cool-down between each (so every segment stays high-fps even at 1080p/1440p). The HUD follows
// ?lang; captions come from TXT. It opens in autumn and every feature switches season or weather.
// Usage: SVW=1920 SVH=1080 node demo_seg.mjs <en|zh>
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { execSync } from 'child_process';

const LANG = (process.argv[2] === 'zh') ? 'zh' : 'en';
const W = +(process.env.SVW || 1920), H = +(process.env.SVH || 1080);
const therm = () => { try { return +(/CPU_Speed_Limit\s*=\s*(\d+)/.exec(execSync('pmset -g therm').toString()) || [0, 100])[1]; } catch (e) { return 100; } };
const gpu = () => { try { return +execSync('sysctl -n machdep.xcpm.gpu_thermal_level').toString().trim() || 0; } catch (e) { return 0; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// This Mac can THRMTRIP power-off under sustained GPU load. Before every segment, wait until the CPU
// is unthrottled AND the GPU thermal level is genuinely low (ceiling is ~100+), then rest a beat more,
// so the GPU never climbs anywhere near the danger zone across the run.
const coolReady = async () => { let n = 0; while (!(therm() >= 92 && gpu() <= 30)) { if (++n > 120) break; await sleep(6000); } await sleep(3000); };

const KEY = s => `<span class="key">${s}</span>`;
const TXT = {
  en: {
    t1: 'StarVale', s1: 'a whole cozy valley — right in your browser',
    walk: 'Walk the valley', walkS: `${KEY('W')}${KEY('A')}${KEY('S')}${KEY('D')} to move · ${KEY('Space')} to jump`,
    farm: 'Till, plant & water', farmS: 'grow your own crops, row by row',
    harvest: 'Reap the harvest', harvestS: 'scythe your grown crops',
    fish: 'Cast a line', fishS: 'fish the lake, the river, the sea',
    animals: 'Raise animals', animalsS: 'cows, sheep & chickens — fresh milk and eggs',
    gather: 'Chop · mine · forage', gatherS: 'gather wood, ore and wild food',
    pack: 'Your pack & tools', packS: `${KEY('Tab')} opens the backpack · ${KEY('1')}–${KEY('6')} switch tools`,
    map: 'The whole valley', mapS: `press ${KEY('M')} for the map`,
    town: 'Visit the town', townS: 'shops, neighbours, festivals through the year',
    craft: 'Craft, cook & fight', craftS: 'build machines, cook recipes, delve the mines',
    boat: 'Row the lake', boatS: 'sail out and explore the water',
    weather: 'Real weather', weatherS: 'sun · rain · storms · snow',
    night: 'Nights & northern lights', nightS: 'fireflies, aurora, a sky full of stars',
    coop: 'Play together', coopS: 'invite a friend with one link',
    t2: 'StarVale', s2: 'play free · nova-games.up.railway.app'
  },
  zh: {
    t1: '星星人露谷', s1: '一整座温暖山谷 · 打开网页就能玩',
    walk: '自由漫步', walkS: `${KEY('W')}${KEY('A')}${KEY('S')}${KEY('D')} 移动 · ${KEY('空格')} 跳跃`,
    farm: '锄地 · 播种 · 浇水', farmS: '一行一行种出自己的庄稼',
    harvest: '收获作物', harvestS: '用镰刀收割成熟的庄稼',
    fish: '湖边垂钓', fishS: '湖泊、河流、大海都能钓',
    animals: '饲养动物', animalsS: '牛、羊、鸡 —— 新鲜牛奶和鸡蛋',
    gather: '砍树 · 挖矿 · 采集', gatherS: '收集木头、矿石和野味',
    pack: '背包与工具', packS: `${KEY('Tab')} 打开背包 · ${KEY('1')}–${KEY('6')} 切换工具`,
    map: '俯瞰整座山谷', mapS: `按 ${KEY('M')} 打开地图`,
    town: '逛逛小镇', townS: '商店、邻居、四季节日',
    craft: '制作 · 烹饪 · 战斗', craftS: '造机器、做料理、下矿洞',
    boat: '泛舟湖上', boatS: '划船出去探索水域',
    weather: '真实天气', weatherS: '晴 · 雨 · 暴风雨 · 飘雪',
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

// Opens and closes in autumn; every feature switches season/weather. Each beat is played hands-on —
// the star figure really walks through the scene and performs a run of actions, so it reads like play.
const SEGS = [
  { name: 'a_intro', pre: `__hintOff(); __season(2,1030); __teleport(-2,18,0.1); __sv.cam.pitch=.12;`,
    body: `__title(L.t1,L.s1,3600); __pan(-0.3,0.38,6400); __down('W'); await wait(5400); __up('W'); await wait(500);` },
  { name: 'b_walk', pre: `__hintOff(); __season(1,560); __teleport(-2,18,0.1); __sv.cam.pitch=.12;`,
    body: `__hint(L.walk,L.walkS); __pan(0.1,-0.55,2800); await __walk(2800); __pan(-0.55,0.35,2600); await __walk(2400); __press('Space'); await wait(600); __press('Space'); await wait(750); __hintOff(); await wait(400);` },
  { name: 'c_farm', pre: `__hintOff(); __season(0,900); __teleport(0,5,0); __sv.cam.pitch=.17;`,
    body: `__hint(L.farm,L.farmS); __tool(0); __tgt(0,1.4); __sv.G.useTool(); await wait(520); await __walk(520); __tgt(0,1.4); __sv.G.useTool(); await wait(520); await __walk(520); __tgt(0,1.4); __sv.G.useTool(); await wait(560);
      __tool(1); __tgt(0,1.4); __sv.G.useTool(); await wait(520); await __walk(500); __tgt(0,1.4); __sv.G.useTool(); await wait(560); await wait(500); __hintOff(); await wait(400);` },
  { name: 'd_harvest', pre: `__hintOff(); __season(2,1100); __teleport(0,5,0); __sv.cam.pitch=.17;`,
    body: `__hint(L.harvest,L.harvestS); __tool(4); for(let i=0;i<5;i++){ __tgt(0,1.4); try{ __sv.G.harvestHere&&__sv.G.harvestHere(); }catch(e){} __sv.G.useTool(); await wait(380); await __walk(360); } __hintOff(); await wait(400);` },
  { name: 'e_fish', pre: `__hintOff(); __season(1,900,'rain'); __teleport(__sv.DOCK.x,__sv.DOCK.z1-4,-0.97); __sv.cam.pitch=.1;`,
    body: `__hint(L.fish,L.fishS); await __walk(1100); try{ __sv.G.tryFish(); }catch(e){} await wait(1600); try{ __sv.G.fishPress(true); }catch(e){} await wait(420); try{ __sv.G.fishPress(false); }catch(e){} await wait(420); try{ __sv.G.fishPress(true); }catch(e){} await wait(520); try{ __sv.G.fishPress(false); }catch(e){} await wait(900); try{ __sv.G.cancelFish&&__sv.G.cancelFish(); }catch(e){} __hintOff(); await wait(400);` },
  { name: 'f_animals', pre: `__hintOff(); __season(1,1000); __sv.S.built.barn=3; __sv.S.built.coop=3; try{ ['cow','cow','sheep','goat'].forEach(a=>__sv.spawnAnimal(a)); ['chicken','chicken','duck'].forEach(a=>__sv.spawnAnimal(a)); }catch(e){} __teleport(22,12,Math.PI*0.5); __sv.cam.pitch=.14;`,
    body: `__hint(L.animals,L.animalsS); __pan(1.57,2.3,2800); await __walk(2800); try{ __sv.interact&&__sv.interact(); }catch(e){} await wait(900); await __walk(900); try{ __sv.interact&&__sv.interact(); }catch(e){} await wait(800); __hintOff(); await wait(400);` },
  { name: 'g_gather', pre: `__hintOff(); __season(3,800,'snow'); __teleport(-20,13,0.5); __sv.cam.pitch=.14;`,
    body: `__hint(L.gather,L.gatherS); await __walk(900); __tool(2); for(let i=0;i<3;i++){ __sv.G.useTool(); await wait(520); } await wait(350); __pan(0.5,1.5,1500); await __walk(1300); __tool(3); for(let i=0;i<3;i++){ __sv.G.useTool(); await wait(520); } __hintOff(); await wait(400);` },
  { name: 'h_pack', pre: `__hintOff(); __season(0,620); __teleport(0,6,0.2); __sv.cam.pitch=.12;`,
    body: `__hint(L.pack,L.packS); __press('Tab'); await wait(2300); __press('Tab'); await wait(350); for(let n=0;n<6;n++){ __tool(n); await wait(380); } __hintOff(); await wait(400);` },
  { name: 'i_map', pre: `__hintOff(); __season(0,1000); __teleport(0,6,0.2); __sv.cam.pitch=.12;`,
    body: `__hint(L.map,L.mapS); __press('M'); await wait(2800); __press('M'); await wait(400); __hintOff(); await wait(350);` },
  { name: 'j_town', pre: `__hintOff(); __season(2,600); __teleport(26,-33,Math.PI*0.92); __sv.cam.pitch=.12;`,
    body: `__hint(L.town,L.townS); await __walk(1500); try{ __sv.G.openStore(); }catch(e){} await wait(1900); try{ var b=document.querySelector('#dynmodal .buy'); if(b) b.click(); }catch(e){} await wait(1300); __clearModal(); __hintOff(); await wait(400);` },
  { name: 'k_craft', pre: `__hintOff(); __season(3,1200); __teleport(-6,4,0.4); __sv.cam.pitch=.12;`,
    body: `__hint(L.craft,L.craftS); try{ __sv.G.openCraft(); }catch(e){} await wait(2100); __clearModal(); await wait(300); __tool(5); for(let i=0;i<3;i++){ __sv.G.useTool(); await wait(480); } __hintOff(); await wait(400);` },
  { name: 'l_boat', pre: `__hintOff(); __season(1,1130); __teleport(__sv.DOCK.x,__sv.DOCK.z1-1,-0.97); __sv.cam.pitch=.08; try{ if(!__sv.S.boating) __sv.toggleBoat(); }catch(e){}`,
    body: `__hint(L.boat,L.boatS); __down('W'); __pan(-0.97,-0.3,3200); await wait(3000); __up('W'); await wait(400); __down('W'); await wait(1500); __up('W'); __hintOff(); await wait(400); try{ if(__sv.S.boating) __sv.toggleBoat(); }catch(e){}` },
  { name: 'm_weather', pre: `__hintOff(); __season(1,1000,'storm'); __teleport(15,41,-0.97); __sv.cam.pitch=.08;`,
    body: `__hint(L.weather,L.weatherS); __pan(-0.97,-0.5,2800); await wait(2800); __hintOff(); await wait(400);` },
  { name: 'n_night', pre: `__hintOff(); __season(2,1380); __teleport(15,41,-0.97); __sv.cam.pitch=.08;`,
    body: `__hint(L.night,L.nightS); __pan(-0.97,-0.42,3200); await wait(3000); __hintOff(); await wait(400);` },
  { name: 'o_coop', pre: `__hintOff(); __season(0,560); __teleport(-2,18,0.1); __sv.cam.pitch=.12;`,
    body: `__hint(L.coop,L.coopS); try{ __sv.G.openCoop(); }catch(e){} await wait(2700); __clearModal(); __hintOff(); await wait(400);` },
  { name: 'p_outro', pre: `__hintOff(); __season(2,1160); __teleport(-2,18,0.1); __sv.cam.pitch=.12;`,
    body: `__pan(0.1,-0.22,4000); __down('W'); await wait(3400); __up('W'); __title(L.t2,L.s2,3600); await wait(1600);` },
];
const ONLY = process.env.SEGONLY;

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
console.log('loaded', LANG, W + 'x' + H, await page.evaluate(() => [!!window.__audioStream, window.__audioErr || 'ok']));

await page.evaluate((TXT) => {
  const d = document, S = __sv.S, G = __sv.G, P = __sv.player, cam = __sv.cam;
  window.L = TXT;
  const st = d.createElement('style');
  st.textContent = `#dz{position:fixed;inset:0;z-index:200;pointer-events:none;font-family:'Avenir Next','PingFang SC',system-ui,sans-serif}
   #dz .title{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);text-align:center;opacity:0;transition:opacity .5s}
   #dz .title h1{margin:0;color:#fff;font-size:5.6vw;font-weight:600;letter-spacing:1px;text-shadow:0 3px 24px rgba(0,0,0,.6)}
   #dz .title p{margin:10px 0 0;color:#f0ead8;font-size:2.1vw;text-shadow:0 2px 14px rgba(0,0,0,.6)}
   #dz .hint{position:absolute;left:50%;bottom:11%;transform:translate(-50%,16px);background:rgba(18,16,22,.62);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.14);border-radius:1.2vw;padding:1.1vw 1.9vw;opacity:0;transition:opacity .35s,transform .35s;max-width:74vw}
   #dz .hint b{color:#fff;font-size:2.2vw;font-weight:600;display:block;text-align:center}
   #dz .hint span.s{color:#cfc8dc;font-size:1.5vw;display:block;text-align:center;margin-top:3px}
   #dz .hint.on{opacity:1;transform:translate(-50%,0)}
   #dz .key{display:inline-block;background:rgba(255,255,255,.16);border-radius:5px;padding:1px 9px;margin:0 3px;font-weight:700;color:#fff;font-size:1.3vw}`;
  d.head.appendChild(st);
  const z = d.createElement('div'); z.id = 'dz';
  z.innerHTML = '<div class="title"><h1></h1><p></p></div><div class="hint"><b></b><span class="s"></span></div>';
  d.body.appendChild(z);
  const T = z.querySelector('.title'), Hh = z.querySelector('.hint');
  window.__title = (h, p, ms = 2600) => { T.querySelector('h1').textContent = h; T.querySelector('p').innerHTML = p || ''; T.style.opacity = 1; setTimeout(() => T.style.opacity = 0, ms); };
  window.__hint = (b, s) => { Hh.querySelector('b').textContent = b; Hh.querySelector('span').innerHTML = s || ''; Hh.classList.add('on'); };
  window.__hintOff = () => Hh.classList.remove('on');
  const kv = { W: 'KeyW', A: 'KeyA', S: 'KeyS', D: 'KeyD', Space: 'Space', Tab: 'Tab', M: 'KeyM' };
  window.__down = k => dispatchEvent(new KeyboardEvent('keydown', { code: kv[k] || k, key: k.length === 1 ? k.toLowerCase() : k, bubbles: true }));
  window.__up = k => dispatchEvent(new KeyboardEvent('keyup', { code: kv[k] || k, key: k.length === 1 ? k.toLowerCase() : k, bubbles: true }));
  window.__press = k => { window.__down(k); setTimeout(() => window.__up(k), 90); };
  window.__teleport = (x, zz, yaw) => { P.pos.x = x; P.pos.z = zz; P.pos.y = __sv.walkH(x, zz); if (yaw !== undefined) { cam.yaw = yaw; P.yaw = yaw; } };
  window.__season = (s, t, w = 'clear') => { if (S.inHouse) __sv.leaveHouse(); S.season = s; __sv.setSeason(s); S.time = t; S.weather = w; __sv.applyWeather(); G.weatherSnap && G.weatherSnap(w === 'rain' || w === 'storm' ? 1 : 0, w === 'snow' ? 1 : 0); };
  window.__tool = n => { S.tool = n; S.heldSeed = S.heldPlace = S.heldFert = null; __sv.renderStatus(); G.renderHotbar && G.renderHotbar(); };
  window.__pan = (a, b, ms) => { const t0 = performance.now(); const step = () => { const u = Math.min(1, (performance.now() - t0) / ms); cam.yaw = a + (b - a) * (u * u * (3 - 2 * u)); if (u < 1) requestAnimationFrame(step); }; step(); };
  window.__walk = async ms => { window.__down('W'); await new Promise(r => setTimeout(r, ms)); window.__up('W'); };
  window.__tgt = (dx, dz) => { try { __sv.setTarget({ x: Math.round(P.pos.x + dx), z: Math.round(P.pos.z + dz) }); } catch (e) {} };
  window.__clearModal = () => { try { G.closeModal && G.closeModal(); } catch (e) {} const m = d.querySelector('#dynmodal'); if (m) m.remove(); const bm = d.querySelector('#bigmap'); if (bm) bm.remove(); };
  try { G.pickFarm = () => {}; } catch (e) {}
  d.querySelectorAll('#dynmodal,#guide,#todo').forEach(e => e.remove());
  if (G.startFarm && !S.farmType) G.startFarm('standard');
  d.querySelector('#fps') && (d.querySelector('#fps').style.display = 'none');
  d.querySelector('#help') && (d.querySelector('#help').style.display = 'none');
  for (let x = -6; x <= 6; x++) for (let zz = 2; zz <= 11; zz++) { S.tiles.set(x + ',' + zz, { tilled: true, watered: (x + zz) % 3 !== 0, crop: { id: ['melon', 'corn', 'tomato', 'radish', 'pepper', 'blueberry'][Math.abs(x) % 6], stage: Math.min(9, 6 + Math.abs(zz) % 4), watered: true, acc: 0 } }); try { G.refreshTileMesh(x, zz); G.rebuildCrop(x, zz); } catch (e) {} }
  try { ['melon', 'corn', 'tomato'].forEach(c => G.give('crop', c, 9, true)); G.give('seed', 'melon', 12, true); G.give('fish', 'bass', 3, true); G.give('mat', 'wood', 40, true); G.give('mat', 'stone', 24, true); G.give('product', 'milk', 4, true); G.give('product', 'egg', 6, true); S.gold = 3280; __sv.renderStatus(); } catch (e) {}
}, TXT);

const client = await page.target().createCDPSession();
const ROOT = 'seg_' + LANG;
// the renderer gets unstable after ~8 back-to-back segments, so a run can be done in batches
// (SEGSTART/SEGLEN) across fresh sessions; only the first batch wipes the output.
const START = +(process.env.SEGSTART || 0), LEN = +(process.env.SEGLEN || SEGS.length);
if (START === 0) { fs.rmSync(ROOT, { recursive: true, force: true }); }
fs.mkdirSync(ROOT, { recursive: true });

for (const seg of SEGS.slice(START, START + LEN)) {
  if (ONLY && seg.name !== ONLY) continue;
  await coolReady();
  await page.evaluate(`(async()=>{ const wait=ms=>new Promise(r=>setTimeout(r,ms)); ${seg.pre} })()`);
  await sleep(600);
  const dir = ROOT + '/' + seg.name; fs.mkdirSync(dir, { recursive: true });
  const stamps = []; let fi = 0; const T0 = performance.now();
  const onFrame = async ({ data, sessionId }) => { const t = (performance.now() - T0) / 1000; fs.writeFileSync(dir + '/' + String(fi++).padStart(5, '0') + '.jpg', Buffer.from(data, 'base64')); stamps.push(t); try { await client.send('Page.screencastFrameAck', { sessionId }); } catch (e) {} };
  client.on('Page.screencastFrame', onFrame);
  await page.evaluate(nm => new Promise(res => { if (!window.__audioStream) return res(); const rec = new MediaRecorder(window.__audioStream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 160000 }); rec.ondataavailable = e => { if (e.data.size) e.data.arrayBuffer().then(b => { const u = new Uint8Array(b); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); window.__achunk(nm, btoa(s)); }); }; window.__arec = rec; rec.start(1000); res(); }), seg.name);
  await client.send('Page.startScreencast', { format: 'jpeg', quality: 76, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  await page.evaluate(`new Promise(async(resolve)=>{ const wait=ms=>new Promise(r=>setTimeout(r,ms)); ${seg.body}\n; resolve(); })`);
  await client.send('Page.stopScreencast');
  client.off('Page.screencastFrame', onFrame);
  await sleep(300);
  await page.evaluate(() => new Promise(res => { const r = window.__arec; if (!r) return res(); r.onstop = () => res(); r.stop(); }));
  await sleep(300);
  fs.writeFileSync(dir + '/stamps.json', JSON.stringify(stamps));
  if (audio[seg.name]) fs.writeFileSync(dir + '/audio.webm', Buffer.concat(audio[seg.name]));
  const fps = stamps.length / (stamps[stamps.length - 1] || 1);
  console.log('seg', seg.name, 'frames', fi, 'fps', fps.toFixed(0), 'audioKB', audio[seg.name] ? Math.round(Buffer.concat(audio[seg.name]).length / 1024) : 0, 'therm', therm(), 'gpu', gpu());
}
await browser.close();
console.log('DONE', LANG);
