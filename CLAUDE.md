# Games gallery

The index of every game and toy we've built, live at https://www.alecsharpie.me/games/ (GitHub Pages, repo `alecsharpie/games`, branch `main`). Each game is its own repo, served by Pages at `https://www.alecsharpie.me/<slug>/`, and the gallery links to it as `../<slug>/`.

Use the project skills for changes:
- `/create-game` to add a game.
- `/update-game` to change anything already on the page: refresh a still or clip, edit copy, rename, move between sections, change the featured hero, remove.

## Layout

The whole site is `index.html`, a single file with no build step.
- `shots/<slug>.jpg` is the gallery still for each game.
- `clips/<slug>.mp4` is its hover loop.
- `tools/` holds the capture, check and deploy scripts, plus one recipe per game in `tools/recipes/`.
- `.out/` is scratch output and is gitignored.

The tiles come from two arrays near the bottom of `index.html`. Each entry is `[slug, name, month, caption, tags, size]`.
- `games` is for things with a score, a clock or someone to beat.
- `worlds` ("Little worlds") is for simulations and toys to watch and poke at.

Order is newest first. Section counts are computed from the arrays. The featured hero (`a.feature`) is hand-written markup above the grids.

## Look and feel

The page should be a crisp, clean gallery: dark, quiet and image-led, with nothing too crazy. Fonts are Geist plus Instrument Serif. The accent is `#ffd23f`.

## Grid balance

Every row must be full at every width.
- Games, at 3 columns: a `"wide"` tile is 2×2 (4 cells), a normal tile is 1, and the "More experiments" tile is 2. The total must be a multiple of 3.
- Games, at 2 columns (≤1000px): a wide tile is 2 cells, a normal tile is 1, and More is 2. The total must be even.
- Little worlds, at 2 columns: a `"full"` tile is 2 cells and a normal tile is 1. The total must be even.

To fix a hole, add or remove a `wide` or `full` tile, or move one. Don't add filler. `node tools/check.mjs` finds empty cells.

## Copy style

**Captions** are one or two plain sentences, about 20–30 words, that say what you actually do. Use concrete nouns, no hype words and no exclamation marks.

**Tags** are 1–2 short ones, like `Phones`, `Up to 8`, `WebGL`, `Physics` or `Daily`.

**Month** is `Mon YYYY`, taken from when the game was made, which is usually its first commit.

## Stills and clips

**Content:** show real gameplay at its busiest, most legible moment. Never show menus, title cards, hint overlays, debug panels or cursors.

**Stills:** 1600×1000 JPEG. TV party games are 1600×900.

**Clips:**
- About 3.5–4.5s, 960px wide, H.264 with no audio. Keep each under ~800 KB; together they're about 5 MB.
- They must be perfectly smooth: no dropped or frozen frames, no hitches and no jump where the loop restarts. `capture.mjs` records them **stepped** by default. It freezes the page's clock (`VCLOCK` in `tools/lib.mjs`) and renders exactly 1/30s of game time per frame, so GPU hiccups can't show. Use `clip: { realtime: true }` only for a game the virtual clock can't drive, such as logic in a Worker or CSS-animation-driven motion. `node tools/smooth.mjs` must pass, and `check.mjs` runs it.
- Under the stepped clock, input sent from Node during a clip arrives on real time, not game time. To time input, call `window.__vclock.freeze()` in `beforeClip` and schedule it with in-page `setTimeout` (see `endo` and `cards`). The clock only steps the top window, so games in iframes must freeze each same-origin iframe's `__vclock` and forward `step()` into it (see `little-guys` and `finger-frolic`).
- Crossfade them into seamless loops, except text- or UI-heavy games (Co-op, Wayword), where the dissolve looks ghosted. Many small fast-moving things also ghost during the dissolve: slow the game down (Picnic Ant Raid runs at 1×, not 2×) or shorten `clip.fade`.
- Fast-forwarding through a game's own debug hooks is fine, because it's still the real simulation. Staged data, such as Koi Kanban's example tasks, is fine too.

**Credits:** third-party media that appears in a still or clip gets a credit in the footer.

**Jumping Jack** draws the webcam image, so its capture is fed a video of a person through Chrome's fake camera (see its recipe). The source is the user's own recording, which is kept local and gitignored under `tools/assets/private/`.

## Environment gotchas

- `cp` and `mv` are aliased to interactive mode here, so use `/bin/cp -f` and `/bin/mv -f`.
- SSH push to GitHub can fail with "Permission denied (publickey)". `tools/deploy.sh` falls back to HTTPS with `gh` credentials.
- Playwright: `tools/node_modules` should hold a playwright install. Either run `cd tools && npm install`, or symlink `~/.claude/skills/screenshot-verify/node_modules`. Real Chrome (`channel: 'chrome'`) is needed to play H.264; bundled Chromium can't.
- WebGL capture needs the GPU flags in `tools/lib.mjs`. Headless SwiftShader is too slow and the loops come out choppy.
