// Wayword: today's daily journey with a few words already on the trail; the loop types one more word
// letter by letter and plays it onto the trail. The in-browser model loads in ~12-15s.
// The puzzle changes daily, so the words come from today's puzzle: the longest of the judge's routes
// (route + alts, read from the game's saved state in localStorage), playing up to 3 of its interior words
// in setup and typing the next one in the clip. Each is a judge-approved step from the one before.
// clip.realtime + no crossfade: typing is driven from Node in real time and the judge runs in a Worker
// (not on the page's frozen clock); a dissolve over text looks ghosted.
import { SITE } from '../lib.mjs';

let words = [];
const play = async (page, w) => {
  await page.fill('#guess', w); await page.press('#guess', 'Enter');
  await page.waitForFunction(() => !document.getElementById('guess-form').classList.contains('judging'), null, { timeout: 30000 });
  await page.waitForTimeout(1200);
};

export default {
  url: `${SITE}/wayword/`,
  async setup(page) {
    await page.waitForSelector('#loading.hidden', { state: 'attached', timeout: 180000 });
    await page.waitForTimeout(500);
    await page.evaluate(() => document.getElementById('modal').classList.add('hidden'));   // how-to-play
    const g = await page.evaluate(() => JSON.parse(localStorage.getItem('wayword.game.v2')));
    const routes = [g.route, ...(g.alts || []).map(a => a.route || a)].filter(Array.isArray);
    const best = routes.map(r => r.slice(1, -1)).sort((a, b) => b.length - a.length)[0] || [];
    if (best.length < 2) throw new Error(`wayword: today's routes are too short (${JSON.stringify(routes)})`);
    words = best.slice(0, 4);   // a prefix of a judge route is still a valid chain; 4 keeps the trail on screen
    console.log(`wayword: ${g.start} -> ${g.target}, playing ${words.join(', ')}`);
    for (const w of words.slice(0, -1)) await play(page, w);
    await page.click('#guess');
    await page.waitForTimeout(800);
  },
  async beforeClip(page) {
    // Type the last word while the recording runs (not awaited on purpose).
    (async () => {
      await page.waitForTimeout(800);
      await page.keyboard.type(words.at(-1), { delay: 220 });
      await page.keyboard.press('Enter');
    })().catch(() => {});
  },
  shot: { quality: 82 },
  clip: { seconds: 4, crossfade: false, realtime: true },
};
