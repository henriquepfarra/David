import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // In development mode, try to authenticate via cookie first
    if (process.env.NODE_ENV === "development") {
      // Check if user has a valid session cookie (set by localLogin)
      const authResult = await sdk.authenticateRequest(opts.req);
      if (authResult) {
        user = authResult;
      }
      // If no session, user stays null (not logged in)
      // User can login via /login page which calls localLogin
    } else {
      user = await sdk.authenticateRequest(opts.req);
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
