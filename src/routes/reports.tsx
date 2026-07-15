import { createFileRoute } from "@tanstack/react-router";
import { FileText, FileSpreadsheet, Printer, Download } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { exportExcel, exportPDF, printReport } from "@/lib/exports";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Forecaster AI" },
      { name: "description", content: "Download sales, inventory, forecast, and AI recommendation reports." },
    ],
  }),
  component: ReportsPage,
});

type Kind = "sales" | "inventory" | "forecast" | "insights" | "all";

const REPORTS: { kind: Kind; title: string; description: string }[] = [
  { kind: "sales", title: "Sales Report", description: "Product-level performance: units, revenue, profit, and trend." },
  { kind: "inventory", title: "Inventory Report", description: "Reorder points, order quantities, days of supply, and health scores." },
  { kind: "forecast", title: "Forecast Report", description: "Weekly, monthly, quarterly, and annual demand forecasts with confidence." },
  { kind: "insights", title: "AI Recommendations", description: "Prioritized business insights across restocking, promotions, and trends." },
  { kind: "all", title: "Executive Summary", description: "All reports combined into a single downloadable file." },
];

function ReportsPage() {
  const doPDF = (k: Kind) => { try { exportPDF(k); toast.success("PDF exported"); } catch { toast.error("Export failed"); } };
  const doXLSX = (k: Kind) => { try { exportExcel(k); toast.success("Excel exported"); } catch { toast.error("Export failed"); } };
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Download AI-assisted reports for offline review and sharing.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {REPORTS.map((r) => (
          <Card key={r.kind}>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle>{r.title}</CardTitle>
                  <CardDescription className="mt-1">{r.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button onClick={() => doPDF(r.kind)} size="sm">
                <Download className="mr-2 h-4 w-4" /> PDF
              </Button>
              <Button onClick={() => doXLSX(r.kind)} variant="outline" size="sm">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
              </Button>
              <Button onClick={printReport} variant="ghost" size="sm">
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4 text-sm">
        <strong>Responsible AI:</strong> All reports include AI-generated forecasts and
        recommendations. Confidence scores are shown alongside each prediction. Please review
        before circulating externally or making purchase commitments.
      </div>
    </div>
  );
}
