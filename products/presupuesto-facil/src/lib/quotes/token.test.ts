import { describe, expect, it } from "vitest";
import { buildQuoteLink, createQuoteToken, defaultTokenExpiry } from "./token";

describe("quote tokens", () => {
  it("is long enough for the database constraint", () => {
    // share_quote refuses anything shorter than 32 characters.
    expect(createQuoteToken().length).toBeGreaterThanOrEqual(32);
  });

  it("only uses URL-safe characters", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      expect(createQuoteToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("never repeats", () => {
    const tokens = new Set(Array.from({ length: 500 }, () => createQuoteToken()));

    expect(tokens.size).toBe(500);
  });
});

describe("token expiry", () => {
  it("defaults to thirty days ahead", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");

    expect(defaultTokenExpiry(from).toISOString()).toBe("2026-01-31T00:00:00.000Z");
  });

  it("is always in the future", () => {
    expect(defaultTokenExpiry().getTime()).toBeGreaterThan(Date.now());
  });
});

describe("quote links", () => {
  it("builds a link from the application URL", () => {
    expect(buildQuoteLink("https://presupuesto.example.com", "abc123")).toBe(
      "https://presupuesto.example.com/p/abc123",
    );
  });

  it("tolerates a trailing slash", () => {
    expect(buildQuoteLink("https://presupuesto.example.com/", "abc123")).toBe(
      "https://presupuesto.example.com/p/abc123",
    );
  });
});
