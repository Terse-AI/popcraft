#!/usr/bin/env node
// NOVA MCP server — lets a creator's agent (Claude Code / Codex) submit a game to
// NOVA, run the quality checks, iterate against the hints, and auto-publish when
// every error-level check is green. Zero deps; line-delimited JSON-RPC over stdio.
// Needs Node 18+ (global fetch). Point it at your NOVA with NOVA_URL.
const BASE = (process.env.NOVA_URL || 'https://nova-games.up.railway.app').replace(/\/+$/,'');

const TOOLS = [
  { name:'nova_submit',
    description:'Submit a self-contained HTML game to NOVA as a draft and run the quality gate. Returns structured pass/fail checks with hints. Pass autopublish:true to publish automatically once all error-level checks pass. To iterate, fix the issues and call again with the same draftId.',
    inputSchema:{ type:'object', required:['title','html'], properties:{
      title:{type:'string'}, html:{type:'string', description:'A full self-contained HTML document'},
      author:{type:'string'}, emoji:{type:'string'},
      draftId:{type:'string', description:'Reuse to update an existing draft (iterate in place)'},
      autopublish:{type:'boolean', description:'Publish immediately if all error-level checks pass'} } } },
  { name:'nova_check',
    description:'Re-run NOVA quality checks on an existing draft; returns structured pass/fail with hints to fix.',
    inputSchema:{ type:'object', required:['draftId'], properties:{ draftId:{type:'string'} } } },
  { name:'nova_publish',
    description:'Publish a draft to the NOVA catalog. Succeeds only if all error-level checks pass; otherwise returns the remaining failures.',
    inputSchema:{ type:'object', required:['draftId'], properties:{ draftId:{type:'string'} } } }
];

async function api(method, p, body){
  const r = await fetch(BASE+p, { method, headers:{'Content-Type':'application/json'}, body: body?JSON.stringify(body):undefined });
  let j; try { j = await r.json(); } catch(e){ j = { error:'non-json response', status:r.status }; }
  return { status:r.status, body:j };
}
async function call(name, a){
  a = a || {};
  if (name==='nova_submit')  return api('POST','/api/submit', a);
  if (name==='nova_check')   return api('GET','/api/draft/'+encodeURIComponent(a.draftId));
  if (name==='nova_publish') return api('POST','/api/publish/'+encodeURIComponent(a.draftId));
  return { status:400, body:{ error:'unknown tool '+name } };
}
const send = obj => process.stdout.write(JSON.stringify(obj)+'\n');
async function handle(msg){
  const { id, method, params } = msg;
  if (method==='initialize')
    return send({ jsonrpc:'2.0', id, result:{ protocolVersion:(params&&params.protocolVersion)||'2024-11-05',
      capabilities:{ tools:{} }, serverInfo:{ name:'nova', version:'0.1.0' } } });
  if (method==='tools/list') return send({ jsonrpc:'2.0', id, result:{ tools:TOOLS } });
  if (method==='tools/call'){
    try { const r = await call(params.name, params.arguments);
      return send({ jsonrpc:'2.0', id, result:{ content:[{ type:'text', text:JSON.stringify(r.body,null,2) }], isError:r.status>=400 } });
    } catch(e){ return send({ jsonrpc:'2.0', id, result:{ content:[{ type:'text', text:'error: '+e.message }], isError:true } }); }
  }
  if (method==='ping') return send({ jsonrpc:'2.0', id, result:{} });
  if (id!==undefined && method && method.indexOf('notifications/')!==0)
    return send({ jsonrpc:'2.0', id, error:{ code:-32601, message:'method not found: '+method } });
  // notifications have no response
}
let buf='';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buf += chunk; let nl;
  while ((nl = buf.indexOf('\n')) >= 0){
    const line = buf.slice(0,nl).trim(); buf = buf.slice(nl+1);
    if (!line) continue;
    let msg; try { msg = JSON.parse(line); } catch(e){ continue; }
    handle(msg);
  }
});
