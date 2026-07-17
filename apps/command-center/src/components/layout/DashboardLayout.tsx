/**
 * StadiumOS AI — Unified App Shell Layout.
 * 
 * Provides collapsible sidebar, keyboard navigation support (WCAG AA),
 * active stadium context selection, theme toggling, and notifications count indicators.
 */

import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Map,
  AlertTriangle,
  DoorOpen,
  Users,
  Menu,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  Building,
  Bell,
} from "lucide-react";
import { useUIStore } from "../../store/uiStore";
import api from "../../services/api";

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
  badgeKey?: string;
}

export const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSidebarOpen, activeStadiumId, theme, toggleSidebar, setActiveStadiumId, setTheme } = useUIStore();

  const [stadiums, setStadiums] = useState<any[]>([]);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const user = JSON.parse(localStorage.getItem("stadiumos-user") || "{}");

  const sidebarLinks: SidebarItem[] = [
    { name: "Overview", path: "/", icon: LayoutDashboard },
    { name: "Digital Twin Map", path: "/map", icon: Map },
    { name: "Incident Triage", path: "/incidents", icon: AlertTriangle, badgeKey: "alerts" },
    { name: "Gate Controls", path: "/gates", icon: DoorOpen },
    { name: "Volunteer Registry", path: "/volunteers", icon: Users }
  ];

  // Fetch active stadiums list & alert counts on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get("/stadiums");
        const data = response.data || [];
        setStadiums(data);
        if (data.length > 0 && !activeStadiumId) {
          setActiveStadiumId(data[0].id);
        }
      } catch (err) {
        console.warn("Failed to load stadiums list, applying default context.");
        // Fallback Dallas Stadium
        setStadiums([{ id: "dallas-stadium-id", name: "Dallas Stadium (AT&T Stadium)" }]);
        if (!activeStadiumId) {
          setActiveStadiumId("dallas-stadium-id");
        }
      }

      try {
        const resIncidents = await api.get("/incidents");
        setActiveAlertsCount(resIncidents.data?.length || 0);
      } catch (err) {
        // Fallback alert count
        setActiveAlertsCount(3);
      }
    };

    fetchData();
    
    // Poll alert count every 15 seconds as a fallback
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [activeStadiumId, setActiveStadiumId]);

  const handleLogout = () => {
    localStorage.removeItem("stadiumos-access-token");
    localStorage.removeItem("stadiumos-user");
    navigate("/login");
  };

  const getActiveStadiumName = () => {
    const match = stadiums.find((s) => s.id === activeStadiumId);
    return match ? match.name : "Select Venue...";
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-200">
      
      {/* WCAG Skip Navigation link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:shadow-md"
      >
        Skip to main content
      </a>
      
      {/* 1. Left Collapsible Sidebar */}
      <aside 
        className={`border-r border-border bg-card/60 backdrop-blur-md transition-all duration-300 flex flex-col flex-shrink-0 relative z-20 ${
          isSidebarOpen ? "w-64" : "w-16"
        }`}
        aria-label="Main Navigation Sidebar"
      >
        {/* Sidebar Header Brand */}
        <header className="h-16 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <Building className="w-5 h-5 flex-shrink-0" />
            </div>
            {isSidebarOpen && (
              <span className="font-bold tracking-tight text-sm whitespace-nowrap">
                StadiumOS AI
              </span>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="p-1 rounded-md border border-border hover:bg-muted text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </header>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;
            
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isActive
                    ? "bg-primary text-white shadow-md shadow-primary/10"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isSidebarOpen && (
                  <span className="flex-1 whitespace-nowrap">{link.name}</span>
                )}
                {isSidebarOpen && link.badgeKey === "alerts" && activeAlertsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-destructive text-white" role="status">
                    {activeAlertsCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer (Logout) */}
        <footer className="p-3 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span className="whitespace-nowrap">Sign Out</span>}
          </button>
        </footer>
      </aside>

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Main Header Navbar */}
        <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md flex items-center justify-between px-6 relative z-10">
          
          {/* Left: Active Stadium Dropdown */}
          <div className="flex items-center gap-4">
            <label htmlFor="stadium-select" className="sr-only">Active Stadium Context</label>
            <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary/50 text-sm font-medium">
              <Building className="w-4 h-4 text-muted-foreground" />
              <select
                id="stadium-select"
                value={activeStadiumId || ""}
                onChange={(e) => setActiveStadiumId(e.target.value)}
                className="bg-transparent focus:outline-none text-foreground cursor-pointer font-medium"
              >
                {stadiums.map((s) => (
                  <option key={s.id} value={s.id} className="bg-background text-foreground">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Controls & User Profile */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition cursor-pointer"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notification Alert Status */}
            <div className="relative">
              <button 
                aria-label="View alerts notification center"
                className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition relative"
              >
                <Bell className="w-4 h-4" />
                {activeAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                )}
              </button>
            </div>

            {/* User Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-expanded={showUserMenu}
                aria-label="User Profile options"
                className="flex items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-primary/50 p-1.5 rounded-lg"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs">
                  {user.email ? user.email.slice(0, 2).toUpperCase() : "OP"}
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-semibold text-foreground leading-tight">{user.email || "Operator"}</p>
                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{user.role || "OPERATOR"}</p>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card shadow-lg py-1 z-30" role="menu">
                  <div className="px-4 py-2 border-b border-border text-xs text-muted-foreground">
                    Role level: <span className="font-bold text-foreground">{user.role}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    role="menuitem"
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 3. Main Outlet Container (Sub-views) */}
        <main id="main-content" className="flex-1 overflow-y-auto bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
export default DashboardLayout;
