import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
const ROOT = '/Users/aedinlai/Desktop/all/Aedin-ctrl.github.io/docs/';
const T = { '.html':'text/html', '.mjs':'text/javascript', '.woff2':'font/woff2', '.js':'text/javascript', '.css':'text/css' };
const srv = createServer((q,s)=>{
  let p = join(ROOT, decodeURI(q.url.split('?')[0].split('#')[0]));
  try { if (statSync(p).isDirectory()) p = join(p,'index.html'); } catch {}
  if (!existsSync(p)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'Content-Type': T[extname(p)] || 'application/octet-stream' });
  s.end(readFileSync(p));
});
await new Promise(r=>srv.listen(0,r));
const br = await chromium.launch({ channel:'chrome', headless:true });
const pg = await br.newPage({ viewport:{width:1000,height:820}, deviceScaleFactor:2 });
const errs = [];
pg.on('pageerror', e=>errs.push(e.message));
pg.on('requestfailed', r=>errs.push('404? '+r.url()));
pg.on('response', r=>{ if (r.status()>=400) errs.push(r.status()+' '+r.url()); });
const base = 'http://127.0.0.1:'+srv.address().port;
await pg.goto(base+'/games/', { waitUntil:'load' }); await pg.waitForTimeout(400);
await pg.screenshot({ path:'/tmp/hub1.png' });
console.log('level 1:', await pg.locator('#headTitle').textContent());
await pg.click('[data-to="demos"]'); await pg.waitForTimeout(300);
console.log('level 2:', await pg.locator('#headTitle').textContent(), '| games listed:', await pg.locator('[data-play]').count());
await pg.screenshot({ path:'/tmp/hub2.png' });
await pg.click('[data-play="latch"]'); await pg.waitForTimeout(2500);
console.log('playing:', JSON.stringify(await pg.evaluate(()=>({ on:document.getElementById('player').classList.contains('on'), src:document.getElementById('frame').getAttribute('src') }))));
await pg.screenshot({ path:'/tmp/hub3.png' });
await pg.click('#back'); await pg.waitForTimeout(300);
console.log('back works:', await pg.evaluate(()=>!document.getElementById('player').classList.contains('on')));
console.log(errs.length ? ('ERRORS: '+errs.join(' | ')) : 'no errors');
await br.close(); srv.close();
