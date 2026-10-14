/** NDIS Commission registration groups. High-intensity and behaviour-support
 *  standards only apply when the provider holds those groups. */

export const REGISTRATION_GROUPS = {
  "0101": { name: "Accommodation / tenancy assistance", audit: "verification" },
  "0102": { name: "Assistance to access and maintain employment or higher education", audit: "verification" },
  "0104": { name: "High intensity daily personal activities", audit: "certification" },
  "0106": { name: "Assistance in coordinating or managing life stages, transitions and supports", audit: "certification" },
  "0107": { name: "Daily personal activities", audit: "certification" },
  "0108": { name: "Assistance with travel / transport arrangements", audit: "verification" },
  "0115": { name: "Assistance with daily life tasks in a group or shared living arrangement", audit: "certification" },
  "0116": { name: "Innovative community participation", audit: "verification" },
  "0117": { name: "Development of daily living and life skills", audit: "certification" },
  "0125": { name: "Participation in community, social and civic activities", audit: "certification" },
  "0126": { name: "Household tasks", audit: "verification" },
  "0127": { name: "Interpreting and translating", audit: "verification" },
  "0128": { name: "Therapeutic supports", audit: "certification" },
  "0129": { name: "Specialised driver training", audit: "verification" },
  "0131": { name: "Specialist disability accommodation", audit: "certification" },
  "0132": { name: "Specialised support coordination", audit: "certification" },
  "0133": { name: "Early childhood supports", audit: "certification" },
  "0134": { name: "Specialist behaviour support", audit: "certification" },
  "0136": { name: "Group and centre based activities", audit: "certification" },
} as const;

export type RegistrationGroup = keyof typeof REGISTRATION_GROUPS;

export const REGISTRATION_GROUP_CODES = Object.keys(REGISTRATION_GROUPS) as RegistrationGroup[];

export function registrationGroup(value: string): RegistrationGroup | null {
  return Object.hasOwn(REGISTRATION_GROUPS, value) ? (value as RegistrationGroup) : null;
}

export type AuditPath = "verification" | "certification";

export function auditPath(groups: readonly RegistrationGroup[]): AuditPath | null {
  if (groups.length === 0) return null;
  return groups.some((code) => REGISTRATION_GROUPS[code].audit === "certification") ? "certification" : "verification";
}

export type PolicyRequirement = {
  key: string;
  title: string;
  needles: readonly string[];
};

const VERIFICATION_POLICIES: readonly PolicyRequirement[] = [
  { key: "incident-management", title: "Incident management", needles: ["incident management", "incident policy"] },
  { key: "complaints-management", title: "Complaints management", needles: ["complaint"] },
  { key: "risk-management", title: "Risk management", needles: ["risk management", "risk policy"] },
  { key: "information-management", title: "Information management", needles: ["privacy", "information management"] },
  { key: "worker-screening", title: "Worker screening", needles: ["worker screening", "human resource", "human resources"] },
];

const CERTIFICATION_POLICIES: readonly PolicyRequirement[] = [
  { key: "emergency-disaster", title: "Emergency and disaster management", needles: ["emergency", "disaster"] },
  { key: "violence-abuse", title: "Violence, abuse, neglect and exploitation", needles: ["violence", "abuse", "neglect", "exploitation"] },
  { key: "support-planning", title: "Support planning", needles: ["support plan"] },
];

const MODULE_POLICIES: Partial<Record<RegistrationGroup, PolicyRequirement>> = {
  "0104": { key: "high-intensity", title: "High intensity supports", needles: ["high intensity", "high-intensity"] },
  "0131": { key: "sda", title: "Specialist disability accommodation", needles: ["specialist disability accommodation", "sda"] },
  "0132": { key: "support-coordination", title: "Support coordination", needles: ["support coordination"] },
  "0133": { key: "early-childhood", title: "Early childhood supports", needles: ["early childhood"] },
  "0134": { key: "restrictive-practice", title: "Restrictive practices", needles: ["restrictive practice", "behaviour support", "behavior support"] },
};

/** Policies the groups require. High-intensity and behaviour-support stay off unless those groups are held. */
export function requiredPolicies(groups: readonly RegistrationGroup[]): PolicyRequirement[] {
  const path = auditPath(groups);
  if (!path) return [];
  const out = [...VERIFICATION_POLICIES];
  if (path === "certification") out.push(...CERTIFICATION_POLICIES);
  for (const code of groups) {
    const extra = MODULE_POLICIES[code];
    if (extra && !out.some((item) => item.key === extra.key)) out.push(extra);
  }
  return out;
}

export function holdsPersonalCare(groups: readonly RegistrationGroup[]): boolean {
  return groups.includes("0104") || groups.includes("0107") || groups.includes("0115");
}

export function documentMatchesPolicy(title: string, category: string, needles: readonly string[]): boolean {
  const hay = `${title} ${category}`.toLowerCase();
  return needles.some((needle) => hay.includes(needle));
}
