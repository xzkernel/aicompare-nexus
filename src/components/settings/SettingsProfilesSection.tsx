import { User } from "lucide-react";
import { SettingsPanel } from "./SettingsLayout";
import type { SettingsHandlersProps } from "./settings-props";

export function SettingsProfilesSection({
  profileId,
  setProfileId,
  availableProfiles,
}: Pick<SettingsHandlersProps, "profileId" | "setProfileId" | "availableProfiles">) {
  return (
    <SettingsPanel title="Profiles" description="Isolated API key configurations" icon={User}>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="profile-select" className="mw-label-mono text-text-muted">
          Active profile
        </label>
        <select
          id="profile-select"
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          className="border border-stroke-subtle bg-bg-soft px-3 py-1.5 font-mono text-[12px] text-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-cyan/40"
        >
          <option value="default">default</option>
          {availableProfiles.map((profile) => (
            <option key={profile} value={profile}>
              {profile}
            </option>
          ))}
        </select>
        <p className="font-mono text-[10px] text-text-muted">
          Keys are scoped per profile · auto-saved to this browser (localStorage)
        </p>
      </div>
    </SettingsPanel>
  );
}
