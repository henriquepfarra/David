import axios from "axios";
import { ENV } from "./env";

// Google OAuth URLs
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export interface GoogleTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
    id_token?: string;
}

export interface GoogleUserInfo {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    locale?: string;
}

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(redirectUri: string): string {
    const params = new URLSearchParams({
        client_id: ENV.googleClientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        access_type: "offline",
        prompt: "consent",
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeGoogleCode(
    code: string,
    redirectUri: string
): Promise<GoogleTokenResponse> {
    const params = new URLSearchParams({
        code,
        client_id: ENV.googleClientId,
        client_secret: ENV.googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
    });

    const response = await axios.post<GoogleTokenResponse>(
        GOOGLE_TOKEN_URL,
        params.toString(),
        {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }
    );

    return response.data;
}

/**
 * Get user info from Google using access token
 */
export async function getGoogleUserInfo(
    accessToken: string
): Promise<GoogleUserInfo> {
    const response = await axios.get<GoogleUserInfo>(GOOGLE_USERINFO_URL, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    return response.data;
}
