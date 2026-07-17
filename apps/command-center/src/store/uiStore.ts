/**
 * StadiumOS AI — Zustand UI Preferences Store.
 * 
 * Manages theme switching (light/dark), sidebar toggle, and active stadium selection.
 */

import { create } from "zustand";

interface UIState {
  isSidebarOpen: boolean;
  activeStadiumId: string | null;
  theme: "light" | "dark";
  toggleSidebar: () => void;
  setActiveStadiumId: (id: string | null) => void;
  setTheme: (theme: "light" | "dark") => void;
}

export const useUIStore = create<UIState>((set) => {
  // Read initial values from localStorage to support persistency
  const storedTheme = localStorage.getItem("stadiumos-theme") as "light" | "dark" || "dark";
  const storedStadium = localStorage.getItem("stadiumos-active-stadium");

  // Sync theme class to document body on startup
  if (storedTheme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  return {
    isSidebarOpen: true,
    activeStadiumId: storedStadium || null,
    theme: storedTheme,
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    setActiveStadiumId: (id) => {
      if (id) {
        localStorage.setItem("stadiumos-active-stadium", id);
      } else {
        localStorage.removeItem("stadiumos-active-stadium");
      }
      set({ activeStadiumId: id });
    },
    setTheme: (theme) => {
      localStorage.setItem("stadiumos-theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      set({ theme });
    }
  };
});
export default useUIStore;
