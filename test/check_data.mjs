import path from 'path'; const d=await import(path.resolve(process.argv[2]));
const DB={fruit:d.FRUIT,seed:d.CROPS,crop:d.CROPS,fish:d.FISH,trash:d.TRASH,ore:d.ORES,bar:d.BARS,gem:d.GEMS,product:d.PRODUCTS,artisan:d.ARTISAN,mat:d.MATS,craft:d.CRAFTABLES,food:d.FOOD,forage:d.FORAGE,artifact:d.ARTIFACTS,ring:d.RINGS,boot:d.BOOTS};
const miss=new Set(), chk=(k,w)=>{ const [a,r]=k.split(':'); if(r==='*') return; const b=r.split('~')[0].split('*')[0].split('.')[0]; if(!DB[a]||!DB[a][b]) miss.add(w+' -> '+k); };
for(const id in d.COOK){ for(const k in d.COOK[id].cost) chk(k,'cook '+id); if(!d.FOOD[id]) miss.add('food '+id); }
for(const id in d.CRAFTABLES){ const c=d.CRAFTABLES[id]; for(const k in (c.cost||{})) chk(k,'craft '+id); if(c.give) chk(c.give[0]+':'+c.give[1],'give '+id); }
for(const id in d.BUILDINGS) for(const k in d.BUILDINGS[id].cost) chk(k,'bld '+id);
for(const id in d.MACHINES) for(const r of d.MACHINES[id]){ if(r.in) chk(r.in,'mach '+id); if(r.out.includes(':')) chk(r.out,'mach out '+id); }
for(const t of d.TAILOR) chk(t[0],'tailor');
console.log(Object.keys(d.CRAFTABLES).length,'craftables',Object.keys(d.COOK).length,'recipes',Object.keys(d.FURNITURE).length,'furniture',d.WEAPONS.length,'weapons',d.GUILD_GOALS.length,'goals',Object.keys(d.FISH).length,'fish'); console.log([...miss].join('\n')||'all refs ok');
