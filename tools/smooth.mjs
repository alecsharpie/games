// Find stutters and loop-seam jumps in the hover clips.
//   node tools/smooth.mjs [slug ...]
// For each clip, measures how much every frame differs from the one before (mean abs luma difference),
// including the wrap from the last frame back to the first, which is what a viewer sees when the loop restarts.
// Flags:
//   freeze — a frame identical to the previous one while the rest of the clip is moving (a dropped/duplicated frame)
//   jump   — a frame change far bigger than the clip's typical motion (a hitch, a cut, or a bad loop seam)
// Exits 1 if anything is flagged.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { CLIPS, FFMPEG } from './lib.mjs';

// Raw 160px-wide grey frames from ffmpeg, so the diffs are cheap and ignore compression noise.
function frames(mp4) {
  const W = 160;
  const probe = execFileSync(FFMPEG, ['-v', 'error', '-i', mp4, '-vf', `scale=${W}:-2,format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 28 });
  const info = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', mp4]).toString().trim().split(',').map(Number);
  const H = Math.round(info[1] * W / info[0] / 2) * 2, size = W * H, out = [];
  for (let o = 0; o + size <= probe.length; o += size) out.push(probe.subarray(o, o + size));
  return out;
}
const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

export function analyse(mp4) {
  const f = frames(mp4), n = f.length;
  const d = f.map((fr, i) => diff(fr, f[(i + n - 1) % n]));  // d[0] = last frame → first frame (the loop seam)
  const typical = median(d.slice(1)), moving = typical > 0.15;
  const issues = [];
  d.forEach((x, i) => {
    const t = (i / 30).toFixed(2), where = i === 0 ? 'loop seam' : `${t}s (frame ${i})`;
    // in a mostly static clip (word games, boards) a discrete UI change is content, not a hitch: only judge the seam
    if ((moving || i === 0) && x > Math.max(3 * typical, typical + 2.5)) issues.push(`jump at ${where}: ${x.toFixed(1)} vs typical ${typical.toFixed(2)}`);
    else if (moving && i > 0 && x < 0.02) issues.push(`freeze at ${where}`);
  });
  return { frames: n, typical, seam: d[0], issues };
}

if (import.meta.url === `file://${process.argv[1]}`) {
const want = process.argv.slice(2);
const files = fs.readdirSync(CLIPS).filter(f => f.endsWith('.mp4') && (!want.length || want.includes(f.slice(0, -4))));
let bad = 0;
for (const f of files) {
  const r = analyse(path.join(CLIPS, f));
  const freezes = r.issues.filter(s => s.startsWith('freeze')).length;
  const shown = [...r.issues.filter(s => !s.startsWith('freeze')), ...(freezes > 2 ? [`${freezes} frozen frames`] : r.issues.filter(s => s.startsWith('freeze')))];
  console.log(`${shown.length ? '✗' : '✓'} ${f.padEnd(22)} ${r.frames} frames, typical motion ${r.typical.toFixed(2)}, seam ${r.seam.toFixed(2)}`);
  shown.forEach(s => console.log('    ' + s));
  if (shown.length) bad++;
}
process.exit(bad ? 1 : 0);
}
