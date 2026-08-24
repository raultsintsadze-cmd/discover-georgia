/**
 * Cinematic per-place "mood" — drives the overlay gradient tint on feed
 * cards and hero sections so mountains read icy-blue, wine country reads
 * warm gold, and the coast reads deep teal, instead of one flat brand
 * gradient everywhere. Matched on category/region name (feed data only
 * carries names, not slugs — see FeedItem) rather than a stored field,
 * since this is a purely presentational classification, not a domain one.
 */
export type Mood = "mountains" | "wine" | "coast" | "culture" | "nature" | "default";

interface MoodPalette {
  /** Tailwind gradient classes for the scrim over media. */
  overlay: string;
  /** Ambient glow color used behind hero content / floating elements. */
  glow: string;
  /** Accent used for small mood-tinted UI touches (progress dots, etc). */
  accent: string;
}

const PALETTES: Record<Mood, MoodPalette> = {
  mountains: {
    overlay: "from-[#0a1626]/90 via-[#0e2740]/25 to-[#1b3a5c]/50",
    glow: "#3b82c4",
    accent: "#7db8e8",
  },
  wine: {
    overlay: "from-[#2b1508]/90 via-[#4a2410]/20 to-[#8a5a1e]/45",
    glow: "#d4922a",
    accent: "#e8b563",
  },
  coast: {
    overlay: "from-[#031f1c]/90 via-[#053832]/20 to-[#0a5c4f]/45",
    glow: "#14b8a6",
    accent: "#5eead4",
  },
  culture: {
    overlay: "from-[#241016]/90 via-[#3d1a22]/20 to-[#6b2632]/45",
    glow: "#c2536b",
    accent: "#e08ba0",
  },
  nature: {
    overlay: "from-[#0f1f0f]/90 via-[#1a3318]/20 to-[#2f5c28]/45",
    glow: "#4ade80",
    accent: "#86efac",
  },
  default: {
    overlay: "from-black/75 via-black/10 to-black/35",
    glow: "#c2703a",
    accent: "#e0a06c",
  },
};

const MOUNTAIN_TERMS = ["mountain", "svaneti", "racha", "tusheti", "kazbegi", "mtianeti", "adventure"];
const WINE_TERMS = ["wine", "kakheti"];
const COAST_TERMS = ["sea", "coast", "adjara", "guria", "samegrelo", "beach"];
const CULTURE_TERMS = ["culture", "history", "cathedral", "monastery", "fortress"];
const NATURE_TERMS = ["nature", "hidden", "park", "forest"];

function matches(haystack: string, terms: string[]): boolean {
  return terms.some((t) => haystack.includes(t));
}

export function moodFor(categoryName?: string | null, regionName?: string | null): Mood {
  const text = `${categoryName ?? ""} ${regionName ?? ""}`.toLowerCase();
  if (matches(text, MOUNTAIN_TERMS)) return "mountains";
  if (matches(text, WINE_TERMS)) return "wine";
  if (matches(text, COAST_TERMS)) return "coast";
  if (matches(text, CULTURE_TERMS)) return "culture";
  if (matches(text, NATURE_TERMS)) return "nature";
  return "default";
}

export function paletteFor(mood: Mood): MoodPalette {
  return PALETTES[mood];
}
