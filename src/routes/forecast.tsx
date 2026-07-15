import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { DATASET, formatNumber } from "@/lib/data";
import { forecastForProduct, productDailyUnits } from "@/lib/forecast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/forecast")({
  head: () => ({
    meta: [
      { title: "AI Sales Forecast — Forecaster AI" },
      { name: "description", content: "AI-generated weekly, monthly, quarterly, and annual sales forecasts." },
    ],
  }),
  component: ForecastPage,
});

function ForecastPage() {
  const [productId, setProductId] = useState(DATASET.products[0].id);
  const product = DATASET.products.find((p) => p.id === productId)!;
  const forecast = useMemo(() => forecastForProduct(productId), [productId]);
  const daily = useMemo(() => productDailyUnits(productId), [productId]);

  // Weekly aggregation for chart
  const weekly = useMemo(() => {
    const map = new Map<string, { week: string; units: number }>();
    for (const d of daily) {
      const dt = new Date(d.date);
      const first = new Date(dt);
      first.setDate(dt.getDate() - dt.getDay());
      const key = first.toISOString().slice(0, 10);
      const cur = map.get(key) ?? { week: key, units: 0 };
      cur.units += d.units;
      map.set(key, cur);
    }
    return Array.from(map.values());
  }, [daily]);

  // Project forward: repeat last 4 weeks' average
  const avgWeekly = weekly.slice(-4).reduce((a, b) => a + b.units, 0) / Math.max(1, Math.min(4, weekly.length));
  const projected = Array.from({ length: 8 }).map((_, i) => {
    const lastDate = new Date(weekly[weekly.length - 1]?.week ?? new Date());
    lastDate.setDate(lastDate.getDate() + 7 * (i + 1));
    return { week: lastDate.toISOString().slice(0, 10), forecast: Math.round(avgWeekly) };
  });
  const combined = [
    ...weekly.map((w) => ({ week: w.week, units: w.units, forecast: null as number | null })),
    ...projected.map((p) => ({ week: p.week, units: null as number | null, forecast: p.forecast })),
  ];

  const TrendIcon = forecast.trend === "up" ? TrendingUp : forecast.trend === "down" ? TrendingDown : Minus;

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">AI Sales Forecast</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Weekly, monthly, quarterly, and annual demand predictions with confidence scores.
          </p>
        </div>
        <div className="w-full shrink-0 sm:w-80">
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DATASET.products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Weekly Forecast" value={`${formatNumber(forecast.weekly)} units`} icon={TrendingUp} tone="primary" />
        <StatCard label="Monthly Forecast" value={`${formatNumber(forecast.monthly)} units`} icon={TrendingUp} tone="info" />
        <StatCard label="Quarterly Forecast" value={`${formatNumber(forecast.quarterly)} units`} icon={TrendingUp} tone="success" />
        <StatCard label="Annual Forecast" value={`${formatNumber(forecast.annual)} units`} icon={TrendingUp} tone="primary" />
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{product.name}</CardTitle>
              <CardDescription>Historical weekly demand + 8-week forecast</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-1"><TrendIcon className="h-3 w-3" /> {forecast.trend.toUpperCase()} {forecast.trendPct >= 0 ? "+" : ""}{forecast.trendPct}%</Badge>
              <div className="w-40">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Confidence</span><span>{forecast.confidence}%</span>
                </div>
                <Progress value={forecast.confidence} className="h-1.5" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combined}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="units" stroke="var(--chart-1)" strokeWidth={2} dot={false} name="Actual" connectNulls={false} />
              <Line type="monotone" dataKey="forecast" stroke="var(--chart-4)" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Forecast" connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Forecast — All Products</CardTitle>
          <CardDescription>Monthly projected units for every SKU</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DATASET.products.map((p) => ({ name: p.name, forecast: forecastForProduct(p.id).monthly }))} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} angle={-30} textAnchor="end" interval={0} height={60} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="forecast" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Weekly</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead className="text-right">Quarterly</TableHead>
                  <TableHead className="text-right">Annual</TableHead>
                  <TableHead className="text-right">Trend</TableHead>
                  <TableHead className="text-right">Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DATASET.products.map((p) => {
                  const f = forecastForProduct(p.id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right">{formatNumber(f.weekly)}</TableCell>
                      <TableCell className="text-right">{formatNumber(f.monthly)}</TableCell>
                      <TableCell className="text-right">{formatNumber(f.quarterly)}</TableCell>
                      <TableCell className="text-right">{formatNumber(f.annual)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={f.trend === "up" ? "default" : f.trend === "down" ? "destructive" : "secondary"}>
                          {f.trend} {f.trendPct >= 0 ? "+" : ""}{f.trendPct}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{f.confidence}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4 text-sm">
        <strong>How this works:</strong> Forecasts combine a 30-day rolling average with a linear
        trend line and are adjusted for volatility to produce a confidence score. This is a
        transparent statistical model, not a black-box. Treat outputs as decision support, not truth.
      </div>
    </div>
  );
}
