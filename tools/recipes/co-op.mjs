// Co-op (Two-Keeper Garden board, season "First Morning"): day 2 playing out on the board, the toast
// stepping "Plans revealed!" -> "The cook picked the tomato from Bed 2" -> "...Bed 3".
// The board is the captured page; the two phone hands are extra pages in the same context, talking to it
// over BroadcastChannel (?net=local), and the recipe plays day 1 and plans day 2 through their real UI.
// clip.realtime + no crossfade: the board's playback is DOM/text driven by timers set before the freeze
// (stepping would not advance them), and a dissolve over text looks ghosted. The clip is mostly still
// with a few state changes; that is how the board plays.
import { SITE } from '../lib.mjs';

const B = `${SITE}/co-op/garden/`, ROOM = 'SHOTG';
const hands = {};
let readied = false;

const dismiss = async p => { for (let i = 0; i < 3; i++) { const b = p.getByRole('button', { name: /got it/i }); if (await b.count()) { try { await b.first().click({ timeout: 800 }); } catch {} } } };
const dismissAll = async board => { await dismiss(board); for (const h of Object.values(hands)) await dismiss(h); };
async function place(r, at, verb, opt) {
  const h = hands[r];
  await h.evaluate(at => document.querySelector(`[data-at="${at}"]`).click(), at);
  await h.waitForTimeout(200);
  const ok = await h.evaluate(([verb, opt]) => {
    const el = [...document.querySelectorAll('[data-pick]')].find(e => { const t = JSON.parse(e.dataset.pick); return t.verb === verb && (!opt || t.opt === opt); });
    if (el) el.click(); return !!el;
  }, [verb, opt]);
  if (!ok) throw new Error(`co-op: could not place ${r} ${at} ${verb} ${opt || ''}`);
  await h.waitForTimeout(150);
}
const ready = async () => { for (const r of ['grower', 'cook']) await hands[r].evaluate(() => document.querySelector('[data-act=ready]')?.click()); };
async function waitPlanning(r) { // until the hand is back to planning (day played out)
  for (let i = 0; i < 60; i++) {
    const t = await hands[r].evaluate(() => document.body.innerText);
    if (!/playing out|Locked in/.test(t) && /Ready/.test(t)) return;
    await hands[r].waitForTimeout(500);
  }
  throw new Error('co-op: day 1 never finished playing out');
}

export default {
  url: `${B}board.html?net=local&room=${ROOM}`,
  async setup(board, { context }) {
    await board.waitForTimeout(1500);
    for (const r of ['grower', 'cook']) {
      const h = await context.newPage(); await h.setViewportSize({ width: 390, height: 844 });
      await h.goto(`${B}hand.html?net=local&room=${ROOM}&cid=shot-${r}&want=${r}`, { waitUntil: 'load' });
      hands[r] = h;
    }
    await board.waitForTimeout(2000);
    await dismissAll(board);
    for (const r of ['grower', 'cook']) { const s = hands[r].locator('[data-act=start]'); if (await s.count()) { await s.first().click(); break; } }
    await board.waitForTimeout(1500);
    await dismissAll(board);
    // Day 1 (the guided tutorial day): water the tomato, plant + water herbs; pick herbs, cook tea, serve.
    await place('grower', 'b1', 'water'); await place('grower', 'b2', 'plant', 'herb'); await place('grower', 'b2', 'water');
    await place('cook', 'b0', 'harvest'); await place('cook', 'stove', 'cook', 'tea'); await place('cook', 'counter', 'serve');
    await ready(); await board.waitForTimeout(300); await dismiss(board);
    for (const r of ['grower', 'cook']) await waitPlanning(r);
    await dismissAll(board);
    // Day 2 plans: the cook picks the ripe tomato and herbs and makes a salad.
    await place('grower', 'b1', 'plant', 'tomato'); await place('grower', 'b2', 'plant', 'herb'); await place('grower', 'b2', 'water');
    await place('cook', 'b1', 'harvest'); await place('cook', 'b2', 'harvest'); await place('cook', 'stove', 'cook', 'salad');
    await board.bringToFront();   // screencast only paints the front page
  },
  async beforeShot(board) {
    readied = true;
    await ready(); await board.waitForTimeout(2500);   // "The cook picked the tomato from Bed 2"
  },
  async beforeClip(board) {
    if (!readied) { await ready(); await board.waitForTimeout(1700); }
  },
  shot: { quality: 82 },
  clip: { seconds: 4, crossfade: false, realtime: true },
};
