#!/usr/bin/env bash
# Vendor the WHOLE design system into an app: scripts/vendor.sh /path/to/app   (npm run vendor -- /path/to/app)
#
# Builds, then makes <app>/vendor/curv-design-system/ exactly this release: everything package.json "files" lists
# (dist with every entry and declaration chunk, theme.css, mobile.css, home.css, morph.css, eslint, skills, agents,
# docs), a package.json (this one without scripts and devDependencies, so the app's install builds nothing) and
# source.json (name, version, the commit it was built from, sha256 of every vendored file). Anything else in the
# vendor dir goes, older mobile-, home- and morph-source manifests included, so desktop and mobile always ship
# together at one version. node_modules/ and the app's own .gitignore stay.
#
# Run it from a committed tree: source.json names HEAD, so the files it hashes must be HEAD's.
# SKIP_BUILD=1 reuses dist/ (for a rerun). The script re-hashes what landed and fails loudly if anything differs.
#
# scripts/vendor.sh --check /path/to/app re-hashes an app's vendored copy against its source.json and exits 1 on
# any drift (a file edited, added or missing), without building or copying anything.
#
# After vendoring, run `npm install` in the app (package-lock.json records the vendored version), then commit
# vendor/curv-design-system and package-lock.json together. The mobile-only script is scripts/vendor-payload.sh.
set -euo pipefail

CHECK_ONLY=0
if [ "${1:-}" = "--check" ]; then CHECK_ONLY=1; shift; fi
APP="${1:?usage: scripts/vendor.sh [--check] /path/to/app}"
APP="$(cd "$APP" && pwd)"
V="$APP/vendor/curv-design-system"
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

# Compares every file under a vendor dir with its source.json. Prints each difference; exit 1 when there is one.
verify() {
  node - "$1" <<'NODE'
const { createHash } = require("node:crypto");
const { readFileSync, readdirSync, statSync, existsSync } = require("node:fs");
const { join, relative } = require("node:path");
const dir = process.argv[2];
const manifestPath = join(dir, "source.json");
if (!existsSync(manifestPath)) { console.error(`no source.json in ${dir}: vendor it with scripts/vendor.sh first`); process.exit(1); }
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const KEEP = new Set(["node_modules", ".gitignore", "source.json"]);
const walk = (d) => readdirSync(d).flatMap((name) => {
  const path = join(d, name);
  if ((d === dir && KEEP.has(name)) || name === ".DS_Store") return [];
  return statSync(path).isDirectory() ? walk(path) : [relative(dir, path)];
});
const sha = (file) => createHash("sha256").update(readFileSync(join(dir, file))).digest("hex");
const present = new Set(walk(dir));
const problems = [];
for (const [file, hash] of Object.entries(manifest.sha256)) {
  if (!present.has(file)) problems.push(`missing  ${file}`);
  else if (sha(file) !== hash) problems.push(`changed  ${file}`);
}
for (const file of present) if (!(file in manifest.sha256)) problems.push(`extra    ${file}`);
if (problems.length) {
  console.error(`vendor/curv-design-system differs from ${manifest.name}@${manifest.version} (${manifest.sourceCommit}):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`${manifest.name}@${manifest.version} (${manifest.sourceCommit.slice(0, 12)}): ${present.size} files match source.json`);
NODE
}

if [ "$CHECK_ONLY" = "1" ]; then
  [ -d "$V" ] || { echo "no vendor dir at $V" >&2; exit 1; }
  verify "$V"
  exit 0
fi

[ -f "$APP/package.json" ] || { echo "$APP has no package.json: pass the app's root" >&2; exit 1; }

# What package.json "files" ships (bash 3.2 has no mapfile).
FILES=()
while IFS= read -r f; do FILES+=("$f"); done < <(node -p "require('./package.json').files.join('\n')")

# Everything the payload is built or copied from must be HEAD's. dist/ is built, not tracked: its sources are.
TRACKED=(package.json package-lock.json src tsconfig.json tsup.config.ts tsup.mobile.config.ts tsup.home.config.ts tsup.morph.config.ts)
for f in "${FILES[@]}"; do [ "$f" = "dist" ] || TRACKED+=("$f"); done
if ! git diff --quiet HEAD -- "${TRACKED[@]}" || [ -n "$(git ls-files --others --exclude-standard -- "${TRACKED[@]}")" ]; then
  echo "uncommitted changes in ${TRACKED[*]}: commit first, source.json names HEAD" >&2
  exit 1
fi

[ "${SKIP_BUILD:-}" = "1" ] || npm run build

for f in "${FILES[@]}"; do [ -e "$f" ] || { echo "package.json files lists $f, which does not exist (did the build run?)" >&2; exit 1; }; done

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
for f in "${FILES[@]}"; do cp -R "$f" "$STAGE/"; done
find "$STAGE" -name .DS_Store -delete

COMMIT="$(git rev-parse HEAD)"
node - "$STAGE" "$COMMIT" <<'NODE'
const { createHash } = require("node:crypto");
const { readFileSync, writeFileSync, readdirSync, statSync } = require("node:fs");
const { join, relative } = require("node:path");
const [stage, commit] = process.argv.slice(2);
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
// The app installs this as a file: dependency. No scripts (a `prepare` would try to build in the app), no dev tools.
const { scripts, devDependencies, publishConfig, ...vendored } = pkg;
writeFileSync(join(stage, "package.json"), JSON.stringify(vendored, null, 2) + "\n");
const walk = (d) => readdirSync(d).flatMap((name) => {
  const path = join(d, name);
  return statSync(path).isDirectory() ? walk(path) : [relative(stage, path)];
});
const sha256 = {};
for (const file of walk(stage).sort()) sha256[file] = createHash("sha256").update(readFileSync(join(stage, file))).digest("hex");
const manifest = {
  name: pkg.name,
  version: pkg.version,
  sourceCommit: commit,
  sourceStatus: "The whole package (desktop, mobile, home and morph entries, theme, lint, skills, docs), built from this commit of jonas-curv/curv-design-system by scripts/vendor.sh. Do not edit: re-vendor instead.",
  entrypoints: Object.keys(pkg.exports),
  sha256,
};
writeFileSync(join(stage, "source.json"), JSON.stringify(manifest, null, 2) + "\n");
NODE

mkdir -p "$V"
# Replace the release, keep the app's install and its ignore file.
find "$V" -mindepth 1 -maxdepth 1 ! -name node_modules ! -name .gitignore -exec rm -rf {} +
cp -R "$STAGE"/. "$V"/
[ -f "$V/.gitignore" ] || printf '/node_modules/\n' > "$V/.gitignore"

# Verify what landed in the app, not what we meant to copy.
verify "$V"
cmp -s dist/index.js "$V/dist/index.js" || { echo "verify failed: dist/index.js" >&2; exit 1; }
cmp -s theme.css "$V/theme.css" || { echo "verify failed: theme.css" >&2; exit 1; }

VERSION="$(node -p "require('./package.json').version")"
echo "vendored $VERSION ($COMMIT) into $V"
echo "next: cd $APP && npm install, then commit vendor/curv-design-system and package-lock.json"
