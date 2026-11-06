import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { searchMedicalRecords, type FamilyProfile, type SearchResultItem } from "../../api/client";
import { useOptionalAuth } from "../../context/AuthContext";
import { formatDate } from "../../lib/dates";

const DESTINATIONS: Record<SearchResultItem["result_type"], string> = {
  document: "/app/records",
  observation: "/app/trends",
  medication: "/app/medicines",
  appointment: "/app/appointments",
  follow_up: "/app/appointments",
};

const TYPE_LABEL: Record<SearchResultItem["result_type"], string> = {
  document: "Report",
  observation: "Result",
  medication: "Medication",
  appointment: "Appointment",
  follow_up: "To-do",
};

/** Debounced search across the active profile's records. */
export function GlobalSearch({ activeProfile }: { activeProfile: FamilyProfile | null }) {
  const auth = useOptionalAuth();
  const token = auth?.token ?? null;
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const profileId = activeProfile?.id;

  useEffect(() => {
    const id = setTimeout(() => setDebounced(text.trim()), 300);
    return () => clearTimeout(id);
  }, [text]);

  // A different profile means different records: drop the old query.
  useEffect(() => {
    setText("");
    setDebounced("");
  }, [profileId]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const results = useQuery({
    queryKey: ["global-search", profileId, debounced],
    queryFn: () => searchMedicalRecords(token as string, { q: debounced, page_size: 8, profile_id: profileId, verified_only: false }),
    enabled: !!token && debounced.length >= 2,
  });

  const go = (r: SearchResultItem) => {
    setOpen(false);
    navigate(DESTINATIONS[r.result_type] ?? "/app/records");
  };

  return (
    <div ref={ref} className="relative w-full">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" aria-hidden="true" />
      <input
        type="search"
        role="combobox"
        aria-label="Search records"
        aria-expanded={open && debounced.length >= 2}
        aria-controls="global-search-results"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="Search records, lab tests, medications…"
        className="w-full min-h-[38px] pl-9 pr-3 text-xs bg-[var(--bg)] border border-[var(--border)] rounded-lg placeholder:text-[var(--muted)] focus:outline-none focus:bg-white focus:border-[var(--green-700)] focus:shadow-[var(--focus)] transition-colors"
      />
      {open && debounced.length >= 2 && token && (
        <div id="global-search-results" role="listbox" className="absolute left-0 right-0 mt-2 bg-white border border-[var(--border)] rounded-xl shadow-2 z-50 max-h-96 overflow-y-auto">
          {results.isLoading ? (
            <p className="p-4 text-xs text-[var(--muted)]">Searching…</p>
          ) : results.isError ? (
            <p role="alert" className="p-4 text-xs text-[var(--danger)]">Search isn't available right now.</p>
          ) : (results.data?.results ?? []).length === 0 ? (
            <p className="p-4 text-xs text-[var(--muted)]">No matches for “{debounced}”.</p>
          ) : (
            <ul>
              {(results.data?.results ?? []).map((r) => (
                <li key={r.id} role="option" aria-selected="false">
                  <button type="button" onClick={() => go(r)} className="w-full text-left px-4 py-2.5 hover:bg-[var(--bg)] border-b border-[var(--border)] last:border-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold truncate">{r.title}</span>
                      <span className="text-[10px] uppercase tracking-wide text-[var(--muted)] shrink-0">{TYPE_LABEL[r.result_type]}</span>
                    </span>
                    <span className="block text-[11px] text-[var(--muted)] truncate">
                      {r.value ? `${r.value} ${r.unit ?? ""} · ` : ""}
                      {r.date ? formatDate(r.date) : r.snippet}
                      {r.is_verified === false ? " · unverified" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
