/**
 * Seeds regions, categories, and an initial set of real Georgian places
 * (spec §48). Coordinates are real-world values for each landmark — never
 * guessed — sourced from public geographic knowledge. Idempotent: every
 * upsert is keyed by slug, so re-running is safe.
 *
 * Run with: npm run db:seed
 */
import {
  PrismaClient,
  Difficulty,
  PlaceStatus,
  DriverVerificationStatus,
  DriverAvailabilityStatus,
  ActivityCategory,
} from "@prisma/client";
import { slugify } from "../src/lib/utils/slugify";

const prisma = new PrismaClient();

const REGIONS = [
  { slug: "tbilisi", name: "Tbilisi" },
  { slug: "kakheti", name: "Kakheti" },
  { slug: "mtskheta-mtianeti", name: "Mtskheta-Mtianeti" },
  { slug: "adjara", name: "Adjara" },
  { slug: "imereti", name: "Imereti" },
  { slug: "samegrelo", name: "Samegrelo" },
  { slug: "svaneti", name: "Svaneti" },
  { slug: "samtskhe-javakheti", name: "Samtskhe-Javakheti" },
  { slug: "guria", name: "Guria" },
  { slug: "racha", name: "Racha" },
  { slug: "tusheti", name: "Tusheti" },
  { slug: "kvemo-kartli", name: "Kvemo Kartli" },
  { slug: "shida-kartli", name: "Shida Kartli" },
  { slug: "javakheti", name: "Javakheti" },
] as const;

const CATEGORIES = [
  { slug: "nature", name: "Nature" },
  { slug: "mountains", name: "Mountains" },
  { slug: "cities", name: "Cities" },
  { slug: "wine", name: "Wine" },
  { slug: "culture", name: "Culture" },
  { slug: "adventure", name: "Adventure" },
  { slug: "sea", name: "Sea" },
  { slug: "history", name: "History" },
  { slug: "hidden-gems", name: "Hidden Gems" },
  { slug: "family", name: "Family" },
] as const;

interface SeedPlace {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  regionSlug: (typeof REGIONS)[number]["slug"];
  categorySlug: (typeof CATEGORIES)[number]["slug"];
  latitude: number;
  longitude: number;
  bestSeason?: string;
  recommendedDuration?: number; // minutes
  difficulty?: Difficulty;
  entranceFee?: string;
  parking: boolean;
  familyFriendly: boolean;
  tags: string[];
}

