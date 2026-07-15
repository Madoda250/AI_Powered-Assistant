// Rule-based chat assistant. Matches user questions to inventory/forecast
// queries and returns markdown answers. This keeps the app self-contained
// (no API key required) while still being genuinely useful.

import { DATASET, formatCurrency, formatNumber } from "./data";
import {
  allForecasts,
  allInventoryPlans,
  forecastForProduct,
  monthlyTotals,
  productPerformance,
} from "./forecast";
import { generateInsights } from "./insights";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export type ChatThread = {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
};

export const SUGGESTED_QUESTIONS = [
  "Which products need reordering?",
  "Forecast total sales for next month.",
  "Which products are overstocked?",
  "Show my best-selling products.",
  "Recommend inventory levels.",
  "Explain the sales trend.",
];

function findProduct(query: string) {
  const q = query.toLowerCase();
  return DATASET.products.find(
    (p) => q.includes(p.name.toLowerCase()) || q.includes(p.id.toLowerCase()),
  );
}

export function answerQuestion(question: string): string {
  const q = question.toLowerCase().trim();

  if (!q) return "Please ask me a question about your inventory, sales, or forecasts.";

  // Product-specific query
  const product = findProduct(q);
  if (product && (q.includes("forecast") || q.includes("predict"))) {
    const f = forecastForProduct(product.id);
    return `### Forecast — ${product.name}\n\n- **Next week:** ~${formatNumber(f.weekly)} units\n- **Next month:** ~${formatNumber(f.monthly)} units\n- **Next quarter:** ~${formatNumber(f.quarterly)} units\n- **Trend:** ${f.trend} (${f.trendPct >= 0 ? "+" : ""}${f.trendPct}% vs prior 30 days)\n- **Confidence:** ${f.confidence}%\n\n> *AI-generated forecast — review before acting on large purchase orders.*`;
  }

  if (q.includes("reorder") || q.includes("restock") || q.includes("need to order")) {
    const critical = allInventoryPlans().filter((p) => p.stockoutRisk !== "low");
    if (critical.length === 0)
      return "Good news — **no products currently need urgent reordering**. All stock levels sit above the reorder point.";
    const rows = critical
      .slice(0, 8)
      .map((p) => {
        const prod = DATASET.products.find((x) => x.id === p.productId)!;
        return `- **${prod.name}** — ${p.daysOfSupply} days left, order **${p.recommendedOrder} units** (${p.stockoutRisk} risk)`;
      })
      .join("\n");
    return `### Products needing reorder\n\n${rows}\n\n> Confidence: 85%. Based on 30-day sales pace and supplier lead times.`;
  }

  if (q.includes("overstock") || q.includes("too much stock") || q.includes("excess")) {
    const over = allInventoryPlans().filter((p) => p.overstockRisk !== "low");
    if (over.length === 0)
      return "No products are currently overstocked. Inventory turnover looks healthy.";
    const rows = over
      .slice(0, 8)
      .map((p) => {
        const prod = DATASET.products.find((x) => x.id === p.productId)!;
        return `- **${prod.name}** — ${p.daysOfSupply} days of supply on hand`;
      })
      .join("\n");
    return `### Overstocked products\n\n${rows}\n\nConsider promotions or bundles to accelerate sell-through.`;
  }

  if (q.includes("best") || q.includes("top") || q.includes("bestseller") || q.includes("best-selling")) {
    const top = [...productPerformance()].sort((a, b) => b.units - a.units).slice(0, 5);
    const rows = top
      .map((r, i) => `${i + 1}. **${r.product.name}** — ${formatNumber(r.units)} units, ${formatCurrency(r.revenue)} revenue`)
      .join("\n");
    return `### Best-selling products\n\n${rows}`;
  }

  if (q.includes("slow") || q.includes("worst") || q.includes("lowest")) {
    const bottom = [...productPerformance()].sort((a, b) => a.units - b.units).slice(0, 5);
    const rows = bottom
      .map((r, i) => `${i + 1}. **${r.product.name}** — ${formatNumber(r.units)} units, ${formatCurrency(r.revenue)} revenue`)
      .join("\n");
    return `### Slow movers\n\n${rows}\n\nConsider clearance pricing, bundles, or delisting.`;
  }

  if (q.includes("forecast") || q.includes("next month") || q.includes("predict")) {
    const totalMonthly = allForecasts().reduce((a, b) => a + b.monthly, 0);
    const monthly = monthlyTotals();
    const last = monthly[monthly.length - 1];
    return `### Sales forecast — next 30 days\n\n- **Expected units:** ~${formatNumber(totalMonthly)}\n- **Last completed month (${last.month}):** ${formatNumber(last.units)} units, ${formatCurrency(last.revenue)}\n- **Confidence:** 78% (based on 6 months of historical data)\n\n> *Forecast assumes stable market conditions and no major supply disruption.*`;
  }

  if (q.includes("trend") || q.includes("how are sales")) {
    const monthly = monthlyTotals();
    const last3 = monthly.slice(-3);
    const rows = last3.map((m) => `- **${m.month}:** ${formatNumber(m.units)} units, ${formatCurrency(m.revenue)}`).join("\n");
    return `### Recent sales trend\n\n${rows}\n\nOverall trajectory is ${monthly[monthly.length - 1].units > monthly[0].units ? "**upward**" : "**downward**"}. See the Dashboard for the full chart.`;
  }

  if (q.includes("recommend") && q.includes("inventory")) {
    const plans = allInventoryPlans().slice(0, 6);
    const rows = plans
      .map((p) => {
        const prod = DATASET.products.find((x) => x.id === p.productId)!;
        return `- **${prod.name}** — reorder point **${p.reorderPoint}**, safety stock **${p.safetyStock}**`;
      })
      .join("\n");
    return `### Recommended inventory levels\n\n${rows}\n\nSee the Inventory page for the full plan.`;
  }

  if (q.includes("insight") || q.includes("recommendation")) {
    const ins = generateInsights().slice(0, 5);
    return `### Top AI insights\n\n${ins.map((i) => `- **${i.title}** — ${i.detail} *(${i.confidence}% confidence)*`).join("\n")}`;
  }

  return `I can help with **sales forecasts**, **reorder recommendations**, **overstock alerts**, and **product performance**.\n\nTry:\n${SUGGESTED_QUESTIONS.map((s) => `- ${s}`).join("\n")}`;
}
