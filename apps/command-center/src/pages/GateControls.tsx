/**
 * StadiumOS AI — Gate Controls Panel.
 * 
 * Provides interactive matrix grids of gates grouped by stadium sectors.
 * Orchestrates direct patch status overrides and validates state changes.
 */

import React, { useEffect, useState } from "react";
import { DoorOpen, Settings2, ShieldCheck, Activity, Loader2 } from "lucide-react";
import api from "../services/api";
import { useUIStore } from "../store/uiStore";

export const GateControls: React.FC = () => {
  const { activeStadiumId } = useUIStore();
  const [sectors, setSectors] = useState<any[]>([]);
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [gates, setGates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Status modify modal states
  const [modifyingGate, setModifyingGate] = useState<any | null>(null);
  const [targetStatus, setTargetStatus] = useState("CLOSED");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchSectors = async () => {
    if (!activeStadiumId) return;
    try {
      const response = await api.get(`/stadiums/${activeStadiumId}/sectors`);
      const data = response.data || [];
      setSectors(data);
      if (data.length > 0 && !selectedSectorId) {
        setSelectedSectorId(data[0].id);
      }
    } catch (err) {
      console.warn("Failed to load stadium sectors, supplying default mockup.");
      setSectors([
        { id: "sector-1", name: "North Tribune" },
        { id: "sector-2", name: "South Stand" }
      ]);
      if (!selectedSectorId) {
        setSelectedSectorId("sector-1");
      }
    }
  };

  const fetchGates = async () => {
    if (!selectedSectorId) return;
    setLoading(true);
    try {
      const response = await api.get(`/gates/sectors/${selectedSectorId}/gates`);
      setGates(response.data || []);
    } catch (err) {
      console.warn("Failed to retrieve sector gates. Providing mockup gates.");
      setGates([
        { id: "gate-1", gate_code: "GATE_1A", status: "OPEN", is_bidirectional: true, latitude: 32.7, longitude: -97.1 },
        { id: "gate-2", gate_code: "GATE_1B", status: "CLOSED", is_bidirectional: false, latitude: 32.7, longitude: -97.1 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSectors();
  }, [activeStadiumId]);

  useEffect(() => {
    fetchGates();
  }, [selectedSectorId]);

  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modifyingGate || !reason) return;
    if (reason.length < 10) {
      alert("Please provide a detailed reason (minimum 10 characters).");
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/gates/${modifyingGate.id}/status`, {
        status: targetStatus,
        reason
      });
      alert(`Gate ${modifyingGate.gate_code} state updated to ${targetStatus}!`);
      setModifyingGate(null);
      setReason("");
      fetchGates();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      alert(`Status transition failed: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Gate Controls</h1>
        <p className="text-muted-foreground mt-1">Configure entry/exit points, monitor local flow rates, and trigger manual overrides.</p>
      </header>

      {/* Sectors Tabs Row */}
      <nav 
        className="flex items-center gap-2 border-b border-border pb-px overflow-x-auto"
        aria-label="Stadium Sectors filter"
      >
        {sectors.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setSelectedSectorId(sec.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              selectedSectorId === sec.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            aria-selected={selectedSectorId === sec.id}
          >
            {sec.name}
          </button>
        ))}
      </nav>

      {/* Gates Grid Matrix */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <section 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          aria-label={`Gates inside selected sector`}
        >
          {gates.length === 0 ? (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground bg-card">
              <DoorOpen className="w-10 h-10 stroke-1 mx-auto mb-2 text-muted" />
              <p className="font-semibold text-sm">No Gates Registered</p>
              <p className="text-xs">No gate records linked to this sector.</p>
            </div>
          ) : (
            gates.map((gate) => (
              <article 
                key={gate.id}
                className="p-5 rounded-xl border border-border bg-card shadow-sm flex flex-col gap-4 text-left"
              >
                <header className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-secondary text-primary border border-border">
                      <DoorOpen className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-foreground">{gate.gate_code}</span>
                  </div>
                  
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${
                    gate.status === "OPEN" ? "bg-green-500/10 text-green-500" :
                    gate.status === "CLOSED" ? "bg-red-500/10 text-red-500" :
                    gate.status === "CONGESTED" ? "bg-orange-500/10 text-orange-500" : "bg-muted text-muted-foreground"
                  }`}>
                    {gate.status}
                  </span>
                </header>

                <div className="space-y-2 text-xs border-y border-border/40 py-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Directional Profile</span>
                    <span className="font-semibold text-foreground">{gate.is_bidirectional ? "Bidirectional" : "One-Way Exit Only"}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>GPS Long/Lat</span>
                    <span className="font-semibold text-foreground">{gate.longitude.toFixed(4)}, {gate.latitude.toFixed(4)}</span>
                  </div>
                </div>

                <footer className="pt-2">
                  <button
                    onClick={() => {
                      setModifyingGate(gate);
                      setTargetStatus(gate.status);
                    }}
                    className="w-full py-2 bg-secondary hover:bg-muted text-foreground border border-border rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <Settings2 className="w-4 h-4 text-muted-foreground" />
                    <span>Override gate state</span>
                  </button>
                </footer>
              </article>
            ))
          )}
        </section>
      )}

      {/* Override Configuration Modal */}
      {modifyingGate && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <form 
            onSubmit={handleSubmitOverride}
            className="w-full max-w-md p-6 rounded-2xl border border-border bg-card shadow-2xl relative space-y-5"
          >
            <header className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                <Settings2 className="w-5 h-5" />
              </div>
              <div>
                <h3 id="modal-title" className="text-base font-bold text-foreground">Override Gate Status</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Code: {modifyingGate.gate_code}</p>
              </div>
            </header>

            {/* Target Status Select */}
            <div className="space-y-2">
              <label htmlFor="target-status-select" className="text-xs font-semibold text-muted-foreground block">
                Target Status
              </label>
              <select
                id="target-status-select"
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-border bg-secondary/50 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition cursor-pointer"
              >
                <option value="OPEN">OPEN (Free Access)</option>
                <option value="CLOSED">CLOSED (Locked)</option>
                <option value="RESTRICTED">RESTRICTED (VIP/Accredited)</option>
                <option value="MAINTENANCE">MAINTENANCE (Offline)</option>
              </select>
            </div>

            {/* Reason Input */}
            <div className="space-y-2">
              <label htmlFor="reason-textarea" className="text-xs font-semibold text-muted-foreground block">
                Operational Reason
              </label>
              <textarea
                id="reason-textarea"
                required
                disabled={submitting}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Specify reason (minimum 10 characters). E.g. Opening gate A to relieve congestion in sector B."
                className="w-full p-2.5 rounded-lg border border-border bg-secondary/50 text-xs text-foreground placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition h-20 resize-none"
              />
            </div>

            {/* Footer triggers */}
            <footer className="flex items-center gap-3 pt-3 border-t border-border/40">
              <button
                type="button"
                onClick={() => {
                  setModifyingGate(null);
                  setReason("");
                }}
                className="flex-1 py-2 rounded-lg border border-border hover:bg-secondary transition font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || reason.length < 10}
                className="flex-1 py-2 bg-primary hover:bg-primary/95 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? "Saving..." : "Commit Override"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
};
export default GateControls;