const PLACES: SeedPlace[] = [
  // ── Tbilisi ──────────────────────────────────────────────────────
  {
    slug: "old-tbilisi",
    name: "Old Tbilisi",
    shortDescription: "Winding cobblestone streets, sulfur bathhouses, and balconied houses.",
    description:
      "The historic core of the capital, spanning the Sioni Cathedral district, the sulfur bathhouses of Abanotubani, and the Bridge of Peace over the Mtkvari River. Best explored on foot, with cafés and wine bars tucked into every side street.",
    regionSlug: "tbilisi",
    categorySlug: "cities",
    latitude: 41.6934,
    longitude: 44.8015,
    bestSeason: "April – October",
    recommendedDuration: 180,
    difficulty: Difficulty.EASY,
    entranceFee: "Free",
    parking: false,
    familyFriendly: true,
    tags: ["walking", "old-town", "architecture"],
  },
  {
    slug: "narikala-fortress",
    name: "Narikala Fortress",
    shortDescription: "Ancient hilltop fortress overlooking the whole city.",
    description:
      "A 4th-century fortress on the Sololaki hill, reachable by cable car from Rike Park. The ruins frame the best panoramic view of Tbilisi's Old Town, the Mtkvari River, and the surrounding hills.",
    regionSlug: "tbilisi",
    categorySlug: "history",
    latitude: 41.6879,
    longitude: 44.8078,
    bestSeason: "April – October",
    recommendedDuration: 90,
    difficulty: Difficulty.MODERATE,
    entranceFee: "Free (cable car ticketed)",
    parking: false,
    familyFriendly: true,
    tags: ["fortress", "viewpoint", "cable-car"],
  },
  {
    slug: "sameba-cathedral",
    name: "Sameba Cathedral",
    shortDescription: "The Holy Trinity Cathedral, the spiritual heart of Georgia.",
    description:
      "Completed in 2004, Sameba is one of the largest Eastern Orthodox cathedrals in the world, sited on Elia Hill overlooking the city. Its gold dome and scale make it visible from most of Tbilisi.",
    regionSlug: "tbilisi",
    categorySlug: "culture",
    latitude: 41.6969,
    longitude: 44.821,
    bestSeason: "Year-round",
    recommendedDuration: 60,
    difficulty: Difficulty.EASY,
    entranceFee: "Free",
    parking: true,
    familyFriendly: true,
    tags: ["cathedral", "religious-site"],
  },
  {
    slug: "mtatsminda-park",
    name: "Mtatsminda Park",
    shortDescription: "Mountaintop park and funicular with sweeping city views.",
    description:
      "Reached by a historic funicular railway, Mtatsminda Park sits atop Mount Mtatsminda with an amusement park, restaurants, and the best sunset view over Tbilisi.",
    regionSlug: "tbilisi",
    categorySlug: "nature",
    latitude: 41.6975,
    longitude: 44.7878,
    bestSeason: "May – September",
    recommendedDuration: 120,
    difficulty: Difficulty.EASY,
    entranceFee: "Funicular ticketed; park free",
    parking: true,
    familyFriendly: true,
    tags: ["viewpoint", "funicular", "amusement-park"],
  },
  {
    slug: "chronicle-of-georgia",
    name: "Chronicle of Georgia",
    shortDescription: "Monumental pillars carved with 3,000 years of Georgian history.",
    description:
      "A striking, unfinished monument on a plateau above the Tbilisi Sea, its 16 towering pillars depict Georgian kings, queens, and biblical scenes. One of the city's most dramatic and least crowded viewpoints.",
    regionSlug: "tbilisi",
    categorySlug: "history",
    latitude: 41.7742,
    longitude: 44.7911,
    bestSeason: "April – October",
    recommendedDuration: 60,
    difficulty: Difficulty.EASY,
    entranceFee: "Free",
    parking: true,
    familyFriendly: true,
    tags: ["monument", "viewpoint", "hidden-gem"],
  },

  // ── Mtskheta-Mtianeti (incl. Kazbegi area) ──────────────────────
  {
    slug: "gergeti-trinity-church",
    name: "Gergeti Trinity Church",
    shortDescription: "Iconic mountainside church beneath Mount Kazbek.",
    description:
      "Perched at 2,170m below the glaciers of Mount Kazbek, Gergeti Trinity Church is Georgia's most photographed landmark. Reachable by 4x4 or a steep ~2-hour hike from Stepantsminda.",
    regionSlug: "mtskheta-mtianeti",
    categorySlug: "mountains",
    latitude: 42.6625,
    longitude: 44.6188,
    bestSeason: "June – September",
    recommendedDuration: 150,
    difficulty: Difficulty.HARD,
    entranceFee: "Free",
    parking: false,
    familyFriendly: false,
    tags: ["church", "hiking", "mount-kazbek"],
  },
  {
    slug: "stepantsminda",
    name: "Stepantsminda",
    shortDescription: "Gateway town to Mount Kazbek and the Georgian Military Highway.",
    description:
      "Formerly known as Kazbegi, this small town is the base for treks to Gergeti Trinity Church and the Kazbek massif, with guesthouses, homestays, and views of the mountain from nearly every street.",
    regionSlug: "mtskheta-mtianeti",
    categorySlug: "mountains",
    latitude: 42.6578,
    longitude: 44.6449,
    bestSeason: "May – October",
    recommendedDuration: 240,
    difficulty: Difficulty.EASY,
    entranceFee: "Free",
    parking: true,
    familyFriendly: true,
    tags: ["town", "base-camp", "military-highway"],
  },
  {
    slug: "juta",
    name: "Juta",
    shortDescription: "Remote trailhead village beneath the Chaukhi massif.",
    description:
      "A small highland village at the end of a rough road, Juta is the starting point for treks to Chaukhi Pass and the Abudelauri lakes — some of the most dramatic trekking in the Caucasus.",
    regionSlug: "mtskheta-mtianeti",
    categorySlug: "adventure",
    latitude: 42.5844,
    longitude: 44.7702,
    bestSeason: "June – September",
    recommendedDuration: 360,
    difficulty: Difficulty.HARD,
    entranceFee: "Free",
    parking: true,
    familyFriendly: false,
    tags: ["trekking", "remote", "chaukhi"],
  },
  {
    slug: "dariali-gorge",
    name: "Dariali Gorge",
    shortDescription: "Dramatic narrow gorge on the Georgian-Russian border.",
    description:
      "A steep, narrow canyon carved by the Terek River along the Georgian Military Highway near the Russian border, historically one of the few passes through the central Caucasus.",
    regionSlug: "mtskheta-mtianeti",
    categorySlug: "mountains",
    latitude: 42.7402,
    longitude: 44.6382,
    bestSeason: "May – October",
    recommendedDuration: 45,
    difficulty: Difficulty.EASY,
    entranceFee: "Free",
    parking: true,
    familyFriendly: true,
    tags: ["gorge", "border", "scenic-drive"],
  },
  {
    slug: "mtskheta",
    name: "Mtskheta",
    shortDescription: "Georgia's ancient capital and UNESCO World Heritage town.",
    description:
      "One of the oldest cities in Georgia and its spiritual center, Mtskheta sits at the confluence of the Mtkvari and Aragvi rivers, home to Svetitskhoveli Cathedral and a UNESCO World Heritage designation.",
    regionSlug: "mtskheta-mtianeti",
    categorySlug: "culture",
    latitude: 41.8453,
    longitude: 44.7208,
    bestSeason: "Year-round",
    recommendedDuration: 150,
    difficulty: Difficulty.EASY,
    entranceFee: "Free",
    parking: true,
    familyFriendly: true,
    tags: ["unesco", "ancient-capital"],
  },
  {
    slug: "jvari-monastery",
    name: "Jvari Monastery",
    shortDescription: "Clifftop monastery overlooking the meeting of two rivers.",
    description:
      "A 6th-century Georgian Orthodox monastery perched on a mountain above Mtskheta, with a sweeping view over the confluence of the Aragvi and Mtkvari rivers. Part of the same UNESCO listing as Mtskheta.",
    regionSlug: "mtskheta-mtianeti",
    categorySlug: "culture",
    latitude: 41.8394,
    longitude: 44.7186,
    bestSeason: "Year-round",
    recommendedDuration: 60,
    difficulty: Difficulty.EASY,
    entranceFee: "Free",
    parking: true,
    familyFriendly: true,
    tags: ["monastery", "unesco", "viewpoint"],
  },
  {
    slug: "svetitskhoveli-cathedral",
    name: "Svetitskhoveli Cathedral",
    shortDescription: "Georgia's second-largest cathedral, the burial site of kings.",
    description:
      "Built in the 11th century in Mtskheta, Svetitskhoveli ('Living Pillar Cathedral') is one of the most sacred sites in Georgia and the traditional burial place of Georgian royalty.",
    regionSlug: "mtskheta-mtianeti",
    categorySlug: "culture",
    latitude: 41.8447,
    longitude: 44.7194,
    bestSeason: "Year-round",
    recommendedDuration: 60,
    difficulty: Difficulty.EASY,
    entranceFee: "Free",
    parking: false,
    familyFriendly: true,
    tags: ["cathedral", "unesco", "religious-site"],
  },
  {
    slug: "ananuri",
    name: "Ananuri",
    shortDescription: "Fortified castle complex above a turquoise reservoir.",
    description:
      "A stone fortress and church complex on the banks of the Aragvi River, overlooking the Zhinvali Reservoir along the Georgian Military Highway.",
    regionSlug: "mtskheta-mtianeti",
    categorySlug: "history",
    latitude: 42.1633,
    longitude: 44.6997,
    bestSeason: "April – October",
    recommendedDuration: 60,
    difficulty: Difficulty.EASY,
    entranceFee: "Free",
    parking: true,
    familyFriendly: true,
    tags: ["fortress", "reservoir", "scenic-drive"],
  },

  // ── Kakheti ──────────────────────────────────────────────────────
  {
    slug: "telavi",
    name: "Telavi",
    shortDescription: "The capital of Georgia's wine country.",
    description:
      "The largest town in Kakheti, surrounded by vineyards and family wineries, with a hilltop old town, the Batonis Tsikhe fortress, and views across the Alazani Valley to the Caucasus.",
    regionSlug: "kakheti",
    categorySlug: "wine",
    latitude: 41.9189,
    longitude: 45.4739,
    bestSeason: "September – October (harvest)",
    recommendedDuration: 180,
    difficulty: Difficulty.EASY,
    entranceFee: "Free",
    parking: true,
    familyFriendly: true,
    tags: ["wine", "vineyards", "old-town"],
  },
  {
    slug: "sighnaghi",
    name: "Sighnaghi",
    shortDescription: "The 'City of Love' — a walled hill town over the Alazani Valley.",
    description:
      "A pastel-colored, cobblestoned town encircled by a 4.5km 18th-century wall, famous for panoramic valley views, a 24-hour wedding registry, and nearby wineries.",
    regionSlug: "kakheti",
    categorySlug: "wine",
    latitude: 41.6199,
    longitude: 45.9169,
    bestSeason: "April – October",
    recommendedDuration: 150,
    difficulty: Difficulty.EASY,
    entranceFee: "Free",
    parking: true,
    familyFriendly: true,
    tags: ["hilltop-town", "wine", "viewpoint"],
  },
  {
    slug: "gremi",
    name: "Gremi",
    shortDescription: "Ruined citadel of the former Kingdom of Kakheti.",
    description:
      "Once the capital of the Kingdom of Kakheti, Gremi's hilltop Church of the Archangels and royal tower survive above the Alazani Valley, with a small museum inside.",
    regionSlug: "kakheti",
    categorySlug: "history",
    latitude: 41.9364,
    longitude: 45.6906,
    bestSeason: "April – October",
    recommendedDuration: 60,
    difficulty: Difficulty.EASY,
    entranceFee: "Ticketed (museum)",
    parking: true,
    familyFriendly: true,
    tags: ["citadel", "royal-history"],
  },
  {
    slug: "alaverdi-monastery",
    name: "Alaverdi Monastery",
    shortDescription: "One of Georgia's tallest cathedrals, surrounded by vineyards.",
    description:
      "An 11th-century cathedral rising 50 meters above the Alazani Valley, with an active monastery that produces its own qvevri wine using traditional methods.",
    regionSlug: "kakheti",
    categorySlug: "culture",
    latitude: 41.9394,
    longitude: 45.5847,
    bestSeason: "Year-round",
    recommendedDuration: 60,
    difficulty: Difficulty.EASY,
    entranceFee: "Free",
    parking: true,
    familyFriendly: true,
    tags: ["monastery", "wine", "cathedral"],
  },

  // ── Svaneti ──────────────────────────────────────────────────────
  {
    slug: "mestia",
    name: "Mestia",
    shortDescription: "Medieval stone tower village in the high Caucasus.",
    description:
      "The main town of Svaneti, known for its distinctive defensive stone towers, the Svaneti History and Ethnography Museum, and access to some of Georgia's highest peaks.",
    regionSlug: "svaneti",
    categorySlug: "mountains",
    latitude: 43.045,
    longitude: 42.725,
    bestSeason: "June – September",
    recommendedDuration: 240,
    difficulty: Difficulty.MODERATE,
    entranceFee: "Free",
    parking: true,
    familyFriendly: true,
    tags: ["svan-towers", "unesco-buffer", "mountain-town"],
  },
  {
    slug: "ushguli",
    name: "Ushguli",
    shortDescription: "One of the highest permanently inhabited settlements in Europe.",
    description:
      "A cluster of four villages at 2,100m under Mount Shkhara, Ushguli is a UNESCO World Heritage Site famed for its Svan towers and remoteness — reachable by a rough mountain road from Mestia.",
    regionSlug: "svaneti",
    categorySlug: "mountains",
    latitude: 42.9142,
    longitude: 43.0072,
    bestSeason: "June – September",
    recommendedDuration: 300,
    difficulty: Difficulty.HARD,
    entranceFee: "Free",
    parking: true,
    familyFriendly: false,
    tags: ["unesco", "svan-towers", "remote"],
  },
  {
    slug: "koruldi-lakes",
    name: "Koruldi Lakes",
    shortDescription: "Alpine lakes above Mestia with views of Mount Ushba.",
    description:
      "A high-altitude hike or 4x4 ride above Mestia leads to these small alpine lakes, framed by a panoramic view of Mount Ushba's twin peaks.",
    regionSlug: "svaneti",
    categorySlug: "nature",
    latitude: 43.0342,
    longitude: 42.6892,
    bestSeason: "July – September",
    recommendedDuration: 300,
    difficulty: Difficulty.HARD,
    entranceFee: "Free",
    parking: false,
    familyFriendly: false,
    tags: ["alpine-lake", "hiking", "mount-ushba"],
  },

  // ── Imereti ──────────────────────────────────────────────────────
  {
    slug: "kutaisi",
    name: "Kutaisi",
    shortDescription: "Georgia's ancient western capital, on the Rioni River.",
    description:
      "One of the oldest continuously inhabited cities in the world, Kutaisi is home to the Bagrati Cathedral, a lively market, and easy access to the caves and monasteries of Imereti.",
    regionSlug: "imereti",
    categorySlug: "cities",
    latitude: 42.2679,
    longitude: 42.7,
    bestSeason: "April – October",
    recommendedDuration: 180,
    difficulty: Difficulty.EASY,
    entranceFee: "Free",
    parking: true,
    familyFriendly: true,
    tags: ["city", "market", "cathedral"],
  },
  {
    slug: "prometheus-cave",
    name: "Prometheus Cave",
    shortDescription: "A vast illuminated cave system near Tskaltubo.",
    description:
      "One of Georgia's largest show caves, with a 1.6km walkway past stalactites, underground rivers, and a boat ride on the final stretch.",
    regionSlug: "imereti",
    categorySlug: "nature",
    latitude: 42.3689,
    longitude: 42.5486,
    bestSeason: "Year-round",
    recommendedDuration: 90,
    difficulty: Difficulty.EASY,
    entranceFee: "Ticketed",
    parking: true,
    familyFriendly: true,
    tags: ["cave", "underground-river"],
  },
  {
    slug: "gelati-monastery",
    name: "Gelati Monastery",
    shortDescription: "A UNESCO monastery and former center of learning.",
    description:
      "Founded in 1106 near Kutaisi, Gelati was a medieval academy as well as a monastery, and retains extensive Byzantine-style frescoes. A UNESCO World Heritage Site.",
    regionSlug: "imereti",
    categorySlug: "culture",
    latitude: 42.3128,
    longitude: 42.7442,
    bestSeason: "Year-round",
    recommendedDuration: 60,
    difficulty: Difficulty.EASY,
    entranceFee: "Free",
    parking: true,
    familyFriendly: true,
    tags: ["unesco", "monastery", "frescoes"],
  },
  // Geographic note: Martvili Canyon sits in Martvili Municipality, which
  // is administratively part of Samegrelo-Zemo Svaneti, not Imereti —
  // corrected here rather than fabricating a region assignment.
  {
    slug: "martvili-canyon",
    name: "Martvili Canyon",
    shortDescription: "Turquoise canyon river, explored by raft or on foot.",
    description:
      "A narrow limestone canyon carved by the Abasha River, with a wooden walkway above the water and an optional short raft trip through the gorge.",
    regionSlug: "samegrelo",
    categorySlug: "nature",
    latitude: 42.4064,
    longitude: 42.3872,
    bestSeason: "May – September",
    recommendedDuration: 90,
    difficulty: Difficulty.EASY,
    entranceFee: "Ticketed (raft optional, extra fee)",
    parking: true,
    familyFriendly: true,
    tags: ["canyon", "rafting", "river"],
  },

  // ── Adjara ───────────────────────────────────────────────────────
  {
    slug: "batumi",
    name: "Batumi",
    shortDescription: "Georgia's Black Sea resort city, with a modern skyline.",
    description:
      "A subtropical port city on the Black Sea coast, known for its striking modern architecture, casinos, seaside promenade, and Old Town squares.",
    regionSlug: "adjara",
    categorySlug: "sea",
    latitude: 41.6168,
    longitude: 41.6367,
    bestSeason: "June – September",
    recommendedDuration: 240,
    difficulty: Difficulty.EASY,
    entranceFee: "Free",
    parking: true,
    familyFriendly: true,
    tags: ["beach", "nightlife", "architecture"],
  },
  {
    slug: "batumi-boulevard",
    name: "Batumi Boulevard",
    shortDescription: "A 7km seafront promenade along the Black Sea.",
    description:
      "One of the oldest boulevards in the region, stretching along Batumi's coastline with cycling paths, sculptures (including the moving Ali and Nino statue), and beach access.",
    regionSlug: "adjara",
    categorySlug: "sea",
    latitude: 41.65,
    longitude: 41.635,
    bestSeason: "May – September",
    recommendedDuration: 90,
    difficulty: Difficulty.EASY,
    entranceFee: "Free",
    parking: true,
    familyFriendly: true,
    tags: ["promenade", "beach", "cycling"],
  },
  {
    slug: "gonio-fortress",
    name: "Gonio Fortress",
    shortDescription: "A Roman-era fortress on the Black Sea coast.",
    description:
      "A rectangular Roman fortification just south of Batumi, with walls dating back nearly 2,000 years and ongoing archaeological excavation inside.",
    regionSlug: "adjara",
    categorySlug: "history",
    latitude: 41.5589,
    longitude: 41.5758,
    bestSeason: "Year-round",
    recommendedDuration: 60,
    difficulty: Difficulty.EASY,
    entranceFee: "Ticketed",
    parking: true,
    familyFriendly: true,
    tags: ["roman-fortress", "archaeology"],
  },
  {
    slug: "batumi-botanical-garden",
    name: "Batumi Botanical Garden",
    shortDescription: "A cliffside garden with plants from six continents.",
    description:
      "Founded in 1912 on a series of ridges above the Black Sea, the garden groups plants by climate zone — from Himalayan forest to Mexican desert — connected by coastal walking trails.",
    regionSlug: "adjara",
    categorySlug: "nature",
    latitude: 41.6989,
    longitude: 41.7208,
    bestSeason: "April – October",
    recommendedDuration: 150,
    difficulty: Difficulty.MODERATE,
    entranceFee: "Ticketed",
    parking: true,
    familyFriendly: true,
    tags: ["garden", "coastal-walk"],
  },

  // ── Samtskhe-Javakheti ───────────────────────────────────────────
  {
    slug: "vardzia",
    name: "Vardzia",
    shortDescription: "A 12th-century cave city carved into a cliff face.",
    description:
      "A vast monastic complex of caves cut into the Erusheti Mountain, built as a refuge from Mongol invasion under Queen Tamar. Originally up to 19 stories, with tunnels, a throne room, and a church.",
    regionSlug: "samtskhe-javakheti",
    categorySlug: "history",
    latitude: 41.3903,
    longitude: 43.2872,
    bestSeason: "April – October",
    recommendedDuration: 120,
    difficulty: Difficulty.MODERATE,
    entranceFee: "Ticketed",
    parking: true,
    familyFriendly: true,
    tags: ["cave-city", "unesco-tentative", "queen-tamar"],
  },
  {
    slug: "rabati-castle",
    name: "Rabati Castle",
    shortDescription: "A restored citadel complex in Akhaltsikhe.",
    description:
      "A fortress complex with roots to the 9th century, extensively restored in the 2010s, combining a mosque, church, synagogue, and citadel within its walls.",
    regionSlug: "samtskhe-javakheti",
    categorySlug: "history",
    latitude: 41.6367,
    longitude: 43.0033,
    bestSeason: "Year-round",
    recommendedDuration: 90,
    difficulty: Difficulty.EASY,
    entranceFee: "Ticketed",
    parking: true,
    familyFriendly: true,
    tags: ["castle", "restored"],
  },
  {
    slug: "borjomi",
    name: "Borjomi",
    shortDescription: "A spa town famous for its mineral water and forested park.",
    description:
      "Georgia's best-known spa town, home to the mineral water that bears its name and Borjomi Central Park, gateway to the Borjomi-Kharagauli National Park.",
    regionSlug: "samtskhe-javakheti",
    categorySlug: "nature",
    latitude: 41.8406,
    longitude: 43.3833,
    bestSeason: "May – October",
    recommendedDuration: 150,
    difficulty: Difficulty.EASY,
    entranceFee: "Park ticketed",
    parking: true,
    familyFriendly: true,
    tags: ["spa-town", "mineral-water", "national-park"],
  },
];

