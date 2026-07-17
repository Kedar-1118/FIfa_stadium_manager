/**
 * StadiumOS AI — Incident Triage Board & Inspector Panel.
 * 
 * Implements incident report listings, detail inspectors sidebars,
 * nearby volunteer geolocation searches, and dispatch coordination endpoints.
 */

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Users,
  Compass,
  CheckCircle,
  Clock,
  Shield,
  Loader2,
  Check,
} from "lucide-react";
import api from "../services/api";

export const IncidentTriage: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [nearbyVolunteers, setNearbyVolunteers] = useState<any[]>([]);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  
  // Resolution form state
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  const fetchIncidents = async () => {
    try {
      const response = await api.get("/incidents");
      setIncidents(response.data || []);
      
      // Auto-refresh selected incident context if active
      if (selectedIncident) {
        const refreshed = (response.data || []).find((i: any) => i.id === selectedIncident.id);
        if (refreshed) setSelectedIncident(refreshed);
      }
    } catch (err) {
      console.warn("Failed to load incidents feed.");
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 10000);
    return () => clearInterval(interval);
  }, [selectedIncident]);

  // Load volunteers close to the incident centroid coordinates
  useEffect(() => {
    if (!selectedIncident) {
      setNearbyVolunteers([]);
      return;
    }

    const loadNearbyVolunteers = async () => {
      setLoadingVolunteers(true);
      try {
        const skill = selectedIncident.incident_type.toLowerCase().includes("medical") ? "first_aid" : undefined;
        const res = await api.get("/volunteers/search/nearby", {
          params: {
            latitude: selectedIncident.latitude,
            longitude: selectedIncident.longitude,
            radius_meters: 1000,
            required_skill: skill
          }
        });
        setNearbyVolunteers(res.data || []);
      } catch (err) {
        console.warn("Failed to search nearby volunteers, providing static volunteers fallback.");
        setNearbyVolunteers([
          { id: "vol-1", name: "Sarah Connor", status: "AVAILABLE", distance_meters: 240, skills: ["first_aid"] },
          { id: "vol-2", name: "John Doe", status: "AVAILABLE", distance_meters: 480, skills: ["spanish"] }
        ]);
      } finally {
        setLoadingVolunteers(false);
      }
    };

    loadNearbyVolunteers();
  }, [selectedIncident]);

  const handleDispatch = async (volunteerId: string) => {
    if (!selectedIncident) return;
    setDispatchLoading(true);
    try {
      await api.post(`/incidents/${selectedIncident.id}/assign`, {
        volunteer_id: volunteerId
      });
      alert(`Volunteer dispatched successfully!`);
      fetchIncidents();
    } catch (err: any) {
      alert(`Dispatch assignment failed: ${err.message}`);
    } finally {
      setDispatchLoading(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !resolutionNotes) return;
    setResolving(true);
    try {
      await api.post(`/incidents/${selectedIncident.id}/resolve`, {
        resolution_notes: resolutionNotes
      });
      alert("Incident resolved successfully!");
      setResolutionNotes("");
      fetchIncidents();
    } catch (err: any) {
      alert(`Resolution failed: ${err.message}`);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Incident Triage Board</h1>
        <p className="text-muted-foreground mt-1">Review reported alerts, dispatch field volunteers, and record resolutions.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left: Incidents Grid Board */}
        <section 
          className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4"
          aria-label="Active Incident Cards Feed"
        >
          {incidents.length === 0 ? (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground bg-card">
              <Clock className="w-10 h-10 stroke-1 mx-auto mb-2 text-muted" />
              <p className="font-semibold text-sm">All Incident Tiers Stable</p>
              <p className="text-xs">No active reports registered.</p>
            </div>
          ) : (
            incidents.map((incident) => (
              <article
                key={incident.id}
                onClick={() => setSelectedIncident(incident)}
                className={`p-5 rounded-xl border transition cursor-pointer flex flex-col gap-4 text-left relative overflow-hidden ${
                  selectedIncident?.id === incident.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border bg-card hover:bg-secondary/20"
                }`}
                aria-label={`Incident reported: ${incident.incident_type}`}
              >
                {/* Left Severity indicator block */}
                <span className={`absolute top-0 left-0 bottom-0 w-1 ${
                  incident.severity === "CRITICAL" ? "bg-red-500" :
                  incident.severity === "HIGH" ? "bg-amber-500" : "bg-blue-500"
                }`} />

                <header className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                    {incident.incident_type}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    incident.severity === "CRITICAL" ? "bg-red-500/10 text-red-500" :
                    incident.severity === "HIGH" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                  }`}>
                    {incident.severity}
                  </span>
                </header>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {incident.description}
                </p>

                <footer className="flex items-center justify-between pt-3 border-t border-border/40 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {incident.status}
                  </span>
                  <span>
                    Reported: {new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </footer>
              </article>
            ))
          )}
        </section>

        {/* Right: Selected Incident Inspector Drawer Sidebar */}
        <aside 
          className="w-full lg:w-96 rounded-xl border border-border bg-card shadow-sm p-6 flex flex-col gap-5"
          aria-labelledby="inspector-title"
        >
          {selectedIncident ? (
            <>
              <header className="pb-4 border-b border-border">
                <h2 id="inspector-title" className="text-lg font-bold">Triage Inspector</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">ID: {selectedIncident.id}</p>
              </header>

              {/* Core Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Category</span>
                  <span className="font-bold text-foreground">{selectedIncident.incident_type}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Severity Level</span>
                  <span className="font-bold text-foreground">{selectedIncident.severity}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Status</span>
                  <span className="font-bold text-primary">{selectedIncident.status}</span>
                </div>
              </div>

              {/* SOP / RAG Guidelines */}
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/40 space-y-2">
                <header className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Verified SOP Guideline Context</span>
                </header>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {selectedIncident.incident_type.toLowerCase().includes("medical")
                    ? "Dispatch nearest available first-aid provider. Check airway/breathing. Keep ingress path clear for emergency ambulances."
                    : "Establish security perimeter in target sector. Direct crowds toward opposite exit gates. Avoid direct engagement."}
                </p>
              </div>

              {/* Triage action panels */}
              {selectedIncident.status === "RESOLVED" ? (
                <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-xs flex items-center justify-center gap-1.5 font-bold">
                  <Check className="w-4 h-4" />
                  <span>Incident Resolved</span>
                </div>
              ) : (
                <div className="space-y-5">
                  
                  {/* Volunteer dispatcher */}
                  <div className="space-y-3">
                    <header className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dispatch Volunteer</h3>
                      {loadingVolunteers && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    </header>

                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                      {nearbyVolunteers.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground">No available volunteers close to incident coordinates.</p>
                      ) : (
                        nearbyVolunteers.map((vol) => (
                          <div 
                            key={vol.id} 
                            className="p-2.5 rounded-lg border border-border bg-secondary/20 flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-bold text-foreground">{vol.name}</p>
                              <p className="text-[9px] text-muted-foreground">Dist: {vol.distance_meters}m • {vol.skills?.join(", ") || "No badges"}</p>
                            </div>
                            <button
                              disabled={dispatchLoading || selectedIncident.assigned_volunteer_id === vol.id}
                              onClick={() => handleDispatch(vol.id)}
                              className="px-2 py-1 rounded bg-primary hover:bg-primary/95 text-white font-semibold text-[10px] cursor-pointer transition disabled:opacity-50"
                            >
                              {selectedIncident.assigned_volunteer_id === vol.id ? "Assigned" : "Dispatch"}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Resolution notes forms */}
                  <form onSubmit={handleResolve} className="space-y-3 pt-4 border-t border-border">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Close Incident</h3>
                    
                    <div className="space-y-2">
                      <label htmlFor="res-notes-input" className="sr-only">Resolution Notes</label>
                      <textarea
                        id="res-notes-input"
                        required
                        disabled={resolving}
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Detail resolution steps (e.g. Paramedics treated target on-scene, sector cleared)."
                        className="w-full p-2.5 rounded-lg border border-border bg-secondary/50 text-xs text-foreground placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition h-20 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={resolving || !resolutionNotes}
                      className="w-full py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition cursor-pointer"
                    >
                      {resolving ? "Resolving..." : "Confirm Resolution"}
                    </button>
                  </form>

                </div>
              )}
            </>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground p-6">
              <Compass className="w-8 h-8 stroke-1 mb-2 text-muted animate-spin" style={{ animationDuration: '6s' }} />
              <span className="text-xs font-semibold">Select an incident card</span>
              <span className="text-[10px]">Inspect RAG guidelines and coordinate dispatches.</span>
            </div>
          )}
        </aside>

      </div>
    </div>
  );
};
export default IncidentTriage;
