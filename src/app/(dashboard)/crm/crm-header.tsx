"use client";

import { useRef } from "react";
import { ChevronDown, FileOutput, ListFilter } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { Menu, type MenuItem } from "@/components/menu";
import { SearchToggle } from "@/components/search-toggle";
import { Field, Input, Select, buttonClass } from "@/components/ui";
import { createCompany, createContact } from "./actions";

export function CrmHeaderActions({
  base,
  q,
  views,
  exportHref,
  companies,
}: {
  base: string;
  q: string;
  views: MenuItem[];
  exportHref: string;
  companies: { id: string; name: string }[];
}) {
  const contactDialog = useRef<HTMLDialogElement>(null);
  const companyDialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <SearchToggle base={base} q={q} />
      <span className="mx-1 h-5 w-px bg-line-strong" />
      <Menu
        label="View"
        triggerClassName={buttonClass("secondary")}
        trigger={
          <>
            <ListFilter /> View
          </>
        }
        items={views}
      />
      <a href={exportHref} download className={buttonClass("secondary")}>
        <FileOutput /> Export
      </a>
      <span className="mx-1 h-5 w-px bg-line-strong" />
      <Menu
        label="Create"
        triggerClassName={buttonClass("primary")}
        trigger={
          <>
            Create <ChevronDown />
          </>
        }
        items={[
          { label: "Contact", onSelect: () => contactDialog.current?.showModal() },
          { label: "Company", onSelect: () => companyDialog.current?.showModal() },
        ]}
      />

      <FormDialog
        dialogRef={contactDialog}
        title="Create contact"
        description="Contacts are the people who sign in to your portal."
        action={createContact}
        submitLabel="Create contact"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <Input name="first_name" required maxLength={80} />
          </Field>
          <Field label="Last name">
            <Input name="last_name" maxLength={80} />
          </Field>
        </div>
        <Field label="Email">
          <Input name="email" type="email" required />
        </Field>
        <Field label="Company" hint="Contacts in a company share its conversation and files.">
          <Select name="company_id" defaultValue="">
            <option value="">No company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </FormDialog>
      <FormDialog
        dialogRef={companyDialog}
        title="Create company"
        description="Companies group contacts so they share messages and files."
        action={createCompany}
        submitLabel="Create company"
      >
        <Field label="Name">
          <Input name="name" required maxLength={120} placeholder="Acme Inc." />
        </Field>
        <Field label="Website">
          <Input name="website" type="url" placeholder="https://acme.com" />
        </Field>
      </FormDialog>
    </>
  );
}