// ── Hotels / restaurants / activities (spec §37, §38) ──────────────────────
// Fictional demo listings — generic, plausible names, not real businesses.
// bookingUrl uses the RFC 2606 reserved example.com domain so it can never
// resolve to a real site. Coordinates are small offsets from each hub
// place's real coordinates (a few hundred meters), not invented from
// scratch. Price/rating are left `undefined` on some entries on purpose —
// HotelService/RestaurantService/ActivityService return those as `null`,
// and the AI + UI must show "not currently available" rather than a guess.
interface SeedHotel {
  name: string;
  nearPlaceSlug: (typeof PLACES)[number]["slug"];
  latOffset: number;
  lngOffset: number;
  description: string;
  category: string;
  rating?: number;
  price?: number;
  bookingUrl?: string;
}

interface SeedRestaurant {
  name: string;
  nearPlaceSlug: (typeof PLACES)[number]["slug"];
  latOffset: number;
  lngOffset: number;
  description: string;
  cuisine: string;
  rating?: number;
  priceLevel?: number; // 1-4
  bookingUrl?: string;
}

interface SeedActivity {
  name: string;
  nearPlaceSlug: (typeof PLACES)[number]["slug"];
  latOffset: number;
  lngOffset: number;
  description: string;
  category: ActivityCategory;
  rating?: number;
  price?: number;
  bookingUrl?: string;
}

