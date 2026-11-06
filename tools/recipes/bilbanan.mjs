// Not Bilbanan: a four-car race on the default track — the cockatoo's AI (red) plus orange, blue and green on keys K, Z, M.
// The game's code is wrapped in an IIFE (no globals), so the key cars are driven by pulsing synthetic keydown/keyup
// inside the page, each at its own duty cycle (~40-55%) so they spread out and none flies off every corner.
// The phone join card (QR + live room code) is hidden: a code in a still would point at a dead room.
import { SITE } from '../lib.mjs';

export default {
  url: `${SITE}/bilbanan/`,
  async setup(page) {
    await page.waitForTimeout(2500);
    await page.addStyleTag({ content: '#phones,#full{display:none!important}' });
    await page.keyboard.press('Enter');             // the track is closed: open the hold-to-join lobby
    await page.waitForTimeout(300);
    for (const k of ['k', 'z', 'm']) await page.keyboard.down(k);
    await page.waitForTimeout(2200);                // everyone holding: orange, blue and green join
    await page.evaluate(() => {
      const ev = (t, key) => window.dispatchEvent(new KeyboardEvent(t, { key }));
      [['k', 5], ['z', 4], ['m', 5.5]].forEach(([key, on], i) => {
        let n = i * 3;
        setInterval(() => { n = (n + 1) % 10; ev(n < on ? 'keydown' : 'keyup', key); }, 6);
      });
    });
    for (const k of ['k', 'z', 'm']) await page.keyboard.up(k);
    await page.waitForTimeout(8500);                // a lap or so in, the field spread around the track
  },
  shot: { quality: 82 },
  clip: { seconds: 4, crossfade: true },
};
