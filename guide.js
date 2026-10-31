/* A first day with a friend beside you: four short cards, then a checklist that ticks itself as you play. */
const CARDS=[
 {ic:'🌾',zh:['欢迎来到星谷','爷爷把湖边的小农场留给了你。这里没有时间压力:种地、钓鱼、下矿、认识邻居,怎么过都行。'],en:['Welcome to StarVale','Grandpa left you a little farm by the lake. No rush here: farm, fish, explore the mine, meet the neighbours. Live it your way.']},
 {ic:'🎮',zh:['怎么操作','WASD 走路 · Shift 跑 · 鼠标转视角\n1 到 6 换工具 · 左键使用\nE 交互、对话、睡觉 · F 钓鱼\nTab 背包 · C 制作 · J 日志 · M 大地图 · H 隐藏面板'],en:['Controls','WASD walk · Shift run · mouse look\n1 to 6 tools · left click to use\nE interact, talk, sleep · F fish\nTab bag · C craft · J journal · M map · H hide panels']},
 {ic:'🌱',zh:['能做什么','种 28 种作物、养鸡养牛、酿酒做果酱\n去镇上买卖、交朋友、参加 9 个节日\n下矿打怪、钓 23 种鱼、修复社区中心\n累了就回屋睡觉,新的一天从早上 6 点开始'],en:['What you can do','Grow 28 crops, raise animals, brew and preserve\nTrade in town, make friends, join 9 festivals\nMine, fight, catch 23 fish, restore the community centre\nTired? Sleep in your cabin. Each day starts at 6 AM']},
 {ic:'💾',zh:['关于存档','每晚睡觉时自动存档,也可以点 💾 随时保存。\n存档保存在你的 NOVA 账号里,需要先登录,换设备也能接着玩。'],en:['Saving','The game saves when you sleep, or tap 💾 any time.\nSaves live in your NOVA account, so sign in first. Then carry on from any device.']}];
const STEPS=[
 ['走到田边(WASD)','Walk to the field (WASD)',s=>s.moved>6],
 ['按 1 拿锄头,对着地面左键耕地','Press 1 for the hoe, left click to till',s=>s.S.stats.till>=1],
 ['按 Tab 打开背包,选防风草种子种下','Open your bag (Tab), pick parsnip seeds, plant one',s=>[...s.S.tiles.values()].some(t=>t.crop)],
 ['按 2 拿水壶,给它浇水','Press 2 for the can and water it',s=>[...s.S.tiles.values()].some(t=>t.crop&&t.watered)],
 ['去镇上和一位村民说话(M 看地图)','Go to town and talk to someone (M for the map)',s=>s.S.stats.meet>=1],
 ['回屋按 E 睡觉,结束第一天','Go home and press E to sleep',s=>s.S.day>1||s.S.absDay>1]];
export function showCards(L,done){ let i=0; const w=document.createElement('div'); w.id='guide'; w.innerHTML='<div class="gcard"><div class="gic"></div><h2></h2><p></p><div class="gdots"></div><div class="grow"><button class="gskip"></button><button class="gnext"></button></div></div>'; document.body.appendChild(w);
  const paint=()=>{ const c=CARDS[i], t=L('zh','en')==='zh'?c.zh:c.en; w.querySelector('.gic').textContent=c.ic; w.querySelector('h2').textContent=t[0]; w.querySelector('p').textContent=t[1]; w.querySelector('.gdots').innerHTML=CARDS.map((_,k)=>'<i'+(k===i?' class="on"':'')+'></i>').join(''); w.querySelector('.gskip').textContent=L('跳过','Skip'); w.querySelector('.gnext').textContent=i<CARDS.length-1?L('下一步','Next'):L('开始','Start playing'); };
  const onLang=()=>paint(); addEventListener('sv-lang',onLang); const close=()=>{ removeEventListener('sv-lang',onLang); w.remove(); done&&done(); }; w.querySelector('.gskip').onclick=close; w.querySelector('.gnext').onclick=()=>{ if(++i>=CARDS.length) close(); else paint(); }; paint(); }
export function startChecklist(S,L,player,snd){ const box=document.createElement('div'); box.id='todo'; box.className='card'; document.getElementById('hud').appendChild(box); const st={S,moved:0}; const p0={x:player.pos.x,z:player.pos.z}; let last=-1, was='';
  const paint=n=>{ box.innerHTML='<b>'+L('新手任务','First day')+' <span>'+n+'/'+STEPS.length+'</span></b>'+STEPS.map((q,i)=>'<div class="'+(i<n?'done':i===n?'now':'')+'">'+(i<n?'✓':i===n?'›':'·')+' '+L(q[0],q[1])+'</div>').join(''); };
  const tick=()=>{ st.moved=Math.max(st.moved,Math.hypot(player.pos.x-p0.x,player.pos.z-p0.z)); let n=0; while(n<STEPS.length&&STEPS[n][2](st)) n++; const lg=L('zh','en'); if(n!==last||lg!==was){ if(last>=0&&n>last) snd('quest'); last=n; was=lg; paint(n); } if(n>=STEPS.length){ clearInterval(iv); setTimeout(()=>box.remove(),5000); try{ localStorage.setItem('sv_guide','done'); }catch(e){} } }; const iv=setInterval(tick,500); tick(); }
