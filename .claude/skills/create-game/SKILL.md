---
name: create-game
description: Add a new game or toy to the games gallery (alecsharpie.me/games). Use when the user asks to add, include or list a game on the index page. Covers deploying the game itself if it isn't on GitHub Pages yet, writing its tile, capturing its still and hover loop, keeping the grid balanced, checking and deploying.
---

# Add a game to the gallery

Read `CLAUDE.md` first. It holds the conventions this procedure relies on: the arrays, grid balance, copy style and the quality bar for stills and clips.

## 1. Find the game and make sure it's live

The user's spelling may be off, so match loosely. For example, "finger-folic" meant `finger-frolic`.

1. Look in `~/me/*` and on GitHub with `gh repo list alecsharpie --limit 200`. The slug is the repo name, which is also its URL path.
2. Check that `https://www.alecsharpie.me/<slug>/` answers 200.
3. If the game isn't deployed, deploy it before adding the tile, but confirm with the user first if the repo is private or the game needs secrets or a server. Steps:
   - If the local directory isn't a repo yet, run `git init`, make a first commit and `gh repo create alecsharpie/<slug> --public --source . --push`.
   - Enable Pages with `gh api -X POST repos/alecsharpie/<slug>/pages -f "source[branch]=main" -f "source[path]=/"`. If the game needs a build step, publish its build output instead, for example with a `gh-pages` branch or a Pages workflow.
   - Poll `gh api repos/alecsharpie/<slug>/pages/builds/latest` until the status is `built`, then load the URL and confirm it actually runs.
4. Read the game's README and source so you know what you actually do in it. You need this for the caption, and to find hooks for the capture: `window.game`, `?debug`, dev pages, seeded randomness, fast-forward.

## 2. Write the tile

1. Add the entry to the top of `games` or `worlds` in `index.html`, since the arrays are newest first.
   - **Section:** a score, clock or opponent puts it in Games. Something to watch or poke at puts it in Little worlds. If it's a real toss-up, ask the user.
   - **Month:** use the month of the first commit, from `git log --reverse --format=%ad --date=format:'%b %Y' | head -1`.
   - **Caption and tags:** follow the copy style in `CLAUDE.md`, and read the neighbouring captions to match their tone.
2. Rebalance the grid, following the "Grid balance" section of `CLAUDE.md`. Adding one tile always unbalances it, so decide which tiles are `wide` or `full`. Give the size to games whose still holds up big, such as busy, colourful 3D scenes or party games.
3. Leave the featured hero alone unless the user asks to change it.

## 3. Capture the still and the loop

1. Copy `tools/recipes/_template.mjs` to `tools/recipes/<slug>.mjs`. Fill in how to reach real gameplay: click through menus, start a match, add bots and hide hints. Look at existing recipes for similar games first; for example, `little-guys` and `finger-frolic` cover TV party games through `partyRoom()`.
2. Run `node tools/capture.mjs <slug>`, adding `--headed` to watch it or `--raw` to keep the full recording.
3. Look at `shots/<slug>.jpg` and `.out/<slug>-sheet.png` with the Read tool and judge them honestly.
   - Is it real play, and busy?
   - Is it legible at tile size, about 450px wide?
   - Are there any menus or overlays?
   - Does the loop move enough to be worth hovering?
   - Is the loop smooth? `node tools/smooth.mjs <slug>` must pass.
   
   Iterate on the recipe until all of these pass; it usually takes several tries. To pick a better moment without recapturing, use `--raw` with `trim()` from `tools/lib.mjs`.
4. Clips should stay under ~600 KB. If one is too big, shorten it, slow the game down or crop with `clip.crop`. If the tile is `wide` or `full`, set `clip: { width: 960 }` in the recipe.
5. If the still or clip shows third-party media, add a credit to the footer.

## 4. Check and ship

1. Run `node tools/check.mjs --live`. It must finish with "All good".
2. Look at `.out/check-1440.png` and `.out/check-390.png` to confirm the new tile sits well.
3. Commit the tile, still, clip and recipe together with a message like `Add <Name>`.
4. Run `tools/deploy.sh`. It pushes, waits for Pages and confirms the page is live.
5. Tell the user what you added, and where. Flag anything you staged or fast-forwarded, and anything you weren't happy with in the capture.
