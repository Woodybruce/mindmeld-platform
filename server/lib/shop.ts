// Shop helpers shared by the legacy AI and shop routes.
// Moved verbatim from server/routes.ts (Task 10).

export const AMAZON_TAG = "woodybruce-21";

export function buildAmazonUrl(productName?: string): string {
  const name = productName || "couples gift";
  return `https://www.amazon.co.uk/s?k=${encodeURIComponent(name)}&tag=${AMAZON_TAG}`;
}

export const normalizeShopCategory = (cat: string): string => {
  const c = cat.toLowerCase().trim();
  const map: Record<string, string> = {
    "massage": "Wellness", "candles": "Date Night", "bath": "Wellness",
    "lingerie": "Intimacy", "nightwear": "Intimacy", "accessories": "Gifts",
    "fragrance": "Gifts", "beauty": "Wellness", "skincare": "Wellness",
    "games": "Date Night", "cocktails": "Date Night", "kitchenware": "Home",
    "bedding": "Home", "homeware": "Home", "décor": "Home", "decor": "Home",
  };
  return map[c] || cat;
};
