// Recipe for `node tools/capture.mjs <slug>`. Copy to tools/recipes/<slug>.mjs.
// Goal: get the game to its most alive, most legible moment — real play, no menus, title cards or hint overlays.
// Prefer the live site (SITE/<slug>/); point at http://localhost:... when the game isn't deployed yet.
import { SITE } from '../lib.mjs';

export default {
  url: `${SITE}/my-game/`,
  viewport: { width: 1600, height: 1000 },     // 1600x900 for TV party games
  // context: { permissions: ['camera'] },     // extra browser.newContext() options
  // launchArgs: ['--use-file-for-fake-video-capture=...'],  // extra Chromium flags for this game
  async setup(page) {
    // Click past the title screen, press keys, use the game's own debug hooks (window.game, ?debug, fast-forward)
    // to reach a busy moment. Hide hint overlays so the still is clean.
    await page.waitForTimeout(3000);
  },
  // async beforeShot(page) {},                // optional: stage the still
  // async beforeClip(page) {},                // optional: start motion (e.g. hold a key) right before recording
  shot: {},                                    // { clip: {x,y,width,height} } to crop, { quality }
  clip: { seconds: 4, crossfade: true },       // crossfade:false for text/UI-heavy games; { crop } for a region
};
