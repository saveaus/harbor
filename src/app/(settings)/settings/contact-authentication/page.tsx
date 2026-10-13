import { getWorkspace } from "@/lib/workspace";
import { updateContactAuthentication } from "../actions";
import { SaveBar, SettingsNotice, SettingsSection, SettingsTitle, SwitchRow, type SettingsSearchParams } from "../settings-page";

export default async function ContactAuthenticationPage({ searchParams }: { searchParams: SettingsSearchParams }) {
  const { workspace, member } = await getWorkspace();
  const locked = member.role === "member";
  return (
    <>
      <SettingsTitle title="Contact authentication">How your clients sign in to the {workspace.name} portal.</SettingsTitle>
      <SettingsNotice searchParams={searchParams} />
      <form action={updateContactAuthentication}>
        <SettingsSection title="Sign-in methods">
          <div className="divide-y divide-line">
            <SwitchRow
              name="password"
              label="Email and password"
              description="Always available. Clients set a password when they accept their invite."
              defaultChecked
              disabled
            />
            <SwitchRow
              name="contact_link_sign_in"
              label="Email sign-in link"
              description="Clients can accept an invite and sign in with a one-time link sent to their inbox, without a password."
              defaultChecked={workspace.contact_link_sign_in}
              disabled={locked}
            />
          </div>
        </SettingsSection>
        {locked ? null : <SaveBar />}
      </form>
    </>
  );
}
