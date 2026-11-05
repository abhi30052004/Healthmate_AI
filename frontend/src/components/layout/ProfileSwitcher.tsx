import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Check, UserPlus } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import type { FamilyProfile } from "../../api/client";

export interface ProfileSwitcherProps {
  activeProfile: FamilyProfile | null;
  profiles: FamilyProfile[];
  onSelectProfile: (profile: FamilyProfile) => void;
  onAddProfile?: () => void;
}

export function ProfileSwitcher({
  activeProfile,
  profiles,
  onSelectProfile,
  onAddProfile,
}: ProfileSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const currentName = activeProfile?.name || "Patient Profile";
  const currentRelationship = activeProfile?.is_primary
    ? "Self (Primary)"
    : activeProfile?.relationship || "Active";

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        id="profile-switcher-btn"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Active patient: ${currentName}, ${currentRelationship}. Click to switch patient.`}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 pr-3 rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus)]"
      >
        <Avatar
          name={currentName}
          relationship={activeProfile?.relationship}
          size="sm"
          color={activeProfile?.avatar_color || undefined}
        />
        <div className="text-left hidden sm:block">
          <p className="text-xs font-semibold text-[var(--text)] leading-tight">{currentName}</p>
          <p className="text-[10px] text-[var(--muted)] leading-tight">{currentRelationship}</p>
        </div>
        <ChevronDown size={14} className="text-[var(--muted)] ml-0.5" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-labelledby="profile-switcher-btn"
          className="absolute left-0 mt-2 w-64 rounded-xl bg-white border border-[var(--border)] shadow-2 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
            Switch Family Profile
          </div>

          <div className="max-h-60 overflow-y-auto space-y-0.5 px-1">
            {profiles.map((profile) => {
              const isSelected = activeProfile?.id === profile.id;
              return (
                <button
                  key={profile.id}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    onSelectProfile(profile);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-[var(--green-50)] text-[var(--green-900)] font-semibold"
                      : "text-[var(--text)] hover:bg-[var(--bg)]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      name={profile.name}
                      size="sm"
                      color={profile.avatar_color || undefined}
                    />
                    <div>
                      <p className="font-medium text-xs">{profile.name}</p>
                      <p className="text-[10px] text-[var(--muted)]">
                        {profile.is_primary ? "Self (Primary Account)" : profile.relationship}
                      </p>
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="text-[var(--green-600)]" />}
                </button>
              );
            })}
          </div>

          {onAddProfile && (
            <div className="border-t border-[var(--border)] mt-1.5 pt-1.5 px-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onAddProfile();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-[var(--green-800)] hover:bg-[var(--green-50)] transition-colors"
              >
                <Plus size={14} />
                <span>Add Family Profile</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

