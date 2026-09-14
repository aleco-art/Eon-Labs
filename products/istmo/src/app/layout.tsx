import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Istmo · Ideas que conectan Panamá",
    template: "%s · Istmo",
  },
  description:
    "Comparte propuestas para Panamá, conversa con tu comunidad y encuentra a quienes pueden hacerlas realidad.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
