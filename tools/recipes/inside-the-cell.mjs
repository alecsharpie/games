// Inside the Cell: the animal cell with all UI hidden (header, panel, labels, hint, scale bar, reset,
// toast) and the 3D view widened to fill the window; dragged to an angle and zoomed into the interior.
// The app's own idle auto-rotate gives the loop a slow turn.
import { SITE } from '../lib.mjs';

export default {
  url: `${SITE}/inside-the-cell/`,
  async setup(page) {
    await page.waitForTimeout(1500);
    await page.addStyleTag({ content: 'header.top,#panel,#labels-layer,#reset,#hint,#scalebar,#toast{display:none!important} main{grid-template-columns:1fr!important} #app{height:100vh}' });
    await page.evaluate(() => {
      const L = document.getElementById('labels'); if (L.checked) L.click();
      const c = document.getElementById('cut'); c.value = 30; c.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(800);
    await page.mouse.move(800, 500); await page.mouse.down();
    for (let i = 1; i <= 10; i++) { await page.mouse.move(800 + 120 * i / 10, 500 - 20 * i / 10); await page.waitForTimeout(30); }
    await page.mouse.up();
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(40); }
    await page.mouse.move(2, 998);
    await page.waitForTimeout(3000);
  },
  shot: { quality: 82 },
  clip: { seconds: 5, crossfade: true },
};
