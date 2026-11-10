import type { Category } from "../types";
import type { DraftProduct } from "./rows";

/**
 * Category resolution for imported rows:
 *   manual pick → value from the file → keyword guess from the title → default.
 * The guesser is a small ordered rule set tuned for an electronics store:
 * accessory words win first ("iPad case" is a case, not an iPad).
 */

export type CategorySource = "manual" | "file" | "new" | "existing" | "auto" | "default" | "none";

export interface CategoryChoice {
  categoryId: string | null;
  source: CategorySource;
  /** For source "new": the category that will be created. */
  newName?: string;
}

export interface CategoryOptions {
  autoDetect: boolean;
  createMissing: boolean;
  defaultCategoryId: string | null;
}

interface Rule {
  id: string;
  seedId: string;
  stems: string[];
  icon: string;
  re: RegExp;
}

const RULES: Rule[] = [
  {
    id: "accessories",
    seedId: "cat-accessories",
    stems: ["accessor"],
    icon: "Cable",
    re: /\b(\w*cases?\d*|covers?|tv ?stick|fire ?stick|chromecast|tv ?box|pouch|airtags?|hdmi|splitter|converter|capture card|extension|surge|(?:[1-9]\d{1,2},?\d{3}) ?mah|ip[ae][rc]?f[ea]c?t|sleeve|screen ?guard|protector|tempered|charger|chargers|charging|adapter|adaptor|cable|cables|cord|power ?banks?|magsafe|holder|stand|mount|tripod|strap|skin|backpack|bags?|hub|dock|dongle|stylus|pencil|keyboard|mouse|memory card|sd card|flash ?drive|otg|usb|type ?-?c|lightning|plug|ring light|selfie|lanyard|pd)\b/i,
  },
  {
    id: "gaming",
    seedId: "cat-gaming",
    stems: ["gam", "console", "playstation"],
    icon: "Gamepad2",
    re: /\b(playstation|gaming chair|ps[2-5]|xbox|nintendo|games?|assassin'?s creed|horizon (zero|forbidden)|god of war|spider-?man|call of duty|gta( ?v| ?5)?|grand theft auto|fifa|fc ?2[4-9]|mortal kombat|tekken|elden ring|red dead|dragon ball|resident evil|gran turismo|ghost of tsushima|uncharted|last of us|minecraft|zelda|pokemon|nba ?2k\d*|need for speed|far cry|hogwarts|cyberpunk|joy-?cons?|game ?pad|controller|joystick|console|dualsense|dualshock|steam deck)\b/i,
  },
  {
    id: "audio",
    seedId: "cat-audio",
    stems: ["audio", "sound", "headphone", "speaker", "music"],
    icon: "Headphones",
    re: /\b(head ?phones?|head ?sets?|ear ?pods?|air ?pods?|\w*buds?\d*|onyx|harman|earphones?|speakers?|sound ?bar|jbl|beats|bose|marshall|subwoofer|amplifier|microphone|freepods|freebuds|tws|neckband|wh-?1000\w*|wf-?1000\w*)\b/i,
  },
  {
    id: "wearables",
    seedId: "cat-wearables",
    stems: ["wearable", "watch", "smartwatch"],
    icon: "Watch",
    re: /\b(smart ?watch(es)?|watch(es)?|smart ?band|fitness band|fitbit|smart ?glass(es)?|smart ?ring|amazfit|galaxy fit)\b/i,
  },
  {
    id: "cameras",
    seedId: "cat-cameras",
    stems: ["camera", "photo"],
    icon: "Camera",
    re: /\b(cameras?|camcorder|gopro|dslr|mirrorless|nikon|fujifilm|instax|polaroid|drones?|dji|lens(es)?)\b/i,
  },
  {
    id: "tablets",
    seedId: "cat-tablets",
    stems: ["tablet", "ipad"],
    icon: "Tablet",
    re: /\b(ipad|\w*tab+l+ets?|galaxy tab|tab s\d+|tab a\d*|kindle|e-?reader|matepad)\b/i,
  },
  {
    id: "laptops",
    seedId: "cat-laptops",
    stems: ["laptop", "computer", "notebook", "macbook"],
    icon: "Laptop",
    re: /\b(laptops?|notebooks?|macbook|elitebook|probook|thinkpad|ideapad|zenbook|vivobook|chromebook|surface (laptop|pro)|xps|latitude|inspiron|pavilion|envy|spectre|omen|legion|aspire|predator|imac|mac ?mini|desktop|all-in-one|ssd|core i[3579]|ryzen \d)\b/i,
  },
  {
    id: "smartphones",
    seedId: "cat-phones",
    stems: ["phone", "smartphone", "mobile"],
    icon: "Smartphone",
    re: /\b(i ?phones?|smart ?phones?|phones?|galaxy (s|a|z|note|m)\s?\d+|galaxy (fold|flip)|pixel \d+|tecno|infinix|itel|redmi|xiaomi|poco|oppo|vivo|realme|oneplus|nokia|huawei|honor|motorola|moto g\d*|android)\b/i,
  },
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const singular = (s: string) => s.replace(/(ies)$/, "y").replace(/(ches|shes|sses|xes)$/, (m) => m.slice(0, -2)).replace(/s$/, "");
const compact = (s: string) => s.replace(/\s+/g, "");

/** Word-start match, so "Footwear" never counts as "wear…" and "Smartphones" still counts as "smartphone…". */
const hasStem = (text: string, stem: string) => new RegExp(`\\b${stem}`).test(norm(text));
const nameText = (c: Category) => `${c.name} ${c.slug.replace(/-/g, " ")}`;

function categoryForRule(rule: Rule, categories: Category[]): Category | undefined {
  return (
    categories.find((c) => c.id === rule.seedId) ??
    categories.find((c) => rule.stems.some((stem) => hasStem(nameText(c), stem))) ??
    categories.find((c) => c.icon === rule.icon)
  );
}

function ruleOwnsCategory(c: Category): boolean {
  return RULES.some((r) => r.seedId === c.id || r.stems.some((stem) => hasStem(nameText(c), stem)));
}

/** Matches a category name from the file ("Phones", "Audio > Headphones") to a store category. */
export function matchCategoryName(value: string, categories: Category[]): Category | null {
  const v = norm(value);
  if (!v) return null;
  const vs = singular(v);
  const exact =
    categories.find((c) => norm(c.name) === v || c.slug === compact(v).toLowerCase() || norm(c.slug) === v) ??
    categories.find((c) => singular(norm(c.name)) === vs);
  if (exact) return exact;
  for (const rule of RULES) {
    if (rule.re.test(value) || rule.stems.some((s) => hasStem(v, s))) {
      const c = categoryForRule(rule, categories);
      if (c) return c;
    }
  }
  return null;
}

/** Guesses a category from a product title. */
export function guessCategory(title: string, categories: Category[]): Category | null {
  const t = norm(title);
  if (!t) return null;
  const tc = compact(t);

  // Admin-made categories that the rules don't know ("Smart Home", "Power Banks")
  const custom = categories
    .filter((c) => !ruleOwnsCategory(c))
    .sort((a, b) => b.name.length - a.name.length);
  for (const c of custom) {
    const n = norm(c.name);
    const variants = [n, singular(n)].filter((x) => x.length >= 3);
    if (variants.some((x) => ` ${t} `.includes(` ${x} `) || tc.includes(compact(x)))) return c;
  }

  // "14promax Guess", "16PLUS VIP": a bare phone model with no device word is,
  // in practice, an accessory listed by the phone it fits.
  if (MODEL_ONLY.test(t) && !DEVICE_WORD.test(t)) {
    const acc = categoryForRule(RULES[0], categories);
    if (acc) return acc;
  }

  for (const rule of RULES) {
    if (rule.re.test(title)) return categoryForRule(rule, categories) ?? null;
  }
  return null;
}

const MODEL_ONLY = /(^|\s)(1[1-7]|x|xr|xs) ?(pro ?max|promax|pro|plus|mini)(\s|$)|(^|\s)(s2[0-9]|a[0-9]{2}) ?(ultra|plus|fe)(\s|$)/;
const DEVICE_WORD = /\b(i ?phone|galaxy|samsung|pixel|tecno|infinix|redmi|oppo|vivo|phone|i ?pad|tablet|macbook|laptop|watch|airpods?)\b/;

export function chooseCategory(
  product: DraftProduct,
  categories: Category[],
  opts: CategoryOptions,
  manualId?: string,
): CategoryChoice {
  if (manualId && categories.some((c) => c.id === manualId)) return { categoryId: manualId, source: "manual" };

  if (product.categoryNames.length) {
    for (const name of product.categoryNames) {
      const c = matchCategoryName(name, categories);
      if (c) return { categoryId: c.id, source: "file" };
    }
    if (opts.createMissing) {
      // the last listed value is the broadest in "A > B" paths; for lists use the first
      const name = product.categoryNames[0].slice(0, 60);
      return { categoryId: null, source: "new", newName: name };
    }
  }

  if (opts.autoDetect) {
    const guess = guessCategory(product.name, categories);
    if (guess) return { categoryId: guess.id, source: "auto" };
  }

  if (opts.defaultCategoryId && categories.some((c) => c.id === opts.defaultCategoryId)) {
    return { categoryId: opts.defaultCategoryId, source: "default" };
  }
  return { categoryId: null, source: "none" };
}

/** Category names in the file that don't match any store category. */
export function unknownCategoryNames(products: DraftProduct[], categories: Category[]): string[] {
  const out = new Map<string, string>();
  for (const p of products) {
    if (!p.categoryNames.length) continue;
    if (p.categoryNames.some((n) => matchCategoryName(n, categories))) continue;
    const n = p.categoryNames[0];
    out.set(n.toLowerCase(), n);
  }
  return Array.from(out.values());
}
