/* StarVale runs inside NOVA. Accounts live on NOVA's page, so the game asks its host for everything to do with
   the player's cloud save over postMessage, and only trusts replies from NOVA itself. */
const HOSTS=['https://nova-games.up.railway.app'];
const host=HOSTS.find(h=>document.referrer.startsWith(h))||HOSTS[0];
export const NOVA_URL=host;
export const inNova=window.parent!==window;
const wait=new Map(); let seq=0;
addEventListener('message',e=>{ if(!HOSTS.includes(e.origin)) return; const d=e.data; if(!d||!d.novaReply||!wait.has(d.novaReply)) return; const r=wait.get(d.novaReply); wait.delete(d.novaReply); r(d.result); });
export const nova=(type,data,ms=20000)=>new Promise(res=>{ if(!inNova) return res(null); const id=++seq; wait.set(id,res); parent.postMessage({novaCall:id,type,data},host); setTimeout(()=>{ if(wait.delete(id)) res(null); },ms); });
