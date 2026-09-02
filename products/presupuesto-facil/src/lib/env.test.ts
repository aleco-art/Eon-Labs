import { afterEach, describe, expect, it } from "vitest";
import { getAppUrl, getSupabaseConfig, isSupabaseConfigured } from "./env";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const originalVercelUrl = process.env.VERCEL_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  process.env.VERCEL_URL = originalVercelUrl;
});

describe("application URL", () => {
  it("uses the explicit application URL when configured", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://preview.example.com/";

    expect(getAppUrl()).toBe("https://preview.example.com");
  });

  it("uses Vercel's deployment URL for previews", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_URL = "presupuesto-facil-git-feature.vercel.app";

    expect(getAppUrl()).toBe("https://presupuesto-facil-git-feature.vercel.app");
  });
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
