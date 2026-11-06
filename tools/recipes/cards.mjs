// Cards: a full deck scattered face-up on the felt; the loop flips them all then scatters them again.
import { SITE } from '../lib.mjs';

export default {
  url: `${SITE}/cards/`,
  async setup(page) {
    await page.waitForTimeout(2500);
    await page.click('#btn-shuffle'); await page.waitForTimeout(3000);
    await page.click('#btn-scatter'); await page.waitForTimeout(8000);
    // Turn most face-down cards up with the game's own flip (what tapping a card does).
    await page.evaluate(() => cards.forEach(c => { if (!c.faceUp && c.flat && Math.random() < 0.82) c.flipToss(); }));
    await page.waitForTimeout(5000);
    await page.mouse.move(5, 995); // no hover highlight on a card or button
  },
  async beforeClip(page) {
    // Kick off motion right as recording starts: Flip all at 0.15s, Scatter at 1.2s, Flip all again at 2.6s,
    // so the table never comes fully to rest (smooth.mjs flags still frames as freezes). Freeze the virtual
    // clock first so these timers (and the game's own per-card setTimeouts) run on game time.
    await page.evaluate(() => {
      window.__vclock.freeze();
      setTimeout(() => document.getElementById('btn-flipall').click(), 150);
      setTimeout(() => document.getElementById('btn-scatter').click(), 1200);
      setTimeout(() => document.getElementById('btn-flipall').click(), 2600);
    });
  },
  shot: { quality: 82 },
  clip: { seconds: 4, crossfade: true },
};
