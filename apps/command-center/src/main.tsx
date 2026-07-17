/**
 * StadiumOS AI — React Bootstrap entry.
 * 
 * Configures QueryClient and registers the router layout endpoints.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import DigitalTwinMap from "./pages/DigitalTwinMap";
import IncidentTriage from "./pages/IncidentTriage";
import GateControls from "./pages/GateControls";
import VolunteerRegistry from "./pages/VolunteerRegistry";
import DashboardLayout from "./components/layout/DashboardLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import WebSocketProvider from "./components/auth/WebSocketProvider";
import "./index.css";

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
        element: <Overview />
      },
      {
        path: "map",
        element: <DigitalTwinMap />
      },
      {
        path: "incidents",
        element: <IncidentTriage />
      },
      {
        path: "gates",
        element: <GateControls />
      },
      {
        path: "volunteers",
        element: <VolunteerRegistry />
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