const HOTELS: SeedHotel[] = [
  { name: "Abanotubani Boutique Hotel", nearPlaceSlug: "old-tbilisi", latOffset: 0.002, lngOffset: 0.003, description: "A restored 19th-century townhouse a short walk from the sulfur baths.", category: "Boutique", rating: 4.6, price: 220, bookingUrl: "https://example.com/book/abanotubani-boutique-hotel" },
  { name: "Sioni Courtyard Guesthouse", nearPlaceSlug: "old-tbilisi", latOffset: -0.003, lngOffset: 0.002, description: "Family-run guesthouse around a quiet vine-covered courtyard.", category: "Guesthouse", rating: 4.3 },
  { name: "Kazbek View Guesthouse", nearPlaceSlug: "stepantsminda", latOffset: 0.003, lngOffset: -0.002, description: "Simple rooms with a direct view of Mount Kazbek from the terrace.", category: "Guesthouse", rating: 4.7, price: 150, bookingUrl: "https://example.com/book/kazbek-view-guesthouse" },
  { name: "Gveleti Mountain Lodge", nearPlaceSlug: "stepantsminda", latOffset: -0.004, lngOffset: 0.003, description: "A small lodge on the road toward Gveleti waterfall.", category: "Lodge" },
  { name: "Alazani Valley View Hotel", nearPlaceSlug: "telavi", latOffset: 0.002, lngOffset: 0.004, description: "Hilltop hotel looking out over the vineyards of the Alazani Valley.", category: "Hotel", rating: 4.5, price: 180, bookingUrl: "https://example.com/book/alazani-valley-view-hotel" },
  { name: "Batonis Tsikhe Inn", nearPlaceSlug: "telavi", latOffset: -0.002, lngOffset: -0.003, description: "Small inn near the old fortress, run by a local winemaking family.", category: "Inn", price: 130 },
  { name: "Sighnaghi Hilltop Hotel", nearPlaceSlug: "sighnaghi", latOffset: 0.003, lngOffset: 0.002, description: "Rooms behind the town wall with panoramic Alazani Valley views.", category: "Hotel", rating: 4.7, price: 200, bookingUrl: "https://example.com/book/sighnaghi-hilltop-hotel" },
  { name: "City of Love Guesthouse", nearPlaceSlug: "sighnaghi", latOffset: -0.002, lngOffset: -0.002, description: "Cobblestone-street guesthouse a few doors from the wedding registry.", category: "Guesthouse", rating: 4.5 },
  { name: "Svan Tower Guesthouse", nearPlaceSlug: "mestia", latOffset: 0.003, lngOffset: 0.002, description: "Stays in a working family homestead beneath a real Svan defensive tower.", category: "Guesthouse", rating: 4.8, price: 100, bookingUrl: "https://example.com/book/svan-tower-guesthouse" },
  { name: "Mestia Alpine Lodge", nearPlaceSlug: "mestia", latOffset: -0.003, lngOffset: -0.004, description: "Modern lodge at the edge of town with mountain-facing rooms.", category: "Lodge", price: 160 },
  { name: "Rioni Riverside Hotel", nearPlaceSlug: "kutaisi", latOffset: 0.002, lngOffset: 0.003, description: "Mid-range hotel a few minutes' walk from the Rioni River promenade.", category: "Hotel", rating: 4.4, price: 140 },
  { name: "Bagrati View Inn", nearPlaceSlug: "kutaisi", latOffset: -0.003, lngOffset: 0.002, description: "Small inn on the hill facing Bagrati Cathedral.", category: "Inn", rating: 4.1 },
  { name: "Batumi Seafront Hotel", nearPlaceSlug: "batumi", latOffset: 0.002, lngOffset: -0.003, description: "High-rise hotel directly on Batumi Boulevard.", category: "Hotel", rating: 4.6, price: 250, bookingUrl: "https://example.com/book/batumi-seafront-hotel" },
  { name: "Boulevard Boutique Rooms", nearPlaceSlug: "batumi", latOffset: -0.002, lngOffset: 0.004, description: "Small boutique stay a block back from the seafront.", category: "Boutique", rating: 4.3 },
  { name: "Borjomi Park Hotel", nearPlaceSlug: "borjomi", latOffset: 0.003, lngOffset: 0.002, description: "Spa hotel at the edge of Borjomi Central Park.", category: "Hotel", rating: 4.5, price: 170, bookingUrl: "https://example.com/book/borjomi-park-hotel" },
  { name: "Mineral Springs Guesthouse", nearPlaceSlug: "borjomi", latOffset: -0.002, lngOffset: -0.003, description: "Family guesthouse a short walk from the mineral water pavilion.", category: "Guesthouse" },
];

