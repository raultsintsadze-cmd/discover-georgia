// Purely decorative — deliberately built from the brand accent/wine hues
// rather than the semantic tokens (success/warning/danger already carry
// meaning elsewhere in the UI and shouldn't be reused decoratively).
const FEED_GRADIENTS = [
  "bg-gradient-to-br from-wine-500 via-accent-600 to-accent-500",
  "bg-gradient-to-tr from-accent-600 via-accent-500 to-wine-500",
  "bg-gradient-to-b from-wine-500 to-accent-600",
  "bg-gradient-to-bl from-accent-500 via-wine-500 to-accent-600",
];

/** Deterministic so a given place always gets the same placeholder look. */
export function gradientForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return FEED_GRADIENTS[hash % FEED_GRADIENTS.length] ?? "bg-gradient-to-br from-wine-500 via-accent-600 to-accent-500";
}
