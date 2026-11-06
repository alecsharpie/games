// The Courtyard: seed 11, day 34, sunny midsummer late morning, "Far bank" close-up camera.
// Uses courtyard.html directly (the /courtyard/ landing page is just an iframe wrapper) and the page's
// own test hooks: __reseed + __warp to fast-forward deterministically, __where(4) for the Far bank view.
import { SITE } from '../lib.mjs';

export default {
  url: `${SITE}/courtyard/courtyard.html?seed=11&t=0&pause`,
  async setup(page) {
    await page.waitForFunction(() => window.__warp);
    await page.evaluate(() => { window.__reseed(); window.__warp(1826.5); window.__where(4, 2); paused = false; });
    await page.waitForTimeout(2500);
  },
  shot: { quality: 82 },
  clip: { seconds: 4.5, crossfade: true },
};
