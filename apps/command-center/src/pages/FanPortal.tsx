/**
 * StadiumOS AI — Fan Portal emergency reporting screen.
 * 
 * Provides frictionless reporting triggers for medical, security, fire, and evacuation.
 * Feeds incidents to the backend database and monitors volunteer response status live.
 */

import React, { useState, useEffect } from "react";
import { AlertTriangle, AlertCircle, ShieldAlert, HeartPulse, Flame, CheckCircle, Clock, Loader2, Send } from "lucide-react";
import api from "../services/api";

interface Sector {
  id: string;
  name: string;
}

interface IncidentLog {
  id: string;
  incident_type: string;
  severity: string;
  status: string;
  description: string;
  created_at: string;
}

export const FanPortal: React.FC = () => {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedSectorId, setSelectedSectorId] = useState("");
  const [description, setDescription] = useState("");
  const [reportingType, setReportingType] = useState("Medical Emergency");
  const [severity, setSeverity] = useState("HIGH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [incidentLogs, setIncidentLogs] = useState<IncidentLog[]>([]);

  // Load sectors on mount
  useEffect(() => {
    const loadStadiumData = async () => {
      try {
        const response = await api.get("/stadiums");
        const stadiums = response.data || [];
        if (stadiums.length > 0) {
          // Fetch sectors for the first stadium
          const stadiumId = stadiums[0].id;
          const sectorsRes = await api.get(`/stadiums/${stadiumId}/sectors`);
          const sectorList = sectorsRes.data || [];
          setSectors(sectorList);
          if (sectorList.length > 0) {
            setSelectedSectorId(sectorList[0].id);
          }
        }
      } catch (err) {
        console.warn("Could not load stadium sectors, loading fallbacks.");
        const fallbackSectors = [
          { id: "sec-a", name: "Sector A - West Gate" },
          { id: "sec-b", name: "Sector B - North Gate" },
          { id: "sec-c", name: "Sector C - East Gate" },
          { id: "sec-d", name: "Sector D - South Gate" }
        ];
        setSectors(fallbackSectors);
        setSelectedSectorId("sec-a");
      }
    };
    loadStadiumData();
  }, []);

  const handleQuickReport = async (type: string, isEvacuation: boolean = false) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload = {
      incident_type: type,
      severity: isEvacuation ? "CRITICAL" : "HIGH",
      description: isEvacuation 
        ? "URGENT evacuation requested by fan. Sector gates must be verified." 
        : `Fan reported ${type} from current location. Requires first-aid or safety dispatch.`,
      latitude: 32.7475, // Default Dallas AT&T Stadium centroid
      longitude: -97.0928,
      sector_id: selectedSectorId,
      gate_id: null
    };

    try {
      const response = await api.post("/incidents", payload);
      setSuccess(`Emergency reported successfully! Dispatching staff to verify.`);
      
      const newLog: IncidentLog = {
        id: response.data.id,
        incident_type: payload.incident_type,
        severity: payload.severity,
        status: response.data.status || "REPORTED",
        description: payload.description,
        created_at: new Date().toISOString()
      };
      setIncidentLogs((prev) => [newLog, ...prev]);
      setDescription("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to submit emergency dispatch request. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please add a description of the emergency.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const isEvacuation = description.toUpperCase().includes("EVACUATE") || description.toUpperCase().includes("EVACUATION");

    const payload = {
      incident_type: reportingType,
      severity: isEvacuation ? "CRITICAL" : severity,
      description: description,
      latitude: 32.7475,
      longitude: -97.0928,
      sector_id: selectedSectorId,
      gate_id: null
    };

    try {
      const response = await api.post("/incidents", payload);
      setSuccess("Incident submitted successfully. Staff notification has been sent.");
      
      const newLog: IncidentLog = {
        id: response.data.id,
        incident_type: payload.incident_type,
        severity: payload.severity,
        status: response.data.status || "REPORTED",
        description: payload.description,
        created_at: new Date().toISOString()
      };
      setIncidentLogs((prev) => [newLog, ...prev]);
      setDescription("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to submit custom report. Review database connectivity.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case "ACKNOWLEDGED":
      case "IN_PROGRESS":
        return <Clock className="w-5 h-5 text-amber-400 animate-pulse" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6 font-sans">
      
      {/* Introduction Banner */}
      <header className="p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-red-500 animate-pulse" />
            StadiumOS Emergency Portal
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Submit critical incidents in real-time. Staff will receive instant alerts and coordinates for dispatch.
          </p>
        </div>

        {/* Sector Selection Dropdown */}
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label htmlFor="current-sector" className="text-[10px] font-semibold uppercase tracking-wider text-slate-450">
            Select Your Sector Context
          </label>
          <select
            id="current-sector"
            value={selectedSectorId}
            onChange={(e) => setSelectedSectorId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sectors.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Action Success & Error Feedback */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3" role="alert">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3" role="alert">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Grid of Emergency Triggers */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left: Quick Actions */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Quick Emergency Reports</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Click one of the buttons below to trigger an instant report. The closest volunteer will be dispatched immediately.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleQuickReport("Medical Emergency")}
              disabled={loading}
              className="p-4 rounded-xl border border-red-900/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/35 transition flex flex-col items-center justify-center gap-2 group cursor-pointer text-red-400 font-bold text-xs"
            >
              <HeartPulse className="w-8 h-8 group-hover:scale-105 transition-transform" />
              <span>Medical Emergency</span>
            </button>

            <button
              onClick={() => handleQuickReport("Security Alert")}
              disabled={loading}
              className="p-4 rounded-xl border border-blue-900/20 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/35 transition flex flex-col items-center justify-center gap-2 group cursor-pointer text-blue-400 font-bold text-xs"
            >
              <ShieldAlert className="w-8 h-8 group-hover:scale-105 transition-transform" />
              <span>Security Issue</span>
            </button>

            <button
              onClick={() => handleQuickReport("Fire Threat")}
              disabled={loading}
              className="p-4 rounded-xl border border-orange-900/20 bg-orange-500/5 hover:bg-orange-500/10 hover:border-orange-500/35 transition flex flex-col items-center justify-center gap-2 group cursor-pointer text-orange-400 font-bold text-xs"
            >
              <Flame className="w-8 h-8 group-hover:scale-105 transition-transform" />
              <span>Fire Hazard</span>
            </button>

            <button
              onClick={() => handleQuickReport("Evacuation Request", true)}
              disabled={loading}
              className="p-4 rounded-xl border-2 border-dashed border-red-500/30 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500 transition flex flex-col items-center justify-center gap-2 group cursor-pointer text-red-500 font-extrabold text-xs animate-pulse"
            >
              <AlertTriangle className="w-8 h-8 group-hover:rotate-6 transition-transform" />
              <span>EVACUATION</span>
            </button>
          </div>
        </div>

        {/* Right: Custom Form Reporting */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Submit Detailed Report</h2>
          
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="custom-type" className="text-[10px] font-semibold uppercase tracking-wider text-slate-450 block">
                Emergency Category
              </label>
              <select
                id="custom-type"
                value={reportingType}
                onChange={(e) => setReportingType(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 rounded-lg border border-slate-850 bg-slate-950 text-white text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Medical Emergency">Medical Incident</option>
                <option value="Security Alert">Crowd Control & Safety</option>
                <option value="Facilities / Gate Issue">Gate & Access Malfunction</option>
                <option value="Sanitation Emergency">Environmental / Spills</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="custom-severity" className="text-[10px] font-semibold uppercase tracking-wider text-slate-450 block">
                Estimated Severity
              </label>
              <select
                id="custom-severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 rounded-lg border border-slate-855 bg-slate-955 text-white text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="LOW">Low (Nuisance/Repair)</option>
                <option value="MEDIUM">Medium (Needs attention)</option>
                <option value="HIGH">High (Urgent Dispatch)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="custom-desc" className="text-[10px] font-semibold uppercase tracking-wider text-slate-450 block">
                Incident Description
              </label>
              <textarea
                id="custom-desc"
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                placeholder="Please describe exactly what happened and where..."
                className="w-full px-3 py-2 rounded-lg border border-slate-850 bg-slate-950 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600 resize-none disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-500 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-blue-500/15"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting report...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Alert</span>
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Live Incident Status Logs */}
      <section className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20" aria-labelledby="logs-title">
        <h2 id="logs-title" className="text-sm font-bold text-white uppercase tracking-wider mb-4">My Submitted Reports</h2>

        {incidentLogs.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
            No emergency incidents submitted during this session.
          </div>
        ) : (
          <div className="space-y-3">
            {incidentLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-xl border border-slate-850 bg-slate-950/40 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{log.incident_type}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                      log.severity === "CRITICAL"
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : log.severity === "HIGH"
                        ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    }`}>
                      {log.severity}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed max-w-xl truncate">
                    {log.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 text-slate-400 text-xs">
                  {getStatusIcon(log.status)}
                  <span className="font-semibold text-[10px] tracking-wider uppercase">{log.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};

export default FanPortal;
