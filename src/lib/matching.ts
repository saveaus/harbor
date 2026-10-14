/** What is known about one worker for one open shift. */
export type Candidate = {
  id: string;
  name: string;
  /** Null when the worker hasn't set any availability. */
  available: boolean | null;
  onLeave: boolean;
  excluded: boolean;
  preferred: boolean;
  missingCredentials: string[];
  clash: boolean;
  shortRest: boolean;
  overWeekly: boolean;
  atSite: boolean;
  /** Shifts already worked with this shift's clients. */
  history: number;
};

export type Match = Candidate & { eligible: boolean; score: number; reasons: string[]; warnings: string[] };

/**
 * Ranks workers for a shift. Workers a client has excluded, who are on leave,
 * or who are already rostered at the time can't take it; everyone else is
 * ordered by client preference, familiarity, site and availability, with
 * missing credentials and award risks counting against them.
 */
export function rankCandidates(candidates: readonly Candidate[]): Match[] {
  return candidates
    .map((c) => {
      const reasons: string[] = [];
      const warnings: string[] = [];
      let score = 0;
      if (c.preferred) {
        score += 40;
        reasons.push("Preferred by the client");
      }
      if (c.history) {
        score += Math.min(c.history, 10) * 3;
        reasons.push(`Worked ${c.history} shift${c.history === 1 ? "" : "s"} with this client`);
      }
      if (c.atSite) {
        score += 15;
        reasons.push("Supports this site");
      }
      if (c.available === true) {
        score += 15;
        reasons.push("Available at this time");
      } else if (c.available === false) {
        score -= 25;
        warnings.push("Outside their availability");
      }
      for (const credential of c.missingCredentials) {
        score -= 30;
        warnings.push(`${credential} not current`);
      }
      if (c.shortRest) {
        score -= 20;
        warnings.push("Short rest between shifts");
      }
      if (c.overWeekly) {
        score -= 20;
        warnings.push("Over weekly hours");
      }
      const blockers = [c.excluded && "Excluded by the client", c.onLeave && "On leave", c.clash && "Already rostered at this time"].filter(
        (b): b is string => Boolean(b),
      );
      return { ...c, eligible: blockers.length === 0, score, reasons, warnings: [...blockers, ...warnings] };
    })
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || a.name.localeCompare(b.name));
}
