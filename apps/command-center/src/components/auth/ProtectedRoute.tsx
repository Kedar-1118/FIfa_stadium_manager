/**
 * StadiumOS AI — Session Verification Route Guard.
 * 
 * Verifies existence of auth token in localStorage, checks user role against permitted lists,
 * and handles redirects to fallback workspaces.
 */

import React from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("stadiumos-access-token");
  const userJson = localStorage.getItem("stadiumos-user");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && userJson) {
    try {
      const user = JSON.parse(userJson);
      const userRole = user.role || "";
      if (!allowedRoles.includes(userRole)) {
        // Redirect FAN user to their specialized portal
        if (userRole === "FAN") {
          return <Navigate to="/dashboard/fan" replace />;
        }
        // Redirect volunteer or other unauthorized roles back to overview dashboard
        return <Navigate to="/dashboard" replace />;
      }
    } catch {
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
