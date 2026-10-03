import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
const ROOT = new URL('..', import.meta.url).pathname;
const T = { '.html':'text/html', '.mjs':'text/javascript' };
const srv = createServer((q,s)=>{ let p=join(ROOT,decodeURI(q.url.split('?')[0]));
  try{ if(statSync(p).isDirectory()) p=join(p,'index.html'); }catch{}
  if(!existsSync(p)){s.writeHead(404);return s.end();}
  s.writeHead(200,{'Content-Type':T[extname(p)]||'application/octet-stream'}); s.end(readFileSync(p)); });
await new Promise(r=>srv.listen(0,r));
const br = await chromium.launch({ channel:'chrome', headless:true });
const pg = await br.newPage({ viewport:{ width:1100, height:760 } });
const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
pg.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE: '+m.text());});
await pg.goto(`http://127.0.0.1:${srv.address().port}/?dev`, { waitUntil:'load' });
await pg.waitForTimeout(900);
await pg.screenshot({ path:'out/title.png' });
await pg.keyboard.press('Space');
await pg.waitForTimeout(700);
await pg.screenshot({ path:'out/play.png' });
// play several turns, aiming to reach distance and then attack
for (let i=0;i<9;i++){
  const st = await pg.evaluate(()=>{ const s=window.__lockout.state;
    return { phase:s.phase, measure:s.measure, hand:[...s.you.hand] }; });
  if (st.phase === 'choose') {
    const want = st.measure >= 2 ? 'attack' : 'step';
    let idx = st.hand.indexOf(want); if (idx < 0) idx = 0;
    await pg.keyboard.press(`Digit${idx+1}`);
  }
  await pg.waitForTimeout(2600);
  if (i===2) await pg.screenshot({ path:'out/mid.png' });
}
await pg.screenshot({ path:'out/late.png' });
const info = await pg.evaluate(()=>{ const s=window.__lockout.state;
  return { tick:s.tick, phase:s.phase, measure:s.measure, you:s.you.score, foe:s.foe.score, over:s.over }; });
console.log(JSON.stringify(info));
console.log(errs.length ? errs.slice(0,6).join('\n') : 'no console errors');
await br.close(); srv.close();
