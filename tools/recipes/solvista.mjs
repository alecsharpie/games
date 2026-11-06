// Solvista: seed 1 grown to ~2024, every card hidden, zoomed 1.5x on the downtown towers, monorail,
// beach and Ferris-wheel pier. The loop runs at 2x so the city visibly grows, with a slow ~60px camera
// drift; season and time of day are pinned with the page's __setYear/__setTime hooks so the light
// doesn't shift during the clip. Heavy scene: captures at ~28 fps, so it's encoded at 800px.
import { SITE } from '../lib.mjs';

export default {
  url: `${SITE}/solvista/solvista.html?seed=1&warp=49.6`,
  async setup(page) {
    await page.waitForFunction(() => window.__census);
    await page.addStyleTag({ content: '.card,.hint,.stats,#tip,.tip,.tooltip{display:none!important}' });
    await page.evaluate(() => {
      zoomAt(1310, 700, 1.5); speed = 2;
      const Y = 2024.35, D = dayT; (function pin() { __setYear(Y); __setTime(D); requestAnimationFrame(pin); })();
    });
    await page.mouse.move(1599, 999);
    await page.waitForTimeout(1500);
  },
  async beforeClip(page) {
    await page.evaluate(() => {
      let last = performance.now();
      const go = t => { const d = (t - last) / 1000; last = t; offX += 14 * d; requestAnimationFrame(go); };
      requestAnimationFrame(go);
    });
  },
  shot: { quality: 82 },
  clip: { seconds: 4.5, crossfade: true, width: 800 },
};
