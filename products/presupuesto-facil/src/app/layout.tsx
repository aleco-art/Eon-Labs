import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Presupuesto Fácil | Eon Labs",
  description: "Presupuestos claros, compartidos y aceptados sin papeleo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
