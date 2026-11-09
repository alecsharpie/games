// Lava Lamp (full-width tile): the five-lamp lineup glowing in a dark room, wax rising and falling.
// ?hideui hides the panel and hint; the status line (#hud) is hidden here. ?speed=4 runs the physics faster so the
// 4s loop shows the wax moving (real lamps are slow). The page opens on pre-warmed snapshots, so the wax is already
// flowing after a few seconds. The camera is pulled in from the ?cam=wide framing so the lamps survive the 21:9 crop.
// Physics runs in Web Workers, which the virtual clock can't drive, so the clip records in real time; ?always=1 makes
// the page draw every display frame instead of only when the physics steps, or the recording has frozen frames.
import { SITE } from '../lib.mjs';

const frame = page => page.evaluate(() => {
  const { camera, controls } = window.LL;
  camera.position.set(0.22, 0.4, 1.2); controls.target.set(0.02, 0.19, 0); controls.update();
});

export default {
  url: `${SITE}/lava-lamp/?hideui=1&lamps=5&cam=wide&speed=4&always=1`,
  async setup(page) {
    await page.addStyleTag({ content: '#hud,#hint,#loading{display:none!important}' });
    await page.waitForFunction(() => window.LL?.stats, null, { timeout: 60000 });
    await frame(page);
    await page.waitForTimeout(8000);
  },
  shot: { quality: 86 },
  clip: { seconds: 4.5, crossfade: true, realtime: true, width: 960 },   // full-width tile
};