const RESTAURANTS: SeedRestaurant[] = [
  { name: "Old Town Khinkali House", nearPlaceSlug: "old-tbilisi", latOffset: 0.001, lngOffset: -0.002, description: "Georgian dumplings and grilled meats in a cellar dining room.", cuisine: "Georgian", rating: 4.7, priceLevel: 2, bookingUrl: "https://example.com/book/old-town-khinkali-house" },
  { name: "Mtkvari Riverside Bistro", nearPlaceSlug: "old-tbilisi", latOffset: -0.002, lngOffset: 0.003, description: "European-leaning menu with river views near the Bridge of Peace.", cuisine: "European", priceLevel: 3 },
  { name: "Kazbegi Family Kitchen", nearPlaceSlug: "stepantsminda", latOffset: 0.002, lngOffset: 0.001, description: "Home-style Georgian cooking run out of a family house.", cuisine: "Georgian", rating: 4.6, priceLevel: 1 },
  { name: "Trinity Trail Café", nearPlaceSlug: "stepantsminda", latOffset: -0.003, lngOffset: -0.001, description: "Simple café popular with hikers heading up to Gergeti Trinity Church.", cuisine: "Café", rating: 4.2, priceLevel: 1 },
  { name: "Telavi Marani Wine Restaurant", nearPlaceSlug: "telavi", latOffset: 0.002, lngOffset: -0.002, description: "Restaurant built around a working qvevri wine cellar.", cuisine: "Georgian", rating: 4.8, priceLevel: 3, bookingUrl: "https://example.com/book/telavi-marani-wine-restaurant" },
  { name: "Vineyard Table", nearPlaceSlug: "telavi", latOffset: -0.001, lngOffset: 0.003, description: "Seasonal Kakhetian dishes served among the vines.", cuisine: "Georgian", rating: 4.4, priceLevel: 2 },
  { name: "Pheasant's Tears Restaurant", nearPlaceSlug: "sighnaghi", latOffset: 0.001, lngOffset: 0.002, description: "Natural-wine restaurant paired with a traditional Georgian menu.", cuisine: "Georgian", rating: 4.9, priceLevel: 3, bookingUrl: "https://example.com/book/pheasants-tears-restaurant" },
  { name: "Alazani View Café", nearPlaceSlug: "sighnaghi", latOffset: -0.002, lngOffset: -0.002, description: "Coffee and light meals on a terrace over the valley.", cuisine: "Café", priceLevel: 1 },
  { name: "Svaneti Highland Kitchen", nearPlaceSlug: "mestia", latOffset: 0.002, lngOffset: -0.001, description: "Svan specialties like kubdari served in a tower-village dining room.", cuisine: "Svan", rating: 4.7, priceLevel: 2 },
  { name: "Tower View Café", nearPlaceSlug: "mestia", latOffset: -0.001, lngOffset: 0.002, description: "Small café with a direct view of Mestia's stone towers.", cuisine: "Café", rating: 4.2, priceLevel: 1 },
  { name: "Kutaisi Market Kitchen", nearPlaceSlug: "kutaisi", latOffset: 0.001, lngOffset: 0.002, description: "Stalls-turned-kitchen serving dishes straight from the Green Market.", cuisine: "Georgian", rating: 4.5, priceLevel: 1 },
  { name: "Imereti Cheese House", nearPlaceSlug: "kutaisi", latOffset: -0.002, lngOffset: -0.001, description: "Restaurant specializing in Imeretian cheese breads and stews.", cuisine: "Georgian", priceLevel: 2 },
  { name: "Adjaruli Khachapuri House", nearPlaceSlug: "batumi", latOffset: 0.002, lngOffset: 0.001, description: "Wood-fired boat-shaped khachapuri, an Adjaran specialty.", cuisine: "Georgian", rating: 4.8, priceLevel: 2, bookingUrl: "https://example.com/book/adjaruli-khachapuri-house" },
  { name: "Black Sea Grill", nearPlaceSlug: "batumi", latOffset: -0.001, lngOffset: -0.003, description: "Grilled Black Sea fish and seafood on the boulevard.", cuisine: "Seafood", priceLevel: 3 },
  { name: "Firuza Borjomi Restaurant", nearPlaceSlug: "borjomi", latOffset: 0.001, lngOffset: 0.002, description: "Long-running restaurant near the mineral water park entrance.", cuisine: "Georgian", rating: 4.6, priceLevel: 2 },
  { name: "Central Park Café", nearPlaceSlug: "borjomi", latOffset: -0.002, lngOffset: -0.001, description: "Casual café just inside Borjomi Central Park.", cuisine: "Café", rating: 4.1, priceLevel: 1 },
];

