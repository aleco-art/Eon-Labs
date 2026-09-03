/**
 * Kept out of actions.ts because a "use server" module may only export async
 * functions.
 */

export type NewQuoteState = {
  status: "idle" | "error";
  message?: string;
};

export const initialNewQuoteState: NewQuoteState = { status: "idle" };
