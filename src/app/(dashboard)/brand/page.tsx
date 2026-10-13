import { BrandMark } from "@/components/brand-mark";
import { Button, Field, Input, PageHeader, SectionTitle } from "@/components/ui";
import { logoUrl } from "@/lib/brand";
import { getWorkspace } from "@/lib/workspace";
import { removeLogo, setLogo, updateBrand } from "@/app/(settings)/settings/actions";
import { LogoUploader } from "./logo-uploader";

export default async function BrandPage() {
  const { workspace } = await getWorkspace();
  const logo = logoUrl(workspace.logo_path);
  return (
    <>
      <PageHeader title="Brand" />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-4xl grid-cols-[1fr_300px] gap-10 px-6 py-8">
          <form action={updateBrand} className="space-y-6">
            <SectionTitle title="Portal brand" description="This is how your business appears to clients." />
            <Field label="Brand name" hint="The name clients know you by. It doesn't have to be your legal name.">
              <Input name="name" defaultValue={workspace.name} maxLength={30} required />
            </Field>
            <Field label="Accent color" hint="Used for buttons and highlights in the client portal.">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  name="brand_color"
                  defaultValue={workspace.brand_color}
                  className="h-8 w-12 cursor-pointer rounded-control border border-line-strong bg-canvas p-0.5"
                />
                <span className="text-[13px] text-ink-3">{workspace.brand_color}</span>
              </div>
            </Field>
            <Field label="Logo" hint="PNG, JPEG or WebP up to 2 MB. Square images look best. Saved as soon as you upload.">
              <LogoUploader
                workspaceId={workspace.id}
                name={workspace.name}
                color={workspace.brand_color}
                logoUrl={logo}
                setLogo={setLogo}
                removeLogo={removeLogo}
              />
            </Field>
            <div className="flex justify-end border-t border-line pt-5">
              <Button type="submit" variant="primary">
                Save brand
              </Button>
            </div>
          </form>

          <aside>
            <div className="mb-2 text-[12px] font-medium text-ink-3">Preview</div>
            <div className="overflow-hidden rounded-card border border-line shadow-control">
              <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
                <BrandMark name={workspace.name} color={workspace.brand_color} logoUrl={logo} />
                <span className="text-[13px] font-semibold">{workspace.name}</span>
              </div>
              <div className="space-y-2 bg-surface p-4">
                <div className="h-2 w-2/3 rounded bg-line" />
                <div className="h-2 w-1/2 rounded bg-line" />
                <div className="mt-3 inline-flex h-7 items-center rounded-control px-3 text-[12px] font-medium text-white" style={{ backgroundColor: workspace.brand_color }}>
                  Pay invoice
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
