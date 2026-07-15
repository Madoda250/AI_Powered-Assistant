// Simple, transparent forecasting + inventory analytics used across the app.
// These are heuristic models (moving average + trend + seasonality signal),
// not black-box AI — that lets us honestly show a confidence score and
// avoid misleading users with fake ML certainty.

import { DATASET, type Product, type SalesRow } from "./data";

export type DailyPoint = { date: string; units: number; revenue: number };

export function dailyTotals(sales: SalesRow[] = DATASET.sales): DailyPoint[] {
  const map = new Map<string, DailyPoint>();
  for (const s of sales) {
    const cur = map.get(s.date) ?? { date: s.date, units: 0, revenue: 0 };
    cur.units += s.units;
    cur.revenue += s.revenue;
    map.set(s.date, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function monthlyTotals(sales: SalesRow[] = DATASET.sales) {
  const map = new Map<string, { month: string; units: number; revenue: number }>();
  for (const s of sales) {
    const key = s.date.slice(0, 7);
    const cur = map.get(key) ?? { month: key, units: 0, revenue: 0 };
    cur.units += s.units;
    cur.revenue += s.revenue;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export function productDailyUnits(productId: string): DailyPoint[] {
  return dailyTotals(DATASET.sales.filter((s) => s.productId === productId));
}

// Compute average daily units and linear trend from a sales series.
function fit(series: DailyPoint[]) {
  if (series.length === 0) return { avg: 0, slope: 0 };
  const n = series.length;
  const xs = series.map((_, i) => i);
  const ys = series.map((p) => p.units);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return { avg: meanY, slope };
}

export type ProductForecast = {
  productId: string;
  weekly: number;
  monthly: number;
  quarterly: number;
  annual: number;
  trend: "up" | "down" | "flat";
  trendPct: number;
  confidence: number; // 0-100
};

export function forecastForProduct(productId: string): ProductForecast {
  const series = productDailyUnits(productId);
  const { avg, slope } = fit(series);
  const last30 = series.slice(-30).reduce((a, b) => a + b.units, 0) / Math.max(1, Math.min(30, series.length));
  const prev30 =
    series.slice(-60, -30).reduce((a, b) => a + b.units, 0) /
    Math.max(1, Math.min(30, Math.max(0, series.length - 30)));
  const trendPct = prev30 > 0 ? ((last30 - prev30) / prev30) * 100 : 0;
  const trend: "up" | "down" | "flat" = trendPct > 5 ? "up" : trendPct < -5 ? "down" : "flat";
  const dailyForecast = Math.max(0, last30 + slope * 7); // project a week ahead

  // Confidence from data completeness + volatility.
  const variance =
    series.reduce((a, b) => a + (b.units - avg) ** 2, 0) / Math.max(1, series.length);
  const cv = avg > 0 ? Math.sqrt(variance) / avg : 1;
  const confidence = Math.round(Math.max(35, Math.min(95, 95 - cv * 40)));

  return {
    productId,
    weekly: Math.round(dailyForecast * 7),
    monthly: Math.round(dailyForecast * 30),
    quarterly: Math.round(dailyForecast * 90),
    annual: Math.round(dailyForecast * 365),
    trend,
    trendPct: Math.round(trendPct),
    confidence,
  };
}

export type InventoryPlan = {
  productId: string;
  dailyDemand: number;
  reorderPoint: number;
  recommendedOrder: number;
  safetyStock: number;
  stockoutRisk: "low" | "medium" | "high";
  overstockRisk: "low" | "medium" | "high";
  daysOfSupply: number;
  healthScore: number; // 0-100
  action: string;
  reason: string;
};

export function inventoryPlanFor(product: Product): InventoryPlan {
  const f = forecastForProduct(product.id);
  const dailyDemand = f.monthly / 30;
  const safetyStock = Math.round(dailyDemand * Math.sqrt(product.leadTimeDays) * 1.65);
  const reorderPoint = Math.round(dailyDemand * product.leadTimeDays + safetyStock);
  const targetCover = 45; // aim to keep ~45 days of supply after reorder
  const recommendedOrder = Math.max(
    0,
    Math.round(dailyDemand * targetCover + safetyStock - product.stock),
  );
  const daysOfSupply = dailyDemand > 0 ? product.stock / dailyDemand : 999;

  const stockoutRisk: InventoryPlan["stockoutRisk"] =
    product.stock < reorderPoint * 0.6 ? "high" : product.stock < reorderPoint ? "medium" : "low";
  const overstockRisk: InventoryPlan["overstockRisk"] =
    daysOfSupply > 120 ? "high" : daysOfSupply > 75 ? "medium" : "low";

  let action = "Maintain current levels";
  let reason = `Stock covers ~${Math.round(daysOfSupply)} days of forecast demand.`;
  if (stockoutRisk === "high") {
    action = `Reorder now (${recommendedOrder} units)`;
    reason = `Only ${Math.round(daysOfSupply)} days of cover — lead time is ${product.leadTimeDays} days, so a stockout is likely without action.`;
  } else if (stockoutRisk === "medium") {
    action = `Place order soon (${recommendedOrder} units)`;
    reason = `Stock is approaching the reorder point of ${reorderPoint} units.`;
  } else if (overstockRisk === "high") {
    action = "Reduce reorders / run a promotion";
    reason = `Current stock covers ${Math.round(daysOfSupply)} days — capital is tied up.`;
  } else if (overstockRisk === "medium") {
    action = "Slow down reorders";
    reason = `Stock is comfortable — no reorder needed for several weeks.`;
  }

  // Health: penalize both stockout and overstock risk.
  const stockoutPenalty = stockoutRisk === "high" ? 45 : stockoutRisk === "medium" ? 20 : 0;
  const overstockPenalty = overstockRisk === "high" ? 25 : overstockRisk === "medium" ? 10 : 0;
  const healthScore = Math.max(10, Math.min(100, 100 - stockoutPenalty - overstockPenalty));

  return {
    productId: product.id,
    dailyDemand: Math.round(dailyDemand * 10) / 10,
    reorderPoint,
    recommendedOrder,
    safetyStock,
    stockoutRisk,
    overstockRisk,
    daysOfSupply: Math.round(daysOfSupply),
    healthScore,
    action,
    reason,
  };
}

export function allInventoryPlans(): InventoryPlan[] {
  return DATASET.products.map(inventoryPlanFor);
}

export function allForecasts(): ProductForecast[] {
  return DATASET.products.map((p) => forecastForProduct(p.id));
}

export function productPerformance() {
  return DATASET.products.map((p) => {
    const rows = DATASET.sales.filter((s) => s.productId === p.id);
    const units = rows.reduce((a, b) => a + b.units, 0);
    const revenue = rows.reduce((a, b) => a + b.revenue, 0);
    const profit = rows.reduce((a, b) => a + b.units * (p.price - p.cost), 0);
    const f = forecastForProduct(p.id);
    return {
      product: p,
      units,
      revenue,
      profit,
      trend: f.trend,
      trendPct: f.trendPct,
    };
  });
}

// Forecast vs actual for the last 30 days: fit on first 150 days, project last 30.
export function forecastVsActualDaily() {
  const daily = dailyTotals();
  const cutoff = daily.length - 30;
  const train = daily.slice(0, cutoff);
  const test = daily.slice(cutoff);
  const { avg, slope } = fit(train);
  return test.map((d, i) => ({
    date: d.date,
    actual: d.units,
    forecast: Math.max(0, Math.round(avg + slope * (cutoff + i))),
  }));
}
