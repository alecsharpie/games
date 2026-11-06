// Capture a game's gallery still and/or hover loop from its recipe.
//   node tools/capture.mjs <slug> [--shot] [--clip] [--raw] [--headed]
// With neither --shot nor --clip, does both. Writes shots/<slug>.jpg and clips/<slug>.mp4,
// plus .out/<slug>-sheet.png (4 frames of the clip) to check with the Read tool.
// Clips are recorded frame by frame on a frozen game clock (see VCLOCK in lib.mjs), so they can't stutter.
// --raw keeps the un-looped recording at .out/<slug>-raw.mp4 so a better moment can be trimmed from it.
import fs from 'node:fs'; import path from 'node:path';
import { ROOT, SHOTS, CLIPS, VCLOCK, launch, shoot, record, recordStepped, crossfade, sheet } from './lib.mjs';

const args = process.argv.slice(2);
const slug = args.find(a => !a.startsWith('--'));
const has = f => args.includes(f);
if (!slug) { console.error('usage: node tools/capture.mjs <slug> [--shot] [--clip] [--raw] [--headed]'); process.exit(1); }
const file = path.join(ROOT, 'tools/recipes', `${slug}.mjs`);
if (!fs.existsSync(file)) { console.error(`no recipe: tools/recipes/${slug}.mjs (copy tools/recipes/_template.mjs)`); process.exit(1); }
const r = (await import(file)).default;
const doShot = has('--shot') || !has('--clip'), doClip = has('--clip') || !has('--shot');
const out = path.join(ROOT, '.out'); fs.mkdirSync(out, { recursive: true });

const browser = await launch({ headless: !has('--headed'), args: r.launchArgs || [] });
const context = await browser.newContext({ viewport: r.viewport || { width: 1600, height: 1000 }, ...(r.context || {}) });
await context.addInitScript(VCLOCK);   // idle until a stepped recording freezes the clock
const page = await context.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  if (r.url) await page.goto(r.url, { waitUntil: 'load' });
  if (r.setup) await r.setup(page, { context });

  if (doShot) {
    if (r.beforeShot) await r.beforeShot(page);
    await shoot(page, path.join(SHOTS, `${slug}.jpg`), r.shot || {});
  }
  if (doClip) {
    const c = { seconds: 4, crossfade: true, ...(r.clip || {}) };
    if (r.beforeClip) await r.beforeClip(page);
    const raw = path.join(out, `${slug}-raw.mp4`), dest = path.join(CLIPS, `${slug}.mp4`);
    // Stepped (frame-exact, stutter-free) by default; clip.realtime for games that the virtual clock can't drive.
    await (c.realtime ? record : recordStepped)(page, { out: raw, seconds: c.seconds, clip: c.crop, width: c.width || 960, ...(c.substeps ? { substeps: c.substeps } : {}) });
    if (c.crossfade) crossfade(raw, dest, c.fade || 0.6); else fs.copyFileSync(raw, dest);
    if (!has('--raw')) fs.rmSync(raw);
    sheet(dest, path.join(out, `${slug}-sheet.png`));
    console.log(`check: .out/${slug}-sheet.png`);
  }
} finally {
  if (errors.length) console.warn('page errors:', errors.slice(0, 5));
  await browser.close();
}
