import { describe, expect, it } from "vitest";
import { loginSchema } from "./auth";

describe("login schema", () => {
  it("normalizes a valid email", () => {
    const result = loginSchema.parse({
      email: "  PROFESIONAL@EJEMPLO.ES ",
    });

    expect(result.email).toBe("profesional@ejemplo.es");
  });

  it("rejects an invalid email before contacting Auth", () => {
    expect(loginSchema.safeParse({ email: "sin-arroba" }).success).toBe(false);
  });
});
