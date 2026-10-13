export const APP_KEYS = ["files", "payments", "contracts", "forms", "helpdesk", "timetracker"] as const;

export type AppKey = (typeof APP_KEYS)[number];

export type AppDefinition = {
  key: AppKey;
  name: string;
  href: string;
  summary: string;
  detail: string;
};

export const APPS: Record<AppKey, AppDefinition> = {
  files: {
    key: "files",
    name: "Files",
    href: "/files",
    summary: "A shared folder for every client",
    detail:
      "Give each client or company its own space for documents, folders and links. Both sides can add files and everything stays attached to the right record.",
  },
  payments: {
    key: "payments",
    name: "Payments",
    href: "/payments",
    summary: "Invoices, recurring billing and payment links",
    detail:
      "Bill clients with itemised invoices, run recurring subscriptions from your service catalogue and share links that let anyone pay for a service.",
  },
  contracts: {
    key: "contracts",
    name: "Contracts",
    href: "/contracts",
    summary: "Reusable agreements clients sign online",
    detail:
      "Write a template once, send it to any contact and track who has signed. Signed copies are kept with the client record.",
  },
  forms: {
    key: "forms",
    name: "Forms",
    href: "/forms",
    summary: "Questionnaires you send to clients",
    detail:
      "Build intake questionnaires and checklists, request them from specific contacts and review answers in one place.",
  },
  helpdesk: {
    key: "helpdesk",
    name: "Help desk",
    href: "/helpdesk",
    summary: "Articles that answer common client questions",
    detail:
      "Publish guides and answers your clients can read any time, and keep drafts private until they are ready.",
  },
  timetracker: {
    key: "timetracker",
    name: "Time tracker",
    href: "/time",
    summary: "Log hours against clients and bill them",
    detail:
      "Record time for each client, see totals by client and teammate, and turn unbilled billable hours into an invoice when Payments is installed.",
  },
};

export function parseAppKey(value: string): AppKey | undefined {
  return (APP_KEYS as readonly string[]).includes(value) ? (value as AppKey) : undefined;
}
