// Sample dataset generator and shared types for the AI Inventory & Sales Forecaster.
// The dataset lives fully in-memory so every chart, forecast, and insight works
// out of the box without any backend.

export type Category =
  | "Electronics"
  | "Apparel"
  | "Home & Kitchen"
  | "Beauty"
  | "Grocery";

export type Product = {
  id: string;
  name: string;
  category: Category;
  price: number; // selling price
  cost: number; // unit cost
  stock: number; // current on-hand units
  leadTimeDays: number;
};

export type SalesRow = {
  date: string; // ISO date (YYYY-MM-DD)
  productId: string;
  units: number;
  revenue: number;
  promotion: boolean;
  seasonalEvent: string | null;
};

const PRODUCT_SEED: Omit<Product, "stock">[] = [
  { id: "P001", name: "Wireless Noise-Cancel Headphones", category: "Electronics", price: 189, cost: 92, leadTimeDays: 12 },
  { id: "P002", name: "Smart Fitness Watch", category: "Electronics", price: 149, cost: 68, leadTimeDays: 10 },
  { id: "P003", name: "4K Streaming Stick", category: "Electronics", price: 59, cost: 24, leadTimeDays: 8 },
  { id: "P004", name: "Ergonomic Office Chair", category: "Home & Kitchen", price: 279, cost: 140, leadTimeDays: 21 },
  { id: "P005", name: "Ceramic Non-Stick Pan", category: "Home & Kitchen", price: 45, cost: 18, leadTimeDays: 14 },
  { id: "P006", name: "Stainless Steel Water Bottle", category: "Home & Kitchen", price: 28, cost: 9, leadTimeDays: 9 },
  { id: "P007", name: "Merino Wool Sweater", category: "Apparel", price: 89, cost: 34, leadTimeDays: 18 },
  { id: "P008", name: "Everyday Cotton Tee", category: "Apparel", price: 22, cost: 6, leadTimeDays: 7 },
  { id: "P009", name: "Running Shoes Pro", category: "Apparel", price: 129, cost: 52, leadTimeDays: 15 },
  { id: "P010", name: "Vitamin C Serum", category: "Beauty", price: 34, cost: 8, leadTimeDays: 6 },
  { id: "P011", name: "Hydrating Face Cream", category: "Beauty", price: 42, cost: 11, leadTimeDays: 6 },
  { id: "P012", name: "Bamboo Toothbrush 4-pack", category: "Beauty", price: 14, cost: 3, leadTimeDays: 8 },
  { id: "P013", name: "Organic Coffee Beans 1kg", category: "Grocery", price: 24, cost: 10, leadTimeDays: 5 },
  { id: "P014", name: "Dark Chocolate Bar 12-pack", category: "Grocery", price: 32, cost: 12, leadTimeDays: 5 },
  { id: "P015", name: "Cold-Pressed Olive Oil", category: "Grocery", price: 19, cost: 7, leadTimeDays: 7 },
];

// Deterministic pseudo-random so the sample data is stable across reloads.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOLIDAYS: Record<string, string> = {
  "11-24": "Black Friday",
  "11-25": "Black Friday",
  "11-27": "Cyber Monday",
  "12-15": "Holiday Season",
  "12-20": "Holiday Season",
  "12-24": "Holiday Season",
  "07-04": "Summer Sale",
};

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function seasonalMultiplier(date: Date, category: Category) {
  const m = date.getUTCMonth();
  const base = 1 + 0.15 * Math.sin(((m + 3) / 12) * Math.PI * 2);
  if (category === "Apparel") return base + (m >= 9 || m <= 1 ? 0.25 : 0);
  if (category === "Grocery") return base + (m === 10 || m === 11 ? 0.2 : 0);
  if (category === "Beauty") return base + (m === 1 || m === 4 ? 0.15 : 0);
  if (category === "Electronics") return base + (m === 10 || m === 11 ? 0.35 : 0);
  return base;
}

// Give each product a distinctive velocity so "fast movers / slow movers"
// analysis produces a clear ranking.
const VELOCITY: Record<string, number> = {
  P001: 8, P002: 12, P003: 18, P004: 1.4, P005: 5, P006: 22,
  P007: 3, P008: 26, P009: 6, P010: 15, P011: 9, P012: 30,
  P013: 20, P014: 11, P015: 7,
};

// Long-run trend per product (>1 growing, <1 declining).
const TREND: Record<string, number> = {
  P001: 1.08, P002: 1.22, P003: 1.15, P004: 0.98, P005: 1.02, P006: 1.05,
  P007: 0.85, P008: 1.1, P009: 0.92, P010: 1.28, P011: 1.18, P012: 1.05,
  P013: 1.06, P014: 0.9, P015: 1.03,
};

const REFERENCE_DATE = "2026-07-16T00:00:00Z";

export function generateSalesHistory(days = 180): { products: Product[]; sales: SalesRow[] } {
  const rand = mulberry32(42);
  const today = new Date(REFERENCE_DATE);
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - days + 1);

  const products: Product[] = PRODUCT_SEED.map((p) => ({
    ...p,
    stock: Math.round(20 + rand() * 240),
  }));

  const sales: SalesRow[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const mmdd = `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const holiday = HOLIDAYS[mmdd] ?? null;
    const dow = d.getUTCDay();
    const weekend = dow === 0 || dow === 6 ? 1.15 : 1;

    for (const p of products) {
      const trendFactor = Math.pow(TREND[p.id] ?? 1, i / days);
      const season = seasonalMultiplier(d, p.category);
      const promo = rand() < 0.06;
      const promoBoost = promo ? 1.6 : 1;
      const holidayBoost = holiday ? 1.9 : 1;
      const noise = 0.7 + rand() * 0.6;
      const base = VELOCITY[p.id] ?? 5;
      const units = Math.max(
        0,
        Math.round(base * trendFactor * season * weekend * promoBoost * holidayBoost * noise),
      );
      if (units === 0 && !promo && !holiday) continue;
      sales.push({
        date: isoDate(d),
        productId: p.id,
        units,
        revenue: units * p.price,
        promotion: promo,
        seasonalEvent: holiday,
      });
    }
  }
  return { products, sales };
}

// Fixed dataset for the whole app.
export const DATASET = generateSalesHistory(180);

export function formatCurrency(v: number): string {
  // Use a deterministic, locale-independent format so SSR and the browser
  // always render the same ZAR string (e.g. "R 1 938 715").
  const rounded = Math.round(v);
  const grouped = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  return `R\u00a0${grouped}`;
}

export function formatNumber(v: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(v));
}
