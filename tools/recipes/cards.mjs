// Cards: a full deck scattered face-up on the felt; in the loop single cards get flipped and thrown across it, one at a time.
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
    await page.mouse.move(5, 995); // no hover highlight on a card
    await page.evaluate(() => { document.getElementById('btn-gather').parentElement.style.visibility = 'hidden'; });   // the button bar
  },
  async beforeClip(page) {
    // One card at a time, about every 0.3s: alternately a flip in place (what tapping a card does) and a throw that
    // sends it skimming and spinning back across the felt, aimed toward the middle so cards don't pile on the rails.
    // Freeze the virtual clock first so these timers (and the game's own physics) run on game time.
    await page.evaluate(() => {
      window.__vclock.freeze();
      const cx = innerWidth / 2, cy = innerHeight / 2;
      const pick = () => {
        const ok = cards.filter(c => c.flat && !c.held && Math.abs(c.p.x - cx) < innerWidth * 0.36 && Math.abs(c.p.y - cy) < innerHeight * 0.34);
        return ok[Math.floor(Math.random() * ok.length)];
      };
      for (let i = 0; i < 16; i++) setTimeout(() => {
        const c = pick(); if (!c) return;
        if (i % 2 === 0) { c.flipToss(); return; }
        const a = Math.random() * Math.PI * 2;
        c.flipFrom(c.p.x - Math.cos(a) * 70, c.p.y - Math.sin(a) * 70, 1.2 + Math.random() * 0.6);
        const dir = Math.atan2(cy - c.p.y, cx - c.p.x) + (Math.random() - 0.5) * 1.6, sp = 500 + Math.random() * 500;
        c.v.x += Math.cos(dir) * sp; c.v.y += Math.sin(dir) * sp; c.w.z += (Math.random() - 0.5) * 14;
      }, 60 + i * 290);
    });
  },
  shot: { quality: 82 },
  clip: { seconds: 4, crossfade: true, fade: 0.4 },   // a short dissolve: flying cards ghost in a long one
};
