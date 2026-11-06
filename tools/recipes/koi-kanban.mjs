// Koi Kanban: "day" time of day, hint hidden, nine pond-themed tasks (4 To Do, 3 Doing, 2 Done) staged
// through the app's own saved-tasks localStorage format (key 'koi-kanban-v1') so the board looks full.
import { SITE } from '../lib.mjs';

const TASKS = [
  [0, 'Order river stones', 0, 1], [0, 'Find a stone lantern', 0, 1], [0, 'Buy koi food', 1, 0], [0, 'Sketch the garden layout', 3, 1],
  [1, 'Prune the maple', 4, 0], [1, 'Plant the lotus', 2, 2], [1, 'Test the water pH', 1, 1],
  [2, 'Dig the pond', 0, 2], [2, 'Fill the pond', 0, 1],
].map(([pool, text, category, priority], i) => ({ id: 'c' + i, pool, text, category, priority }));

export default {
  url: null, // navigate in setup, after the init script that stages the tasks
  async setup(page, { context }) {
    await context.addInitScript(t => { try { localStorage.setItem('koi-kanban-v1', JSON.stringify(t)); } catch {} }, TASKS);
    await page.goto(`${SITE}/koi-kanban/#day`, { waitUntil: 'load' });
    await page.addStyleTag({ content: '.hint{display:none!important}' });
    await page.mouse.move(1599, 500);
    await page.waitForTimeout(8000);
  },
  shot: { quality: 82 },
  clip: { seconds: 5, crossfade: true },
};
