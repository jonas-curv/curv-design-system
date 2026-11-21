/**
 * eslint-plugin-curv — mechanical guards for the Curv design language.
 *
 * These catch the exact mistakes a human (or an agent) makes when they write UI
 * without reading docs/design-system.md: full uppercase, wide tracking, raw hex
 * and palette colours instead of tokens, and font sizes off the seven-size type
 * scale. They scan the *static* strings inside every `className`
 * (including inside `cn(...)`, arrays and template literals), so deviations fail
 * CI instead of reaching a review.
 *
 * Radius is deliberately NOT linted: it's a concentric (relational) rule now
 * (outer = inner + padding), which a linter can't compute — curv-ui and the
 * design-review agent own it.
 *
 * They are deliberately narrow and deterministic. Taste-level judgment (clutter,
 * hierarchy, "does this need to exist") is the design-review agent's job, not
 * lint's.
 */

// The only sanctioned raw hex: the top-bar chrome colour, fixed in both themes
// (see design-system.md → App shell). Everything else must be a token.
const HEX_ALLOWLIST = new Set(["1b1b1b"]);

/**
 * Strip Tailwind variant prefixes (`sm:`, `hover:`, `[&>svg]:`) → the base
 * utility. Colons inside brackets belong to the value (`text-[length:13px]`).
 */
function baseUtility(token) {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < token.length; i++) {
    const c = token[i];
    if (c === "[" || c === "(") depth++;
    else if (c === "]" || c === ")") depth--;
    else if (c === ":" && depth === 0) start = i + 1;
  }
  return token.slice(start);
}

/** Collect every static string reachable inside a className attribute value. */
function collectStrings(node, out) {
  if (!node) return;
  switch (node.type) {
    case "Literal":
      if (typeof node.value === "string") out.push({ text: node.value, node });
      break;
    case "TemplateLiteral":
      for (const q of node.quasis) out.push({ text: q.value.cooked ?? "", node: q });
      break;
    case "JSXExpressionContainer":
      collectStrings(node.expression, out);
      break;
    case "CallExpression":
      for (const arg of node.arguments) collectStrings(arg, out);
      break;
    case "ArrayExpression":
      for (const el of node.elements) collectStrings(el, out);
      break;
    case "LogicalExpression":
      collectStrings(node.left, out);
      collectStrings(node.right, out);
      break;
    case "ConditionalExpression":
      collectStrings(node.consequent, out);
      collectStrings(node.alternate, out);
      break;
    default:
      break;
  }
}

function classNameStrings(attr) {
  if (!attr.value) return [];
  const out = [];
  collectStrings(attr.value, out);
  return out;
}

function tokensOf(text) {
  return text.split(/\s+/).filter(Boolean);
}

/** Build a rule that reports any className token matching `test(base, raw)`. */
function makeClassRule({ description, messageId, message, test }) {
  return {
    meta: {
      type: "problem",
      docs: { description },
      schema: [],
      messages: { [messageId]: message },
    },
    create(context) {
      return {
        JSXAttribute(attr) {
          const name = attr.name && attr.name.name;
          if (name !== "className" && name !== "class") return;
          for (const { text, node } of classNameStrings(attr)) {
            for (const raw of tokensOf(text)) {
              const hit = test(baseUtility(raw), raw);
              if (hit) {
                context.report({ node, messageId, data: { token: raw, ...hit } });
              }
            }
          }
        },
      };
    },
  };
}

