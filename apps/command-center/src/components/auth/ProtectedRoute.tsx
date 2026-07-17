/**
 * StadiumOS AI — Session Verification Route Guard.
 * 
 * Verifies existence of auth token in localStorage, else redirects to login.
 */

import React from "react";
import { Navigate } from "react-router-dom";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem("stadiumos-access-token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
export default ProtectedRoute;