const ACTIVITIES: SeedActivity[] = [
  { name: "Old Tbilisi Walking Tour", nearPlaceSlug: "old-tbilisi", latOffset: 0.001, lngOffset: 0.001, description: "Guided walk through Abanotubani, Sioni Cathedral, and the Bridge of Peace.", category: ActivityCategory.TOUR, rating: 4.8, price: 60, bookingUrl: "https://example.com/book/old-tbilisi-walking-tour" },
  { name: "Sulfur Bathhouse Experience", nearPlaceSlug: "old-tbilisi", latOffset: -0.001, lngOffset: -0.002, description: "Traditional sulfur bath and scrub in a domed bathhouse.", category: ActivityCategory.GENERAL, rating: 4.5, price: 45 },
  { name: "Gergeti Trinity Church Hike", nearPlaceSlug: "stepantsminda", latOffset: 0.002, lngOffset: 0.002, description: "Guided hike up to the church beneath Mount Kazbek.", category: ActivityCategory.ADVENTURE, rating: 4.9 },
  { name: "Juta to Chaukhi Pass Trek", nearPlaceSlug: "stepantsminda", latOffset: -0.002, lngOffset: -0.003, description: "Full-day guided trek toward the Chaukhi massif.", category: ActivityCategory.ADVENTURE, rating: 4.8, price: 80 },
  { name: "Kakheti Wine Tasting Tour", nearPlaceSlug: "telavi", latOffset: 0.001, lngOffset: -0.001, description: "Tastings at family wineries around Telavi, including qvevri cellars.", category: ActivityCategory.WINE_TASTING, rating: 4.9, price: 70, bookingUrl: "https://example.com/book/kakheti-wine-tasting-tour" },
  { name: "Telavi Old Town Tour", nearPlaceSlug: "telavi", latOffset: -0.002, lngOffset: 0.002, description: "Short guided walk through Telavi's old town and fortress.", category: ActivityCategory.TOUR, price: 40 },
  { name: "Bodbe Monastery & Wine Tasting", nearPlaceSlug: "sighnaghi", latOffset: 0.002, lngOffset: -0.002, description: "Visit to St. Nino's monastery followed by a local wine tasting.", category: ActivityCategory.WINE_TASTING, rating: 4.6, price: 55 },
  { name: "Sighnaghi Wall Walk Tour", nearPlaceSlug: "sighnaghi", latOffset: -0.001, lngOffset: 0.001, description: "Guided walk along sections of the 18th-century town wall.", category: ActivityCategory.TOUR, rating: 4.3 },
  { name: "Koruldi Lakes Guided Hike", nearPlaceSlug: "mestia", latOffset: 0.002, lngOffset: 0.003, description: "Full-day guided hike up to the Koruldi Lakes viewpoint.", category: ActivityCategory.ADVENTURE, rating: 4.9, price: 90 },
  { name: "Svaneti Museum & Towers Tour", nearPlaceSlug: "mestia", latOffset: -0.001, lngOffset: -0.002, description: "Guided visit to the Svaneti History Museum and a family tower.", category: ActivityCategory.CULTURE, price: 35 },
  { name: "Prometheus Cave & Martvili Canyon Day Tour", nearPlaceSlug: "kutaisi", latOffset: 0.002, lngOffset: 0.001, description: "Day trip combining Prometheus Cave and the Martvili Canyon boat ride.", category: ActivityCategory.TOUR, rating: 4.7, price: 65 },
  { name: "Gelati & Motsameta Monastery Tour", nearPlaceSlug: "kutaisi", latOffset: -0.002, lngOffset: -0.001, description: "Half-day tour of the UNESCO-listed Gelati and Motsameta monasteries.", category: ActivityCategory.CULTURE, rating: 4.6, price: 40 },
  { name: "Batumi Botanical Garden Guided Walk", nearPlaceSlug: "batumi", latOffset: 0.001, lngOffset: 0.002, description: "Guided walk through the garden's plant collections from six continents.", category: ActivityCategory.TOUR, rating: 4.5, price: 30 },
  { name: "Adjara Rafting Adventure", nearPlaceSlug: "batumi", latOffset: -0.002, lngOffset: -0.002, description: "White-water rafting on a river outside Batumi.", category: ActivityCategory.ADVENTURE, rating: 4.7, price: 95 },
  { name: "Borjomi-Kharagauli National Park Hike", nearPlaceSlug: "borjomi", latOffset: 0.002, lngOffset: 0.002, description: "Guided hike into one of Europe's largest national parks.", category: ActivityCategory.ADVENTURE, rating: 4.7, price: 50 },
  { name: "Mineral Water Spa Day", nearPlaceSlug: "borjomi", latOffset: -0.001, lngOffset: -0.002, description: "Spa treatments using Borjomi's mineral water.", category: ActivityCategory.GENERAL, rating: 4.4 },
];