const HEX_ARBITRARY = /\[#([0-9a-fA-F]{3,8})\]/;

// Tailwind's default colour scales. Banned in className — a raw `bg-neutral-100`
// or `border-amber-400` bypasses the theme and drifts from every other OS. Use a
// semantic token instead (bg-background/-card/-muted, text-foreground/
// -muted-foreground, border-border, the verdict-*/chart-* families). This is the
// rule that catches a page shell hand-rolled with `bg-neutral-100` instead of
// `bg-background`. `black`/`white` are NOT scales, so `outline-black/10` (the
// sanctioned image-outline) and `bg-white/10` stay legal.
const PALETTE_SCALE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|" +
  "emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const PALETTE_PREFIX =
  "bg|text|border|border-[trblxyse]|ring|ring-offset|from|via|to|fill|" +
  "stroke|divide|outline|placeholder|caret|accent|decoration|shadow";
const PALETTE_UTILITY = new RegExp(
  `^(?:${PALETTE_PREFIX})-(?:${PALETTE_SCALE})-\\d{2,3}(?:\\/\\d{1,3})?$`,
);

// The seven type sizes (theme.css → @theme, design-system.md → Type scale).
// An arbitrary pixel or rem size is reported with the token it folds to.
const TYPE_SCALE = [
  [32, "text-display"],
  [24, "text-figure"],
  [20, "text-title"],
  [16, "text-section"],
  [13, "text-body"],
  [12, "text-caption"],
  [11, "text-micro"],
];
// `text-[13px]`, `text-[0.8125rem]`, `text-[length:13px]`; `!` (important) allowed.
// Relative sizes (`text-[0.55em]`, a superscript) are not a size on the scale.
const ARBITRARY_TEXT_SIZE = /^!?text-\[(?:length:)?(\d*\.?\d+)(px|rem)\]!?$/;

/**
 * The scale token an arbitrary size folds to: 10 and 9 → micro, 14 → body,
 * 15 → section (the nearest step, so a title keeps its place above body text),
 * then the nearest step, ties to the larger. The stream C codemod folds the same.
 */
function foldToScale(px) {
  if (px <= 11) return "text-micro";
  if (px < 12.5) return "text-caption";
  if (px < 14.5) return "text-body";
  if (px < 16) return "text-section";
  // TYPE_SCALE runs large to small and only a strictly nearer step replaces
  // the best so far, so a tie keeps the larger.
  let best = TYPE_SCALE[0];
  for (const entry of TYPE_SCALE) {
    if (Math.abs(entry[0] - px) < Math.abs(best[0] - px)) best = entry;
  }
  return best[1];
}

// Positive tracking is the "spaced caps label" style. Negative tracking on big
// type (`tracking-tight`, `tracking-[-0.02em]`) stays legal.
const WIDE_TRACKING_ARBITRARY = /^!?tracking-\[\+?(\d*\.?\d+)(em|rem|px)\]!?$/;

const rules = {
  "no-arbitrary-text-size": makeClassRule({
    description:
      "Disallow arbitrary font sizes (text-[13px]); use the seven type-scale tokens.",
    messageId: "noArbitraryTextSize",
    message:
      'Arbitrary size "{{token}}": use {{suggestion}}. The type scale is text-display (32), text-figure (24), text-title (20), text-section (16), text-body (13), text-caption (12) and text-micro (11); 14 folds to body, 15 to section, 10 and 9 to micro.',
    test: (base) => {
      const m = base.match(ARBITRARY_TEXT_SIZE);
      if (!m) return null;
      const px = m[2] === "rem" ? Number(m[1]) * 16 : Number(m[1]);
      return { suggestion: foldToScale(px) };
    },
  }),
  "no-wide-tracking": makeClassRule({
    description: "Disallow wide letter-spacing (tracking-wide and positive arbitrary tracking).",
    messageId: "noWideTracking",
    message:
      'Avoid "{{token}}". design-system.md forbids wide tracking: labels are sentence case at normal tracking.',
    test: (base) => {
      const plain = base.replace(/^!|!$/g, "");
      if (plain === "tracking-wide") return {};
      const m = plain.match(WIDE_TRACKING_ARBITRARY);
      return m && Number(m[1]) > 0 ? {} : null;
    },
  }),
  "no-uppercase-utility": makeClassRule({
    description: "Disallow full-uppercase / wide-tracking label styles.",
    messageId: "noUppercase",
    message:
      'Avoid "{{token}}". design-system.md forbids full uppercase and wide tracking — use sentence case.',
    test: (base) =>
      base === "uppercase" || base === "tracking-wider" || base === "tracking-widest"
        ? {}
        : null,
  }),
  "no-raw-hex": makeClassRule({
    description: "Disallow raw hex colours in className; use theme tokens.",
    messageId: "noRawHex",
    message:
      'Raw hex "{{token}}" — use a theme token (bg-card, text-muted-foreground, …) instead of a hardcoded colour.',
    test: (_base, raw) => {
      const m = raw.match(HEX_ARBITRARY);
      if (!m) return null;
      return HEX_ALLOWLIST.has(m[1].toLowerCase()) ? null : {};
    },
  }),
  "no-palette-utility": makeClassRule({
    description:
      "Disallow raw Tailwind colour-scale utilities in className; use theme tokens.",
    messageId: "noPalette",
    message:
      'Raw palette utility "{{token}}" — use a semantic token (bg-background, bg-card, bg-muted, text-foreground, text-muted-foreground, border-border, or the verdict-*/chart-* families) instead of a Tailwind default colour scale.',
    test: (base) => (PALETTE_UTILITY.test(base) ? {} : null),
  }),
};

export default { rules, meta: { name: "eslint-plugin-curv" } };
