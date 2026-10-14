import { Button } from "@/components/ui";
import { REGISTRATION_GROUP_CODES, REGISTRATION_GROUPS, type RegistrationGroup } from "@/lib/ndis-registration";
import { saveRegistrationGroups } from "./actions";

export function GroupsForm({ selected, canEdit }: { selected: readonly RegistrationGroup[]; canEdit: boolean }) {
  const held = new Set(selected);
  return (
    <form action={saveRegistrationGroups} className="border-b border-line px-9 py-6">
      <h2 className="text-[15px] font-medium text-ink">Registration groups</h2>
      <p className="mt-1 max-w-2xl text-[13px] leading-5 text-ink-3">
        These groups decide which practice standards apply. Until they are set, there is no checklist. High-intensity and
        behaviour-support items stay off unless you hold those groups.
      </p>
      <fieldset disabled={!canEdit} className="mt-4 grid gap-1.5 sm:grid-cols-2">
        <legend className="sr-only">NDIS registration groups</legend>
        {REGISTRATION_GROUP_CODES.map((code) => (
          <label key={code} className="flex items-start gap-2 text-[13px] text-ink">
            <input type="checkbox" name="group" value={code} defaultChecked={held.has(code)} className="mt-0.5" />
            <span>
              <span className="text-ink-3">{code}</span> {REGISTRATION_GROUPS[code].name}
            </span>
          </label>
        ))}
      </fieldset>
      {canEdit ? (
        <div className="mt-4">
          <Button type="submit" variant="primary">
            Save groups
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-ink-3">Only owners and admins can change the groups.</p>
      )}
    </form>
  );
}
