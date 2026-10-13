export const AUTOMATION_TRIGGERS = ["contact_created", "invoice_paid", "contract_signed", "form_completed", "client_message"] as const;
export const AUTOMATION_ACTIONS = ["send_message", "notify_team"] as const;

export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];
export type AutomationAction = (typeof AUTOMATION_ACTIONS)[number];

/** `detail` is what {{detail}} expands to for each trigger. */
export const triggerLabels: Record<AutomationTrigger, { label: string; detail: string }> = {
  contact_created: { label: "A contact is added", detail: "their email" },
  invoice_paid: { label: "An invoice is paid", detail: "the invoice number" },
  contract_signed: { label: "A contract is signed", detail: "the contract name" },
  form_completed: { label: "A form is completed", detail: "the form name" },
  client_message: { label: "A client sends a message", detail: "the start of their message" },
};

export const actionLabels: Record<AutomationAction, string> = {
  send_message: "Message the client",
  notify_team: "Notify the team",
};

function member<T extends string>(values: readonly T[], value: string): T | undefined {
  return (values as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function parseTrigger(value: string): AutomationTrigger | undefined {
  return member(AUTOMATION_TRIGGERS, value);
}

export function parseAction(value: string): AutomationAction | undefined {
  return member(AUTOMATION_ACTIONS, value);
}
