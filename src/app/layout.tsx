import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { SessionProvider } from "@/components/auth/session-provider";

export const metadata: Metadata = {
  title: "BillFlow — Dual Aero Billing",
  description: "Invoice and Purchase Order management for Dual Aero",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <SessionProvider>
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
        </SessionProvider>
      </body>
    </html>
  );
}
