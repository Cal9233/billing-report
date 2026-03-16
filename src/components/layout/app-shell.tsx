"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/auth");

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main
          id="main-content"
          role="main"
          className="flex-1 overflow-auto"
          tabIndex={-1}
        >
          <div className="p-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </>
  );
}
