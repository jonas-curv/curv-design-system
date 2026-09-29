"use client";

/**
 * Morph kit entry: MorphStack, the summary line that opens in place into the
 * list it summarises. Standalone like the mobile and home entries: React is
 * its only import, style comes from `@curvgroup/design-system/morph.css`, and
 * nothing here touches dist/index.js or the mobile files.
 */
export {
  MorphStack,
  MorphStackButton,
  MorphStackInput,
  MORPH_OPEN_MS,
  MORPH_CLOSE_MS,
  MORPH_EXIT_MS,
  type MorphStackItem,
  type MorphStackProps,
  type MorphStackTone,
  type MorphStackAnchor,
  type MorphStackButtonProps,
} from "./components/morph/morph-stack";
