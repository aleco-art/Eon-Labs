import { ProfilePage } from "@/components/profile";
export default async function Profile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ProfilePage id={(await params).id} />;
}
