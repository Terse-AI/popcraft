#!/usr/bin/env node
// NOVA MCP server — lets a creator's agent (Claude Code / Codex) submit a game to
// NOVA, run the quality checks, iterate against the hints, and auto-publish when
// every error-level check is green. Zero deps; line-delimited JSON-RPC over stdio.
// Needs Node 18+ (global fetch). Point it at your NOVA with NOVA_URL.
const BASE = (process.env.NOVA_URL || 'https://nova-games.up.railway.app').replace(/\/+$/,'');

const KEY = process.env.NOVA_KEY || '';
// the tools live on NOVA; this file only carries them over stdio for clients without HTTP MCP
async function rpc(method, params){ const r = await fetch(BASE+'/mcp', { method:'POST', headers:{ 'Content-Type':'application/json', ...(KEY?{Authorization:'Bearer '+KEY}:{}) }, body:JSON.stringify({ jsonrpc:'2.0', id:1, method, params }) }); return (await r.json()); }
const send = obj => process.stdout.write(JSON.stringify(obj)+'\n');
async function handle(msg){
  const { id, method, params } = msg;
  if (method==='initialize')
    return send({ jsonrpc:'2.0', id, result:{ protocolVersion:(params&&params.protocolVersion)||'2024-11-05',
      capabilities:{ tools:{} }, serverInfo:{ name:'nova', version:'0.1.0' } } });
  if (method==='tools/list') { const r = await rpc('tools/list',{}); return send({ jsonrpc:'2.0', id, result:r.result }); }
  if (method==='tools/call'){
    try { const r = await rpc('tools/call',params); return send({ jsonrpc:'2.0', id, result:r.result }); } catch(e){ return send({ jsonrpc:'2.0', id, result:{ content:[{ type:'text', text:'error: '+e.message }], isError:true } }); }
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
