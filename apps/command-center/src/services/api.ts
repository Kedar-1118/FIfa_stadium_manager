/**
 * StadiumOS AI — Axios API Service client.
 * 
 * Provides unified HTTP client wrappers with interceptors injecting bearer tokens.
 */

import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1",
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 10000 // 10 seconds
});

// Request Interceptor: Attach JWT Access token if cached
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("stadiumos-access-token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Redirect on 401 Unauthenticated error
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("stadiumos-access-token");
      localStorage.removeItem("stadiumos-user");
      // Check if not already on login page to prevent redirects loops
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
