---
name: update-game
description: Change something already on the games gallery (alecsharpie.me/games). Use when the user asks to refresh or improve a game's screenshot or hover clip, recapture after a game changed, edit a caption, tags or date, rename a game, move it between Games and Little worlds, change the featured hero, reorder, or remove a game. Also for refreshing every capture at once.
---

# Update the gallery

Read `CLAUDE.md` first. It holds the conventions: the arrays, grid balance, copy style and the quality bar for stills and clips.

Most changes are in `index.html` plus `shots/`, `clips/` and `tools/recipes/`. Make the change, run the check and deploy. Each kind of change has its own details below.

## Refresh a still or clip

Do this when the game changed, the shot is weak, or the user wants a different moment.

1. Run `node tools/capture.mjs <slug>`. Add `--shot` or `--clip` to redo only one of them (for games with randomness, redo both so they show the same moment), `--raw` to keep the full recording, or `--headed` to watch.
2. Judge `shots/<slug>.jpg` and `.out/<slug>-sheet.png` with the Read tool against the bar in `CLAUDE.md`, and run `node tools/smooth.mjs <slug>`, which must pass. Compare with the old version from `git show HEAD:shots/<slug>.jpg > .out/old.jpg`, and keep whichever is better.
3. If the recipe no longer works, fix the recipe rather than doing a one-off script, so the next refresh works too. This happens when the game's UI, hooks or URL changed. Keep the comments at the top of the recipe current with anything flaky.

To refresh everything, loop over `tools/recipes/*.mjs`, skipping `_template`, then review every result before committing. Some randomness means a few will be worse than before; restore those with `git checkout -- shots/<slug>.jpg clips/<slug>.mp4`.

## Change the copy

This covers the caption, tags, month and name.
- Edit the entry in the array, following the copy style in `CLAUDE.md`.
- A rename changes only the display name. The slug stays, because it's the URL. For example, Bilbanan was renamed "Not Bilbanan" with slug `bilbanan`.
- If the game is the hero, its copy also lives in the `a.feature` markup and its image's `alt` text.

## Move, reorder or resize

- To move a game between sections, cut the entry from one array into the other, keeping the newest-first order.
- Any add, remove, move or resize can unbalance the grids. Rebalance with `wide` or `full` according to `CLAUDE.md`, and confirm with `node tools/check.mjs`.

## Change the featured hero

- Edit the `a.feature` block in `index.html`: the href, the image `src` and alt text, the video `data-src`, the eyebrow (`Featured · <Mon YYYY>`), the h2 and the description.
- Also update the `og:image` meta and the `<link rel="preload">` at the top.
- The old hero needs a tile in its array if it should stay on the page. The new hero should normally come out of its array so it doesn't appear twice; `check.mjs` flags duplicates.
- The hero shows at 16/7.2 on desktop and crops the still. Check that the subject sits in the middle band in `.out/check-1440.png`.

## Remove a game

- Delete the array entry, `shots/<slug>.jpg`, `clips/<slug>.mp4` and `tools/recipes/<slug>.mjs`. Remove any footer credit that only it needed. Rebalance the grid.
- Don't delete the game's own repo or turn off its Pages unless the user explicitly asks.

## Check and ship

1. Run `node tools/check.mjs --live`. It must finish with "All good".
2. Look at `.out/check-1440.png`, and at `.out/check-390.png` if the layout changed.
3. Commit with a message that says what changed.
4. Run `tools/deploy.sh`.
5. Tell the user what changed, with the link https://www.alecsharpie.me/games/.
