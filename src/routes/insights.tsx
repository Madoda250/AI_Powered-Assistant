import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, Lightbulb } from "lucide-react";
import { generateInsights, type Insight } from "@/lib/insights";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "AI Business Insights — Forecaster AI" },
      { name: "description", content: "AI-generated recommendations to grow revenue and reduce stockouts." },
    ],
  }),
  component: InsightsPage,
});

const CATEGORIES: Insight["category"][] = ["Restock", "Overstock", "Trend", "Promotion", "Revenue", "Seasonal"];

const iconFor = (sev: Insight["severity"]) =>
  sev === "critical" ? AlertCircle : sev === "warning" ? AlertTriangle : sev === "success" ? CheckCircle2 : Info;

const toneFor = (sev: Insight["severity"]) => ({
  critical: "border-l-destructive bg-destructive/5",
  warning: "border-l-[color:var(--warning)] bg-[color:var(--warning)]/10",
  success: "border-l-[color:var(--success)] bg-[color:var(--success)]/5",
  info: "border-l-[color:var(--info)] bg-[color:var(--info)]/5",
}[sev]);

function InsightsPage() {
  const [filter, setFilter] = useState<Insight["category"] | "All">("All");
  const insights = useMemo(() => generateInsights(), []);
  const shown = filter === "All" ? insights : insights.filter((i) => i.category === filter);

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">AI Business Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Actionable recommendations synthesized from your sales, inventory, and trend data.
          </p>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl gradient-primary text-white">
          <Lightbulb className="h-5 w-5" />
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["All", ...CATEGORIES] as const).map((c) => (
          <Button key={c} variant={filter === c ? "default" : "outline"} size="sm" onClick={() => setFilter(c)}>
            {c}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {shown.map((ins) => {
          const Icon = iconFor(ins.severity);
          return (
            <Card key={ins.id} className={cn("border-l-4", toneFor(ins.severity))}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <CardTitle className="text-base">{ins.title}</CardTitle>
                      <CardDescription className="mt-0.5 text-xs">{ins.category}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={ins.severity === "critical" ? "destructive" : "secondary"} className="shrink-0">
                    {ins.severity}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{ins.detail}</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>Confidence</span><span>{ins.confidence}%</span>
                    </div>
                    <Progress value={ins.confidence} className="h-1.5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4 text-sm">
        <strong>Responsible AI notice:</strong> These insights are generated from statistical
        rules over your historical data. Confidence scores reflect data quality and consistency —
        they are not guarantees. Combine with domain expertise before acting.
      </div>
    </div>
  );
}
