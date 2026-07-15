import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  DollarSign, ShoppingCart, Package, Boxes, AlertTriangle, TrendingUp, Activity, Sparkles,
} from "lucide-react";

import { DATASET, formatCurrency, formatNumber } from "@/lib/data";
import {
  allInventoryPlans, forecastVsActualDaily, monthlyTotals, productPerformance,
} from "@/lib/forecast";
import { generateInsights } from "@/lib/insights";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Forecaster AI" },
      { name: "description", content: "Overview of sales, inventory health, and AI insights." },
    ],
  }),
  component: DashboardPage,
});

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function DashboardPage() {
  const monthly = useMemo(() => monthlyTotals(), []);
  const perf = useMemo(() => productPerformance(), []);
  const plans = useMemo(() => allInventoryPlans(), []);
  const insights = useMemo(() => generateInsights().slice(0, 4), []);
  const fvsA = useMemo(() => forecastVsActualDaily(), []);

  const totalUnits = perf.reduce((a, b) => a + b.units, 0);
  const totalRevenue = perf.reduce((a, b) => a + b.revenue, 0);
  const inventoryValue = DATASET.products.reduce((a, p) => a + p.stock * p.cost, 0);
  const productsInStock = DATASET.products.filter((p) => p.stock > 0).length;
  const lowStock = plans.filter((p) => p.stockoutRisk !== "low").length;
  const overStock = plans.filter((p) => p.overstockRisk !== "low").length;
  const healthAvg = Math.round(plans.reduce((a, b) => a + b.healthScore, 0) / plans.length);
  const lastMonth = monthly[monthly.length - 1];
  const prevMonth = monthly[monthly.length - 2];
  const revTrend = prevMonth ? Math.round(((lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100) : 0;

  const byCategory = Object.entries(
    perf.reduce<Record<string, number>>((acc, r) => {
      acc[r.product.category] = (acc[r.product.category] ?? 0) + r.revenue;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const topProducts = [...perf].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Business Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-assisted view of your inventory and sales performance across {DATASET.products.length} SKUs.
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 gap-1">
          <Sparkles className="h-3 w-3" /> Updated live
        </Badge>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} tone="primary"
          trend={{ value: revTrend, label: "MoM" }} hint="Trailing 6 months" />
        <StatCard label="Total Units Sold" value={formatNumber(totalUnits)} icon={ShoppingCart} tone="info" />
        <StatCard label="Inventory Value" value={formatCurrency(inventoryValue)} icon={Package} tone="success"
          hint={`${productsInStock} SKUs in stock`} />
        <StatCard label="Inventory Health" value={`${healthAvg}/100`} icon={Activity}
          tone={healthAvg >= 75 ? "success" : healthAvg >= 55 ? "warning" : "destructive"} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Low Stock Alerts" value={String(lowStock)} icon={AlertTriangle}
          tone={lowStock > 0 ? "destructive" : "success"} hint="Products below reorder point" />
        <StatCard label="Overstock Alerts" value={String(overStock)} icon={Boxes} tone="warning"
          hint="Products with >75 days of supply" />
        <StatCard label="Products in Stock" value={String(productsInStock)} icon={Package} tone="info" />
        <StatCard label="AI Recommendations" value={String(insights.length)} icon={Sparkles} tone="primary" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Sales & Revenue</CardTitle>
            <CardDescription>Units sold and revenue over the past 6 months</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="unit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" fill="url(#rev)" name="Revenue" />
                <Area type="monotone" dataKey="units" stroke="var(--chart-2)" fill="url(#unit)" name="Units" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
            <CardDescription>Share of total revenue</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Forecast vs Actual (Last 30 days)</CardTitle>
            <CardDescription>Model fit on the most recent month of daily units</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fvsA}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="actual" stroke="var(--chart-1)" strokeWidth={2} dot={false} name="Actual" />
                <Line type="monotone" dataKey="forecast" stroke="var(--chart-4)" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Forecast" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top AI Recommendations</CardTitle>
            <CardDescription>Actions ranked by urgency</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((i) => (
              <div key={i.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium">{i.title}</div>
                  <Badge
                    variant={i.severity === "critical" ? "destructive" : "secondary"}
                    className="shrink-0 text-[10px]"
                  >
                    {i.severity}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{i.detail}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={i.confidence} className="h-1.5 flex-1" />
                  <span className="text-[10px] text-muted-foreground">{i.confidence}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Top Products by Revenue</CardTitle>
                <CardDescription>Best revenue contributors this period</CardDescription>
              </div>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts.map((r) => ({ name: r.product.name, revenue: r.revenue, units: r.units }))} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={11} width={180} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                />
                <Bar dataKey="revenue" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-muted-foreground">
        <strong>Responsible AI:</strong> Forecasts on this page are model-based estimates
        derived from your historical data. Confidence reflects data quality — always apply
        human judgement before large operational decisions.
      </p>
    </div>
  );
}
