// Lurching Llama (hero): Quick Race, the pack of 8 llamas on the first spinning-sweeper platform.
// Still: fast-forward with the game's window.__game.advance() test hook to race time ~6.5s.
// Clip: reload and race for real (hold W) so the loop shows real-time motion from ~4s to ~8s.
import { SITE } from '../lib.mjs';

const URL = `${SITE}/lurching-llama/`;
// #keys = controls legend; #toast = WHOOPS!/CHECKPOINT! banners that would cover the pack.
const hideKeys = page => page.addStyleTag({ content: '#keys,#toast{display:none!important}' });
let shot = false;

export default {
  url: URL,
  async setup(page) {
    await page.waitForFunction(() => window.__game);
    await page.waitForTimeout(2000);
  },
  async beforeShot(page) {
    shot = true;
    await page.click('#play'); await page.waitForTimeout(500);
    await page.evaluate(() => window.__game.advance(9.5));          // intro flyover + countdown
    await hideKeys(page);
    await page.evaluate(() => window.__game.advance(4.4, () => ({ x: 0, z: 1, moveLen: 1, jump: false, jumpHeld: false, duck: false })));
    await page.evaluate(() => window.__game.advance(0.5, t => ({ x: 0, z: 1, moveLen: 1, jump: (t % 1.5) < 0.05, jumpHeld: (t % 1.5) < 0.4, duck: false })));
    await page.waitForTimeout(1200);
  },
  async beforeClip(page) {
    if (shot) { await page.goto(URL, { waitUntil: 'load' }); await page.waitForFunction(() => window.__game); await page.waitForTimeout(2000); }
    await hideKeys(page);
    await page.click('#play'); await page.waitForTimeout(500);
    await page.click('#intro');                                     // skip the flyover
    await page.waitForFunction(() => window.__game.game.state === 'racing', null, { timeout: 10000 });
    await page.keyboard.down('w');
    await page.waitForFunction(() => window.__game.game.raceT > 4.1, null, { timeout: 15000 });
  },
  shot: { quality: 82 },
  clip: { seconds: 4, crossfade: true },
};
