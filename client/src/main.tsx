import * as Sentry from "@sentry/react";
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

// Initialize Sentry for error monitoring
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    // Only send errors in production
    enabled: import.meta.env.PROD,
    // Sample rate for performance monitoring (0 = disabled, 1 = 100%)
    tracesSampleRate: 0.1,
    // Capture unhandled promise rejections
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Don't send PII
    beforeSend(event) {
      // Remove sensitive data
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      return event;
    },
  });
}

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
    // Report to Sentry (excluding auth errors)
    if (error && !(error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG)) {
      Sentry.captureException(error, { tags: { type: "api_query" } });
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
    // Report to Sentry (excluding auth errors)
    if (error && !(error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG)) {
      Sentry.captureException(error, { tags: { type: "api_mutation" } });
    }
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary
    fallback={({ error }) => (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Algo deu errado</h1>
          <p className="text-muted-foreground mb-4">
            Ocorreu um erro inesperado. Nossa equipe foi notificada.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Recarregar página
          </button>
        </div>
      </div>
    )}
  >
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </Sentry.ErrorBoundary>
);
