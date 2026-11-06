// Inkhold: a late endless-mode wave, a dense ink-drawn walled city with towers firing as the horde marches in.
// The game's own strategy bot (botBuild, policy "phased" = farm then fortify) builds the city and plays
// waves 1-19 headlessly (SIM mode, no drawing); wave 20 then runs live at 1x.
import { SITE } from '../lib.mjs';

const WAVES = 20;

export default {
  url: `${SITE}/inkhold/`,
  async setup(page) {
    await page.waitForTimeout(2000);
    const r = await page.evaluate(W => {
      const pol = POLICIES.phased;
      SIM = true; META.deck = [...pol.deck];
      for (let attempt = 0; attempt < 6 && (attempt === 0 || S.phase === 'dead'); attempt++) {  // the bot sometimes falls: new city
      newRun(0); S.maxWaves = 60; S.lastLoss = 0;
      while (S.phase !== 'dead' && S.wave < W) {
        botBuild(pol);
        let before = 0; for (const b of S.buildings.values()) before += b.hp;
        startWave(); let g = 0; while (S.phase === 'wave' && g++ < 30000) tick(1 / 30);
        let after = 0; for (const b of S.buildings.values()) after += b.hp;
        S.lastLoss = Math.max(0, 1 - after / Math.max(1, before));
      }
      }
      botBuild(pol);
      SIM = false;
      computeFields(); closePop(); renderTray(); renderHud(); hideOverlay();
      return [S.phase, S.wave, S.buildings.size].join(' ');
    }, WAVES);
    console.log('inkhold: phase/wave/buildings', r);
    if (!r.startsWith('build')) throw new Error(`inkhold: the bot's city fell in 6 tries (${r}); rerun`);
    await page.mouse.move(1595, 995); // no hover tooltip
    await page.evaluate(() => startWave());
    await page.waitForTimeout(6000);  // let the horde reach the walls
  },
  shot: { quality: 82 },
  clip: { seconds: 4, crossfade: true },
};
