import React, { useState } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Settings2,
  Trash2,
  Lock,
  Heart,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/Dialog";
import { Input } from "../../components/ui/Input";
import { Avatar } from "../../components/ui/Avatar";
import type { FamilyProfile, RelationshipType } from "../../api/client";

const INITIAL_PROFILES: FamilyProfile[] = [
  {
    id: "prof-1",
    owner_id: "user-1",
    name: "Dr. Abhijit Bhunia",
    relationship: "self",
    is_primary: true,
    is_active: true,
    is_dependent: false,
    consent_status: "authorized",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "prof-2",
    owner_id: "user-1",
    name: "Anima Bhunia",
    relationship: "parent",
    is_primary: false,
    is_active: true,
    is_dependent: true,
    consent_status: "authorized",
    created_at: "2026-02-15T00:00:00Z",
    updated_at: "2026-02-15T00:00:00Z",
  },
  {
    id: "prof-3",
    owner_id: "user-1",
    name: "Aarav Bhunia",
    relationship: "child",
    is_primary: false,
    is_active: true,
    is_dependent: true,
    consent_status: "authorized",
    created_at: "2026-03-10T00:00:00Z",
    updated_at: "2026-03-10T00:00:00Z",
  },
];

export function FamilyView({
  token,
  activeProfile,
  onSelectProfile,
}: {
  token: string;
  activeProfile?: FamilyProfile;
  onSelectProfile?: (profile: FamilyProfile) => void;
}) {
  const [profiles, setProfiles] = useState<FamilyProfile[]>(INITIAL_PROFILES);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deactivatingProfile, setDeactivatingProfile] = useState<FamilyProfile | null>(null);

  // Form state
  const [newName, setNewName] = useState("");
  const [newRelationship, setNewRelationship] = useState<RelationshipType>("parent");
  const [isDependent, setIsDependent] = useState(true);

  const handleAddProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newProf: FamilyProfile = {
      id: `prof-${Date.now()}`,
      owner_id: "user-1",
      name: newName.trim(),
      relationship: newRelationship,
      is_primary: false,
      is_active: true,
      is_dependent: isDependent,
      consent_status: "authorized",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setProfiles((prev) => [...prev, newProf]);
    setNewName("");
    setNewRelationship("parent");
    setIsDependent(true);
    setIsAddModalOpen(false);
  };

  const handleDeactivate = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    setDeactivatingProfile(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="Family Health Profiles"
        subtitle="Manage records, appointments, and dosage schedules for family members in isolated private profiles."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
            className="gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Family Profile</span>
          </Button>
        }
      />

      {/* Role and Data Isolation Banner */}
      <div className="p-4 rounded-xl bg-white border border-[var(--border)] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--green-50)] text-[var(--green-700)] border border-[var(--green-100)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[var(--text)]">
              Strict Profile Scoping & Consent Enforcement
            </h3>
            <p className="text-xs text-[var(--muted)]">
              Each profile maintains its own medical timeline, medications, and audit history. Switching profiles never leaks clinical data.
            </p>
          </div>
        </div>
        <Badge variant="verified" size="md">
          Caregiver Guardian Mode
        </Badge>
      </div>

      {/* Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {profiles.map((profile) => {
          const isCurrentActive = activeProfile?.id === profile.id;

          return (
            <Card
              key={profile.id}
              className={`transition-all hover:shadow-md ${
                isCurrentActive ? "border-[var(--green-600)] ring-2 ring-[var(--green-600)]/20" : ""
              }`}
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={profile.name} size="lg" />
                    <div>
                      <h4 className="font-display font-semibold text-base text-[var(--text)]">
                        {profile.name}
                      </h4>
                      <p className="text-xs text-[var(--muted)] capitalize">
                        Relationship: {profile.relationship}
                      </p>
                    </div>
                  </div>

                  {profile.is_primary && (
                    <Badge variant="info" size="sm">
                      Primary
                    </Badge>
                  )}
                </div>

                <div className="pt-2 border-t border-[var(--border)] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--muted)]">Consent Status</span>
                    <Badge variant="verified" size="sm">
                      {profile.consent_status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--muted)]">Management Mode</span>
                    <span className="font-medium text-[var(--text)]">
                      {profile.is_dependent ? "Guardian / Dependent" : "Independent Access"}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
                  <Button
                    variant={isCurrentActive ? "secondary" : "primary"}
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => onSelectProfile?.(profile)}
                    disabled={isCurrentActive}
                  >
                    {isCurrentActive ? "Currently Viewing" : "Switch to Profile"}
                  </Button>

                  {!profile.is_primary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[var(--danger)] hover:bg-[var(--danger-bg)] p-2"
                      title="Deactivate Profile"
                      onClick={() => setDeactivatingProfile(profile)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Profile Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Family Health Profile</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddProfile} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] uppercase mb-1">
                Full Name
              </label>
              <Input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Maya Bhunia"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] uppercase mb-1">
                Relationship
              </label>
              <select
                value={newRelationship}
                onChange={(e) => setNewRelationship(e.target.value as RelationshipType)}
                className="w-full h-11 px-3.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--green-600)]/30"
              >
                <option value="parent">Parent</option>
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
                <option value="sibling">Sibling</option>
                <option value="other">Other Dependent</option>
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[var(--text)]">Dependent Profile</p>
                <p className="text-[11px] text-[var(--muted)]">
                  Managed by you as legal guardian or caregiver
                </p>
              </div>
              <input
                type="checkbox"
                checked={isDependent}
                onChange={(e) => setIsDependent(e.target.checked)}
                className="w-4 h-4 text-[var(--green-600)] rounded border-[var(--border)] focus:ring-[var(--green-600)]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Create Profile
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Profile Modal */}
      <Dialog
        open={!!deactivatingProfile}
        onOpenChange={(open) => !open && setDeactivatingProfile(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[var(--danger)] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Deactivate Family Profile</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-sm text-[var(--text)] leading-relaxed">
              Are you sure you want to deactivate records for{" "}
              <strong>{deactivatingProfile?.name}</strong>?
            </p>
            <p className="text-xs text-[var(--muted)]">
              This will remove this profile from active views. Their medical documents, extracted lab tests, and appointment history will be archived safely and can be restored from the Privacy Centre.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setDeactivatingProfile(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deactivatingProfile && handleDeactivate(deactivatingProfile.id)}
              >
                Confirm Deactivation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
