import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  TrendingUp,
  Boxes,
  BarChart3,
  Lightbulb,
  MessageSquare,
  FileText,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Sales Forecast", url: "/forecast", icon: TrendingUp },
  { title: "Inventory", url: "/inventory", icon: Boxes },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "AI Insights", url: "/insights", icon: Lightbulb },
  { title: "AI Assistant", url: "/chat", icon: MessageSquare },
  { title: "Reports", url: "/reports", icon: FileText },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-3 px-2 py-3">
          <img
            src="/logo.png"
            alt="Forecaster AI"
            className="h-11 w-11 shrink-0 rounded-lg object-contain shadow-[var(--shadow-elegant)]"
          />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-base font-semibold leading-tight">Forecaster AI</div>
            <div className="truncate text-sm text-muted-foreground">Predict demand. Perfect stock.</div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
