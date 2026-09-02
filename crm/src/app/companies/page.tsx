export default function CompaniesPage() {
  return <PlaceholderPage title="Empresas" />;
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <section aria-labelledby="page-title">
      <h1 className="text-3xl font-semibold" id="page-title">
        {title}
      </h1>
      <p className="mt-3 text-slate-600">
        La gestión de empresas se implementará en una fase posterior.
      </p>
    </section>
  );
}
