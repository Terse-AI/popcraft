const G=__sv.G,S=__sv.S,P=__sv.player,cam=__sv.cam;
const lerp=(a,b,t)=>a+(b-a)*t, ease=t=>t*t*(3-2*t);
async function pan(a,b,ms){ const t0=performance.now(); for(;;){ const u=Math.min(1,(performance.now()-t0)/ms); cam.yaw=lerp(a,b,ease(u)); if(u>=1) break; await new Promise(r=>requestAnimationFrame(r)); } }
async function walk(ms){ __down('W'); await wait(ms); __up('W'); }
function tgt(dx,dz){ const x=Math.round(P.pos.x+dx), z=Math.round(P.pos.z+dz); try{ __sv.setTarget({x,z}); }catch(e){} }
function clearModal(){ try{ G.closeModal&&G.closeModal(); }catch(e){} var m=document.querySelector('#dynmodal'); if(m) m.remove(); }

// a living farm + a stocked pack, so every panel reads like real play
__clearUI();
for(let x=-6;x<=6;x++) for(let z=2;z<=11;z++){ S.tiles.set(x+','+z,{tilled:true,watered:(x+z)%3!==0,crop:{id:['melon','corn','tomato','radish','pepper','blueberry'][Math.abs(x)%6],stage:Math.min(9,6+Math.abs(z)%4),watered:true,acc:0}}); try{ G.refreshTileMesh(x,z); G.rebuildCrop(x,z); }catch(e){} }
try{ ['melon','corn','tomato'].forEach(c=>G.give('crop',c,9,true)); G.give('seed','melon',12,true); G.give('fish','bass',3,true); G.give('mat','wood',40,true); G.give('mat','stone',24,true); S.gold=2450; __sv.renderStatus(); G.renderHotbar&&G.renderHotbar(); }catch(e){}

// intro
__season(1,540); __teleport(-2,18,0.1); cam.pitch=.12;
__title('StarVale','a whole cozy valley — right in your browser',3200);
pan(-0.28,0.26,4200); await wait(3500);

// move
__hint('Walk the valley','<span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span> to move · <span class="key">Space</span> to jump');
await walk(1500); __press('Space'); await wait(800); __hintOff(); await wait(300);

// farming
__teleport(0,6,Math.PI); cam.pitch=.17; await wait(400);
__hint("Tend the star's farm",'till the soil · plant seeds · water the rows');
__tool(0); tgt(0,1.4); G.useTool(); await wait(620); tgt(1,1.4); G.useTool(); await wait(620);
__tool(1); tgt(0,1.4); G.useTool(); await wait(640);
await wait(700); __hintOff(); await wait(300);

// fishing
__teleport(__sv.DOCK.x,__sv.DOCK.z1-2,-0.97); cam.pitch=.1; await wait(400);
__hint('Cast a line','fish the lake, the river, the sea');
try{ G.tryFish(); }catch(e){} await wait(1700); try{ G.fishPress(true); }catch(e){} await wait(500); try{ G.fishPress(false); }catch(e){}
await wait(1100); try{ G.cancelFish&&G.cancelFish(); }catch(e){} __hintOff(); await wait(300);

// gather
__teleport(-20,15,0.6); cam.pitch=.14; await wait(400);
__hint('Chop · mine · forage','gather wood, ore and wild food');
__tool(2); G.useTool(); await wait(620); G.useTool(); await wait(680);
__tool(3); G.useTool(); await wait(700); __hintOff(); await wait(300);

// inventory
__teleport(0,6,0.2); await wait(300);
__hint('Your pack & tools','<span class="key">Tab</span> opens the backpack · <span class="key">1</span>–<span class="key">6</span> switch tools');
__press('Tab'); await wait(2100); __press('Tab'); await wait(400); __hintOff(); await wait(300);

// town
__teleport(26,-30,Math.PI*0.92); cam.pitch=.12; await wait(400);
__hint('Visit the town','shops, neighbours, festivals through the year');
try{ G.openStore(); }catch(e){} await wait(2300); clearModal(); __hintOff(); await wait(300);

// craft + combat
__teleport(-6,4,0.4); await wait(300);
__hint('Craft, cook & fight','build machines, cook recipes, delve the mines');
try{ G.openCraft(); }catch(e){} await wait(1800); clearModal(); await wait(200);
__tool(5); G.useTool(); await wait(600); __hintOff(); await wait(300);

// weather + seasons
__teleport(15,41,-0.97); cam.pitch=.08;
__hint('Real weather','sun · rain · storms · snow');
__season(1,1000,'storm'); await wait(1800); __hintOff(); await wait(200);
__hint('Four seasons','the whole valley turns with them');
__season(0,900,'clear'); await wait(1500);
__season(2,1030,'clear'); await wait(1500);
__season(3,800,'snow'); await wait(1600); __hintOff(); await wait(200);
__hint('Nights & northern lights','fireflies, aurora, a sky full of stars');
__season(2,1380,'clear'); await wait(2000); __hintOff(); await wait(300);

// co-op
__teleport(-2,18,0.1); __season(1,620); cam.pitch=.12;
__hint('Play together','invite a friend with one link');
try{ G.openCoop(); }catch(e){} await wait(2200); clearModal(); __hintOff(); await wait(300);

// outro
pan(0.1,-0.16,3000);
__title('StarVale','play free · nova-games.up.railway.app',3400);
await wait(3500);
