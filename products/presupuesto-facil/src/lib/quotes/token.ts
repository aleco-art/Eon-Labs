/**
 * Public quote links.
 *
 * The token is generated with a CSPRNG and travels only in the link handed to
 * the customer. It is never written to our database: share_quote stores its
 * SHA-256 and nothing else. Hashing deliberately lives in SQL alone, so there
 * is one implementation rather than two that can drift apart.
 */

import { randomBytes } from "node:crypto";

/** 32 bytes of entropy, base64url encoded into 43 URL-safe characters. */
const TOKEN_BYTES = 32;

const DEFAULT_VALIDITY_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function createQuoteToken() {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function defaultTokenExpiry(from: Date = new Date()) {
  return new Date(from.getTime() + DEFAULT_VALIDITY_DAYS * MILLISECONDS_PER_DAY);
}

export function buildQuoteLink(appUrl: string, token: string) {
  return `${appUrl.replace(/\/$/, "")}/p/${token}`;
}
