// AI Business Insights: heuristic rules run over the inventory + sales data
// to produce human-readable, actionable recommendations. Each insight carries
// a confidence score so users can weigh them appropriately.

import { DATASET } from "./data";
import { allInventoryPlans, forecastForProduct, productPerformance } from "./forecast";

export type Insight = {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "success" | "warning" | "critical";
  category: "Restock" | "Promotion" | "Trend" | "Overstock" | "Revenue" | "Seasonal";
  confidence: number;
};

export function generateInsights(): Insight[] {
  const out: Insight[] = [];
  const plans = allInventoryPlans();
  const perf = productPerformance();
  const byId = new Map(DATASET.products.map((p) => [p.id, p] as const));

  for (const plan of plans) {
    const p = byId.get(plan.productId)!;
    if (plan.stockoutRisk === "high") {
      out.push({
        id: `restock-${p.id}`,
        title: `Restock "${p.name}" immediately`,
        detail: `Only ${plan.daysOfSupply} days of supply at current pace. Lead time is ${p.leadTimeDays} days — recommended order: ${plan.recommendedOrder} units.`,
        severity: "critical",
        category: "Restock",
        confidence: 88,
      });
    } else if (plan.overstockRisk === "high") {
      out.push({
        id: `overstock-${p.id}`,
        title: `"${p.name}" is overstocked`,
        detail: `${plan.daysOfSupply} days of inventory on hand. Consider a promotion or bundle to accelerate sell-through.`,
        severity: "warning",
        category: "Overstock",
        confidence: 78,
      });
    }
  }

  for (const row of perf) {
    if (row.trend === "down" && row.trendPct < -15) {
      out.push({
        id: `trend-${row.product.id}`,
        title: `Sales declining for "${row.product.name}"`,
        detail: `Down ${Math.abs(row.trendPct)}% vs previous 30 days. Consider price adjustment, refreshed marketing, or a promotional bundle.`,
        severity: "warning",
        category: "Trend",
        confidence: 74,
      });
    }
    if (row.trend === "up" && row.trendPct > 20) {
      out.push({
        id: `promo-${row.product.id}`,
        title: `"${row.product.name}" is trending up`,
        detail: `Up ${row.trendPct}% vs previous 30 days — increase stock buffer and consider featuring on the homepage.`,
        severity: "success",
        category: "Promotion",
        confidence: 80,
      });
    }
  }

  const topRevenue = [...perf].sort((a, b) => b.revenue - a.revenue).slice(0, 3);
  out.push({
    id: `top-revenue`,
    title: `Top 3 revenue drivers this period`,
    detail: topRevenue.map((r) => `${r.product.name}`).join(", ") + `. Protect their stock and margins.`,
    severity: "info",
    category: "Revenue",
    confidence: 92,
  });

  // Seasonal prediction: naive check for upcoming month.
  const month = new Date().getMonth();
  if (month === 9 || month === 10) {
    out.push({
      id: `seasonal-q4`,
      title: `Q4 demand surge expected`,
      detail: `Holiday sales historically add 30–90% to daily volume for Electronics and Grocery. Build safety stock 3 weeks ahead of Black Friday.`,
      severity: "info",
      category: "Seasonal",
      confidence: 70,
    });
  }

  // Cross-sell / bundle idea from best sellers in same category.
  const bestPerCategory = new Map<string, typeof perf[number]>();
  for (const row of perf) {
    const cur = bestPerCategory.get(row.product.category);
    if (!cur || row.units > cur.units) bestPerCategory.set(row.product.category, row);
  }
  const bundleTargets = Array.from(bestPerCategory.values()).slice(0, 2);
  if (bundleTargets.length === 2) {
    out.push({
      id: `bundle-suggestion`,
      title: `Bundle opportunity`,
      detail: `Pair "${bundleTargets[0].product.name}" with "${bundleTargets[1].product.name}" to lift average order value.`,
      severity: "info",
      category: "Revenue",
      confidence: 62,
    });
  }

  return out.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function severityRank(s: Insight["severity"]) {
  return s === "critical" ? 3 : s === "warning" ? 2 : s === "success" ? 1 : 0;
}
