import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, Phone, ShieldAlert } from "lucide-react";
import { getPublicEmergencyCard } from "../../api/client";
import { formatDate } from "../../lib/dates";

/**
 * What a first responder sees after scanning the emergency QR code.
 * No login, no app chrome: large, high-contrast and readable on a phone in a hurry.
 */
export function PublicEmergencyCardPage() {
  const { token } = useParams<{ token: string }>();
  const query = useQuery({
    queryKey: ["public-emergency-card", token],
    queryFn: () => getPublicEmergencyCard(token ?? ""),
    enabled: !!token,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  if (query.isLoading) {
    return (
      <div role="status" className="min-h-screen flex items-center justify-center gap-2 text-sm text-[var(--muted)]">
        <Loader2 className="animate-spin" size={18} aria-hidden="true" /> Loading emergency card…
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg)]">
        <div role="alert" className="max-w-md p-8 rounded-xl bg-white border border-[var(--border)] text-center space-y-3">
          <AlertCircle className="mx-auto text-[var(--warning)]" size={32} aria-hidden="true" />
          <h1 className="text-lg font-display font-bold">This emergency card isn't available</h1>
          <p className="text-sm text-[var(--muted)]">
            The owner may have turned it off or replaced the QR code. If this is an emergency, call your local emergency
            number now.
          </p>
        </div>
      </main>
    );
  }

  const c = query.data;
  const phone = c.emergency_contact_phone?.trim();
  return (
    <main className="min-h-screen bg-[var(--green-900)] text-white p-4 md:p-8" data-testid="public-emergency-card">
      <div className="max-w-xl mx-auto space-y-5">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <ShieldAlert size={18} aria-hidden="true" /> Emergency medical info
        </div>
        <h1 className="text-4xl font-display font-bold">{c.name}</h1>
        {c.age_years !== null && <p className="text-lg opacity-90">{c.age_years} years old</p>}

        <dl className="grid grid-cols-1 gap-4">
          <div className="rounded-xl bg-white/10 p-4">
            <dt className="text-xs uppercase opacity-70">Blood type</dt>
            <dd className="text-2xl font-bold">{c.blood_type || "Not recorded"}</dd>
          </div>
          <div className="rounded-xl bg-white/10 p-4">
            <dt className="text-xs uppercase opacity-70">Allergies</dt>
            <dd className="text-lg font-semibold whitespace-pre-wrap">{c.allergies || "None recorded"}</dd>
          </div>
          <div className="rounded-xl bg-white/10 p-4">
            <dt className="text-xs uppercase opacity-70">Known conditions</dt>
            <dd className="text-lg font-semibold whitespace-pre-wrap">{c.conditions || "None recorded"}</dd>
          </div>
          <div className="rounded-xl bg-white/10 p-4">
            <dt className="text-xs uppercase opacity-70 flex items-center gap-1">
              <Phone size={12} aria-hidden="true" /> Emergency contact
            </dt>
            <dd className="text-lg font-semibold">{c.emergency_contact_name || "Not recorded"}</dd>
            {phone && (
              <a
                href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                className="mt-2 inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg bg-white text-[var(--green-900)] font-bold"
              >
                <Phone size={16} aria-hidden="true" /> Call {phone}
              </a>
            )}
          </div>
        </dl>

        <p className="text-xs opacity-70">
          Self-reported by the owner and not a medical record. Last updated {formatDate(c.updated_at)}.
        </p>
      </div>
    </main>
  );
}

export default PublicEmergencyCardPage;
