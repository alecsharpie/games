// Lurching Llama (hero): Quick Race, the pack of 8 llamas on the first spinning-sweeper platform, the player hopping the bar.
// Still: fast-forward with the game's window.__game.advance() test hook until the player is mid-hop over
// the sweeper's red bar (race time ~5.8s), then freeze the clock.
// Clip: reload and race for real so the loop shows real-time motion from ~4s to ~8s.
import { SITE } from '../lib.mjs';

const URL = `${SITE}/lurching-llama/`;
// #keys = controls legend; #toast = WHOOPS!/CHECKPOINT! banners that would cover the pack.
const hideKeys = page => page.addStyleTag({ content: '#keys,#toast{display:none!important}' });
// Autopilot for the player's llama, so the hero runs the course like a good player instead of holding W into the
// sweeper hub. On the first sweeper disk it curves round the right of the post, hops the low red bar and ducks the
// high blue one; everywhere else the game's own bot AI drives (with its random mid-race pauses turned off).
// Bar timing: time until the bar first touches us, from its angular speed relative to ours (near the post our own
// motion swings our angle about as fast as the bar turns). Jumping 0.22s ahead was clean in 10/10 headless runs.
const autopilot = page => page.evaluate(() => {
  const g = window.__game, p = g.player(), update = p.update.bind(p);
  const SIDE = 4.5, JUMP = 0.22, DUCK = 0.3;
  const sw = g.course.obstacles.filter(o => o.kind === 'sweeper' && o.c.z === 29), red = sw.find(o => o.low), blue = sw.find(o => !o.low);
  const contact = o => {
    const dx = p.pos.x - o.c.x, dz = p.pos.z - o.c.z, r = Math.hypot(dx, dz);
    if (r > o.len + 2) return 9;
    const sg = Math.sign(o.omega), th = Math.atan2(-dz, dx);
    const rel = Math.abs(o.omega) - sg * (dz * p.vel.x - dx * p.vel.z) / (r * r);
    let d = ((th - o.angle) * sg) % Math.PI; if (d < 0) d += Math.PI;
    const w = Math.min(1, 0.8 / Math.max(r, 0.8));
    return rel > 0.05 ? (d - w) / rel : rel < -0.05 ? (Math.PI - d - w) / -rel : 9;
  };
  p.bot = { wp: 0, lane: 0, baseSkill: 1, skill: 1, think: 0, hold: false, stuck: 0, lastZ: 0, pause: 0 };
  p.update = (dt, inp, t) => {
    if (g.game.state === 'racing' && !p.finished) {
      inp = g.botInput(p, dt); p.bot.pause = 0;
      if (p.pos.z > 15 && p.pos.z < 41) {
        const tx = p.pos.z < 34 ? SIDE : 0;
        let ix = tx - p.pos.x, iz = 5; const l = Math.hypot(ix, iz); ix /= l; iz /= l;
        ix += p.lean.x * 1.7 + p.leanVel.x * 0.25; iz += p.lean.y * 1.7 + p.leanVel.y * 0.25;   // balance like the bots
        const m = Math.hypot(ix, iz); if (m > 1) { ix /= m; iz /= m; }
        const tr = contact(red);
        inp = { x: ix, z: iz, moveLen: Math.min(1, m), jump: p.grounded && tr < JUMP, jumpHeld: tr < JUMP + 0.3, duck: contact(blue) < DUCK };
      }
    }
    return update(dt, inp, t);
  };
});
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
    await autopilot(page);
    await page.evaluate(() => window.__game.advance(9.5));          // intro flyover + countdown
    await hideKeys(page);
    await page.evaluate(() => {   // on to the hop over the red bar, at the top of the jump
      const g = window.__game, p = g.player();
      g.advance(3.5);
      for (let i = 0; i < 300 && !(p.pos.z > 15 && !p.grounded && p.vel.y < 0.5); i++) g.advance(1 / 60);
    });
    // Freeze the clock and render a few frames on game time: the altiplano scenery renders slowly, and on real time
    // the race runs on (with the player standing still) while the screenshot waits for a frame.
    await page.evaluate(() => { window.__vclock.freeze(); for (let i = 0; i < 6; i++) window.__vclock.step(1000 / 60); });
    await page.waitForTimeout(1500);
  },
  async beforeClip(page) {
    if (shot) { await page.goto(URL, { waitUntil: 'load' }); await page.waitForFunction(() => window.__game); await page.waitForTimeout(2000); }
    await hideKeys(page);
    await page.click('#play'); await page.waitForTimeout(500);
    await autopilot(page);
    await page.click('#intro');                                     // skip the flyover
    await page.waitForFunction(() => window.__game.game.state === 'racing', null, { timeout: 10000 });
    await page.waitForFunction(() => window.__game.game.raceT > 4.1, null, { timeout: 15000 });
  },
  shot: { quality: 82 },
  clip: { seconds: 4, crossfade: true, width: 960 },   // the featured hero
};
