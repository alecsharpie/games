// Picnic Ant Raid: the colony swarming an orange by the nest, ants in the trail behind it, the picnic cloth around.
// Uses the game's window.__sim test hooks: fast-forward ~5 min of simulation (eating is slow and realistic now: scouts
// first, then a crowd working one wound), find the fruit with the most biting ants and frame it from the picnic side.
// The clip plays at 1x: at 2x, hundreds of small fast ants ghost visibly in the loop's crossfade. ?seed makes the layout repeatable, but the run
// isn't fully deterministic, so the camera follows whichever fruit is busiest (20+ ants biting) rather than a fixed spot.
// Capture the still and clip together (no --shot/--clip) so they show the same moment.
import { SITE } from '../lib.mjs';

const T = 320;                        // seconds of sim time to fast-forward
const CAM = [-15, 9, 15];             // camera offset from the fruit

export default {
  url: `${SITE}/picnic-ant-raid/?seed=3`,
  async setup(page) {
    await page.waitForFunction(() => window.__sim);
    await page.addStyleTag({ content: '#hud,#hint{display:none!important}' });
    await page.waitForTimeout(1500);
    await page.evaluate(T => { __sim.pause(); while (__sim.t < T) __sim.step(5); }, T);
    // keep going (up to ~4 more minutes) until some fruit has a real crowd on it
    const n = await page.evaluate(cam => {
      const busiest = () => {
        const { ants, fruits } = __sim.internals;
        const biting = ants.filter(a => a.alive && a.state === 'bite');
        let best = null;
        for (const f of fruits) {
          if (!f.alive) continue;
          const q = f.body.position, n = biting.filter(a => Math.hypot(a.pos.x - q.x, a.pos.z - q.z) < 6).length;
          if (!best || n > best.n) best = { n, q };
        }
        return best;
      };
      let best = busiest();
      for (let i = 0; i < 48 && best.n < 20; i++) { __sim.step(5); best = busiest(); }
      const { q } = best;
      __sim.look(q.x + cam[0], q.y + cam[1], q.z + cam[2], q.x, q.y - 0.5, q.z);
      __sim.step(0.05);
      return best.n;
    }, CAM);
    console.log(`framing a fruit with ${n} ants biting`);
    await page.waitForTimeout(500);
  },
  async beforeClip(page) {
    await page.evaluate(() => document.querySelector('#speedSeg button[data-speed="1"]').click());
    await page.waitForTimeout(300);
  },
  shot: {},
  clip: { seconds: 4.6, crossfade: true, fade: 0.5 },
};
