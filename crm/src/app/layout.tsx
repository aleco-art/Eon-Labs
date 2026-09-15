import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PrimaryNavigation } from "@/components/primary-navigation";

import "./globals.css";

export const metadata: Metadata = {
  title: "Eon CRM",
  description: "Base del CRM de Eon Labs",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <header className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <LinkTitle />
            <PrimaryNavigation />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}

function LinkTitle() {
  return <span className="text-lg font-semibold">Eon CRM</span>;
}