// Realistic-shaped Georgia private-driver day-rate market, not sourced
// from a real vendor — an admin can change these via the pricing-rules
// API (Phase 6). Only seeded if no active rule exists yet, so it never
// clobbers a real admin's configuration.
const DEFAULT_PRICING_RULE = {
  name: "Default Georgia rates",
  pricePerKm: 0.6,
  dailyDriverRate: 200,
  minimumTripPrice: 80,
  fuelRate: 0.35,
  additionalFees: [{ label: "Booking fee", amount: 10 }],
};

// Fictional demo driver profiles — clearly fake contact details, not real
// people or businesses. Lets driver selection (Phase 6) be exercised
// without waiting on a real driver onboarding flow. One is left PENDING
// verification on purpose, to prove unverified drivers don't show up in
// "available" listings.
interface SeedDriver {
  name: string;
  phone: string;
  telegramId: string;
  languages: string[];
  vehicle: string;
  vehicleType: string;
  seats: number;
  pricePerKm: number;
  dailyRate: number;
  minimumTripPrice: number;
  rating: number;
  tripsCompleted: number;
  verificationStatus: DriverVerificationStatus;
  availabilityStatus: DriverAvailabilityStatus;
  regionSlugs: (typeof REGIONS)[number]["slug"][];
}

const DRIVERS: SeedDriver[] = [
  {
    name: "Giorgi Beridze",
    phone: "+995 555 00 11 22",
    telegramId: "@giorgi_demo_driver",
    languages: ["Georgian", "English", "Russian"],
    vehicle: "Toyota Camry",
    vehicleType: "Sedan",
    seats: 4,
    pricePerKm: 0.55,
    dailyRate: 180,
    minimumTripPrice: 70,
    rating: 4.8,
    tripsCompleted: 142,
    verificationStatus: DriverVerificationStatus.VERIFIED,
    availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
    regionSlugs: ["tbilisi", "kakheti", "mtskheta-mtianeti"],
  },
  {
    name: "Nino Kapanadze",
    phone: "+995 555 00 22 33",
    telegramId: "@nino_demo_driver",
    languages: ["Georgian", "English", "German"],
    vehicle: "Mercedes Vito",
    vehicleType: "Minivan",
    seats: 7,
    pricePerKm: 0.7,
    dailyRate: 220,
    minimumTripPrice: 90,
    rating: 4.9,
    tripsCompleted: 98,
    verificationStatus: DriverVerificationStatus.VERIFIED,
    availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
    regionSlugs: ["adjara", "guria", "imereti"],
  },
  {
    name: "Davit Lomidze",
    phone: "+995 555 00 33 44",
    telegramId: "@davit_demo_driver",
    languages: ["Georgian", "Russian"],
    vehicle: "Toyota Land Cruiser",
    vehicleType: "SUV",
    seats: 5,
    pricePerKm: 0.8,
    dailyRate: 250,
    minimumTripPrice: 100,
    rating: 4.7,
    tripsCompleted: 67,
    verificationStatus: DriverVerificationStatus.VERIFIED,
    availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
    regionSlugs: ["svaneti", "racha", "imereti"],
  },
  {
    name: "Ana Tsereteli",
    phone: "+995 555 00 44 55",
    telegramId: "@ana_demo_driver",
    languages: ["Georgian", "English", "French"],
    vehicle: "Skoda Octavia",
    vehicleType: "Sedan",
    seats: 4,
    pricePerKm: 0.5,
    dailyRate: 170,
    minimumTripPrice: 65,
    rating: 5.0,
    tripsCompleted: 210,
    verificationStatus: DriverVerificationStatus.VERIFIED,
    availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
    regionSlugs: ["kakheti"],
  },
  {
    name: "Zurab Maisuradze",
    phone: "+995 555 00 55 66",
    telegramId: "@zurab_demo_driver",
    languages: ["Georgian", "Russian", "Turkish"],
    vehicle: "Ford Transit",
    vehicleType: "Minivan",
    seats: 6,
    pricePerKm: 0.6,
    dailyRate: 190,
    minimumTripPrice: 75,
    rating: 4.6,
    tripsCompleted: 54,
    // Left pending on purpose — see comment above.
    verificationStatus: DriverVerificationStatus.PENDING,
    availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
    regionSlugs: ["samtskhe-javakheti", "kvemo-kartli"],
  },
];

