/**
 * The phone's avatar colour. The desktop `Avatar` (src/components/avatar.tsx) picks one of eight hues from a hash of the person's
 * name, at 42% saturation and 46% lightness. White initials on that are only 3:1 for three of the eight (teal, amber, cyan) and
 * 4.35:1 for orange, so on a phone, where the initials are 10-15px, the same hues are drawn darker. The hash and the hue list
 * are the desktop's, so a person is the same hue everywhere; a test reads avatar.tsx and fails if they drift.
 */
const HUES = [212, 158, 24, 280, 340, 42, 190, 262];
const SATURATION = 42;
/** The lightest L at which white clears 4.5:1 on every hue is 36% (4.63:1 on teal, the worst). 35% keeps a margin of 0.3. */
const LIGHTNESS = 35;

/**
 * A stable colour for a person's avatar, from their name: `hsl(H 42% 35%)`, H one of the desktop avatar's eight hues. White text
 * on it is at least 4.8:1 for every hue. `MobileStageBoard` uses it for a card avatar that has no `color`; pass it as the
 * `color` of any other mobile avatar, or as the background of one you draw, so the same person has the same colour everywhere.
 */
export function mobileAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${HUES[hash % HUES.length]} ${SATURATION}% ${LIGHTNESS}%)`;
}
