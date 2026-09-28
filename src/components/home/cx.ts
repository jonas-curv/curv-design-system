/** Join class names. The home kit uses plain classes from home.css, so it
 *  needs no Tailwind merge and carries no dependency for it. */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}
