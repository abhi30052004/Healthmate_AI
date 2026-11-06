import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { router } from "./app/router";
import { queryClient } from "./app/queryClient";
import { ErrorBoundary } from "./app/ErrorBoundary";
import { I18nProvider } from "./i18n/i18nContext";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import "./styles/tokens.css";
import "./index.css";
import "./styles/globals.css";
import "./styles/motion.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <I18nProvider initialLanguage="en">
            <RouterProvider router={router} />
            <Toaster position="top-right" richColors closeButton />
          </I18nProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
