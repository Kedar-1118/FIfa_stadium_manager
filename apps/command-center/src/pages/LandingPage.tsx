/**
 * StadiumOS AI — Unified Operations Landing Page.
 * 
 * Implements a premium, stunning promotional landing page featuring smooth gradients,
 * futuristic glassmorphism components, interactive agent grids, and a clear call-to-action
 * to launch the Command Center.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Zap, Cpu, Users, ArrowRight, Activity, Terminal } from "lucide-react";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLaunch = () => {
    navigate("/login");
  };

  const features = [
    {
      title: "LangGraph Agent Mesh",
      description: "Autonomous orchestration of crowd, transportation, security, and operations agent nodes.",
      icon: Cpu,
      color: "from-blue-500 to-indigo-500",
      glow: "group-hover:shadow-blue-500/20"
    },
    {
      title: "Real-time Telemetry & Map",
      description: "Interactive crowd density mapping, geofenced tracking, and digital twin live rendering.",
      icon: Activity,
      color: "from-emerald-500 to-cyan-500",
      glow: "group-hover:shadow-emerald-500/20"
    },
    {
      title: "Gate Congestion Controls",
      description: "Live flow analytics, remote lock/unlock automation, and bidirectional throughput throttling.",
      icon: Shield,
      color: "from-purple-500 to-pink-500",
      glow: "group-hover:shadow-purple-500/20"
    },
    {
      title: "Volunteer Triage Routing",
      description: "Intelligent match algorithms matching incidents with nearby volunteers based on skills.",
      icon: Users,
      color: "from-amber-500 to-orange-500",
      glow: "group-hover:shadow-amber-500/20"
    }
  ];

  const agentMesh = [
    { name: "CrowdAgent", role: "Analyzes density and routes fans dynamically." },
    { name: "TransportAgent", role: "Coordinates shuttles and resolves bottlenecks." },
    { name: "SecurityAgent", role: "Triages emergency risks and alarm escalations." },
    { name: "VolunteerAgent", role: "Deploys personnel to critical zones instantly." }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col justify-between">
      
      {/* Background Gradients & Blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none" />

      {/* Global Header */}
      <header className="w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-slate-900 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <span className="font-bold tracking-tight text-lg text-white">StadiumOS AI</span>
        </div>

        <nav className="flex items-center gap-6">
          <button 
            onClick={handleLaunch}
            className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition"
          >
            Overview
          </button>
          <button 
            onClick={handleLaunch}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer border border-blue-500/20"
          >
            Launch App
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 pt-16 pb-20 relative z-10 flex flex-col items-center text-center">
        
        {/* Promotion tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-8 animate-fade-in shadow-inner">
          <Zap className="w-3.5 h-3.5" />
          <span>FIFA World Cup 2026 Ready</span>
        </div>

        {/* Hero title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          Next-Gen Autonomous <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">
            Stadium Operations OS
          </span>
        </h1>

        <p className="text-slate-400 text-lg max-w-2xl mt-6 leading-relaxed">
          Coordinate microservices, crowd densities, smart gates, and volunteer dispatch 
          powered by an advanced agentic LangGraph workflow mesh.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
          <button 
            onClick={handleLaunch}
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-600/30 transition flex items-center justify-center gap-3 group cursor-pointer border border-blue-500/20 active:scale-98"
          >
            <span>Launch CommandCenter</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button 
            onClick={handleLaunch}
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex items-center justify-center gap-3 cursor-pointer"
          >
            <Terminal className="w-5 h-5 text-slate-500" />
            <span>Join Volunteer Mesh</span>
          </button>
        </div>

        {/* Features Showcase Grid */}
        <section className="w-full mt-24" aria-labelledby="features-title">
          <h2 id="features-title" className="text-sm font-semibold tracking-wider text-slate-500 uppercase mb-8">
            Engineered for Ultra-Scale Safety & Efficiency
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={idx}
                  className="group relative p-6 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-md hover:border-slate-800 hover:bg-slate-900/60 transition duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Feature Icon Container */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} p-0.5 text-white flex items-center justify-center mb-6 shadow-md shadow-black/20`}>
                      <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-blue-400 group-hover:text-white transition">
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                  </div>

                  <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-blue-400 group-hover:text-blue-300 transition cursor-pointer" onClick={handleLaunch}>
                    <span>Learn more</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Agentic Graph Blueprint Section */}
        <section className="w-full max-w-5xl mt-24 p-8 rounded-3xl border border-slate-900 bg-slate-900/20 backdrop-blur-sm relative overflow-hidden" aria-labelledby="agents-title">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
          
          <h2 id="agents-title" className="text-xl font-bold text-white mb-2">LangGraph Specialist Coordinator Blueprint</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto mb-8">
            How StadiumOS routes incoming telemetry incidents through our specialized LLM sub-agents.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {agentMesh.map((agent, i) => (
              <div 
                key={i}
                className="p-4 rounded-xl border border-slate-800/40 bg-slate-950/40 text-left hover:border-blue-500/30 transition duration-300"
              >
                <div className="text-xs font-semibold text-blue-400 mb-1">Agent {i+1}</div>
                <div className="font-bold text-white mb-1.5">{agent.name}</div>
                <div className="text-slate-400 text-xs leading-relaxed">{agent.role}</div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Global Footer */}
      <footer className="w-full border-t border-slate-900 py-8 z-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 StadiumOS AI. Built for the FIFA World Cup United 2026 Host Cities.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-300 cursor-pointer">Security Protocol v4.9</span>
            <span className="hover:text-slate-300 cursor-pointer">Terms & API Specs</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
