// Little Guys: wave ~3-4 with 6 bot gardeners bonking bugs around the veggie beds, TRIPLE!/DOUBLE! pops.
// TV + phones party game: dev.html?players=6&bots (via lib's partyRoom), all phones as bots, TV iframe
// blown up to its native 1600x900. The "Click anywhere for sound" pill is hidden.
// Stepped recording: the game runs in the TV iframe and the bots in the phone iframes, but recordStepped()
// only drives the top window's clock, so beforeClip freezes every same-origin iframe's virtual clock too
// and forwards the top window's step() into them.
import { partyRoom } from '../lib.mjs';

export default {
  url: null,
  viewport: { width: 1600, height: 900 },
  async setup(page) {
    await partyRoom(page, 'little-guys');
    const tv = page.frames().find(f => f.url().includes('index.html'));
    await tv.addStyleTag({ content: '#sound{display:none!important}' });
    await page.mouse.move(1599, 899);
    await page.waitForTimeout(63000);   // let the bots play into a busy mid-game wave
  },
  async beforeClip(page) {
    await page.evaluate(() => {
      const kids = () => [...document.querySelectorAll('iframe')].map(f => f.contentWindow && f.contentWindow.__vclock).filter(Boolean);
      const top = window.__vclock, step = top.step.bind(top);
      kids().forEach(v => v.freeze());
      top.step = ms => { step(ms); kids().forEach(v => v.step(ms)); };
    });
  },
  shot: { quality: 85 },
  clip: { seconds: 4, crossfade: true, width: 960 },   // wide tile
};
