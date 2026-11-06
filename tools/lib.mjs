// Shared capture helpers: a GPU browser, CDP screencast recording, seamless loops, stills.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SHOTS = path.join(ROOT, 'shots');
export const CLIPS = path.join(ROOT, 'clips');
export const SITE = 'https://www.alecsharpie.me';

const which = bin => ['/opt/homebrew/bin/', '/usr/local/bin/', '/usr/bin/'].map(d => d + bin).find(fs.existsSync) || bin;
export const FFMPEG = which('ffmpeg'), FFPROBE = which('ffprobe');
const ff = args => execFileSync(FFMPEG, ['-y', '-loglevel', 'error', ...args]);
const H264 = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '30', '-preset', 'veryslow', '-profile:v', 'high', '-movflags', '+faststart', '-an'];

// Real GPU WebGL on macOS; headless SwiftShader is too slow for most of these games.
export const GPU_ARGS = ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required',
  '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];
export const launch = (opts = {}) => chromium.launch({ ...opts, args: [...GPU_ARGS, ...(opts.args || [])] });

export const duration = mp4 => +execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]).toString().trim();
const kb = f => `${(fs.statSync(f).size / 1024).toFixed(0)} KB`;

// Gallery still: viewport JPEG (1600x1000 for most games, 1600x900 for TV party games), plus the WebPs the page serves.
export async function shoot(page, out, { clip = null, quality = 86 } = {}) {
  await page.screenshot({ path: out, type: 'jpeg', quality, ...(clip ? { clip } : {}) });
  console.log(`still ${path.relative(ROOT, out)}: ${kb(out)}`);
  webps(out);
}

// The page shows <slug>-960.webp in normal tiles and <slug>-1600.webp in wide tiles and the hero (srcset);
// the JPEG is the master and the og:image.
export const WEBP_WIDTHS = [960, 1600];
export function webps(jpg) {
  for (const w of WEBP_WIDTHS) {
    const out = jpg.replace(/\.jpg$/, `-${w}.webp`);
    ff(['-i', jpg, '-vf', `scale=${w}:-2:flags=lanczos`, '-c:v', 'libwebp', '-quality', '80', out]);
    console.log(`  ${path.relative(ROOT, out)}: ${kb(out)}`);
  }
}

// Record `seconds` of the page via CDP screencast (~60fps on GPU) to a silent H.264 mp4, scaled to `width`.
// clip: optional {x,y,width,height} in CSS px to crop to.
export async function record(page, { out, seconds = 4, clip = null, width = 720 }) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', f => {
    frames.push({ data: f.data, t: f.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  const vp = page.viewportSize();
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: vp.width, maxHeight: vp.height, everyNthFrame: 1 });
  await page.waitForTimeout(seconds * 1000 + 400);
  await cdp.send('Page.stopScreencast');
  await cdp.detach();
  if (!frames.length) throw new Error('no screencast frames (is the page visible and painting?)');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'loop-'));
  const end = frames[0].t + seconds;
  const kept = frames.filter(f => f.t <= end);
  const name = i => path.join(dir, `f${String(i).padStart(5, '0')}.jpg`);
  let list = '';
  kept.forEach((f, i) => {
    fs.writeFileSync(name(i), Buffer.from(f.data, 'base64'));
    const next = kept[i + 1] ? kept[i + 1].t : end;
    list += `file '${name(i)}'\nduration ${Math.max(0.001, next - f.t).toFixed(4)}\n`;
  });
  list += `file '${name(kept.length - 1)}'\n`;
  fs.writeFileSync(path.join(dir, 'list.txt'), list);
  const vf = [];
  if (clip) vf.push(`crop=${clip.width}:${clip.height}:${clip.x}:${clip.y}`);
  vf.push('fps=30', `scale=${width}:-2:flags=lanczos`);
  ff(['-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-vf', vf.join(','), ...H264, out]);
  fs.rmSync(dir, { recursive: true, force: true });
  const fps = +(kept.length / seconds).toFixed(1);
  console.log(`recorded ${out}: ${kept.length} frames (${fps} fps captured), ${kb(out)}`);
  if (fps < 20) console.warn(`  warning: only ${fps} fps captured; the loop will look choppy`);
  return { frames: kept.length, fps };
}

