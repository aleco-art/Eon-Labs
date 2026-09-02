import { describe, expect, it } from "vitest";
import { loginSchema } from "./auth";

describe("login schema", () => {
  it("normalizes a valid email", () => {
    const result = loginSchema.parse({
      email: "  PROFESIONAL@EJEMPLO.ES ",
      password: "UnaClaveSegura9",
    });

    expect(result.email).toBe("profesional@ejemplo.es");
  });

  it("rejects invalid credentials before contacting Auth", () => {
    expect(loginSchema.safeParse({ email: "sin-arroba", password: "corta" }).success).toBe(false);
  });
});
