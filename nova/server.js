// NOVA: a home for web games. Upload a game, get a link, anyone plays it in the browser at once.
// Uploaded games run client-side in a sandbox and we never execute them here. Zero dependencies.
const http = require('http');
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const PORT  = process.env.PORT || 3000;
const DATA  = process.env.DATA_DIR || path.join(__dirname, 'data'); // a Railway volume keeps this across deploys
const GAMES = path.join(DATA, 'games'), DRAFTS = path.join(DATA, 'drafts'), SITES = path.join(DATA, 'sites'), SAVES = path.join(DATA, 'saves');
for (const d of [GAMES, DRAFTS, SITES, SAVES]) fs.mkdirSync(d, { recursive: true });
const PUBLIC = path.join(__dirname, 'public');
const STARVALE_URL = 'https://popcraft-production.up.railway.app';

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
const authOf  = req => verifyToken(bearer(req));
const isAdmin = req => !!ADMIN_TOKEN && req.headers['x-admin-token'] === ADMIN_TOKEN;

const RESERVED = new Set(['','upload','games','api','g','raw','assets','public','favicon.ico','robots.txt','health','about','popcraft','playforge']);
function allGames(){ const out = []; try { for (const f of fs.readdirSync(GAMES)) { if (!f.endsWith('.json')) continue; try { out.push(JSON.parse(fs.readFileSync(path.join(GAMES,f),'utf8'))); } catch(e){} } } catch(e){} out.sort((a,b) => (b.featured?1:0)-(a.featured?1:0) || (b.created||0)-(a.created||0)); return out; }
const listGames = () => allGames().filter(g => !g.hidden);
const readMeta  = id => { try { return JSON.parse(fs.readFileSync(metaPath(id),'utf8')); } catch(e){ return null; } };
const writeMeta = m  => fs.writeFileSync(metaPath(m.id), JSON.stringify(m));
const findBySlug = slug => allGames().find(g => g.slug === slug) || null;
const publicMeta = g => { const { ownerId, comments, ...rest } = g; return { ...rest, comments:(comments||[]).length }; };
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
    { id:'interactive', label:'Has interactive content', severity:'warn', pass:has(/<canvas|<script|onclick|addeventlistener/i), hint:'Add a <canvas> or scripted interaction.' },
    { id:'viewport', label:'Mobile viewport set', severity:'warn', pass:has(/name=["']?viewport/i), hint:'Add a viewport meta tag for phones.' },
    { id:'charset', label:'Charset declared', severity:'warn', pass:has(/charset/i), hint:'Add <meta charset="utf-8">.' } ];
  const errs = checks.filter(c => c.severity==='error');
  return { ok:errs.every(c=>c.pass), passed:checks.filter(c=>c.pass).length, total:checks.length, failed:checks.filter(c=>!c.pass).map(c=>({id:c.id,severity:c.severity,hint:c.hint})), checks };
}
function publishDraft(draftId){
  const dm = readDraft(draftId); if (!dm) return { error:'draft not found' };
  let html = ''; try { html = fs.readFileSync(draftHtmlPath(draftId),'utf8'); } catch(e){ return { error:'draft file missing' }; }
  const chk = checkHtml(html, dm.title); if (!chk.ok) return { error:'checks failed', check:chk };
  const id = id6(), slug = slugify(dm.title); fs.writeFileSync(htmlPath(id), html);
  writeMeta({ id, slug, title:dm.title, author:dm.author||'anon', created:Date.now(), likes:0, plays:0, comments:[], viaAgent:true, ownerId:dm.ownerId||null });
  try { fs.unlinkSync(draftMetaPath(draftId)); fs.unlinkSync(draftHtmlPath(draftId)); } catch(e){}
  return { published:{ id, slug, url:'/'+slug }, check:chk };
}

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

// ---------------------------------------------------------------- pages
const COPY = { desc:'Play and share web games. No downloads.' };
function page({ title, body, game, cls='' }){
  const boot = { clerk:CLERK_ON?CLERK_PK:'', game:game?{...publicMeta(game),isNative:!!game.saves}:null };
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><meta name="description" content="${COPY.desc}"><meta name="theme-color" content="#0b0b0d">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(game&&game.blurb||COPY.desc)}">${game&&game.cover?`<meta property="og:image" content="${esc(game.cover)}">`:''}
<link rel="icon" href="/public/icon.svg"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet"><link rel="stylesheet" href="/public/site.css?v=${VER}"></head>
<body class="${cls}"><nav id="nav"><a class="logo" href="/">NOVA</a><div class="nv"><a href="/games" data-en="Games">游戏</a><a href="/upload" data-en="Upload">上传</a><button class="lang" id="lang">EN</button><div id="auth"></div></div></nav>
${body}
<div id="player" hidden><div id="pbar"><button id="pexit" aria-label="exit">✕</button><button id="pfull" aria-label="fullscreen">⛶</button></div></div>
<script type="application/json" id="boot">${JSON.stringify(boot).replace(/</g,'\\u003c')}</script>
${CLERK_ON?`<script async crossorigin="anonymous" data-clerk-publishable-key="${CLERK_PK}" src="https://${CLERK_FAPI}/npm/@clerk/clerk-js@5/dist/clerk.browser.js"></script>`:''}
<script src="/public/site.js?v=${VER}"></script></body></html>`;
}
const VER = Date.now().toString(36);
const hue = s => { let h = 0; for (const c of String(s)) h = (h*31+c.charCodeAt(0))%360; return h; };
const coverStyle = g => g.cover ? `background-image:url('${esc(g.cover)}')` : `background-image:linear-gradient(135deg,hsl(${hue(g.slug)} 34% 26%),hsl(${(hue(g.slug)+48)%360} 30% 13%))`;
const card = g => `<a class="card" href="/${esc(g.slug)}"><div class="cv" style="${coverStyle(g)}">${g.cover?'':`<span>${esc(g.title)}</span>`}</div><div class="ct"><b>${esc(g.title)}</b><i>${esc(g.author||'')}</i></div></a>`;
function landing(){ const games = listGames(), sv = games.find(g=>g.saves)||games[0];
  return page({ title:'NOVA · 打开就能玩的网页游戏', game:sv, cls:'home', body:`
<header class="hero"><div class="art" style="background-image:url('/public/starvale-hero.jpg')"></div><div class="veil"></div>
 <div class="hin"><p class="eyebrow" data-en="Now playing on NOVA">正在 NOVA 上</p><h1>StarVale</h1><p class="lede" data-en="A little farm by the lake, through every season. Open the page and play.">湖边的小农场,一年四季。打开网页就能玩。</p>
  <div id="saveline" class="saveline" hidden></div>
  <div class="cta"><button class="btn solid" id="mainplay" data-en="New game">开始新游戏</button><button class="btn" id="altplay" data-en="Load save">读取存档</button></div>
  <div class="links"><a href="/games" data-en="Browse more games →">浏览更多游戏 →</a><a href="/upload" data-en="Upload your game →">上传你的游戏 →</a></div></div></header>
<section class="wrap" id="gal"><div class="sh"><h2 data-en="On NOVA">在 NOVA 上玩</h2><a href="/games" data-en="All games">全部游戏</a></div><div class="grid">${games.slice(0,6).map(card).join('')}</div></section>
<section class="wrap pitch"><p class="eyebrow" data-en="For creators">给创作者</p><h2 class="big" data-en="Your game, one link away.">把你的游戏,变成一个链接。</h2>
 <div class="tri"><div><h3 data-en="One-click upload">一键上传</h3><p data-en="Drop an HTML file or a ZIP. NOVA checks it and puts it online in seconds. Nothing to configure.">拖入 HTML 或 ZIP,NOVA 自动检查,几秒上线。不用配服务器,也不用打包发布。</p></div>
 <div><h3 data-en="One-click share">一键分享</h3><p data-en="Every game gets its own short link. Friends click and play. No install, no account.">每个游戏都有自己的短链接。朋友点开就玩,不用下载,也不用注册。</p></div>
 <div><h3 data-en="Everything runs on the web">全部是网页游戏</h3><p data-en="Computers, phones and tablets all work. Play fullscreen, and saves follow your account.">电脑、手机、平板都能玩。全屏沉浸,存档跟着账号走。</p></div></div>
 <a class="btn solid" href="/upload" data-en="Upload a game">上传游戏</a></section>
<footer><a class="logo" href="/">NOVA</a><span data-en="Web games, one link away.">打开就能玩的网页游戏。</span></footer>` }); }
function gallery(){ return page({ title:'全部游戏 · NOVA', cls:'solidnav', body:`<section class="wrap top"><h1 class="big" data-en="All games">全部游戏</h1><input id="q" class="search" placeholder="搜索游戏" data-en-ph="Search games"><div class="grid" id="grid">${listGames().map(card).join('')}</div></section>` }); }
function uploadPage(){ return page({ title:'上传游戏 · NOVA', cls:'solidnav', body:`<section class="wrap top narrow"><p class="eyebrow" data-en="Upload">上传</p><h1 class="big" data-en="Put your game on NOVA.">把游戏放到 NOVA。</h1>
 <label id="drop"><input type="file" id="file" accept=".html,.htm,.zip" hidden><b data-en="Drop your game here">把游戏拖到这里</b><span data-en="An HTML file, or a ZIP with index.html, up to 80 MB">HTML 文件,或包含 index.html 的 ZIP,最大 80 MB</span></label>
 <div id="form" hidden><input id="title" placeholder="游戏名字" data-en-ph="Game title" maxlength="80"><input id="author" placeholder="作者" data-en-ph="Author" maxlength="40"><textarea id="blurb" placeholder="一句话介绍(可选)" data-en-ph="One line about it (optional)" maxlength="200"></textarea><button class="btn solid" id="pub" data-en="Publish">发布</button></div>
 <div id="done" hidden><h3 data-en="It's live.">上线了。</h3><p class="linkbox"><a id="glink"></a><button class="btn small" id="gcopy" data-en="Copy link">复制链接</button></p><div id="report"></div></div><p id="uerr" class="err" hidden></p></section>` }); }
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

// ---------------------------------------------------------------- routing
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'), p = u.pathname; let m;
  try {
    if (req.method==='GET' && p==='/') return html(res,landing());
    if (req.method==='GET' && p==='/games') return html(res,gallery());
    if (req.method==='GET' && p==='/upload') return html(res,uploadPage());
    if (req.method==='GET' && p==='/popcraft') { res.writeHead(301,{Location:'/starvale'}); return res.end(); }
    if (req.method==='GET' && p==='/health') return json(res,200,{ok:true,clerk:CLERK_ON});
    if (req.method==='GET' && (m=p.match(/^\/public\/([a-zA-Z0-9._-]+)$/))) { const f = path.join(PUBLIC,m[1]); if (!fs.existsSync(f)) return send(res,404,'text/plain','Not found'); return send(res,200,TYPES[path.extname(f)]||'application/octet-stream',fs.readFileSync(f),{'Cache-Control':'public, max-age=3600'}); }
    if (req.method==='GET' && p==='/api/games') return json(res,200,{ games:listGames().map(publicMeta) });

    // saves: one per player per game, reachable only with that player's session
    if ((m=p.match(/^\/api\/saves\/([a-z0-9-]{1,48})$/))) { const a = await authOf(req); if (!a) return json(res,401,{error:'sign in required'}); const { dir, file } = saveFile(a.userId,m[1]);
      if (req.method==='GET') { let d; try { d = JSON.parse(fs.readFileSync(file,'utf8')); } catch(e){ return json(res,200,{save:null}); } if (u.searchParams.get('data')!=='1') delete d.data; return json(res,200,{save:d}); }
      if (req.method==='PUT') { const d = await readJson(req,MAX_SAVE); if (!d||typeof d!=='object'||!d.data) return json(res,400,{error:'bad save'}); fs.mkdirSync(dir,{recursive:true}); const tmp = file+'.tmp'; fs.writeFileSync(tmp,JSON.stringify({ meta:d.meta||{}, updated:Date.now(), data:d.data })); fs.renameSync(tmp,file); return json(res,200,{ok:true}); } }

    if (req.method==='GET' && (m=p.match(/^\/raw\/([a-f0-9]{10})(?:\/(.*))?$/))) { const id = m[1], rel = decodeURIComponent(m[2]||''), site = path.join(SITES,id);
      if (fs.existsSync(site)) { if (rel==='' && !p.endsWith('/')) { res.writeHead(302,{Location:p+'/'}); return res.end(); } const f = path.normalize(path.join(site, rel||'index.html')); if (!f.startsWith(site+path.sep)||!fs.existsSync(f)||fs.statSync(f).isDirectory()) return send(res,404,'text/plain','Not found'); const ext = path.extname(f).toLowerCase(); let b = fs.readFileSync(f); if (ext==='.html'||ext==='.htm') b = withShim(b.toString('utf8')); return send(res,200,TYPES[ext]||'application/octet-stream',b,RAW); }
      let h; try { h = fs.readFileSync(htmlPath(id),'utf8'); } catch(e){ return send(res,404,'text/plain','Not found'); } return send(res,200,'text/html; charset=utf-8',withShim(h),RAW); }
    if (req.method==='GET' && (m=p.match(/^\/api\/check\/([a-f0-9]{10})$/))) { const g = readMeta(m[1]); if (!g) return json(res,404,{error:'not found'}); if (g.url||g.site) return json(res,200,{external:true}); return json(res,200,checkHtml(fs.readFileSync(htmlPath(m[1]),'utf8'),g.title)); }

    if (req.method==='POST' && p==='/api/upload') { const a = await authOf(req); if (CLERK_ON&&!a) return json(res,401,{error:'sign in required'}); const d = await readJson(req); if (d==null) return json(res,413,{error:'too large'}); if (d===undefined) return json(res,400,{error:'bad json'});
      const title = String(d.title||'').slice(0,80).trim(), h = String(d.html||''); if (!title) return json(res,400,{error:'title required'}); const chk = checkHtml(h,title); if (!chk.ok) return json(res,422,{error:'checks failed',check:chk});
      const id = id6(), slug = slugify(title); fs.writeFileSync(htmlPath(id),h); writeMeta({ id, slug, title, author:String(d.author||'anon').slice(0,40), blurb:String(d.blurb||'').slice(0,200), created:Date.now(), likes:0, plays:0, comments:[], ownerId:a?a.userId:null }); return json(res,200,{ id, slug, url:'/'+slug, check:chk }); }
    if (req.method==='POST' && p==='/api/upload-zip') { const a = await authOf(req); if (CLERK_ON&&!a) return json(res,401,{error:'sign in required'}); const b = await readRaw(req,MAX_ZIP); if (!b) return json(res,413,{error:'too large'}); const q = u.searchParams, title = String(q.get('title')||'').slice(0,80).trim(); if (!title) return json(res,400,{error:'title required'});
      let files; try { files = unzip(b); } catch(e){ return json(res,422,{error:e.message}); } const id = id6(), slug = slugify(title), root = path.join(SITES,id); for (const f of files){ const t = path.normalize(path.join(root,f.name)); if (!t.startsWith(root+path.sep)) continue; fs.mkdirSync(path.dirname(t),{recursive:true}); fs.writeFileSync(t,f.data); }
      writeMeta({ id, slug, title, site:true, author:String(q.get('author')||'anon').slice(0,40), blurb:String(q.get('blurb')||'').slice(0,200), created:Date.now(), likes:0, plays:0, comments:[], ownerId:a?a.userId:null }); return json(res,200,{ id, slug, url:'/'+slug, files:files.length }); }
    if (req.method==='POST' && (m=p.match(/^\/api\/like\/([a-f0-9]{10})$/))) { const g = readMeta(m[1]); if (!g) return json(res,404,{error:'not found'}); g.likes = (g.likes||0)+1; writeMeta(g); return json(res,200,{likes:g.likes}); }
    if (req.method==='POST' && (m=p.match(/^\/api\/play\/([a-f0-9]{10})$/))) { const g = readMeta(m[1]); if (!g) return json(res,404,{error:'not found'}); g.plays = (g.plays||0)+1; writeMeta(g); return json(res,200,{plays:g.plays}); }
    if (req.method==='POST' && (m=p.match(/^\/api\/comment\/([a-f0-9]{10})$/))) { const g = readMeta(m[1]); if (!g) return json(res,404,{error:'not found'}); const d = await readJson(req,8192)||{}; const text = String(d.text||'').slice(0,500).trim(); if (!text) return json(res,400,{error:'empty'}); (g.comments=g.comments||[]).unshift({ name:String(d.name||'anon').slice(0,40), text, at:Date.now() }); g.comments = g.comments.slice(0,200); writeMeta(g); return json(res,200,{ok:true}); }

    // agents publish through the same gate: submit a draft, read the checks, fix, resubmit
    if (req.method==='POST' && p==='/api/submit') { const a = await authOf(req); const d = await readJson(req); if (d==null) return json(res,413,{error:'too large'}); if (d===undefined) return json(res,400,{error:'bad json'});
      const title = String(d.title||'').slice(0,80).trim(), h = String(d.html||''); if (!title) return json(res,400,{error:'title required'}); if (!h||h.length>MAX_HTML) return json(res,400,{error:'bad or too-large html'});
      const reuse = typeof d.draftId==='string' && validId(d.draftId) && readDraft(d.draftId), draftId = reuse ? d.draftId : id6(); fs.writeFileSync(draftHtmlPath(draftId),h); fs.writeFileSync(draftMetaPath(draftId),JSON.stringify({ draftId, title, author:String(d.author||'anon').slice(0,40), updated:Date.now(), ownerId:a?a.userId:null }));
      const chk = checkHtml(h,title), out = { draftId, check:chk }; if (chk.ok&&d.autopublish){ const pub = publishDraft(draftId); if (pub.published) out.published = pub.published; } else if (!chk.ok) out.next = 'Fix the failed error-level checks and POST /api/submit again with the same draftId.'; return json(res,200,out); }
    if (req.method==='POST' && (m=p.match(/^\/api\/publish\/([a-f0-9]{10})$/))) { const r = publishDraft(m[1]); return json(res, r.published?200:(r.error==='draft not found'?404:422), r); }
    if (req.method==='GET' && (m=p.match(/^\/api\/draft\/([a-f0-9]{10})$/))) { const dm = readDraft(m[1]); if (!dm) return json(res,404,{error:'not found'}); let h = ''; try { h = fs.readFileSync(draftHtmlPath(m[1]),'utf8'); } catch(e){} return json(res,200,{ draft:dm, check:checkHtml(h,dm.title) }); }
    if (req.method==='POST' && (m=p.match(/^\/api\/delete\/([a-f0-9]{10})$/))) { const g = readMeta(m[1]); if (!g) return json(res,404,{error:'not found'}); const a = await authOf(req); if (!(isAdmin(req)||(a&&g.ownerId&&g.ownerId===a.userId))) return json(res,403,{error:'not allowed'}); for (const f of [metaPath(m[1]),htmlPath(m[1])]) try { fs.unlinkSync(f); } catch(e){} fs.rmSync(path.join(SITES,m[1]),{recursive:true,force:true}); return json(res,200,{deleted:true}); }

    if (req.method==='GET' && (m=p.match(/^\/([a-z0-9][a-z0-9-]{0,48})$/)) && !RESERVED.has(m[1])) { const g = findBySlug(m[1]); if (g&&!g.hidden) return html(res,gamePage(g)); }
    return send(res,404,'text/html; charset=utf-8',page({ title:'NOVA', cls:'solidnav', body:'<section class="wrap top"><h1 class="big" data-en="Nothing here.">这里什么也没有。</h1><a class="btn" href="/" data-en="Back to NOVA">回到 NOVA</a></section>' }));
  } catch(e){ console.error(e); return send(res,500,'text/plain','server error'); }
}).listen(PORT, () => console.log('NOVA on '+PORT));
