export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "David Ghostwriter";

export const APP_LOGO = "https://placehold.co/128x128/E1E7EF/1F2937?text=David";

// Generate login URL - now uses Google OAuth
export const getLoginUrl = () => {
  // Em desenvolvimento local, usar página de login local
  if (import.meta.env.DEV) {
    return "/login";
  }

  // Em produção, usar Google OAuth
  return "/api/oauth/google/login";
};
