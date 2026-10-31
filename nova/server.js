// NOVA: a home for web games. Upload a game, get a link, anyone plays it in the browser at once.
// Uploaded games run client-side in a sandbox and we never execute them here. Zero dependencies.
const http = require('http');
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const PORT  = process.env.PORT || 3000;
const DATA  = process.env.DATA_DIR || path.join(__dirname, 'data'); // a Railway volume keeps this across deploys
const GAMES = path.join(DATA, 'games'), DRAFTS = path.join(DATA, 'drafts'), SITES = path.join(DATA, 'sites'), SAVES = path.join(DATA, 'saves'), COVERS = path.join(DATA, 'covers'), VERSIONS = path.join(DATA, 'versions');
for (const d of [GAMES, DRAFTS, SITES, SAVES, COVERS, VERSIONS]) fs.mkdirSync(d, { recursive: true });
const PUBLIC = path.join(__dirname, 'public');
const STARVALE_URL = '/play/starvale';   // the game ships inside this service, in game/ (sync-game.sh copies it in before a deploy)
const GAME = path.join(__dirname, 'game');

const MAX_HTML = 12 * 1024 * 1024, MAX_ZIP = 80 * 1024 * 1024, MAX_UNZIP = 240 * 1024 * 1024, MAX_SAVE = 4 * 1024 * 1024;
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const id6 = () => crypto.randomBytes(5).toString('hex');
const metaPath = id => path.join(GAMES, id + '.json');
const htmlPath = id => path.join(GAMES, id + '.html');
const draftMetaPath = id => path.join(DRAFTS, id + '.json');
const draftHtmlPath = id => path.join(DRAFTS, id + '.html');
const readDraft = id => { try { return JSON.parse(fs.readFileSync(draftMetaPath(id),'utf8')); } catch(e){ return null; } };
const validId = id => /^[a-f0-9]{10}$/.test(id);

