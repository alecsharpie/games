#!/bin/sh
# Push main and wait for GitHub Pages to publish it.
#   tools/deploy.sh
# Commit first. Falls back to HTTPS with gh's credentials when SSH push fails,
# and retries a few times because GitHub sometimes answers 500 on push.
set -e
cd "$(dirname "$0")/.."
REPO=alecsharpie/games
want=$(git rev-parse --short HEAD)

pushed=
for try in 1 2 3 4; do
  if git push origin main 2>/dev/null ||
     git -c credential.helper= -c credential.helper='!gh auth git-credential' push "https://github.com/$REPO.git" main; then
    pushed=1; break
  fi
  echo "push failed (try $try), retrying in 15s"; sleep 15
done
[ -n "$pushed" ] || { echo "could not push"; exit 1; }
git fetch -q origin main 2>/dev/null || true

echo "waiting for Pages to build $want"
for i in $(seq 1 40); do
  got=$(gh api "repos/$REPO/pages/builds/latest" --jq '.status + " " + .commit[0:7]' 2>/dev/null || echo "? ?")
  case "$got" in
    "built $want") echo "built $want"; break ;;
    "errored "*) echo "Pages build errored: $got"; exit 1 ;;
  esac
  sleep 10
done
[ "$got" = "built $want" ] || { echo "timed out waiting for Pages (last: $got)"; exit 1; }

# Pages CDN can lag the build by a minute.
for i in $(seq 1 12); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://www.alecsharpie.me/games/?v=$want")
  [ "$code" = 200 ] && { echo "live: https://www.alecsharpie.me/games/"; exit 0; }
  sleep 10
done
echo "built, but https://www.alecsharpie.me/games/ answered $code"; exit 1
