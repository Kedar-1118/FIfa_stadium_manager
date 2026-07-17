/**
 * StadiumOS AI — Operations CommandCenter Login Portal.
 * 
 * Implements accessible logins (WCAG AA), custom fields,
 * and modern glassmorphism aesthetics.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, Mail, AlertTriangle, Loader2 } from "lucide-react";
import api from "../services/api";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/auth/login", { email, password });
      const { access_token, user } = response.data;
      
      // Store session context
      localStorage.setItem("stadiumos-access-token", access_token);
      localStorage.setItem("stadiumos-user", JSON.stringify(user));

      navigate("/");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Connection to API gateway failed. Review your configurations.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 relative overflow-hidden font-sans">
      {/* Background Gradients & Effects */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[120px]" />

      <section 
        className="w-full max-w-md p-8 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl relative z-10"
        aria-labelledby="login-title"
      >
        {/* Header Icon */}
        <header className="flex flex-col items-center mb-8">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400 mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h1 id="login-title" className="text-2xl font-bold tracking-tight text-white">
            StadiumOS AI
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            FIFA World Cup 2026 CommandCenter
          </p>
        </header>

        {/* Action Error Alerts */}
        {error && (
          <div 
            className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3 mb-6"
            role="alert"
            aria-live="assertive"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email Input */}
          <div className="space-y-2">
            <label htmlFor="email-input" className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                id="email-input"
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@stadiumos.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-800 bg-slate-950/50 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition disabled:opacity-50"
                aria-required="true"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label htmlFor="password-input" className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                id="password-input"
                type="password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-800 bg-slate-950/50 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition disabled:opacity-50"
                aria-required="true"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 active:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-500/10 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Logging in...</span>
              </>
            ) : (
              <span>Sign In to CommandCenter</span>
            )}
          </button>
        </form>
      </section>
    </main>
  );
};
export default Login;
