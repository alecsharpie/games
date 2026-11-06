// Co-op (Lighthouse & Navigator TV board, bay 6 of 6 "The Long Night": currents, floes, fog, reefs, buoys and sonar).
// Still: turn 4, the keeper has lit the water by the harbour (a floe shows in the beam), with the buoys dropped and
// the wake from the last sail. Clip: the final sail: the currents sweep the boat south and east into the harbour,
// with the toasts. It stops before the "Home safe" card.
// The board is the captured page; the two phone hands are extra pages in the same context, talking to it over
// BroadcastChannel (?net=local), and every move goes through their real UI. The save is seeded so bays 1-5 are
// done and the how-to cards are already seen; the bay is picked from the board's own Bays menu.
// Route (checked with lighthouse/game.js): EEE, ping + SS, SEE, then S E E into the harbour, no damage.
// The room code and connection chips are hidden (a code in a still would point at a dead room).
// Stepped clip: the boat and floes glide with CSS transitions, which the virtual clock doesn't drive, so beforeClip
// wraps __vclock.step to pin every CSS animation to game time. The sail is sent from the navigator's phone page at
// frame 0 (so both ends of the loop read "Sailing…"), and beforeFrame waits for the board to pick it up so it lands on game time.
// The loop wraps with a quick dip through dark (transition 'fadeblack'), not a dissolve: a dissolve shows two boats and
// two toasts at once, and a plain cut from the harbour back to the start is too big a jump for smooth.mjs.
import { SITE } from '../lib.mjs';

const B = `${SITE}/co-op/lighthouse/`, ROOM = 'SHOTL';
const hands = {};

const SAVE = { level: 5, unlocked: 5, mode: 'talk', game: null, log: [], lobby: true, stars: { 0: 3, 1: 3, 2: 2, 3: 3, 4: 2 } };
const SEEN = ['lighthouse-board', 'lighthouse-keeper', 'lighthouse-navigator'];

const tap = (r, sel) => hands[r].evaluate(sel => {
  const el = document.querySelector(sel);
  if (!el || el.closest('[disabled]')) throw new Error('co-op: cannot click ' + sel);
  el.click();
}, sel);
const tile = (r, x, y) => tap(r, `.t[data-x="${x}"][data-y="${y}"]`);
const text = r => hands[r].evaluate(() => document.body.innerText);
async function until(r, re, what) {
  for (let i = 0; i < 80; i++) { if (re.test(await text(r))) return; await hands[r].waitForTimeout(250); }
  throw new Error(`co-op: ${r} never got to ${what}`);
}
async function lamp(aim, buoy) {
  await until('keeper', /Your turn/, 'its turn');
  if (buoy) { await tap('keeper', '[data-act="tool:buoy"]'); await tile('keeper', buoy.x, buoy.y); await tap('keeper', '[data-act="tool:lamp"]'); }
  await tile('keeper', aim.x, aim.y);
  await tap('keeper', '[data-act="light"]');
}
async function plot(moves, { ping = false } = {}) {
  await until('navigator', /Your turn/, 'its turn');
  if (ping) { await tap('navigator', '[data-act="ping"]'); await hands.navigator.waitForTimeout(300); }
  for (const m of moves) await tap('navigator', `[data-act="move:${m}"]`);
}
const sail = () => tap('navigator', '[data-act="sail"]');
const turn = async (aim, buoy, moves, opts) => { await lamp(aim, buoy); await plot(moves, opts); await sail(); };

export default {
  url: null,
  async setup(board, { context }) {
    await board.addInitScript(([key, save, seen]) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', 1);
      localStorage.setItem(key, JSON.stringify(save));
      for (const k of seen) localStorage.setItem('coop-help-seen:' + k, '1');
    }, [`coop-lighthouse-${ROOM}`, SAVE, SEEN]);
    await board.goto(`${B}board.html?net=local&room=${ROOM}`, { waitUntil: 'load' });
    await board.addStyleTag({ content: '#room,#net{display:none!important}' });
    await board.waitForTimeout(1000);
    for (const r of ['keeper', 'navigator']) {
      const h = await context.newPage(); await h.setViewportSize({ width: 390, height: 844 });
      await h.goto(`${B}hand.html?net=local&room=${ROOM}&cid=shot-${r}&want=${r}`, { waitUntil: 'load' });
      hands[r] = h;
    }
    await until('keeper', /Start/, 'the lobby');
    await tap('keeper', '[data-act="start"]');           // starts bay 1 (no game in the save yet)...
    await board.waitForTimeout(800);
    await board.click('#bays');                           // ...so pick The Long Night from the board's menu
    await board.click('[data-act="bay:5"]');
    await board.waitForTimeout(800);
    await turn({ x: 4, y: 2 }, null, ['E', 'E', 'E']);                              // the currents carry it along the top
    await turn({ x: 6, y: 3 }, { x: 6, y: 5 }, ['S', 'S'], { ping: true });         // sonar into the fog bank
    await turn({ x: 8, y: 5 }, { x: 10, y: 6 }, ['S', 'E', 'E']);                   // through the fog
    await lamp({ x: 10, y: 5 });                                                    // light the harbour mouth: a floe shows
    await plot(['S', 'E', 'E']);
    await board.bringToFront();
    await board.waitForTimeout(1500);
  },
  async beforeClip(board) {
    // Pin CSS transitions/animations to the virtual clock: each step, every animation shows game time since it began.
    await board.evaluate(() => {
      window.__vclock.freeze();
      const step = window.__vclock.step;
      window.__vclock.step = ms => {
        step(ms);
        const now = performance.now();
        for (const a of document.getAnimations()) {
          if (a.__t0 == null) { a.__t0 = now; a.pause(); }
          const t = now - a.__t0, end = a.effect?.getComputedTiming().endTime;
          if (Number.isFinite(end) && t >= end) a.finish(); else a.currentTime = t;
        }
      };
    });
  },
  shot: { quality: 82 },
  clip: {
    seconds: 3.25, crossfade: true, fade: 0.5, transition: 'fadeblack',   // the "Home safe" card pops at 3.3s
    async beforeFrame(board, i) {
      if (i !== 0) return;
      await sail();
      await board.waitForFunction(() => /Sailing/.test(document.getElementById('banner').innerText), null, { polling: 50, timeout: 5000 });
    },
  },
};
