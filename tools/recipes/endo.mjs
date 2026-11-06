// ENDO!: still = mid-air off the boulevard kicker, spinning; loop = speeding down the boulevard,
// air off the kicker gap, a stoppie + pivot endo under the ENDO! sign, then riding away.
// Driven through the game's window.__endo debug hook (input flags), controls hint hidden.
import { SITE } from '../lib.mjs';

const key = (page, k, d) => page.evaluate(([k, d]) => { window.__endo.input[k] = d; }, [k, d]);
const release = page => page.evaluate(() => { const i = window.__endo.input; for (const k in i) i[k] = false; });

export default {
  url: `${SITE}/endo/`,
  async setup(page) {
    await page.waitForFunction(() => window.__endo);
    await page.addStyleTag({ content: '#hint{display:none!important}' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__endo.start());
    await page.waitForTimeout(600);
  },
  async beforeShot(page) {
    await key(page, 'pedal', true);
    await page.waitForFunction(() => window.__endo.bk.z > -12, null, { polling: 16 });
    await page.evaluate(() => { window.__endo.input.hop = true; });
    await page.waitForFunction(() => window.__endo.bk.air, null, { polling: 16 });
    await key(page, 'pedal', false); await key(page, 'left', true);
    await page.waitForFunction(() => window.__endo.bk.z > -4 || !window.__endo.bk.air, null, { polling: 16 }); // over the gap, mid-spin
  },
  async beforeClip(page) {
    await release(page);
    await page.evaluate(() => window.__endo.newRun());   // back to the spawn, fresh clock
    await page.waitForTimeout(800);
    await key(page, 'pedal', true);
    await page.waitForFunction(() => window.__endo.bk.z > -21.5, null, { polling: 16 });
    // The rest of the line plays out on game time while recordStepped() runs: freeze the virtual clock, then
    // schedule the inputs with in-page timers (Node-side waits would be real time, not game time).
    await page.evaluate(() => {
      window.__vclock.freeze();
      const i = window.__endo.input, at = (ms, f) => setTimeout(f, ms);
      at(2100, () => { i.pedal = false; i.brake = true; });
      at(2350, () => { i.right = true; });
      at(3350, () => { i.right = false; i.lean = true; });
      at(3700, () => { i.lean = false; i.brake = false; i.pedal = true; });
    });
  },
  shot: { quality: 82 },
  clip: { seconds: 4, crossfade: true },
};
