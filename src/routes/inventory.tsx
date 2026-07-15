import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, AlertTriangle, PackageCheck, PackageX } from "lucide-react";
import { DATASET, formatCurrency, formatNumber } from "@/lib/data";
import { allInventoryPlans } from "@/lib/forecast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/stat-card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "AI Inventory Forecast — Forecaster AI" },
      { name: "description", content: "Reorder points, safety stock, and inventory health with AI recommendations." },
    ],
  }),
  component: InventoryPage,
});

function riskBadge(risk: "low" | "medium" | "high") {
  const variant = risk === "high" ? "destructive" : risk === "medium" ? "secondary" : "outline";
  return <Badge variant={variant as "destructive" | "secondary" | "outline"}>{risk}</Badge>;
}

function InventoryPage() {
  const [q, setQ] = useState("");
  const plans = useMemo(() => allInventoryPlans(), []);
  const byId = new Map(DATASET.products.map((p) => [p.id, p] as const));

  const filtered = plans.filter((p) => {
    const prod = byId.get(p.productId)!;
    return prod.name.toLowerCase().includes(q.toLowerCase()) || prod.category.toLowerCase().includes(q.toLowerCase());
  });

  const critical = plans.filter((p) => p.stockoutRisk === "high").length;
  const warning = plans.filter((p) => p.stockoutRisk === "medium").length;
  const healthy = plans.filter((p) => p.stockoutRisk === "low" && p.overstockRisk === "low").length;
  const totalValue = DATASET.products.reduce((a, p) => a + p.stock * p.cost, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">AI Inventory Forecast</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reorder points, safety stock, stockout risk, and health scores calculated from demand + lead time.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Critical Stockouts" value={String(critical)} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Watch List" value={String(warning)} icon={AlertTriangle} tone="warning" />
        <StatCard label="Healthy SKUs" value={String(healthy)} icon={PackageCheck} tone="success" />
        <StatCard label="Inventory Value" value={formatCurrency(totalValue)} icon={PackageX} tone="info" />
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Inventory Plan</CardTitle>
              <CardDescription>AI recommendations per SKU</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Daily Demand</TableHead>
                  <TableHead className="text-right">Reorder Point</TableHead>
                  <TableHead className="text-right">Safety</TableHead>
                  <TableHead className="text-right">Order Qty</TableHead>
                  <TableHead className="text-right">Days Supply</TableHead>
                  <TableHead>Stockout</TableHead>
                  <TableHead>Overstock</TableHead>
                  <TableHead>Health</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const prod = byId.get(p.productId)!;
                  return (
                    <TableRow key={p.productId}>
                      <TableCell>
                        <div className="font-medium">{prod.name}</div>
                        <div className="text-xs text-muted-foreground">{prod.category} • {prod.leadTimeDays}d lead time</div>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(prod.stock)}</TableCell>
                      <TableCell className="text-right">{p.dailyDemand}</TableCell>
                      <TableCell className="text-right">{p.reorderPoint}</TableCell>
                      <TableCell className="text-right">{p.safetyStock}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">{p.recommendedOrder}</TableCell>
                      <TableCell className="text-right">{p.daysOfSupply > 500 ? "∞" : p.daysOfSupply}</TableCell>
                      <TableCell>{riskBadge(p.stockoutRisk)}</TableCell>
                      <TableCell>{riskBadge(p.overstockRisk)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={p.healthScore} className="h-1.5 w-16" />
                          <span className="text-xs">{p.healthScore}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans
          .filter((p) => p.stockoutRisk !== "low" || p.overstockRisk !== "low")
          .slice(0, 6)
          .map((p) => {
            const prod = byId.get(p.productId)!;
            return (
              <Card key={p.productId}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{prod.name}</CardTitle>
                    {p.stockoutRisk === "high" ? riskBadge("high") : riskBadge(p.overstockRisk)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-2 font-medium text-primary">{p.action}</div>
                  <p className="text-sm text-muted-foreground">{p.reason}</p>
                </CardContent>
              </Card>
            );
          })}
      </section>
    </div>
  );
}