async function main() {
  console.log(`Seeding ${REGIONS.length} regions...`);
  for (const region of REGIONS) {
    await prisma.region.upsert({
      where: { slug: region.slug },
      update: { name: region.name },
      create: region,
    });
  }

  console.log(`Seeding ${CATEGORIES.length} categories...`);
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });
  }

  console.log(`Seeding ${PLACES.length} places...`);
  for (const place of PLACES) {
    const region = await prisma.region.findUniqueOrThrow({ where: { slug: place.regionSlug } });
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: place.categorySlug } });

    await prisma.place.upsert({
      where: { slug: place.slug },
      update: {
        name: place.name,
        shortDescription: place.shortDescription,
        description: place.description,
        regionId: region.id,
        categoryId: category.id,
        latitude: place.latitude,
        longitude: place.longitude,
        bestSeason: place.bestSeason,
        recommendedDuration: place.recommendedDuration,
        difficulty: place.difficulty,
        entranceFee: place.entranceFee,
        parking: place.parking,
        familyFriendly: place.familyFriendly,
        tags: place.tags,
        status: PlaceStatus.PUBLISHED,
      },
      create: {
        slug: place.slug,
        name: place.name,
        shortDescription: place.shortDescription,
        description: place.description,
        regionId: region.id,
        categoryId: category.id,
        latitude: place.latitude,
        longitude: place.longitude,
        bestSeason: place.bestSeason,
        recommendedDuration: place.recommendedDuration,
        difficulty: place.difficulty,
        entranceFee: place.entranceFee,
        parking: place.parking,
        familyFriendly: place.familyFriendly,
        tags: place.tags,
        status: PlaceStatus.PUBLISHED,
      },
    });
  }

  console.log(`Seeding ${HOTELS.length} hotels...`);
  for (const hotel of HOTELS) {
    const existing = await prisma.hotel.findFirst({ where: { name: hotel.name } });
    if (existing) continue;

    const place = await prisma.place.findUniqueOrThrow({ where: { slug: hotel.nearPlaceSlug } });
    await prisma.hotel.create({
      data: {
        name: hotel.name,
        regionId: place.regionId,
        nearPlaceId: place.id,
        latitude: place.latitude + hotel.latOffset,
        longitude: place.longitude + hotel.lngOffset,
        description: hotel.description,
        category: hotel.category,
        rating: hotel.rating,
        price: hotel.price,
        bookingUrl: hotel.bookingUrl,
      },
    });
  }

  console.log(`Seeding ${RESTAURANTS.length} restaurants...`);
  for (const restaurant of RESTAURANTS) {
    const existing = await prisma.restaurant.findFirst({ where: { name: restaurant.name } });
    if (existing) continue;

    const place = await prisma.place.findUniqueOrThrow({ where: { slug: restaurant.nearPlaceSlug } });
    await prisma.restaurant.create({
      data: {
        name: restaurant.name,
        nearPlaceId: place.id,
        latitude: place.latitude + restaurant.latOffset,
        longitude: place.longitude + restaurant.lngOffset,
        description: restaurant.description,
        cuisine: restaurant.cuisine,
        rating: restaurant.rating,
        priceLevel: restaurant.priceLevel,
        bookingUrl: restaurant.bookingUrl,
      },
    });
  }

  console.log(`Seeding ${ACTIVITIES.length} activities...`);
  for (const activity of ACTIVITIES) {
    const existing = await prisma.activity.findFirst({ where: { name: activity.name } });
    if (existing) continue;

    const place = await prisma.place.findUniqueOrThrow({ where: { slug: activity.nearPlaceSlug } });
    await prisma.activity.create({
      data: {
        name: activity.name,
        slug: slugify(activity.name),
        nearPlaceId: place.id,
        category: activity.category,
        latitude: place.latitude + activity.latOffset,
        longitude: place.longitude + activity.lngOffset,
        description: activity.description,
        rating: activity.rating,
        price: activity.price,
        bookingUrl: activity.bookingUrl,
      },
    });
  }

  const hasActiveRule = await prisma.pricingRule.findFirst({ where: { isActive: true } });
  if (!hasActiveRule) {
    console.log("Seeding default active pricing rule...");
    await prisma.pricingRule.create({ data: { ...DEFAULT_PRICING_RULE, isActive: true } });
  }

  console.log(`Seeding ${DRIVERS.length} demo drivers...`);
  for (const driver of DRIVERS) {
    const existing = await prisma.driver.findFirst({ where: { name: driver.name } });
    if (existing) continue;

    const regionIds = await Promise.all(
      driver.regionSlugs.map(async (slug) => (await prisma.region.findUniqueOrThrow({ where: { slug } })).id)
    );

    await prisma.driver.create({
      data: {
        name: driver.name,
        phone: driver.phone,
        telegramId: driver.telegramId,
        languages: driver.languages,
        vehicle: driver.vehicle,
        vehicleType: driver.vehicleType,
        seats: driver.seats,
        pricePerKm: driver.pricePerKm,
        dailyRate: driver.dailyRate,
        minimumTripPrice: driver.minimumTripPrice,
        rating: driver.rating,
        tripsCompleted: driver.tripsCompleted,
        verificationStatus: driver.verificationStatus,
        availabilityStatus: driver.availabilityStatus,
        regions: { create: regionIds.map((regionId) => ({ regionId })) },
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
