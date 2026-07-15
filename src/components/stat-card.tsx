import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "info" | "destructive";
  trend?: { value: number; label?: string };
};

const toneMap: Record<NonNullable<Props["tone"]>, string> = {
  primary: "from-primary/15 to-primary/5 text-primary",
  success: "from-[color:var(--success)]/15 to-[color:var(--success)]/5 text-[color:var(--success)]",
  warning: "from-[color:var(--warning)]/20 to-[color:var(--warning)]/5 text-[color:var(--warning-foreground)]",
  info: "from-[color:var(--info)]/15 to-[color:var(--info)]/5 text-[color:var(--info)]",
  destructive:
    "from-destructive/15 to-destructive/5 text-destructive",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "primary", trend }: Props) {
  return (
    <div className="card-elevated relative overflow-hidden p-5">
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b opacity-70",
          toneMap[tone],
        )}
      />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
          {trend && (
            <div
              className={cn(
                "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                trend.value >= 0
                  ? "bg-[color:var(--success)]/10 text-[color:var(--success)]"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value)}% {trend.label ?? ""}
            </div>
          )}
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-background/60 shadow-inner">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