// Virtual clock, installed before the page loads (capture.mjs does this for every recipe). It does nothing until
// __vclock.freeze(); after that requestAnimationFrame, performance.now, Date.now, setTimeout and setInterval only move
// when __vclock.step(ms) is called. That lets recordStepped() render every frame at exactly 1/30s spacing however long
// the GPU or the screenshot takes, so clips never stutter. Real-time timers created before freeze() keep running in real
// time; CSS animations and Web Workers aren't affected.
export const VCLOCK = () => {
  const realNow = performance.now.bind(performance), realDateNow = Date.now, realRAF = requestAnimationFrame.bind(window);
  const realST = setTimeout.bind(window), realSI = setInterval.bind(window), realCT = clearTimeout.bind(window), realCI = clearInterval.bind(window);
  let frozen = false, vt = 0, dateOff = 0, nextId = 1e6, rafs = new Map(), timers = new Map();
  performance.now = () => frozen ? vt : realNow();
  Date.now = () => frozen ? Math.round(vt + dateOff) : realDateNow();
  window.requestAnimationFrame = cb => { if (!frozen) return realRAF(cb); const id = nextId++; rafs.set(id, cb); return id; };
  const realCAF = cancelAnimationFrame.bind(window);
  window.cancelAnimationFrame = id => { rafs.delete(id); realCAF(id); };
  window.setTimeout = (cb, ms = 0, ...a) => { if (!frozen) return realST(cb, ms, ...a); const id = nextId++; timers.set(id, { cb, at: vt + ms, a }); return id; };
  window.setInterval = (cb, ms = 0, ...a) => { if (!frozen) return realSI(cb, ms, ...a); const id = nextId++; timers.set(id, { cb, at: vt + Math.max(4, ms), every: Math.max(4, ms), a }); return id; };
  window.clearTimeout = id => { timers.delete(id); realCT(id); };
  window.clearInterval = id => { timers.delete(id); realCI(id); };
  window.__vclock = {
    freeze() { if (frozen) return; vt = realNow(); dateOff = realDateNow() - vt; frozen = true; },
    step(ms) {
      const end = vt + ms;
      for (;;) { // fire due timers in order up to the end of the step
        let next = null;
        for (const [id, t] of timers) if (t.at <= end && (!next || t.at < next[1].at)) next = [id, t];
        if (!next) break;
        const [id, t] = next; vt = Math.max(vt, t.at);
        if (t.every) t.at += t.every; else timers.delete(id);
        try { typeof t.cb === 'function' ? t.cb(...t.a) : 0; } catch (e) { console.error(e); }
      }
      vt = end;
      const due = [...rafs.values()]; rafs.clear();
      for (const cb of due) try { cb(vt); } catch (e) { console.error(e); }
    },
  };
};

// Stutter-free recording: freeze the page's clock, then render and screenshot one frame per 1/fps of game time.
// `substeps` runs extra animation frames between captured ones (games tuned for 60Hz behave better at 2).
// `beforeFrame(i)` runs before each frame is stepped, e.g. to feed the game a camera frame that matches game time.
export async function recordStepped(page, { out, seconds = 4, clip = null, width = 720, fps = 30, substeps = 2, beforeFrame = null }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'loop-'));
  const cdp = await page.context().newCDPSession(page);
  await page.evaluate(() => window.__vclock.freeze());
  const n = Math.round(seconds * fps), dt = 1000 / fps / substeps;
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    if (beforeFrame) await beforeFrame(i);
    await page.evaluate(([dt, k]) => { for (let j = 0; j < k; j++) window.__vclock.step(dt); }, [dt, substeps]);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
    fs.writeFileSync(path.join(dir, `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64'));
  }
  await cdp.detach();
  ff(['-framerate', String(fps), '-i', path.join(dir, 'f%05d.jpg'), '-vf', `scale=${width}:-2:flags=lanczos`, ...H264, out]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`recorded ${out}: ${n} stepped frames in ${((Date.now() - t0) / 1000).toFixed(0)}s, ${kb(out)}`);
  return { frames: n, fps };
}

// Seamless loop: the last `fade` seconds dissolve into the first, so the clip has no visible jump.
// Output is about (input length - fade). Skip this for text-heavy games (the dissolve looks ghosted).
export function crossfade(src, out, fade = 0.6) {
  const L = duration(src), off = (L - 2 * fade - 0.05).toFixed(3);
  if (L < 2 * fade + 1) throw new Error(`${src} is too short (${L}s) to crossfade`);
  const tmp = out.replace(/\.mp4$/, '.tmp.mp4');
  ff(['-i', src, '-i', src, '-filter_complex',
    `[0]trim=start=${fade},setpts=PTS-STARTPTS,fps=30,settb=1/30[a];[1]trim=end=${fade},setpts=PTS-STARTPTS,fps=30,settb=1/30[b];` +
    `[a][b]xfade=transition=fade:duration=${fade}:offset=${off},format=yuv420p[v]`, '-map', '[v]', ...H264, tmp]);
  fs.renameSync(tmp, out); // only replace the real clip once ffmpeg succeeded
  console.log(`looped ${path.relative(ROOT, out)}: ${duration(out).toFixed(2)}s, ${kb(out)}`);
}

// Cut `seconds` starting at `start` out of a longer recording (no re-capture needed to pick a better moment).
export function trim(src, out, start, seconds = 4) {
  ff(['-ss', String(start), '-i', src, '-t', String(seconds), ...H264, out]);
}

// Grab one frame from an mp4 (to eyeball a clip, or to build a contact sheet).
export function still(mp4, png, at = 2) {
  ff(['-ss', String(at), '-i', mp4, '-frames:v', '1', png]);
}

// 4 frames across the clip side by side, for a quick visual check with the Read tool.
export function sheet(mp4, png, n = 4) {
  const L = duration(mp4);
  ff(['-i', mp4, '-vf', `fps=${(n / L).toFixed(4)},scale=480:-2,tile=${n}x1`, '-frames:v', '1', png]);
}

// Party games (TV + phones): open dev.html with bot players and blow the TV iframe up to native 1600x900.
export async function partyRoom(page, slug, { players = 6, start = true } = {}) {
  await page.goto(`${SITE}/${slug}/dev.html?players=${players}&bots`, { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  await page.evaluate(() => { const a = document.getElementById('allbots'); if (a) { a.checked = true; a.dispatchEvent(new Event('change')); } });
  await page.waitForTimeout(2500);
  if (start) {
    const tv = page.frames().find(f => f.url().includes('index.html'));
    try { await tv.getByText(/start now/i).first().click({ timeout: 3000 }); } catch {}
  }
  await page.evaluate(() => {
    const f = document.querySelector('.tv iframe');
    Object.assign(f.style, { position: 'fixed', left: '0', top: '0', width: '1600px', height: '900px', transform: 'none', zIndex: 9999 });
  });
}
