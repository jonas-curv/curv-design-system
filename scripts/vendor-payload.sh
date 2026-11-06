#!/usr/bin/env bash
# Vendor the mobile half of this design system into an app: scripts/vendor-payload.sh /path/to/app
#
# Builds, then writes into <app>/vendor/curv-design-system/ everything the mobile entry needs and nothing else:
#   dist/mobile.js, dist/mobile.d.ts and the declaration chunks mobile.d.ts imports (the chunk's name is a content hash, so it is read
#   from mobile.d.ts, never hard-coded), mobile.css, docs/mobile.md, skills/curv-mobile/SKILL.md, mobile-source.json (version,
#   the commit this was built from, sha256 of mobile.js and mobile.css) and mobile-source.tar.gz (the source those files came from).
# dist/index.js (the desktop entry) is left alone: it is vendored at a different version in every app and no desktop surface may change.
# Older mobile-*.d.ts chunks stay: an app's index.d.ts may still point at its own.
#
# Run it from a committed tree: mobile-source.json names HEAD, so the files it hashes must be HEAD's.
# SKIP_BUILD=1 reuses dist/ (for a rerun). The script re-hashes what it copied and fails loudly if anything differs.
set -euo pipefail

APP="${1:?usage: scripts/vendor-payload.sh /path/to/app}"
V="$APP/vendor/curv-design-system"
cd "$(dirname "$0")/.."
[ -d "$V" ] || { echo "no vendor dir at $V" >&2; exit 1; }

SOURCES=(docs mobile.css package.json package-lock.json skills src tests)
if ! git diff --quiet HEAD -- "${SOURCES[@]}"; then
  echo "uncommitted changes in ${SOURCES[*]}: commit first, mobile-source.json names HEAD" >&2
  exit 1
fi

[ "${SKIP_BUILD:-}" = "1" ] || npm run build

sha() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }

VERSION="$(node -p "require('./package.json').version")"
COMMIT="$(git rev-parse HEAD)"

# The declaration chunks dist/mobile.d.ts imports, as files: './avatar-PvoSbi-q.js' is dist/avatar-PvoSbi-q.d.ts.
CHUNKS=()
while IFS= read -r name; do CHUNKS+=("${name%.js}.d.ts"); done < <(grep -oE "from '\./[^']+\.js'" dist/mobile.d.ts | sed -E "s/from '\.\/(.*)'/\1/" | sort -u)
for chunk in ${CHUNKS[@]+"${CHUNKS[@]}"}; do [ -f "dist/$chunk" ] || { echo "dist/mobile.d.ts imports $chunk, which the build did not write" >&2; exit 1; }; done

mkdir -p "$V/dist" "$V/docs" "$V/skills/curv-mobile"
cp dist/mobile.js dist/mobile.d.ts "$V/dist/"
for chunk in ${CHUNKS[@]+"${CHUNKS[@]}"}; do cp "dist/$chunk" "$V/dist/"; done
cp mobile.css "$V/mobile.css"
cp docs/mobile.md "$V/docs/mobile.md"
cp skills/curv-mobile/SKILL.md "$V/skills/curv-mobile/SKILL.md"

JS_SHA="$(sha dist/mobile.js)"
CSS_SHA="$(sha mobile.css)"
cat > "$V/mobile-source.json" <<JSON
{
  "version": "$VERSION",
  "sourceCommit": "$COMMIT",
  "sourceStatus": "Canonical mobile source in jonas-curv/curv-design-system, built from this commit by scripts/vendor-payload.sh. The desktop entry is untouched.",
  "entrypoint": "./mobile",
  "sha256": {
    "dist/mobile.js": "$JS_SHA",
    "mobile.css": "$CSS_SHA"
  }
}
JSON
git archive --format=tar HEAD docs mobile.css package.json package-lock.json src tests | gzip -n > "$V/mobile-source.tar.gz"

# Verify what landed in the app, not what we meant to copy.
fail() { echo "verify failed: $1" >&2; exit 1; }
[ "$(sha "$V/dist/mobile.js")" = "$JS_SHA" ] || fail "dist/mobile.js"
[ "$(sha "$V/mobile.css")" = "$CSS_SHA" ] || fail "mobile.css"
cmp -s docs/mobile.md "$V/docs/mobile.md" || fail "docs/mobile.md"
cmp -s skills/curv-mobile/SKILL.md "$V/skills/curv-mobile/SKILL.md" || fail "skills/curv-mobile/SKILL.md"
cmp -s dist/mobile.d.ts "$V/dist/mobile.d.ts" || fail "dist/mobile.d.ts"
for chunk in ${CHUNKS[@]+"${CHUNKS[@]}"}; do cmp -s "dist/$chunk" "$V/dist/$chunk" || fail "dist/$chunk"; done
[ "$(node -p "require('$V/mobile-source.json').sha256['dist/mobile.js']")" = "$JS_SHA" ] || fail "mobile-source.json"
tar -tzf "$V/mobile-source.tar.gz" | grep -q '^src/components/shell/mobile-nav/' || fail "tarball has no mobile-nav source"

echo "vendored $VERSION ($COMMIT) into $V (desktop entry untouched)"
echo "  dist/mobile.js $JS_SHA"
echo "  mobile.css     $CSS_SHA"
echo "  chunks: ${CHUNKS[*]-none}"
