/** An app-supplied id made safe to join into an element id: whitespace would split an `aria-describedby` or `aria-labelledby` token. */
export const idPart = (value: string) => value.replace(/\s+/g, "-");
