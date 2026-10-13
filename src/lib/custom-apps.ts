export const APP_PERMISSIONS = ["clients:read", "storage"] as const;
export type AppPermission = (typeof APP_PERMISSIONS)[number];

export const permissionLabels: Record<AppPermission, { label: string; detail: string }> = {
  "clients:read": { label: "Read clients", detail: "Names and emails of companies and contacts." },
  storage: { label: "Store data", detail: "Save and load its own data, shared by everyone in this workspace." },
};

export const BRIDGE_METHODS = ["clients.list", "storage.get", "storage.set", "storage.delete", "storage.list"] as const;
export type BridgeMethod = (typeof BRIDGE_METHODS)[number];

export const methodPermission: Record<BridgeMethod, AppPermission> = {
  "clients.list": "clients:read",
  "storage.get": "storage",
  "storage.set": "storage",
  "storage.delete": "storage",
  "storage.list": "storage",
};

export function parseBridgeMethod(value: unknown): BridgeMethod | undefined {
  return typeof value === "string" && (BRIDGE_METHODS as readonly string[]).includes(value) ? (value as BridgeMethod) : undefined;
}

export function parsePermissions(values: unknown[]): AppPermission[] {
  return APP_PERMISSIONS.filter((p) => values.includes(p));
}

/**
 * The app runs in an iframe sandboxed without allow-same-origin, so it gets an opaque origin and cannot
 * read Harbor's cookies, storage or DOM. The CSP comes first so the app's own markup cannot loosen it;
 * it blocks network requests and external resources, leaving the bridge as the only way to reach data.
 */
const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data:",
  "media-src data: blob:",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

const BRIDGE = `<script>
window.harbor = (() => {
  let next = 0;
  const pending = new Map();
  addEventListener("message", (event) => {
    if (event.source !== parent || !event.data || event.data.harbor !== 1) return;
    const call = pending.get(event.data.id);
    if (!call) return;
    pending.delete(event.data.id);
    if ("error" in event.data) call.reject(new Error(event.data.error));
    else call.resolve(event.data.result);
  });
  const request = (method, params) =>
    new Promise((resolve, reject) => {
      const id = ++next;
      pending.set(id, { resolve, reject });
      parent.postMessage({ harbor: 1, id, method, params }, "*");
    });
  return Object.freeze({
    clients: Object.freeze({ list: () => request("clients.list") }),
    storage: Object.freeze({
      get: (key) => request("storage.get", { key }),
      set: (key, value) => request("storage.set", { key, value }),
      delete: (key) => request("storage.delete", { key }),
      list: () => request("storage.list"),
    }),
  });
})();
</script>`;

export function sandboxDocument(code: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP}">${BRIDGE}<style>body{font:13px/1.5 system-ui,sans-serif;margin:16px;color:#1c1d1f}</style></head><body>${code}</body></html>`;
}

export const STARTER_CODE = `<h2>Client checklist</h2>
<ul id="clients">Loading…</ul>
<script>
  async function render() {
    const { companies, contacts } = await harbor.clients.list();
    const done = (await harbor.storage.get("done")) ?? {};
    const list = document.getElementById("clients");
    list.replaceChildren(
      ...[...companies, ...contacts].map((client) => {
        const item = document.createElement("li");
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = Boolean(done[client.id]);
        box.onchange = async () => {
          done[client.id] = box.checked;
          await harbor.storage.set("done", done);
        };
        item.append(box, " ", client.name);
        return item;
      }),
    );
  }
  render().catch((error) => (document.getElementById("clients").textContent = error.message));
</script>
`;
