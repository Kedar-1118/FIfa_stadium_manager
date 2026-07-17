/**
 * StadiumOS AI — React Bootstrap entry.
 * 
 * Configures QueryClient and registers the router layout endpoints.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import Login from "./pages/Login";
import DashboardLayout from "./components/layout/DashboardLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import WebSocketProvider from "./components/auth/WebSocketProvider";
import "./index.css";

// Lazy-load sub-views to optimize initial dashboard bundle size
const Overview = lazy(() => import("./pages/Overview"));
const DigitalTwinMap = lazy(() => import("./pages/DigitalTwinMap"));
const IncidentTriage = lazy(() => import("./pages/IncidentTriage"));
const GateControls = lazy(() => import("./pages/GateControls"));
const VolunteerRegistry = lazy(() => import("./pages/VolunteerRegistry"));

// Loading spinner fallback component
const PageLoader = () => (
  <div className="h-64 w-full flex items-center justify-center text-muted-foreground text-xs font-semibold">
    Loading CommandCenter view...
  </div>
);

// 1. Initialize TanStack React Query cache client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

// 2. Define Router tree with Protected Route boundaries
const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <Overview />
          </Suspense>
        )
      },
      {
        path: "map",
        element: (
          <Suspense fallback={<PageLoader />}>
            <DigitalTwinMap />
          </Suspense>
        )
      },
      {
        path: "incidents",
        element: (
          <Suspense fallback={<PageLoader />}>
            <IncidentTriage />
          </Suspense>
        )
      },
      {
        path: "gates",
        element: (
          <Suspense fallback={<PageLoader />}>
            <GateControls />
          </Suspense>
        )
      },
      {
        path: "volunteers",
        element: (
          <Suspense fallback={<PageLoader />}>
            <VolunteerRegistry />
          </Suspense>
        )
      },
      {
        path: "*",
        element: <Navigate to="/" replace />
      }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <RouterProvider router={router} />
      </WebSocketProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

