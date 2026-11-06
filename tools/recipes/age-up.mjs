// Age Up: a 1v1 skirmish vs the computer ~20 minutes in, a built-up Castle Age town with villagers working.
// My seat is handed to the game's own AI (dbg.ai) and fast-forwarded with dbg.ff, then everything runs at
// normal speed for the still and the loop.
import { SITE } from '../lib.mjs';

export default {
  url: `${SITE}/age-up/`,
  async setup(page) {
    await page.waitForFunction(() => !!window.dbg, null, { timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.evaluate(() => { dbg.start(11, 2, { players: 2 }); dbg.ai(0, true); });
    for (let m = 0; m < 20; m++) await page.evaluate(() => dbg.ff(60));
    await page.evaluate(() => {
      const th = G.buildings.find(b => b.team === ME && b.type === 'townhall');
      const c = center(th); cam.zoom = 0.8; centerOn(c.x + 1, c.y + 1); setSel([th]);
    });
    await page.waitForTimeout(1500);
  },
  shot: { quality: 82 },
  clip: { seconds: 4, crossfade: true, width: 960 },   // wide tile
};
