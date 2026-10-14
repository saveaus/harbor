const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "Harbor <onboarding@resend.dev>";

export type Email = {
  to: string;
  subject: string;
  heading: string;
  body?: string;
  /** Shown as a list under the body, such as the shifts in a roster. */
  lines?: string[];
  action: { label: string; href: string };
  brand: { name: string; color: string };
};

export type SendOutcome = "sent" | "not_configured" | "failed";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ESCAPES[c]);

function render(email: Email): string {
  const body =
    (email.body ? `<p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:22px">${escape(email.body)}</p>` : "") +
    (email.lines?.length
      ? `<ul style="margin:0 0 24px;padding-left:18px;color:#3f3f46;font-size:14px;line-height:22px">${email.lines.map((l) => `<li>${escape(l)}</li>`).join("")}</ul>`
      : "");
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:12px;border:1px solid #e4e4e7">
<tr><td style="padding:32px">
<p style="margin:0 0 24px;font-size:13px;font-weight:600;color:#18181b">${escape(email.brand.name)}</p>
<h1 style="margin:0 0 8px;font-size:18px;line-height:26px;font-weight:600;color:#18181b">${escape(email.heading)}</h1>
${body}
<a href="${escape(email.action.href)}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:${escape(email.brand.color)};color:#fff;font-size:13px;font-weight:500;text-decoration:none">${escape(email.action.label)}</a>
</td></tr></table></td></tr></table></body></html>`;
}

/** Sends one transactional email through Resend. Failures are logged, never thrown, so the triggering action still succeeds. */
export async function sendEmail(email: Email): Promise<SendOutcome> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "not_configured";
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || DEFAULT_FROM,
        to: [email.to],
        subject: email.subject,
        html: render(email),
        text: [email.heading, email.body, email.lines?.map((l) => `- ${l}`).join("\n"), `${email.action.label}: ${email.action.href}`]
          .filter(Boolean)
          .join("\n\n"),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return "sent";
    console.error(`Resend rejected an email (${response.status}): ${(await response.text()).slice(0, 300)}`);
    return "failed";
  } catch (error) {
    console.error("Resend request failed", error);
    return "failed";
  }
}
