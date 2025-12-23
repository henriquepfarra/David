import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";
import {
  getGoogleAuthUrl,
  exchangeGoogleCode,
  getGoogleUserInfo,
} from "./googleOAuth";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getRedirectUri(req: Request): string {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}/api/oauth/callback`;
}

export function registerOAuthRoutes(app: Express) {
  // Google OAuth login route - redirects to Google
  app.get("/api/oauth/google/login", (req: Request, res: Response) => {
    console.log("[OAuth] Starting Google OAuth flow");
    const redirectUri = getRedirectUri(req);
    console.log("[OAuth] Redirect URI:", redirectUri);
    const authUrl = getGoogleAuthUrl(redirectUri);
    res.redirect(authUrl);
  });

  // Google OAuth callback - handles response from Google
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const error = getQueryParam(req, "error");

    // Handle Google OAuth error
    if (error) {
      console.error("[OAuth] Google returned error:", error);
      res.status(400).json({ error: `Google OAuth error: ${error}` });
      return;
    }

    // Check if this is a Google OAuth callback (code present, no state)
    const state = getQueryParam(req, "state");
    const isGoogleCallback = code && !state;

    if (isGoogleCallback) {
      // Handle Google OAuth callback
      if (!code) {
        res.status(400).json({ error: "code is required for Google OAuth" });
        return;
      }

      try {
        console.log("[OAuth] Exchanging Google code for token");
        const redirectUri = getRedirectUri(req);
        console.log("[OAuth] Using redirect URI:", redirectUri);
        console.log("[OAuth] Google Client ID configured:", !!ENV.googleClientId);
        console.log("[OAuth] Google Client Secret configured:", !!ENV.googleClientSecret);

        const tokenResponse = await exchangeGoogleCode(code, redirectUri);

        console.log("[OAuth] Getting user info from Google");
        const googleUser = await getGoogleUserInfo(tokenResponse.access_token);

        console.log("[OAuth] Google user:", googleUser.email);

        // Create/update user in database using Google ID as openId
        const openId = `google_${googleUser.id}`;
        await db.upsertUser({
          openId,
          name: googleUser.name || null,
          email: googleUser.email ?? null,
          loginMethod: "google",
          lastSignedIn: new Date(),
        });

        // Create session token
        const sessionToken = await sdk.createSessionToken(openId, {
          name: googleUser.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        console.log("[OAuth] Google login successful, redirecting to home");
        res.redirect(302, "/");
      } catch (error: any) {
        console.error("[OAuth] Google callback failed:", error?.response?.data || error?.message || error);
        const errorMessage = error?.response?.data?.error_description || error?.response?.data?.error || error?.message || "Unknown error";
        res.status(500).json({ error: "Google OAuth callback failed", details: errorMessage });
      }
      return;
    }

    // Handle legacy Manus OAuth callback (with state)
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required for Manus OAuth" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Manus callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // Logout route
  app.post("/api/oauth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.json({ success: true });
  });
}
