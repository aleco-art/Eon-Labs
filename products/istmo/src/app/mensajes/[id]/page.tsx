import type { Metadata } from "next";
import { Thread } from "@/components/messages";

export const metadata: Metadata = { title: "Conversación", robots: { index: false } };

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Thread id={id} />;
}
