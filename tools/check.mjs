// Check the gallery before deploying.
//   node tools/check.mjs [--live]
// - every tile and the hero have shots/<slug>.jpg and clips/<slug>.mp4; no orphan files
// - renders at 1440 / 900 / 390px: no page errors, no horizontal scroll, every grid row filled
// - every clip is smooth: no dropped/frozen frames, no hitches, no jump at the loop seam (tools/smooth.mjs)
// - every clip actually plays (real Chrome, since bundled Chromium has no H.264)
// - --live: every game URL on alecsharpie.me answers 200
// Screenshots land in .out/check-<width>.png — look at them with the Read tool.
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
import { chromium } from 'playwright';
import { ROOT, SHOTS, CLIPS, SITE } from './lib.mjs';
import { analyse } from './smooth.mjs';

const problems = [], warn = m => { problems.push(m); console.log('  ✗ ' + m); }, ok = m => console.log('  ✓ ' + m);
const out = path.join(ROOT, '.out'); fs.mkdirSync(out, { recursive: true });

// Serve the repo as /games/ so the ../<slug>/ links resolve like on the real site.
const types = { '.html': 'text/html', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!u.startsWith('/games/')) { res.writeHead(404).end(); return; }
  let f = path.join(ROOT, u.slice('/games/'.length) || 'index.html');
  if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404).end(); return; }
  const data = fs.readFileSync(f), range = req.headers.range?.match(/bytes=(\d+)-(\d*)/);
  const type = types[path.extname(f)] || 'application/octet-stream';
  if (range) { // Chrome needs range support to play video
    const a = +range[1], b = range[2] ? +range[2] : data.length - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${a}-${b}/${data.length}`, 'Accept-Ranges': 'bytes', 'Content-Length': b - a + 1 });
    res.end(data.subarray(a, b + 1));
  } else { res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes' }); res.end(data); }
}).listen(0);
const url = `http://localhost:${server.address().port}/games/`;

let browser;
try { browser = await chromium.launch({ channel: 'chrome' }); }
catch { console.log('(real Chrome not found; clip playback is not checked)'); browser = await chromium.launch(); }

try {
  console.log('Assets');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(url, { waitUntil: 'load' });
  const slugs = await page.$$eval('a.feature, a.tile', as => as.map(a => a.getAttribute('href').replace(/^\.\.\/|\/$/g, '')));
  const missing = slugs.flatMap(s => [`shots/${s}.jpg`, `clips/${s}.mp4`].filter(f => !fs.existsSync(path.join(ROOT, f))));
  missing.length ? missing.forEach(f => warn(`missing ${f}`)) : ok(`${slugs.length} entries, all with a still and a clip`);
  const orphans = [...fs.readdirSync(SHOTS), ...fs.readdirSync(CLIPS)].filter(f => !f.startsWith('.') && !slugs.includes(f.replace(/\.(jpg|mp4)$/, '')));
  orphans.length ? orphans.forEach(f => warn(`orphan file ${f} (no tile uses it)`)) : ok('no orphan files');
  const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  dupes.forEach(s => warn(`${s} appears twice`));
  for (const f of fs.readdirSync(CLIPS).filter(f => f.endsWith('.mp4'))) {
    const kb = fs.statSync(path.join(CLIPS, f)).size / 1024;
    if (kb > 1200) warn(`clips/${f} is ${kb.toFixed(0)} KB (keep loops under ~800 KB)`);
  }

  console.log('Clips smooth');
  let rough = 0;
  for (const f of fs.readdirSync(CLIPS).filter(f => f.endsWith('.mp4'))) {
    const { issues } = analyse(path.join(CLIPS, f));
    if (issues.length) { rough++; warn(`clips/${f}: ${issues.length > 3 ? issues.length + ' issues, e.g. ' : ''}${issues.slice(0, 3).join('; ')}`); }
  }
  if (!rough) ok('no stutters or loop jumps (details: node tools/smooth.mjs)');

  console.log('Clips play');
  const results = await page.$$eval('video.loop', vs => Promise.all(vs.map(v => new Promise(res => {
    const t = setTimeout(() => res([v.dataset.src, 'timeout']), 8000);
    v.addEventListener('playing', () => { clearTimeout(t); res([v.dataset.src, 'ok']); }, { once: true });
    v.addEventListener('error', () => { clearTimeout(t); res([v.dataset.src, 'error']); }, { once: true });
    v.src = v.dataset.src; v.play().catch(() => {});
  }))));
  const bad = results.filter(([, r]) => r !== 'ok');
  bad.length ? bad.forEach(([s, r]) => warn(`${s}: ${r}`)) : ok(`all ${results.length} clips play`);

  console.log('Layout');
  for (const w of [1440, 900, 390]) {
    await page.setViewportSize({ width: w, height: w > 600 ? 900 : 844 });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      // Mark every grid cell each tile covers; any unmarked cell is a hole.
      const holes = [...document.querySelectorAll('.gallery')].filter(g => {
        const cs = getComputedStyle(g), gr = g.getBoundingClientRect();
        const starts = (tracks, gap, origin) => { let a = origin; return tracks.split(' ').map(parseFloat).map(t => { const s = a; a += t + gap; return [s, s + t]; }); };
        const cols = starts(cs.gridTemplateColumns, parseFloat(cs.columnGap) || 0, gr.left);
        const rows = starts(cs.gridTemplateRows, parseFloat(cs.rowGap) || 0, gr.top);
        const filled = rows.map(() => cols.map(() => false));
        for (const c of g.children) {
          const k = c.getBoundingClientRect();
          rows.forEach(([t, b], i) => cols.forEach(([l, r], j) => {
            if (k.left < (l + r) / 2 && k.right > (l + r) / 2 && k.top < (t + b) / 2 && k.bottom > (t + b) / 2) filled[i][j] = true;
          }));
        }
        return filled.flat().includes(false);
      }).map(g => g.id);
      return { scroll: document.documentElement.scrollWidth > innerWidth, holes };
    });
    r.scroll ? warn(`${w}px: horizontal scroll`) : ok(`${w}px: no horizontal scroll`);
    r.holes.length ? warn(`${w}px: empty grid cells in #${r.holes.join(', #')} (rebalance wide/full tiles)`) : ok(`${w}px: no empty grid cells`);
    await page.screenshot({ path: path.join(out, `check-${w}.png`), fullPage: true });
  }
  errors.length ? errors.forEach(e => warn(`page error: ${e}`)) : ok('no page errors');

  if (process.argv.includes('--live')) {
    console.log('Live links');
    for (const s of slugs) {
      const res = await fetch(`${SITE}/${s}/`, { method: 'HEAD' }).catch(() => ({ status: 'fetch failed' }));
      res.status === 200 ? ok(`${s}`) : warn(`${SITE}/${s}/ → ${res.status}`);
    }
  }
} finally {
  await browser.close(); server.close();
}
console.log(problems.length ? `\n${problems.length} problem(s).` : '\nAll good. Screenshots: .out/check-1440.png, check-900.png, check-390.png');
process.exit(problems.length ? 1 : 0);
