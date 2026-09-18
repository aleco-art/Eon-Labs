import type { Metadata } from "next";
import { Detail } from "@/components/detail";
import { excerpt, shareData } from "@/lib/share";

type Props = { params: Promise<{ id: string }> };

// What link previews show: the proposal's own title and first lines, with the card from opengraph-image.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await shareData(id);
  if (!data) return { title: "Propuesta no disponible", robots: { index: false } };
  const p = data.proposal;
  const signatures = p.signatures_enabled || p.signature_count > 0
    ? `${p.signature_count.toLocaleString("es-PA")} ${p.signature_count === 1 ? "firma" : "firmas"}${p.signature_goal ? " de " + p.signature_goal.toLocaleString("es-PA") : ""}. `
    : "";
  const description = signatures + excerpt(p.body);
  return {
    title: p.title,
    description,
    alternates: { canonical: "/propuesta/" + p.id },
    openGraph: { type: "article", title: p.title, description, url: "/propuesta/" + p.id },
    twitter: { card: "summary_large_image", title: p.title, description },
  };
}

export default async function ProposalPage({ params }: Props) {
  const { id } = await params;
  return <Detail id={id} />;
}
