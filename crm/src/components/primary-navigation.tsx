import Link from "next/link";

const primaryDestinations = [
  { href: "/companies", label: "Empresas" },
  { href: "/contacts", label: "Contactos" },
  { href: "/opportunities", label: "Oportunidades" },
] as const;

export function PrimaryNavigation() {
  return (
    <nav aria-label="Navegación principal">
      <ul className="flex flex-wrap gap-2">
        {primaryDestinations.map((destination) => (
          <li key={destination.href}>
            <Link
              className="inline-flex rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              href={destination.href}
            >
              {destination.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
