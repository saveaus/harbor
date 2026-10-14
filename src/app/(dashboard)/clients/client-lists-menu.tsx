"use client";

import { useRef } from "react";
import { ListChecks, Plus } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { Menu } from "@/components/menu";
import { Field, Input, buttonClass } from "@/components/ui";
import { createClientList, deleteClientList } from "./actions";

/** Creates and deletes client lists. Filter by a list, then save the view, to give it a tab. */
export function ClientListsMenu({ lists }: { lists: { id: string; name: string }[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Menu
        label="Client lists"
        triggerClassName={buttonClass("secondary")}
        trigger={
          <>
            <ListChecks /> Lists
          </>
        }
        items={[
          {
            label: (
              <>
                <Plus /> New list
              </>
            ),
            onSelect: () => dialog.current?.showModal(),
          },
          ...lists.map((list) => ({
            label: `Delete “${list.name}”`,
            danger: true,
            action: deleteClientList.bind(null, list.id),
            confirm: `Delete the list “${list.name}”? The clients in it stay as they are.`,
          })),
        ]}
      />
      <FormDialog
        dialogRef={dialog}
        title="New list"
        description="Group clients, such as a house or a program. Add clients from the table or from their profile."
        action={createClientList}
        submitLabel="Create list"
      >
        <Field label="Name">
          <Input name="name" required maxLength={60} autoComplete="off" />
        </Field>
      </FormDialog>
    </>
  );
}
