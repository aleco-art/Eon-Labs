import type { Metadata } from "next";
import { Inbox } from "@/components/messages";

export const metadata: Metadata = { title: "Mensajes", robots: { index: false } };

export default function MessagesPage() {
  return <Inbox />;
}