// ---- accounts: Clerk session tokens, checked against Clerk's public keys, so no secret is stored here
const CLERK_PK = process.env.CLERK_PUBLISHABLE_KEY || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const CLERK_ON = /^pk_(test|live)_/.test(CLERK_PK);
let CLERK_FAPI = '';
if (CLERK_ON) { try { CLERK_FAPI = Buffer.from(CLERK_PK.replace(/^pk_(test|live)_/,''),'base64').toString('utf8').replace(/\$+$/,''); } catch(e){} }
let _jwks = null, _jwksAt = 0;
async function jwks(){ if (_jwks && Date.now()-_jwksAt < 3600e3) return _jwks; const r = await fetch('https://'+CLERK_FAPI+'/.well-known/jwks.json'); _jwks = await r.json(); _jwksAt = Date.now(); return _jwks; }
const b64urlJson = s => JSON.parse(Buffer.from(s.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8'));
async function verifyToken(token){
  if (!CLERK_ON || !token || token.split('.').length !== 3) return null;
  try {
    const [h,p,s] = token.split('.'), header = b64urlJson(h), payload = b64urlJson(p);
    if (header.alg !== 'RS256') return null;
    const ks = await jwks(), jwk = (ks.keys||[]).find(k => k.kid === header.kid); if (!jwk) return null;
    const pub = crypto.createPublicKey({ key:jwk, format:'jwk' });
    if (!crypto.verify('RSA-SHA256', Buffer.from(h+'.'+p), pub, Buffer.from(s.replace(/-/g,'+').replace(/_/g,'/'),'base64'))) return null;
    const now = Date.now()/1000; if ((payload.exp && now > payload.exp+5) || (payload.nbf && now < payload.nbf-5)) return null;
    return { userId: payload.sub };
  } catch(e){ return null; }
}
const bearer = req => { const m = (req.headers['authorization']||'').match(/^Bearer\s+(.+)$/i); return m ? m[1] : ''; };
/* agent keys: a creator mints one in the portal and an agent acts as that creator. Only the hash is stored */
const KEYS = path.join(DATA,'keys.json'), keyHash = k => crypto.createHash('sha256').update(k).digest('hex');
const readKeys = () => { try { return JSON.parse(fs.readFileSync(KEYS,'utf8')); } catch(e){ return {}; } };
const writeKeys = k => fs.writeFileSync(KEYS,JSON.stringify(k));
function mintKey(ownerId,name){ const token = 'nova_ak_'+crypto.randomBytes(24).toString('hex'), keys = readKeys(); keys[keyHash(token)] = { ownerId, name:String(name||'agent').slice(0,40), prefix:token.slice(0,14), created:Date.now(), last:0 }; writeKeys(keys); return token; }
async function authOf(req){ const t = bearer(req); if (t.startsWith('nova_ak_')) { const keys = readKeys(), h = keyHash(t), k = keys[h]; if (!k) return null; k.last = Date.now(); writeKeys(keys); return { userId:k.ownerId, viaKey:true }; } return verifyToken(t); }
const OWNER_ID = process.env.OWNER_USER_ID || '';                 // the account that manages NOVA's own titles
const owns = (g,a) => !!a && (g.ownerId===a.userId || (!g.ownerId && !!OWNER_ID && a.userId===OWNER_ID));
const REVIEW_TOKEN = process.env.REVIEW_TOKEN || '';
const isAdmin = req => { const t = req.headers['x-admin-token']; return !!t && ((!!ADMIN_TOKEN&&t===ADMIN_TOKEN)||(!!REVIEW_TOKEN&&t===REVIEW_TOKEN)); };
const isReviewer = (req,a) => isAdmin(req) || (!!a&&!!OWNER_ID&&a.userId===OWNER_ID);

const RESERVED = new Set(['','upload','games','portal','covers','sdk.js','mcp','agent.md','mcp-server.js','api','g','raw','assets','public','favicon.ico','robots.txt','health','about','popcraft','playforge']);
function allGames(){ const out = []; try { for (const f of fs.readdirSync(GAMES)) { if (!f.endsWith('.json')) continue; try { out.push(JSON.parse(fs.readFileSync(path.join(GAMES,f),'utf8'))); } catch(e){} } } catch(e){} out.sort((a,b) => (b.featured?1:0)-(a.featured?1:0) || (b.created||0)-(a.created||0)); return out; }
const listGames = () => allGames().filter(g => !g.hidden);
const readMeta  = id => { try { return JSON.parse(fs.readFileSync(metaPath(id),'utf8')); } catch(e){ return null; } };
const writeMeta = m  => fs.writeFileSync(metaPath(m.id), JSON.stringify(m));
const findBySlug = slug => allGames().find(g => g.slug === slug) || null;
const publicMeta = g => { const { ownerId, comments, daily, versions, settings, ...rest } = g; return { ...rest, comments:(comments||[]).length, sdk:settings?publicSettings(settings):undefined }; };
/* what a creator has connected. Only public values are kept: a game runs in the player's browser, so anything stored here is visible to players */
const publicSettings = s => ({ auth:s.auth||{mode:'nova'}, db:s.db||{mode:'nova'} });
function secretIn(v){ const t = String(v||'').trim(); if (/^(sk_|sk-|rk_|whsec_|xox[bp]-|ghp_)/i.test(t)) return true; if (/^(postgres(ql)?|mysql|mongodb(\+srv)?):\/\/[^\s]*:[^\s]*@/i.test(t)) return true; if (/-----BEGIN/.test(t)) return true; const p = t.split('.'); if (p.length===3) try { const c = JSON.parse(Buffer.from(p[1].replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8')); if (c.role==='service_role') return true; } catch(e){} return false; }
const today = () => new Date().toISOString().slice(0,10);
function slugify(s){ const base = String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40) || 'game'; let slug = base, n = 1; const taken = x => RESERVED.has(x) || allGames().some(g => g.slug === x); while (taken(slug)) slug = base+'-'+(++n); return slug; }

// the gate every game passes: 'error' blocks publishing, 'warn' is advice; hints are written so an agent can act on them
function checkHtml(html, title){
  html = html || ''; const size = Buffer.byteLength(html), has = re => re.test(html);
  const checks = [
    { id:'nonempty', label:'Game file is non-empty', severity:'error', pass:size>0, hint:'The uploaded HTML is empty.' },
    { id:'title', label:'Has a title', severity:'error', pass:!!(title&&title.trim()), hint:'Provide a non-empty title.' },
    { id:'htmldoc', label:'Looks like an HTML document', severity:'error', pass:has(/<html|<!doctype html|<canvas|<body/i), hint:'Return a full HTML document, not a fragment.' },
    { id:'size', label:'Within size budget', severity:'error', pass:size>0&&size<=MAX_HTML, hint:'Compress assets, or upload a ZIP.' },
    { id:'noparent', label:'Does not access the parent frame', severity:'error', pass:!has(/\b(window\.(parent|top)\.|parent\.document|top\.document)\b/), hint:'Remove window.parent/top access; the game runs sandboxed.' },
    { id:'interactive', label:'Has playable content', severity:'error', pass:has(/<canvas|<script|onclick|addeventlistener/i)&&size>=200, hint:'This looks like an empty page. Send the whole game: a full HTML document with its canvas or scripts.' },
    { id:'viewport', label:'Mobile viewport set', severity:'warn', pass:has(/name=["']?viewport/i), hint:'Add a viewport meta tag for phones.' },
    { id:'charset', label:'Charset declared', severity:'warn', pass:has(/charset/i), hint:'Add <meta charset="utf-8">.' } ];
  const errs = checks.filter(c => c.severity==='error');
  return { ok:errs.every(c=>c.pass), passed:checks.filter(c=>c.pass).length, total:checks.length, failed:checks.filter(c=>!c.pass).map(c=>({id:c.id,severity:c.severity,hint:c.hint})), checks };
}
/* the review scan: 'blocked' can never publish; 'flags' send a game to a person before it goes public */
function scanText(t){ const blocked = [], flags = [], add = (l,id,msg) => l.push({ id, hint:msg });
  if (/coinhive|cryptonight|coin-hive|webminer|miner\.start\s*\(/i.test(t)) add(blocked,'miner','Remove the crypto-mining code.');
  if (/<input[^>]+type=["']?password/i.test(t)) add(flags,'password','Asks players for a password. Use Nova.signIn() instead.');
  if (/type=["']?(tel|email)["']?[^>]*(card|cvv|ssn)|name=["']?(card|cvv|ssn)/i.test(t)) add(flags,'payment','Looks like it collects payment or identity details.');
  if (/eval\s*\(\s*(atob|unescape)\s*\(/i.test(t)) add(flags,'obfuscated','Runs hidden code through eval and atob.');
  if (/location\.(href|replace|assign)\s*[=(]\s*['"]https?:/i.test(t)) add(flags,'redirect','Sends players to another site.');
  const hosts = [...t.matchAll(/<script[^>]+src=["']https?:\/\/([^"'\/]+)/gi)].map(m=>m[1].toLowerCase()).filter(h=>!/(^|\.)(cdnjs\.cloudflare\.com|unpkg\.com|cdn\.jsdelivr\.net|nova-games\.up\.railway\.app)$/.test(h)); if (hosts.length) add(flags,'scripts','Loads scripts from '+[...new Set(hosts)].slice(0,3).join(', ')+'.');
  return { blocked, flags }; }
const textOfFiles = files => files.filter(f=>/\.(html?|js|mjs)$/i.test(f.name)&&f.data.length<8e6).map(f=>f.data.toString('utf8')).join('\n');
/* every game comes through here, from the upload page or an agent: checks, then the scan, then published or held for review */
function intake({ title, author, blurb, html:h, zip, ownerId, trusted, draftId, gameId }){
  title = String(title||'').slice(0,80).trim(); if (!title) return { code:400, error:'title required' };
  if (gameId) { const g = readMeta(gameId); if (!g||!ownerId||!owns(g,{userId:ownerId})) return { code:403, error:'not your game' }; }
  const reuse = typeof draftId==='string' && validId(draftId) && readDraft(draftId), id = reuse ? draftId : id6(); let check, scan;
  if (zip) { let files; try { files = unzip(zip); } catch(e){ return { code:422, draftId:id, status:'needs_fix', check:{ ok:false, failed:[{id:'zip',severity:'error',hint:e.message}] }, next:'Fix the ZIP and submit again.' }; } fs.writeFileSync(path.join(DRAFTS,id+'.zip'),zip); try { fs.unlinkSync(draftHtmlPath(id)); } catch(e){} scan = scanText(textOfFiles(files)); check = { ok:true, failed:[], files:files.length }; }
  else { h = String(h||''); if (!h||h.length>MAX_HTML) return { code:400, error:'bad or too-large html' }; fs.writeFileSync(draftHtmlPath(id),h); try { fs.unlinkSync(path.join(DRAFTS,id+'.zip')); } catch(e){} check = checkHtml(h,title); scan = scanText(h); }
  const d = { draftId:id, title, author:String(author||'anon').slice(0,40), blurb:String(blurb||'').slice(0,200), updated:Date.now(), ownerId:ownerId||null, trusted:!!trusted, gameId:gameId||null, kind:zip?'zip':'html', flags:scan.flags, reason:'' };
  const failed = [...(check.failed||[]).filter(f=>f.severity==='error'), ...scan.blocked.map(b=>({ ...b, severity:'error' }))];
  if (failed.length) { d.status = 'needs_fix'; fs.writeFileSync(draftMetaPath(id),JSON.stringify(d)); return { code:200, draftId:id, status:'needs_fix', check, review:{ blocked:scan.blocked, flags:scan.flags }, failed, next:'Fix these, then submit again with the same draftId.' }; }
  if (trusted && !scan.flags.length) { fs.writeFileSync(draftMetaPath(id),JSON.stringify({ ...d, status:'approved' })); const pub = publishDraft(id); return { code:200, draftId:id, status:'published', check, review:{ flags:[] }, published:pub.published }; }
  d.status = 'in_review'; fs.writeFileSync(draftMetaPath(id),JSON.stringify(d)); return { code:200, draftId:id, status:'in_review', check, review:{ flags:scan.flags }, next:scan.flags.length?'A reviewer will look at the flagged items. Poll /api/submission/'+id+', or fix them and resubmit.':'Waiting for a reviewer, because this submission has no creator key. Poll /api/submission/'+id+'.' };
}
function publishDraft(draftId){ const dm = readDraft(draftId); if (!dm) return { error:'draft not found' }; const zp = path.join(DRAFTS,draftId+'.zip'), isZip = fs.existsSync(zp);
  let g = dm.gameId ? readMeta(dm.gameId) : null; const id = g ? g.id : id6(), slug = g ? g.slug : slugify(dm.title);
  if (g) { archive(g,'agent update'); fs.rmSync(path.join(SITES,id),{recursive:true,force:true}); try { fs.unlinkSync(htmlPath(id)); } catch(e){} }
  if (isZip) { const root = path.join(SITES,id); for (const f of unzip(fs.readFileSync(zp))) { const t = path.normalize(path.join(root,f.name)); if (!t.startsWith(root+path.sep)) continue; fs.mkdirSync(path.dirname(t),{recursive:true}); fs.writeFileSync(t,f.data); } } else fs.copyFileSync(draftHtmlPath(draftId),htmlPath(id));
  if (g) { g.version = (g.version||1)+1; g.site = isZip||undefined; writeMeta(g); } else writeMeta({ id, slug, title:dm.title, author:dm.author, blurb:dm.blurb, site:isZip||undefined, created:Date.now(), likes:0, plays:0, comments:[], viaAgent:!dm.web, ownerId:dm.ownerId||null });
  for (const f of [draftMetaPath(draftId),draftHtmlPath(draftId),zp]) try { fs.unlinkSync(f); } catch(e){}
  fs.writeFileSync(path.join(DRAFTS,draftId+'.done'),JSON.stringify({ status:'published', id, slug, url:'/'+slug, at:Date.now() })); return { published:{ id, slug, url:'/'+slug } }; }
const submission = id => { const d = readDraft(id); if (d) return { draftId:id, status:d.status, title:d.title, flags:d.flags||[], reason:d.reason||'', updated:d.updated }; try { return { draftId:id, ...JSON.parse(fs.readFileSync(path.join(DRAFTS,id+'.done'),'utf8')) }; } catch(e){ return null; } };
const listDrafts = () => fs.readdirSync(DRAFTS).filter(f=>f.endsWith('.json')).map(f=>{ try { return JSON.parse(fs.readFileSync(path.join(DRAFTS,f),'utf8')); } catch(e){ return null; } }).filter(Boolean).sort((a,b)=>b.updated-a.updated);
function decide(id,approve,reason){ const d = readDraft(id); if (!d) return { code:404, error:'not found' }; if (d.status!=='in_review') return { code:409, error:'not waiting for review' }; if (!approve) { d.status = 'rejected'; d.reason = String(reason||'').slice(0,300); fs.writeFileSync(draftMetaPath(id),JSON.stringify(d)); return { code:200, status:'rejected', reason:d.reason }; } const pub = publishDraft(id); return { code:200, status:'published', published:pub.published }; }
/* MCP over HTTP: an agent connects with one line and a creator key, nothing to install */
const BAD_KEY = { error:'invalid key', hint:'That key is not valid. Create one at /portal/agents and send it as: Authorization: Bearer nova_ak_...' };
const MCP_TOOLS = [
 { name:'nova_submit', description:'Publish a web game on NOVA. Send a full self-contained HTML document. With a creator key, clean games go live at once; flagged games wait for review. Returns status, failed checks with hints, and the public link. Send game_id to update an existing game, draft_id to iterate on a failed draft.', inputSchema:{ type:'object', required:['title','html'], properties:{ title:{type:'string'}, html:{type:'string'}, blurb:{type:'string'}, author:{type:'string'}, game_id:{type:'string'}, draft_id:{type:'string'} } } },
 { name:'nova_status', description:'Read the state of a submission: needs_fix, in_review, rejected or published.', inputSchema:{ type:'object', required:['draft_id'], properties:{ draft_id:{type:'string'} } } },
 { name:'nova_my_games', description:'List the games owned by this creator key, with plays, likes and comments.', inputSchema:{ type:'object', properties:{} } } ];
function mcpTool(name,x,a){ if (name==='nova_submit') { const { code, ...r } = intake({ title:x.title, html:x.html, blurb:x.blurb, author:x.author, ownerId:a&&a.userId, trusted:!!a, draftId:x.draft_id, gameId:x.game_id }); return { isError:code>=400, body:r }; } if (name==='nova_status') { const r = submission(String(x.draft_id||'')); return { isError:!r, body:r||{error:'not found'} }; } if (name==='nova_my_games') { if (!a) return { isError:true, body:{error:'this tool needs a creator key'} }; return { isError:false, body:{ games:allGames().filter(g=>owns(g,a)).map(ownerMeta) } }; } return { isError:true, body:{error:'unknown tool'} }; }
function mcpReply(msg,a){ const { id, method, params } = msg; if (id===undefined) return null; const ok = result => ({ jsonrpc:'2.0', id, result }); if (method==='initialize') return ok({ protocolVersion:(params&&params.protocolVersion)||'2025-03-26', capabilities:{ tools:{} }, serverInfo:{ name:'nova', version:'1.0.0' } }); if (method==='ping') return ok({}); if (method==='tools/list') return ok({ tools:MCP_TOOLS }); if (method==='tools/call') { const r = mcpTool(params&&params.name,(params&&params.arguments)||{},a); return ok({ content:[{ type:'text', text:JSON.stringify(r.body,null,2) }], isError:r.isError }); } return { jsonrpc:'2.0', id, error:{ code:-32601, message:'method not found' } }; }

// a ZIP game: read the central directory, inflate with zlib, keep paths inside the game's own folder
function unzip(buf){
  let e = buf.length-22; while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--; if (e < 0) throw new Error('not a zip file');
  const count = buf.readUInt16LE(e+10); let p = buf.readUInt32LE(e+16); if (count > 4000) throw new Error('too many files');
  const out = []; let total = 0;
  for (let i=0;i<count;i++){ if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad zip'); const method = buf.readUInt16LE(p+10), comp = buf.readUInt32LE(p+20), size = buf.readUInt32LE(p+24), nl = buf.readUInt16LE(p+28), xl = buf.readUInt16LE(p+30), cl = buf.readUInt16LE(p+32), off = buf.readUInt32LE(p+42), name = buf.slice(p+46,p+46+nl).toString('utf8'); p += 46+nl+xl+cl;
    if (name.endsWith('/') || /(^|\/)__MACOSX\//.test(name) || /(^|\/)\.DS_Store$/.test(name)) continue;
    if (name.includes('..') || name.startsWith('/') || name.includes('\\') || name.includes('\0')) throw new Error('unsafe path in zip');
    total += size; if (total > MAX_UNZIP) throw new Error('game is too large');
    const lnl = buf.readUInt16LE(off+26), lxl = buf.readUInt16LE(off+28), data = buf.slice(off+30+lnl+lxl, off+30+lnl+lxl+comp);
    out.push({ name, data: method===0 ? data : method===8 ? zlib.inflateRawSync(data,{maxOutputLength:MAX_UNZIP}) : (()=>{ throw new Error('unsupported compression'); })() }); }
  const idx = out.map(f=>f.name).filter(n=>/(^|\/)index\.html?$/i.test(n)).sort((a,b)=>a.length-b.length)[0]; if (!idx) throw new Error('no index.html in the zip');
  const root = idx.slice(0, idx.lastIndexOf('/')+1);
  return out.filter(f=>f.name.startsWith(root)).map(f=>({ name:f.name.slice(root.length), data:f.data }));
}
const TYPES = { '.html':'text/html; charset=utf-8','.htm':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.mp4':'video/mp4','.webm':'video/webm','.wasm':'application/wasm','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.pck':'application/octet-stream','.data':'application/octet-stream','.bin':'application/octet-stream' };
const SANDBOX = "sandbox allow-scripts allow-pointer-lock allow-forms allow-popups";
// sandboxed pages have no storage; give them a working in-memory one so ordinary games still run
const SHIM = `<script>(function(){function S(){var m={};return{getItem:function(k){return k in m?m[k]:null},setItem:function(k,v){m[k]=String(v)},removeItem:function(k){delete m[k]},clear:function(){m={}},key:function(i){return Object.keys(m)[i]||null},get length(){return Object.keys(m).length}}}try{window.localStorage.length}catch(e){Object.defineProperty(window,'localStorage',{value:S()});Object.defineProperty(window,'sessionStorage',{value:S()})}})();</script>`;
const withShim = html => /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m+SHIM) : SHIM+html;
const RAW = { 'Content-Security-Policy':SANDBOX, 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'Access-Control-Allow-Origin':'*', 'Cache-Control':'public, max-age=300' };

const send = (res,code,type,body,extra) => { res.writeHead(code, Object.assign({'Content-Type':type}, extra||{})); res.end(body); };
const json = (res,code,obj) => send(res,code,'application/json; charset=utf-8',JSON.stringify(obj),{'Cache-Control':'no-store'});
const html = (res,body) => send(res,200,'text/html; charset=utf-8',body,{'Cache-Control':'no-cache'});
function readRaw(req,limit){ return new Promise(ok => { let n = 0; const c = []; req.on('data',d => { n += d.length; if (n > limit){ ok(null); req.destroy(); return; } c.push(d); }); req.on('end',()=>ok(Buffer.concat(c))); req.on('error',()=>ok(null)); }); }
const readJson = async (req,limit=MAX_HTML+1048576) => { const b = await readRaw(req,limit); if (!b) return null; try { return JSON.parse(b.toString('utf8')); } catch(e){ return undefined; } };

/* static files stream, and honour Range: Safari will not play a video without it */
function sendFile(req,res,f,cache='public, max-age=3600'){ const size = fs.statSync(f).size, h = { 'Content-Type':TYPES[path.extname(f)]||'application/octet-stream', 'Accept-Ranges':'bytes', 'Cache-Control':cache }, r = (req.headers.range||'').match(/^bytes=(\d*)-(\d*)$/);
  if (r && (r[1]||r[2])) { let a = r[1]===''?Math.max(0,size-(+r[2])):+r[1], b = r[1]!==''&&r[2]!==''?Math.min(+r[2],size-1):size-1; if (a>b||a>=size) { res.writeHead(416,{'Content-Range':'bytes */'+size}); return res.end(); } res.writeHead(206,{ ...h, 'Content-Range':`bytes ${a}-${b}/${size}`, 'Content-Length':b-a+1 }); if (req.method==='HEAD') return res.end(); return fs.createReadStream(f,{start:a,end:b}).pipe(res); }
  res.writeHead(200,{ ...h, 'Content-Length':size }); if (req.method==='HEAD') return res.end(); fs.createReadStream(f).pipe(res); }

// ---------------------------------------------------------------- pages
const COPY = { desc:'Play and share web games. No downloads.' };
function page({ title, body, game, cls='', script='' }){
  const boot = { clerk:CLERK_ON?CLERK_PK:'', game:game?{...publicMeta(game),isNative:!!game.saves}:null };
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><meta name="description" content="${COPY.desc}"><meta name="theme-color" content="#0b0b0d">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(game&&game.blurb||COPY.desc)}">${game&&game.cover?`<meta property="og:image" content="${esc(game.cover)}">`:''}
<link rel="icon" href="/public/icon.svg"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet"><link rel="stylesheet" href="/public/site.css?v=${VER}"></head>
<body class="${cls}"><nav id="nav"><a class="logo" href="/">NOVA</a><div class="nv"><a href="/games" data-en="Games">游戏</a><a href="/portal" data-en="Creators">创作者后台</a><button class="lang" id="lang">EN</button><div id="auth"></div></div></nav>
${body}
<div id="player" hidden><div id="pbar"><button id="pexit" aria-label="exit">✕</button><button id="pfull" aria-label="fullscreen">⛶</button></div></div>
<script type="application/json" id="boot">${JSON.stringify(boot).replace(/</g,'\\u003c')}</script>
${CLERK_ON?`<script async crossorigin="anonymous" data-clerk-publishable-key="${CLERK_PK}" src="https://${CLERK_FAPI}/npm/@clerk/clerk-js@5/dist/clerk.browser.js"></script>`:''}
<script src="/public/site.js?v=${VER}"></script>${script?`<script src="/public/${script}?v=${VER}"></script>`:''}</body></html>`;
}
const VER = Date.now().toString(36);
const hue = s => { let h = 0; for (const c of String(s)) h = (h*31+c.charCodeAt(0))%360; return h; };
const coverStyle = g => g.cover ? `background-image:url('${esc(g.cover)}')` : `background-image:linear-gradient(135deg,hsl(${hue(g.slug)} 34% 26%),hsl(${(hue(g.slug)+48)%360} 30% 13%))`;
const card = g => `<a class="card" href="/${esc(g.slug)}"><div class="cv" style="${coverStyle(g)}">${g.cover?'':`<span>${esc(g.title)}</span>`}</div><div class="ct"><b>${esc(g.title)}</b><i>${esc(g.author||'')}</i></div></a>`;
function landing(){ const games = listGames(), sv = games.find(g=>g.saves)||games[0];
  return page({ title:'NOVA · 打开就能玩的网页游戏', game:sv, cls:'home', body:`
<header class="hero"><div class="art" style="background-image:url('/public/starvale-hero.jpg')"></div><video class="heroV" id="heroV" autoplay muted loop playsinline preload="metadata" poster="/public/starvale-hero.jpg"><source media="(max-width:760px)" src="/public/starvale-reel-sm.mp4" type="video/mp4"><source src="/public/starvale-reel.mp4" type="video/mp4"></video><div class="veil"></div>
 <div class="hin"><p class="eyebrow" data-en="Now playing on NOVA">正在 NOVA 上</p><h1>StarVale</h1><p class="lede" data-en="A little farm by the lake, through every season. Open the page and play.">湖边的小农场,一年四季。打开网页就能玩。</p>
  <div id="saveline" class="saveline" hidden></div>
  <div class="cta"><button class="btn solid" id="mainplay" data-en="New game">开始新游戏</button><button class="btn" id="altplay" data-en="Load save">读取存档</button></div>
  <div class="links"><a href="/games" data-en="Browse more games →">浏览更多游戏 →</a><a href="/upload" data-en="Upload your game →">上传你的游戏 →</a></div></div></header>
<section class="wrap" id="gal"><div class="sh"><h2 data-en="On NOVA">在 NOVA 上玩</h2><a href="/games" data-en="All games">全部游戏</a></div><div class="grid">${games.slice(0,6).map(card).join('')}</div></section>
<section class="wrap pitch"><p class="eyebrow" data-en="For creators">给创作者</p><h2 class="big" data-en="Your game, one link away.">把你的游戏,变成一个链接。</h2>
 <div class="tri"><div><h3 data-en="One-click upload">一键上传</h3><p data-en="Drop an HTML file or a ZIP. NOVA checks it and puts it online in seconds. Nothing to configure.">拖入 HTML 或 ZIP,NOVA 自动检查,几秒上线。不用配服务器,也不用打包发布。</p></div>
 <div><h3 data-en="One-click share">一键分享</h3><p data-en="Every game gets its own short link. Friends click and play. No install, no account.">每个游戏都有自己的短链接。朋友点开就玩,不用下载,也不用注册。</p></div>
 <div><h3 data-en="Everything runs on the web">全部是网页游戏</h3><p data-en="Computers, phones and tablets all work. Play fullscreen, and saves follow your account.">电脑、手机、平板都能玩。全屏沉浸,存档跟着账号走。</p></div>
 <div><h3 data-en="Your agent can publish">Agent 一键发布</h3><p data-en="Connect Claude Code or any agent with one key. It submits, fixes what the checks report, and ships.">用一个 Key 连接 Claude Code 或任何 Agent。它会提交、按检查结果修改,然后上线。</p></div>
 <div><h3 data-en="Reviewed before it reaches players">发布前自动审核</h3><p data-en="Every game is scanned. Anything risky goes to a person before it goes public.">每个游戏都会自动扫描,有风险的内容先由人工审核,再公开。</p></div>
 <div><h3 data-en="Your backend, your rules">接入你自己的后端</h3><p data-en="Use NOVA accounts and cloud saves out of the box, or connect your own auth and database.">开箱即用 NOVA 账号和云存档,也可以接入你自己的登录和数据库。</p></div></div>
 <div class="cta"><a class="btn solid" href="/upload" data-en="Upload a game">上传游戏</a><a class="btn" href="/portal" data-en="Creator portal">创作者后台</a></div></section>
<footer><a class="logo" href="/">NOVA</a><span data-en="Web games, one link away.">打开就能玩的网页游戏。</span></footer>` }); }
function gallery(){ return page({ title:'全部游戏 · NOVA', cls:'solidnav', body:`<section class="wrap top"><h1 class="big" data-en="All games">全部游戏</h1><input id="q" class="search" placeholder="搜索游戏" data-en-ph="Search games"><div class="grid" id="grid">${listGames().map(card).join('')}</div></section>` }); }
function uploadPage(){ return page({ title:'上传游戏 · NOVA', cls:'solidnav', body:`<section class="wrap top narrow"><p class="eyebrow" data-en="Upload">上传</p><h1 class="big" data-en="Put your game on NOVA.">把游戏放到 NOVA。</h1>
 <label id="drop"><input type="file" id="file" accept=".html,.htm,.zip" hidden><b data-en="Drop your game here">把游戏拖到这里</b><span data-en="An HTML file, or a ZIP with index.html, up to 80 MB">HTML 文件,或包含 index.html 的 ZIP,最大 80 MB</span></label>
 <div id="form" hidden><input id="title" placeholder="游戏名字" data-en-ph="Game title" maxlength="80"><input id="author" placeholder="作者" data-en-ph="Author" maxlength="40"><textarea id="blurb" placeholder="一句话介绍(可选)" data-en-ph="One line about it (optional)" maxlength="200"></textarea><button class="btn solid" id="pub" data-en="Publish">发布</button></div>
 <div id="done" hidden><h3 data-en="It's live.">上线了。</h3><p class="linkbox"><a id="glink"></a><button class="btn small" id="gcopy" data-en="Copy link">复制链接</button></p><a class="btn small" id="gmanage" href="/portal" data-en="Manage in portal">去后台管理</a></div><p id="uerr" class="err" hidden></p></section>` }); }
function portalPage(){ return page({ title:'创作者后台 · NOVA', cls:'solidnav', script:'portal.js', body:'<main class="wrap top" id="portal"><p class="mut" data-en="Loading…">加载中…</p></main>' }); }
function gamePage(g){ const cm = (g.comments||[]).slice(0,30).map(c=>`<div class="cmt"><b>${esc(c.name)}</b><p>${esc(c.text)}</p></div>`).join('');
  return page({ title:`${g.title} · NOVA`, game:g, cls:'solidnav gamep', body:`<section class="gtop"><div class="poster" style="${coverStyle(g)}"><div class="pv"></div><div class="pin"><h1>${esc(g.title)}</h1>${g.blurb?`<p>${esc(g.blurb)}</p>`:''}<div id="saveline" class="saveline" hidden></div><div class="cta"><button class="btn solid" id="mainplay" data-en="Start playing">开始玩</button>${g.saves?'<button class="btn" id="altplay" data-en="Load save">读取存档</button>':''}</div></div></div></section>
 <section class="wrap narrow meta"><div class="row"><span class="mt">${esc(g.author||'')} · <span id="plays">${g.plays||0}</span> <span data-en="plays">次游玩</span></span><div class="acts"><button class="btn small" id="share" data-en="Share">分享</button><button class="btn small" id="like">♡ <span id="likes">${g.likes||0}</span></button></div></div>
 <h3 data-en="Comments">评论</h3><div class="cform"><input id="cname" placeholder="名字" data-en-ph="Name" maxlength="40"><input id="ctext" placeholder="说点什么" data-en-ph="Say something" maxlength="500"><button class="btn small" id="csend" data-en="Send">发送</button></div><div id="cmts">${cm}</div></section>` }); }

// ---- first run on an existing volume: StarVale takes PopCraft's place, the test uploads step out of the gallery
function setup(){
  const STAR = { title:'StarVale', slug:'starvale', author:'NOVA Originals', url:STARVALE_URL, featured:true, saves:true, cover:'/public/starvale-card.jpg', blurb:'湖边的小农场,一年四季。种地、钓鱼、下矿、交朋友。' };
  let s = allGames().find(g => g.slug==='starvale' || g.slug==='popcraft');
  if (s) writeMeta({ ...s, ...STAR }); else writeMeta({ id:id6(), created:Date.now(), likes:0, plays:0, comments:[], ...STAR });
  for (const g of allGames()) if (['persist-test','tiny-clicker'].includes(g.slug) && !g.hidden) writeMeta({ ...g, hidden:true });
  if (!allGames().some(g => g.slug==='starfall')) try { const seed = fs.readFileSync(path.join(__dirname,'seed-game.html')), id = id6(); fs.writeFileSync(htmlPath(id), seed); writeMeta({ id, slug:'starfall', title:'Starfall', author:'NOVA', created:Date.now(), likes:0, plays:0, comments:[] }); } catch(e){}
}
setup();
const saveFile = (uid,game) => { const dir = path.join(SAVES, crypto.createHash('sha256').update(uid).digest('hex').slice(0,32)); return { dir, file:path.join(dir, game+'.json') }; };

const ownerMeta = g => ({ id:g.id, slug:g.slug, title:g.title, author:g.author, blurb:g.blurb||'', cover:g.cover||'', hidden:!!g.hidden, plays:g.plays||0, likes:g.likes||0, comments:(g.comments||[]).length, version:g.version||1, url:g.url||'', site:!!g.site, native:!!g.saves, created:g.created, week:Object.entries(g.daily||{}).sort().slice(-7).reduce((n,e)=>n+e[1],0) });
function countSaves(slug){ let n = 0; try { for (const d of fs.readdirSync(SAVES)) if (fs.readdirSync(path.join(SAVES,d)).some(f=>f===slug+'.json'||f.startsWith(slug+'__'))) n++; } catch(e){} return n; }
/* every update keeps the last five versions, so a bad release is one click from undone */
function archive(g,note){ const v = g.version||1, to = path.join(VERSIONS,g.id,String(v)); fs.mkdirSync(to,{recursive:true}); const site = path.join(SITES,g.id); let size = 0; if (fs.existsSync(site)) { fs.cpSync(site,to,{recursive:true}); } else if (fs.existsSync(htmlPath(g.id))) { fs.copyFileSync(htmlPath(g.id),path.join(to,'single.html')); size = fs.statSync(htmlPath(g.id)).size; } g.versions = [{ v, at:Date.now(), note, size },...(g.versions||[])].slice(0,5); for (const d of fs.readdirSync(path.join(VERSIONS,g.id))) if (!g.versions.some(x=>String(x.v)===d)) fs.rmSync(path.join(VERSIONS,g.id,d),{recursive:true,force:true}); }

// ---------------------------------------------------------------- routing
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'), p = u.pathname; let m;
  try {
    if (req.method==='GET' && p==='/') return html(res,landing());
    if (req.method==='GET' && p==='/games') return html(res,gallery());
    if (req.method==='GET' && p==='/upload') return html(res,uploadPage());
    if (req.method==='GET' && (p==='/portal'||p==='/portal/agents'||p==='/portal/review'||/^\/portal\/[a-f0-9]{10}$/.test(p))) return html(res,portalPage());
    if ((req.method==='GET'||req.method==='HEAD') && p.startsWith(STARVALE_URL+'/')) { const f = path.normalize(path.join(GAME, decodeURIComponent(p.slice(STARVALE_URL.length))==='/'?'index.html':decodeURIComponent(p.slice(STARVALE_URL.length)))); if (f.startsWith(GAME+path.sep) && fs.existsSync(f) && fs.statSync(f).isFile()) return sendFile(req,res,f,'no-cache'); return send(res,404,'text/plain','not found'); }
    if (req.method==='GET' && p==='/sdk.js') return send(res,200,TYPES['.js'],fs.readFileSync(path.join(PUBLIC,'sdk.js')),{'Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=300'});
    if (req.method==='GET' && (m=p.match(/^\/covers\/([a-f0-9]{10})\.jpg$/))) { const f = path.join(COVERS,m[1]+'.jpg'); if (!fs.existsSync(f)) return send(res,404,'text/plain','Not found'); return send(res,200,'image/jpeg',fs.readFileSync(f),{'Cache-Control':'public, max-age=86400'}); }
    if (req.method==='GET' && p==='/popcraft') { res.writeHead(301,{Location:'/starvale'}); return res.end(); }
    if (req.method==='GET' && p==='/health') return json(res,200,{ok:true,clerk:CLERK_ON});
    if ((req.method==='GET'||req.method==='HEAD') && (m=p.match(/^\/public\/([a-zA-Z0-9._-]+)$/))) { const f = path.join(PUBLIC,m[1]); if (!fs.existsSync(f)) return send(res,404,'text/plain','Not found'); return sendFile(req,res,f); }
    if (req.method==='GET' && p==='/api/games') return json(res,200,{ games:listGames().map(publicMeta) });

    // saves: one per player per game, reachable only with that player's session
    if ((m=p.match(/^\/api\/saves\/([a-z0-9-]{1,48})$/))) { const a = await authOf(req); if (!a) return json(res,401,{error:'sign in required'}); const key = u.searchParams.get('key')||''; if (key&&!/^[a-zA-Z0-9_-]{1,40}$/.test(key)) return json(res,400,{error:'bad key'}); const { dir, file } = saveFile(a.userId,key?m[1]+'__'+key:m[1]);
      if (req.method==='GET') { let d; try { d = JSON.parse(fs.readFileSync(file,'utf8')); } catch(e){ return json(res,200,{save:null}); } if (u.searchParams.get('data')!=='1') delete d.data; return json(res,200,{save:d}); }
      if (req.method==='PUT') { const d = await readJson(req,MAX_SAVE); if (!d||typeof d!=='object'||d.data===undefined) return json(res,400,{error:'bad save'}); fs.mkdirSync(dir,{recursive:true}); if (fs.readdirSync(dir).length>64) return json(res,429,{error:'too many saves'}); const tmp = file+'.tmp'; fs.writeFileSync(tmp,JSON.stringify({ meta:d.meta||{}, updated:Date.now(), data:d.data })); fs.renameSync(tmp,file); return json(res,200,{ok:true}); } }

    if (req.method==='GET' && (m=p.match(/^\/raw\/([a-f0-9]{10})(?:\/(.*))?$/))) { const id = m[1], rel = decodeURIComponent(m[2]||''), site = path.join(SITES,id);
      if (fs.existsSync(site)) { if (rel==='' && !p.endsWith('/')) { res.writeHead(302,{Location:p+'/'}); return res.end(); } const f = path.normalize(path.join(site, rel||'index.html')); if (!f.startsWith(site+path.sep)||!fs.existsSync(f)||fs.statSync(f).isDirectory()) return send(res,404,'text/plain','Not found'); const ext = path.extname(f).toLowerCase(); let b = fs.readFileSync(f); if (ext==='.html'||ext==='.htm') b = withShim(b.toString('utf8')); return send(res,200,TYPES[ext]||'application/octet-stream',b,RAW); }
      let h; try { h = fs.readFileSync(htmlPath(id),'utf8'); } catch(e){ return send(res,404,'text/plain','Not found'); } return send(res,200,'text/html; charset=utf-8',withShim(h),RAW); }
    if (req.method==='GET' && (m=p.match(/^\/api\/check\/([a-f0-9]{10})$/))) { const g = readMeta(m[1]); if (!g) return json(res,404,{error:'not found'}); if (g.url||g.site) return json(res,200,{external:true}); return json(res,200,checkHtml(fs.readFileSync(htmlPath(m[1]),'utf8'),g.title)); }

    if (req.method==='POST' && p==='/api/upload') { const a = await authOf(req); if (CLERK_ON&&!a) return json(res,401,{error:'sign in required'}); const d = await readJson(req); if (d==null) return json(res,413,{error:'too large'}); if (d===undefined) return json(res,400,{error:'bad json'}); const { code, ...r } = intake({ title:d.title, author:d.author, blurb:d.blurb, html:d.html, ownerId:a&&a.userId, trusted:!!a }); return json(res,r.status==='needs_fix'?422:code,{ ...r, ...(r.published||{}) }); }
    if (req.method==='POST' && p==='/api/upload-zip') { const a = await authOf(req); if (CLERK_ON&&!a) return json(res,401,{error:'sign in required'}); const b = await readRaw(req,MAX_ZIP); if (!b) return json(res,413,{error:'too large'}); const q = u.searchParams, { code, ...r } = intake({ title:q.get('title'), author:q.get('author'), blurb:q.get('blurb'), zip:b, ownerId:a&&a.userId, trusted:!!a }); return json(res,r.status==='needs_fix'?422:code,{ ...r, ...(r.published||{}) }); }
    if (req.method==='POST' && (m=p.match(/^\/api\/like\/([a-f0-9]{10})$/))) { const g = readMeta(m[1]); if (!g) return json(res,404,{error:'not found'}); g.likes = (g.likes||0)+1; writeMeta(g); return json(res,200,{likes:g.likes}); }
    if (req.method==='POST' && (m=p.match(/^\/api\/play\/([a-f0-9]{10})$/))) { const g = readMeta(m[1]); if (!g) return json(res,404,{error:'not found'}); g.plays = (g.plays||0)+1; const dd = g.daily||{}; dd[today()] = (dd[today()]||0)+1; g.daily = Object.fromEntries(Object.entries(dd).sort().slice(-60)); writeMeta(g); return json(res,200,{plays:g.plays}); }
    if (req.method==='POST' && (m=p.match(/^\/api\/comment\/([a-f0-9]{10})$/))) { const g = readMeta(m[1]); if (!g) return json(res,404,{error:'not found'}); const d = await readJson(req,8192)||{}; const text = String(d.text||'').slice(0,500).trim(); if (!text) return json(res,400,{error:'empty'}); (g.comments=g.comments||[]).unshift({ name:String(d.name||'anon').slice(0,40), text, at:Date.now() }); g.comments = g.comments.slice(0,200); writeMeta(g); return json(res,200,{ok:true}); }

    // the creator's portal: everything here is the signed-in owner's own game
    if (p==='/api/me/games' && req.method==='GET') { const a = await authOf(req); if (!a) return json(res,401,{error:'sign in required'}); return json(res,200,{ userId:a.userId, games:allGames().filter(g=>owns(g,a)).map(ownerMeta) }); }
    if ((m=p.match(/^\/api\/me\/games\/([a-f0-9]{10})(\/[a-z]+)?(?:\/(\d+))?$/))) { const a = await authOf(req); if (!a) return json(res,401,{error:'sign in required'}); const g = readMeta(m[1]); if (!g) return json(res,404,{error:'not found'}); if (!owns(g,a)) return json(res,403,{error:'not yours'}); const act = m[2]||'';
      if (req.method==='GET' && !act) return json(res,200,{ game:ownerMeta(g), comments:g.comments||[], daily:g.daily||{}, versions:g.versions||[], settings:publicSettings(g.settings||{}), saves:countSaves(g.slug) });
      if (req.method==='PATCH' && !act) { const d = await readJson(req,2*1048576); if (!d) return json(res,400,{error:'bad json'}); if (typeof d.title==='string'&&d.title.trim()) g.title = d.title.trim().slice(0,80); if (typeof d.blurb==='string') g.blurb = d.blurb.slice(0,200); if (typeof d.author==='string') g.author = d.author.slice(0,40); if (typeof d.hidden==='boolean') g.hidden = d.hidden; if (typeof d.url==='string'&&!g.saves) { const t = d.url.trim(); if (t&&!/^https:\/\/[^\s]+$/.test(t)) return json(res,422,{error:'the game address must start with https://'}); g.url = t||undefined; } if (typeof d.cover==='string') { const c = d.cover.match(/^data:image\/jpeg;base64,(.+)$/); if (!c) return json(res,422,{error:'bad cover'}); const b = Buffer.from(c[1],'base64'); if (b.length>900*1024) return json(res,413,{error:'cover too large'}); fs.writeFileSync(path.join(COVERS,g.id+'.jpg'),b); g.cover = '/covers/'+g.id+'.jpg?v='+Date.now().toString(36); } writeMeta(g); return json(res,200,{ game:ownerMeta(g) }); }
      if (req.method==='PUT' && act==='/settings') { const d = await readJson(req,65536); if (!d) return json(res,400,{error:'bad json'}); const flat = [d.auth&&d.auth.publicKey,d.auth&&d.auth.domain,d.db&&d.db.url,d.db&&d.db.publicKey]; if (flat.some(secretIn)) return json(res,422,{error:'secret',hint:'That looks like a secret. Games run in the browser, so only public keys may be stored here.'}); const pick = (o,ks) => Object.fromEntries(ks.filter(k=>o&&o[k]!==undefined).map(k=>[k,String(o[k]).slice(0,300)])); g.settings = { auth:pick(d.auth,['mode','provider','publicKey','domain']), db:pick(d.db,['mode','provider','url','publicKey']) }; writeMeta(g); return json(res,200,{ settings:publicSettings(g.settings) }); }
      if (req.method==='POST' && act==='/version') { if (g.url) return json(res,409,{error:'this game is served from your own address'}); const q = u.searchParams, note = String(q.get('note')||'').slice(0,120); if (q.get('zip')==='1') { const b = await readRaw(req,MAX_ZIP); if (!b) return json(res,413,{error:'too large'}); let files; try { files = unzip(b); } catch(e){ return json(res,422,{error:e.message}); } archive(g,note); const root = path.join(SITES,g.id); fs.rmSync(root,{recursive:true,force:true}); try { fs.unlinkSync(htmlPath(g.id)); } catch(e){} for (const f of files){ const t = path.normalize(path.join(root,f.name)); if (!t.startsWith(root+path.sep)) continue; fs.mkdirSync(path.dirname(t),{recursive:true}); fs.writeFileSync(t,f.data); } g.site = true; }
        else { const b = await readRaw(req,MAX_HTML); if (!b) return json(res,413,{error:'too large'}); const h = b.toString('utf8'), chk = checkHtml(h,g.title), sc = scanText(h); if (sc.blocked.length) return json(res,422,{error:sc.blocked[0].hint}); if (!chk.ok) return json(res,422,{error:'checks failed',check:chk}); archive(g,note); fs.rmSync(path.join(SITES,g.id),{recursive:true,force:true}); fs.writeFileSync(htmlPath(g.id),h); delete g.site; } g.version = (g.version||1)+1; writeMeta(g); return json(res,200,{ version:g.version, versions:g.versions }); }
      if (req.method==='POST' && act==='/restore') { const v = +m[3], from = path.join(VERSIONS,g.id,String(v)); if (!fs.existsSync(from)) return json(res,404,{error:'version not found'}); archive(g,'before restoring v'+v); fs.rmSync(path.join(SITES,g.id),{recursive:true,force:true}); try { fs.unlinkSync(htmlPath(g.id)); } catch(e){} if (fs.existsSync(path.join(from,'index.html'))&&!fs.existsSync(path.join(from,'single.html'))) { fs.cpSync(from,path.join(SITES,g.id),{recursive:true}); g.site = true; } else { fs.copyFileSync(path.join(from,'single.html'),htmlPath(g.id)); delete g.site; } g.version = (g.version||1)+1; writeMeta(g); return json(res,200,{ version:g.version, versions:g.versions }); }
      if (req.method==='DELETE' && act==='/comment') { const at = +m[3]; g.comments = (g.comments||[]).filter(c=>c.at!==at); writeMeta(g); return json(res,200,{ comments:g.comments }); }
      if (req.method==='DELETE' && !act) { for (const f of [metaPath(g.id),htmlPath(g.id),path.join(COVERS,g.id+'.jpg')]) try { fs.unlinkSync(f); } catch(e){} fs.rmSync(path.join(SITES,g.id),{recursive:true,force:true}); fs.rmSync(path.join(VERSIONS,g.id),{recursive:true,force:true}); return json(res,200,{deleted:true}); }
      return json(res,405,{error:'not supported'}); }

    // agents: one key, one call. Everything passes the same checks and review as the upload page
    if (p==='/mcp') { if (req.method==='GET') return send(res,405,'text/plain','POST JSON-RPC here'); if (req.method==='POST') { const a = await authOf(req); if (bearer(req)&&!a) return send(res,401,'application/json; charset=utf-8',JSON.stringify(BAD_KEY),{'WWW-Authenticate':'Bearer'}); const d = await readJson(req); if (d==null) return json(res,413,{error:'too large'}); if (d===undefined) return json(res,400,{ jsonrpc:'2.0', id:null, error:{ code:-32700, message:'parse error' } }); const list = Array.isArray(d)?d:[d], out = list.map(x=>mcpReply(x,a)).filter(Boolean); if (!out.length) { res.writeHead(202); return res.end(); } return json(res,200,Array.isArray(d)?out:out[0]); } }
    if (req.method==='POST' && p==='/api/submit') { const a = await authOf(req); if (bearer(req)&&!a) return json(res,401,BAD_KEY); const d = await readJson(req); if (d==null) return json(res,413,{error:'too large'}); if (d===undefined) return json(res,400,{error:'bad json'}); const { code, ...r } = intake({ title:d.title, author:d.author, blurb:d.blurb, html:d.html, ownerId:a&&a.userId, trusted:!!a, draftId:d.draftId, gameId:d.gameId }); return json(res,code,r); }
    if (req.method==='POST' && p==='/api/submit-zip') { const a = await authOf(req), q = u.searchParams; if (bearer(req)&&!a) return json(res,401,BAD_KEY); const b = await readRaw(req,MAX_ZIP); if (!b) return json(res,413,{error:'too large'}); const { code, ...r } = intake({ title:q.get('title'), author:q.get('author'), blurb:q.get('blurb'), zip:b, ownerId:a&&a.userId, trusted:!!a, gameId:q.get('gameId')||null }); return json(res,code,r); }
    if (req.method==='GET' && (m=p.match(/^\/api\/(?:submission|draft)\/([a-f0-9]{10})$/))) { const r = submission(m[1]); return r?json(res,200,r):json(res,404,{error:'not found'}); }
    if (req.method==='GET' && (m=p.match(/^\/api\/draft\/([a-f0-9]{10})\/preview$/))) { let h; try { h = fs.readFileSync(draftHtmlPath(m[1]),'utf8'); } catch(e){ return send(res,404,'text/plain','Preview is available for single-file games'); } return send(res,200,'text/html; charset=utf-8',withShim(h),{ ...RAW, 'Cache-Control':'no-store' }); }
    if (req.method==='GET' && p==='/api/review') { const a = await authOf(req); if (!isReviewer(req,a)) return json(res,403,{error:'reviewers only'}); return json(res,200,{ queue:listDrafts().filter(d=>d.status==='in_review') }); }
    if (req.method==='POST' && (m=p.match(/^\/api\/review\/([a-f0-9]{10})$/))) { const a = await authOf(req); if (!isReviewer(req,a)) return json(res,403,{error:'reviewers only'}); const d = await readJson(req,8192)||{}, { code, ...r } = decide(m[1],!!d.approve,d.reason); return json(res,code,r); }
    if ((m=p.match(/^\/api\/admin\/purge\/([a-zA-Z0-9_-]{1,40})$/)) && req.method==='POST') { if (!isAdmin(req)) return json(res,403,{error:'not allowed'}); const k = readKeys(); for (const h in k) if (k[h].ownerId===m[1]) delete k[h]; writeKeys(k); const pre = u.searchParams.get('title')||'\0'; for (const d of listDrafts()) if (d.ownerId===m[1]||d.title.startsWith(pre)) for (const f of [draftMetaPath(d.draftId),draftHtmlPath(d.draftId),path.join(DRAFTS,d.draftId+'.zip')]) try { fs.unlinkSync(f); } catch(e){} return json(res,200,{ok:true}); }
    if (p==='/api/admin/keys' && req.method==='POST') { if (!isAdmin(req)) return json(res,403,{error:'not allowed'}); const d = await readJson(req,4096)||{}; return json(res,200,{ token:mintKey(String(d.ownerId||''),d.name) }); }
    if (p==='/api/me/keys') { const a = await authOf(req); if (!a||a.viaKey) return json(res,401,{error:'sign in required'}); if (req.method==='GET') return json(res,200,{ keys:Object.values(readKeys()).filter(k=>k.ownerId===a.userId).map(({ownerId,...k})=>k) }); if (req.method==='POST') { const d = await readJson(req,4096)||{}; return json(res,200,{ token:mintKey(a.userId,d.name) }); } }
    if ((m=p.match(/^\/api\/me\/keys\/(nova_ak_[a-f0-9]{6})$/)) && req.method==='DELETE') { const a = await authOf(req); if (!a||a.viaKey) return json(res,401,{error:'sign in required'}); const k = readKeys(); for (const h in k) if (k[h].ownerId===a.userId&&k[h].prefix===m[1]) delete k[h]; writeKeys(k); return json(res,200,{ok:true}); }
    if (p==='/api/me/submissions' && req.method==='GET') { const a = await authOf(req); if (!a) return json(res,401,{error:'sign in required'}); return json(res,200,{ submissions:listDrafts().filter(d=>d.ownerId===a.userId).map(d=>({ draftId:d.draftId, title:d.title, status:d.status, flags:d.flags||[], reason:d.reason||'', updated:d.updated })), reviewer:!!OWNER_ID&&a.userId===OWNER_ID }); }
    if (req.method==='GET' && (p==='/agent.md'||p==='/mcp-server.js')) return send(res,200,p.endsWith('.md')?'text/markdown; charset=utf-8':'text/javascript; charset=utf-8',fs.readFileSync(path.join(__dirname,p==='/agent.md'?'AGENT.md':'mcp-server.js')),{'Cache-Control':'public, max-age=300'});
    if (req.method==='POST' && (m=p.match(/^\/api\/delete\/([a-f0-9]{10})$/))) { const g = readMeta(m[1]); if (!g) return json(res,404,{error:'not found'}); const a = await authOf(req); if (!(isAdmin(req)||(a&&g.ownerId&&g.ownerId===a.userId))) return json(res,403,{error:'not allowed'}); for (const f of [metaPath(m[1]),htmlPath(m[1])]) try { fs.unlinkSync(f); } catch(e){} fs.rmSync(path.join(SITES,m[1]),{recursive:true,force:true}); return json(res,200,{deleted:true}); }

    if (req.method==='GET' && (m=p.match(/^\/([a-z0-9][a-z0-9-]{0,48})$/)) && !RESERVED.has(m[1])) { const g = findBySlug(m[1]); if (g&&!g.hidden) return html(res,gamePage(g)); }
    return send(res,404,'text/html; charset=utf-8',page({ title:'NOVA', cls:'solidnav', body:'<section class="wrap top"><h1 class="big" data-en="Nothing here.">这里什么也没有。</h1><a class="btn" href="/" data-en="Back to NOVA">回到 NOVA</a></section>' }));
  } catch(e){ console.error(e); return send(res,500,'text/plain','server error'); }
}).listen(PORT, () => console.log('NOVA on '+PORT));
