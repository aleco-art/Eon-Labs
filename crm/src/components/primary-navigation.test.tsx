import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PrimaryNavigation } from "./primary-navigation";

describe("PrimaryNavigation", () => {
  it("links to every primary CRM area", () => {
    render(<PrimaryNavigation />);

    expect(screen.getByRole("link", { name: "Empresas" })).toHaveAttribute(
      "href",
      "/companies",
    );
    expect(screen.getByRole("link", { name: "Contactos" })).toHaveAttribute(
      "href",
      "/contacts",
    );
    expect(screen.getByRole("link", { name: "Oportunidades" })).toHaveAttribute(
      "href",
      "/opportunities",
    );
  });
});
