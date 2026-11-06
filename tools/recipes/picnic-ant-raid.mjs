// Picnic Ant Raid: a small crowd of ants (~12-20) working into a watermelon slice, more on the way.
// Uses the game's window.__sim test hooks. The picnic's own watermelons sit at the far end of the cloth and the
// colony never reaches them, so the recipe drops a slice nearer the nest (the player's "drop fruit" action) a few
// seconds in, fast-forwards until the first scouts have brought a modest crowd (not the late-game swarm), and frames it.
// The clip plays at 1x: at 2x, small fast ants ghost visibly in the loop's crossfade. ?seed makes the layout repeatable,
// but the run isn't fully deterministic, so the recipe waits for the crowd rather than a fixed time.
// Capture the still and clip together (no --shot/--clip) so they show the same moment.
import { SITE } from '../lib.mjs';

const MELON = [50, 38];              // where the slice is dropped (between the picnic and the nest)
const CROWD = [12, 22];              // biting ants wanted on it
const CAM = [-15, 11, 15];           // camera offset from the slice's middle

export default {
  url: `${SITE}/picnic-ant-raid/?seed=3`,
  async setup(page) {
    await page.waitForFunction(() => window.__sim);
    await page.addStyleTag({ content: '#hud,#hint{display:none!important}' });
    await page.waitForTimeout(1500);
    const n = await page.evaluate(([melon, crowd, cam]) => {
      __sim.pause(); __sim.step(3);
      __sim.drop('watermelon', ...melon);
      const { ants, fruits, THREE } = __sim.internals;
      const slice = () => fruits.filter(f => f.alive && f.kind === 'watermelon').sort((a, b) =>
        Math.hypot(a.body.position.x - melon[0], a.body.position.z - melon[1]) - Math.hypot(b.body.position.x - melon[0], b.body.position.z - melon[1]))[0];
      const biting = f => { const q = f.body.position; return ants.filter(a => a.alive && a.state === 'bite' && Math.hypot(a.pos.x - q.x, a.pos.z - q.z) < 13).length; };
      __sim.step(25);
      let f = slice(), n = biting(f);
      for (let i = 0; i < 60 && !(n >= crowd[0] && n <= crowd[1]); i++) { __sim.step(1); f = slice(); n = biting(f); }
      const c = new THREE.Box3().setFromObject(f.mesh).getCenter(new THREE.Vector3());
      __sim.look(c.x + cam[0], c.y + cam[1], c.z + cam[2], c.x, c.y - 0.5, c.z);
      __sim.step(0.05);
      return n;
    }, [MELON, CROWD, CAM]);
    console.log(`framing the watermelon with ${n} ants biting`);
    await page.waitForTimeout(500);
  },
  async beforeClip(page) {
    await page.evaluate(() => document.querySelector('#speedSeg button[data-speed="1"]').click());
    await page.waitForTimeout(300);
  },
  shot: {},
  clip: { seconds: 4.6, crossfade: true, fade: 0.5, width: 960 },   // full-width tile
};
