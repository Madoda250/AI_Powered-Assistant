import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis,
} from "recharts";
import { Trophy, Turtle, Banknote, Star } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/data";
import { productPerformance } from "@/lib/forecast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Product Performance — Forecaster AI" },
      { name: "description", content: "Best sellers, slow movers, and top-profit products." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const perf = useMemo(() => productPerformance(), []);
  const byUnits = [...perf].sort((a, b) => b.units - a.units);
  const bestSellers = byUnits.slice(0, 5);
  const slowMovers = [...byUnits].reverse().slice(0, 5);
  const topRevenue = [...perf].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const topProfit = [...perf].sort((a, b) => b.profit - a.profit).slice(0, 5);

  const scatter = perf.map((r) => ({
    x: r.units,
    y: r.profit,
    z: r.revenue,
    name: r.product.name,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Product Performance Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Identify best sellers, slow movers, and your most profitable SKUs.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <PerfList title="Best Sellers" icon={<Trophy className="h-5 w-5 text-[color:var(--warning-foreground)]" />} rows={bestSellers} metric="units" />
        <PerfList title="Slow Movers" icon={<Turtle className="h-5 w-5 text-muted-foreground" />} rows={slowMovers} metric="units" />
        <PerfList title="Top Revenue" icon={<Banknote className="h-5 w-5 text-primary" />} rows={topRevenue} metric="revenue" />
        <PerfList title="Highest Profit" icon={<Star className="h-5 w-5 text-[color:var(--success)]" />} rows={topProfit} metric="profit" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Ranking (All Products)</CardTitle>
          <CardDescription>Sorted by lifetime revenue in the analysis window</CardDescription>
        </CardHeader>
        <CardContent className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perf.map((r) => ({ name: r.product.name, revenue: r.revenue }))} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={11} width={200} />
              <Tooltip formatter={(v: number) => formatCurrency(v)}
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="revenue" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Units vs Profit</CardTitle>
          <CardDescription>Bubble size = revenue. Top-right = high-volume, high-profit stars.</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="x" name="Units" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis dataKey="y" name="Profit" stroke="var(--muted-foreground)" fontSize={12}
                tickFormatter={(v) => formatCurrency(v)} />
              <ZAxis dataKey="z" range={[80, 400]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-md border bg-popover p-2 text-xs shadow">
                      <div className="font-medium">{d.name}</div>
                      <div>Units: {formatNumber(d.x)}</div>
                      <div>Profit: {formatCurrency(d.y)}</div>
                      <div>Revenue: {formatCurrency(d.z)}</div>
                    </div>
                  );
                }}
              />
              <Scatter data={scatter} fill="var(--chart-1)" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function PerfList({
  title, icon, rows, metric,
}: {
  title: string;
  icon: React.ReactNode;
  rows: ReturnType<typeof productPerformance>;
  metric: "units" | "revenue" | "profit";
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.product.id} className="flex items-center gap-3 rounded-lg border p-2.5">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{r.product.name}</div>
              <div className="text-xs text-muted-foreground">{r.product.category}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">
                {metric === "units" ? formatNumber(r[metric]) : formatCurrency(r[metric])}
              </div>
              <Badge variant={r.trend === "up" ? "default" : r.trend === "down" ? "destructive" : "secondary"} className="text-[10px]">
                {r.trend} {r.trendPct >= 0 ? "+" : ""}{r.trendPct}%
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
