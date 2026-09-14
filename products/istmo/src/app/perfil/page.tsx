"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/shell";

export default function MyProfile() {
  const { user, ready } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (ready) router.replace(user ? "/perfil/" + user.id : "/cuenta");
  }, [ready, user, router]);
  return <p className="page loading">Abriendo tu perfil…</p>;
}
