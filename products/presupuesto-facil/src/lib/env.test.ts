import { afterEach, describe, expect, it } from "vitest";
import { getSupabaseConfig, isSupabaseConfigured } from "./env";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
});

describe("Supabase environment", () => {
  it("accepts a complete public configuration", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_example_key";

    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabaseConfig()).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_example_key",
    });
  });

  it("rejects incomplete configuration", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(isSupabaseConfigured()).toBe(false);
    expect(() => getSupabaseConfig()).toThrow("Supabase no está configurado");
  });
});
