// Report exports: PDF (jsPDF + autotable), Excel (xlsx), and print.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { DATASET, formatCurrency } from "./data";
import { allForecasts, allInventoryPlans, productPerformance } from "./forecast";
import { generateInsights } from "./insights";

function productName(id: string) {
  return DATASET.products.find((p) => p.id === id)?.name ?? id;
}

type Section = { title: string; head: string[]; body: (string | number)[][] };

function buildSections(kind: "sales" | "inventory" | "forecast" | "insights" | "all"): Section[] {
  const s: Section[] = [];
  if (kind === "sales" || kind === "all") {
    s.push({
      title: "Product Performance",
      head: ["Product", "Category", "Units", "Revenue", "Profit", "Trend"],
      body: productPerformance().map((p) => [
        p.product.name,
        p.product.category,
        p.units,
        formatCurrency(p.revenue),
        formatCurrency(p.profit),
        `${p.trend} (${p.trendPct}%)`,
      ]),
    });
  }
  if (kind === "inventory" || kind === "all") {
    s.push({
      title: "Inventory Plan",
      head: ["Product", "Stock", "Reorder Point", "Order Qty", "Days Supply", "Health", "Action"],
      body: allInventoryPlans().map((p) => [
        productName(p.productId),
        DATASET.products.find((x) => x.id === p.productId)!.stock,
        p.reorderPoint,
        p.recommendedOrder,
        p.daysOfSupply,
        `${p.healthScore}/100`,
        p.action,
      ]),
    });
  }
  if (kind === "forecast" || kind === "all") {
    s.push({
      title: "Sales Forecast",
      head: ["Product", "Weekly", "Monthly", "Quarterly", "Annual", "Confidence"],
      body: allForecasts().map((f) => [
        productName(f.productId),
        f.weekly,
        f.monthly,
        f.quarterly,
        f.annual,
        `${f.confidence}%`,
      ]),
    });
  }
  if (kind === "insights" || kind === "all") {
    s.push({
      title: "AI Recommendations",
      head: ["Severity", "Category", "Title", "Detail", "Confidence"],
      body: generateInsights().map((i) => [
        i.severity.toUpperCase(),
        i.category,
        i.title,
        i.detail,
        `${i.confidence}%`,
      ]),
    });
  }
  return s;
}

export function exportPDF(kind: "sales" | "inventory" | "forecast" | "insights" | "all") {
  const doc = new jsPDF({ orientation: "landscape" });
  const sections = buildSections(kind);
  doc.setFontSize(18);
  doc.text("AI Inventory & Sales Forecaster", 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `Generated ${new Date().toLocaleString()} • AI-assisted report — review before acting.`,
    14,
    22,
  );

  let y = 30;
  for (const section of sections) {
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text(section.title, 14, y);
    autoTable(doc, {
      head: [section.head],
      body: section.body,
      startY: y + 3,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229] },
      margin: { left: 14, right: 14 },
    });
    // @ts-expect-error jspdf-autotable augments lastAutoTable
    y = doc.lastAutoTable.finalY + 10;
    if (y > 180) {
      doc.addPage();
      y = 20;
    }
  }
  doc.save(`${kind}-report-${Date.now()}.pdf`);
}

export function exportExcel(kind: "sales" | "inventory" | "forecast" | "insights" | "all") {
  const wb = XLSX.utils.book_new();
  for (const section of buildSections(kind)) {
    const ws = XLSX.utils.aoa_to_sheet([section.head, ...section.body]);
    XLSX.utils.book_append_sheet(wb, ws, section.title.slice(0, 30));
  }
  XLSX.writeFile(wb, `${kind}-report-${Date.now()}.xlsx`);
}

export function printReport() {
  window.print();
}
