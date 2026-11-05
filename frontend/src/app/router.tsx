import React, { lazy, Suspense } from "react";
import { createBrowserRouter, createMemoryRouter, Navigate, useNavigate, RouteObject } from "react-router-dom";
import { PageLoader } from "../components/feedback/PageLoader";
import { LandingPageView } from "../features/landing/LandingPageView";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { PublicDoctorPortalPage } from "../features/sharing/PublicDoctorPortalPage";
import { NotFoundPage } from "../features/notfound/NotFoundPage";

// Lazy-loaded workspace layout and views
const AppLayout = lazy(() => import("./AppLayout"));
const DashboardRoute = lazy(() =>
  import("./AppRoutes").then((m) => ({ default: m.DashboardRoute }))
);
const RecordsRoute = lazy(() =>
  import("./AppRoutes").then((m) => ({ default: m.RecordsRoute }))
);
const TrendsRoute = lazy(() =>
  import("./AppRoutes").then((m) => ({ default: m.TrendsRoute }))
);
const MedicinesRoute = lazy(() =>
  import("./AppRoutes").then((m) => ({ default: m.MedicinesRoute }))
);
const AppointmentsRoute = lazy(() =>
  import("./AppRoutes").then((m) => ({ default: m.AppointmentsRoute }))
);
const SymptomsRoute = lazy(() =>
  import("./AppRoutes").then((m) => ({ default: m.SymptomsRoute }))
);
const VisitPackRoute = lazy(() =>
  import("./AppRoutes").then((m) => ({ default: m.VisitPackRoute }))
);
const AssistantRoute = lazy(() =>
  import("./AppRoutes").then((m) => ({ default: m.AssistantRoute }))
);
const FamilyRoute = lazy(() =>
  import("./AppRoutes").then((m) => ({ default: m.FamilyRoute }))
);
const SharingRoute = lazy(() =>
  import("./AppRoutes").then((m) => ({ default: m.SharingRoute }))
);
const PrivacyRoute = lazy(() =>
  import("./AppRoutes").then((m) => ({ default: m.PrivacyRoute }))
);
const SettingsRoute = lazy(() =>
  import("./AppRoutes").then((m) => ({ default: m.SettingsRoute }))
);
const StyleGuideRoute = lazy(() =>
  import("./AppRoutes").then((m) => ({ default: m.StyleGuideRoute }))
);

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function LandingRouteWrapper() {
  const navigate = useNavigate();
  return (
    <LandingPageView
      onGetStarted={() => navigate("/register")}
      onLogin={() => navigate("/login")}
    />
  );
}

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <LandingRouteWrapper />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/s/:token",
    element: <PublicDoctorPortalPage />,
  },
  {
    path: "/doctor-share",
    element: <PublicDoctorPortalPage />,
  },
  {
    path: "/app",
    element: (
      <SuspenseWrapper>
        <AppLayout />
      </SuspenseWrapper>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      {
        path: "dashboard",
        element: (
          <SuspenseWrapper>
            <DashboardRoute />
          </SuspenseWrapper>
        ),
      },
      {
        path: "records",
        element: (
          <SuspenseWrapper>
            <RecordsRoute />
          </SuspenseWrapper>
        ),
      },
      {
        path: "trends",
        element: (
          <SuspenseWrapper>
            <TrendsRoute />
          </SuspenseWrapper>
        ),
      },
      {
        path: "medicines",
        element: (
          <SuspenseWrapper>
            <MedicinesRoute />
          </SuspenseWrapper>
        ),
      },
      {
        path: "appointments",
        element: (
          <SuspenseWrapper>
            <AppointmentsRoute />
          </SuspenseWrapper>
        ),
      },
      {
        path: "symptoms",
        element: (
          <SuspenseWrapper>
            <SymptomsRoute />
          </SuspenseWrapper>
        ),
      },
      {
        path: "visit-pack",
        element: (
          <SuspenseWrapper>
            <VisitPackRoute />
          </SuspenseWrapper>
        ),
      },
      {
        path: "assistant",
        element: (
          <SuspenseWrapper>
            <AssistantRoute />
          </SuspenseWrapper>
        ),
      },
      {
        path: "family",
        element: (
          <SuspenseWrapper>
            <FamilyRoute />
          </SuspenseWrapper>
        ),
      },
      {
        path: "sharing",
        element: (
          <SuspenseWrapper>
            <SharingRoute />
          </SuspenseWrapper>
        ),
      },
      {
        path: "privacy",
        element: (
          <SuspenseWrapper>
            <PrivacyRoute />
          </SuspenseWrapper>
        ),
      },
      {
        path: "settings",
        element: (
          <SuspenseWrapper>
            <SettingsRoute />
          </SuspenseWrapper>
        ),
      },
      {
        path: "styleguide",
        element: (
          <SuspenseWrapper>
            <StyleGuideRoute />
          </SuspenseWrapper>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
];

export const router = createBrowserRouter(routes);

export function createTestRouter(initialPath = "/") {
  return createMemoryRouter(routes, { initialEntries: [initialPath] });
}
