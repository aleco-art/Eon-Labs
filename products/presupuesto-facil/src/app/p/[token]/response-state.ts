/**
 * Kept out of actions.ts because a "use server" module may only export async
 * functions: exporting the initial state from there fails the build.
 */

export type ResponseState = {
  status: "idle" | "error";
  message?: string;
};

export const initialResponseState: ResponseState = { status: "idle" };
