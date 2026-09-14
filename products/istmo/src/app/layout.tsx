import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { Shell } from "@/components/shell";
import { siteName } from "@/lib/site";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-dm-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: `${siteName()} · Propuestas ciudadanas para Panamá`, template: `%s · ${siteName()}` },
  description:
    "Haz una propuesta que te interesaría, recibe el apoyo de la comunidad y envíala a las entidades y responsables de cada área en Panamá.",
  openGraph: { locale: "es_PA", type: "website", siteName: siteName() },
};
export const viewport: Viewport = { themeColor: "#0b3d8c" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={dmSans.variable}>
      <body>
        <Shell siteName={siteName()}>{children}</Shell>
      </body>
    </html>
  );
}
