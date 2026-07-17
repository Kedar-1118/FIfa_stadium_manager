/**
 * StadiumOS AI — Volunteer Registry & Skill Filter.
 * 
 * Provides interactive grids of checked-in field volunteer records,
 * skill badge searching, and manual shift overrides controls.
 */

import React, { useEffect, useState } from "react";
import { Users, Filter, ShieldAlert, Award, Loader2 } from "lucide-react";
import api from "../services/api";

export const VolunteerRegistry: React.FC = () => {
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchSkill, setSearchSkill] = useState("");

  const fetchVolunteers = async () => {
    setLoading(true);
    try {
      // Query nearby volunteers using general stadium coordinates center baseline range
      const response = await api.get("/volunteers/search/nearby", {
        params: {
          latitude: 32.7473,
          longitude: -97.0945,
          radius_meters: 5000,
          required_skill: searchSkill || undefined
        }
      });
      setVolunteers(response.data || []);
    } catch (err) {
      console.warn("Failed to retrieve volunteers list. Yielding sandbox mockup.");
      // Fallback
      setVolunteers([
        { id: "vol-1", name: "Alice Smith", status: "AVAILABLE", skills: ["first_aid", "english"], phone: "123-456" },
        { id: "vol-2", name: "Carlos Santana", status: "ASSIGNED", skills: ["spanish", "first_aid"], phone: "789-012" },
        { id: "vol-3", name: "David Miller", status: "ON_BREAK", skills: ["french"], phone: "345-678" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVolunteers();
  }, [searchSkill]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/volunteers/${id}/status`, {
        status: newStatus
      });
      alert(`Volunteer status updated to ${newStatus}!`);
      fetchVolunteers();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const filteredVolunteers = volunteers.filter((vol) => {
    if (statusFilter === "ALL") return true;
    return vol.status === statusFilter;
  });

  return (
    <div className="space-y-6 font-sans">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Volunteer Registry</h1>
        <p className="text-muted-foreground mt-1">Monitor volunteer deployments, assign tasks, and verify skill qualifications.</p>
      </header>

      {/* Filter and Search Bar Controls Row */}
      <section 
        className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center p-4 rounded-xl border border-border bg-card shadow-sm"
        aria-label="Filter volunteers controls"
      >
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="status-select" className="text-xs font-bold text-muted-foreground flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Filter Status:
          </label>
          <select
            id="status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 rounded-lg border border-border bg-secondary/50 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition cursor-pointer font-semibold"
          >
            <option value="ALL">ALL Shifts</option>
            <option value="AVAILABLE">AVAILABLE (Idle)</option>
            <option value="ASSIGNED">ASSIGNED (On Scene)</option>
            <option value="ON_BREAK">ON_BREAK</option>
            <option value="OFF_DUTY">OFF_DUTY</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="skill-input" className="sr-only">Search by skill badge</label>
          <input
            id="skill-input"
            type="text"
            value={searchSkill}
            onChange={(e) => setSearchSkill(e.target.value)}
            placeholder="Search skill (e.g. first_aid)"
            className="px-3 py-2 rounded-lg border border-border bg-secondary/50 text-xs text-foreground placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition font-semibold"
          />
        </div>
      </section>

      {/* Registry Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <section 
          className="border border-border rounded-xl bg-card shadow-sm overflow-x-auto"
          aria-label="Checked-in volunteers list"
        >
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-secondary/40 border-b border-border">
              <tr>
                <th className="p-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Volunteer Name</th>
                <th className="p-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                <th className="p-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Skill Badges</th>
                <th className="p-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Contact Info</th>
                <th className="p-4 font-bold text-muted-foreground text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredVolunteers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    <Users className="w-8 h-8 stroke-1 mx-auto mb-2 text-muted" />
                    <p className="font-semibold text-xs">No Volunteers Matches</p>
                    <p className="text-[10px]">No volunteer records found matching current query.</p>
                  </td>
                </tr>
              ) : (
                filteredVolunteers.map((vol) => (
                  <tr key={vol.id} className="hover:bg-secondary/10 transition">
                    <td className="p-4 font-bold text-foreground">{vol.name}</td>
                    <td className="p-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        vol.status === "AVAILABLE" ? "bg-green-500/10 text-green-500" :
                        vol.status === "ASSIGNED" ? "bg-blue-500/10 text-blue-500" :
                        vol.status === "ON_BREAK" ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground"
                      }`}>
                        {vol.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {vol.skills?.length === 0 ? (
                          <span className="text-muted-foreground text-xs">No badges</span>
                        ) : (
                          vol.skills?.map((skill: string) => (
                            <span 
                              key={skill} 
                              className="px-2 py-0.5 rounded bg-secondary border border-border text-[9px] font-bold text-muted-foreground flex items-center gap-1"
                            >
                              <Award className="w-3 h-3 text-primary" />
                              {skill}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-medium text-xs text-muted-foreground">{vol.phone}</td>
                    <td className="p-4 text-right">
                      <label htmlFor={`shift-select-${vol.id}`} className="sr-only">Update Shift status</label>
                      <select
                        id={`shift-select-${vol.id}`}
                        value={vol.status}
                        onChange={(e) => handleUpdateStatus(vol.id, e.target.value)}
                        className="p-1.5 rounded border border-border bg-secondary text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer text-foreground"
                      >
                        <option value="AVAILABLE">Make AVAILABLE</option>
                        <option value="ON_BREAK">Send ON_BREAK</option>
                        <option value="OFF_DUTY">Send OFF_DUTY</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
};
export default VolunteerRegistry;
