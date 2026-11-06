// Jumping Jack: the Jumping Jacks mini-game mid-round, with an older man doing star jumps on a sunny lawn as the "webcam".
// Footage: Pexels 7299359 ("Elderly man doing jumping jacks outside", free Pexels licence, credited in the footer).
// It's downloaded and prepared on first run into tools/assets/private/ (gitignored): the portrait clip is centred
// on a blurred copy of itself to make a 16:9 camera image, all keyframes so seeking to any frame is instant.
//
// The camera is faked in the page rather than with Chrome's --use-fake-device flags: getUserMedia returns a canvas
// stream, and the game's drawImage(video) and pose detection are pointed at that canvas. Before the clip it plays in
// real time; during the stepped clip, beforeFrame seeks the footage to exactly the game time of each frame, so the
// man, his skeleton and the rep counter stay in step and the loop is smooth.
// The game: ?debug exposes window.__G; players=1 so the blurred background can't become a second player.
// Untick #fs before Start, or the requestFullscreen attempt leaves the frame zoomed into the top-left.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { SITE, ROOT, FFMPEG } from '../lib.mjs';

const SRC_URL = 'https://videos.pexels.com/video-files/7299359/7299359-uhd_1440_2560_30fps.mp4';
const DIR = path.join(ROOT, 'tools/assets/private');
const RAW = path.join(DIR, 'pexels-7299359.mp4'), CAM = path.join(DIR, 'jumpingjack-cam.mp4');
const START = 1.0;            // where in the footage the clip starts (s); needs ~4.5s after it

if (!fs.existsSync(CAM)) {
  fs.mkdirSync(DIR, { recursive: true });
  if (!fs.existsSync(RAW)) {
    const res = await fetch(SRC_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`download ${SRC_URL}: ${res.status}`);
    fs.writeFileSync(RAW, Buffer.from(await res.arrayBuffer()));
  }
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', RAW, '-filter_complex',
    '[0]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,boxblur=40:2,eq=brightness=-0.12[bg];' +
    '[0]scale=-2:720[fg];[bg][fg]overlay=(W-w)/2:0,fps=30',
    '-c:v', 'libx264', '-g', '1', '-crf', '18', '-pix_fmt', 'yuv420p', '-an', CAM]);
}

// Runs in the page before the game loads.
const FAKECAM = () => {
  const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
  const cx = canvas.getContext('2d'), src = document.createElement('video');
  src.muted = true; src.loop = true; src.playsInline = true;
  const cam = window.__fakecam = { canvas, src, n: 0, manual: false,
    draw() { cx.drawImage(src, 0, 0, 1280, 720); cam.n++; },
    // Show exactly time t of the footage (stepped clip).
    seek: t => new Promise(res => { src.addEventListener('seeked', () => { cam.draw(); res(); }, { once: true }); src.currentTime = t; }) };
  const ready = fetch('/jumpingjack/__fakecam.mp4').then(r => r.blob()).then(b => { src.src = URL.createObjectURL(b); return src.play(); });
  const tick = () => { if (!cam.manual && src.readyState >= 2) cam.draw(); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  navigator.mediaDevices.getUserMedia = async () => { await ready; return canvas.captureStream(30); };
  // The game draws and detects from <video id="cam">; hand it the canvas instead, and count our frames as its time.
  const drawImage = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) { return drawImage.call(this, img?.id === 'cam' ? canvas : img, ...a); };
  addEventListener('DOMContentLoaded', () => Object.defineProperty(document.getElementById('cam'), 'currentTime', { get: () => cam.n }));
};

export default {
  url: null,
  context: { permissions: ['camera'] },
  async setup(page) {
    await page.route('**/__fakecam.mp4', r => r.fulfill({ body: fs.readFileSync(CAM), contentType: 'video/mp4' }));
    await page.addInitScript(FAKECAM);
    await page.goto(`${SITE}/jumpingjack/?debug&players=1`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__G?.detector, null, { timeout: 60000 });
    await page.evaluate(() => {
      const d = __G.detector, detect = d.detectForVideo.bind(d);
      d.detectForVideo = (v, ts) => detect(__fakecam.canvas, ts);
    });
    await page.uncheck('#fs');
    await page.click('#start');
    await page.waitForFunction(() => __G.scene, null, { timeout: 20000 });
    await page.evaluate(() => { __G.go('jumpingjacks'); __G.debug = false; });
    await page.waitForTimeout(11000);   // 5.5s title + countdown, then a few reps on the counter
  },
  async beforeShot(page) {   // the star: arms up, feet out, skeleton gone yellow
    await page.waitForFunction(() => { const p = __G.scene.ps?.[0]; return p?.state === 'open' && p.armsUp && p.feetOut; }, null, { polling: 'raf', timeout: 10000 });
  },
  async beforeClip(page) {
    await page.evaluate(t => { __fakecam.manual = true; return __fakecam.seek(t); }, START);
  },
  shot: {},
  clip: {
    seconds: 4.2, crossfade: true,
    beforeFrame: (page, i) => page.evaluate(t => __fakecam.seek(t), START + i / 30),
  },
};
