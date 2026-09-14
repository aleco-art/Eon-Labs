import { ProposalForm } from "@/components/proposal-form";
export default async function Edit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProposalForm id={id} />;
}
