"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Users,
  CreditCard,
  Menu,
  X,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { SearchBox } from "@/components/search/search-box";
import { useState } from "react";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Invoices",
    href: "/invoices",
    icon: FileText,
  },
  {
    name: "Purchase Orders",
    href: "/purchase-orders",
    icon: ShoppingCart,
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    name: "Payments",
    href: "/invoices?status=paid",
    icon: CreditCard,
  },
];

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href.includes("?")) return false;
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground leading-none">
              BillFlow
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Dual Aero</p>
          </div>
        </div>
        <SearchBox />
      </div>

      {/* Navigation */}
      <nav
        role="navigation"
        aria-label="Main navigation"
        className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto"
      >
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavClick}
              className={cn(
                "group relative flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                active
                  ? "nav-item-active"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 flex-shrink-0",
                  active
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
                aria-hidden="true"
              />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border space-y-3">
        <LogoutButton />
        <p className="text-xs text-muted-foreground text-center">
          BillFlow v1.0
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-border rounded-lg shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed left-0 top-0 bottom-0 z-40 w-72 bg-card border-r border-border shadow-xl transition-transform duration-200 no-print",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Application sidebar"
      >
        <SidebarContent onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex no-print w-64 flex-col border-r border-border bg-card flex-shrink-0"
        aria-label="Application sidebar"
      >
        <SidebarContent />
      </aside>
    </>
  );
}
