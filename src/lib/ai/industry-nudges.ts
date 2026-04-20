import type { OnboardingProfile } from "@/lib/profile/types";

/**
 * Short domain lens appended to analytics-style replies (pilot heuristics, not legal advice).
 */
export function industryLensForProfile(profile: OnboardingProfile | null): string | null {
  if (!profile) return null;
  const goals = (profile.primaryGoals || []).join(" ").toLowerCase();
  if (/child|daycare|early learning|pre-?k|nursery/i.test(goals)) {
    return "**Lens (care / early learning):** stress-test **duplicate supplier** payments and **payroll-to-headcount** consistency across sites.";
  }
  switch (profile.orgType) {
    case "Government":
      return "**Lens (public sector):** prioritize **audit trail**, **grant/program** mix shifts, and **vendor concentration** that could draw oversight questions.";
    case "NGO":
      return "**Lens (NGO):** tie spend spikes to **program delivery** and watch **donor-restricted** vs unrestricted leakage patterns in the data you upload.";
    case "University":
      return "**Lens (university):** watch **research vs admin** spend clusters and **HR/payroll** anomalies that often surface in multi-dept uploads.";
    case "Hospital":
      return "**Lens (healthcare):** focus on **high-value vendor** concentration and **payroll** signals that often correlate with staffing compliance reviews.";
    case "Bank":
      return "**Lens (regulated finance):** emphasize **segregation-friendly** evidence (invoice IDs, dates) and **repeated payment** patterns.";
    case "Private Company":
      return "**Lens (enterprise):** connect anomalies to **OPEX drivers** and **subsidiary / entity** mix when you scope multiple entities.";
    default:
      return null;
  }
}

export function roleHint(role: string | undefined): string | null {
  if (!role) return null;
  if (role === "Executive") return "Framed for **executive** review: headline risk, savings, and next actions.";
  if (role === "Auditor") return "Framed for **audit**: evidence rows, references, and repeatable checks.";
  if (role === "Finance Lead") return "Framed for **finance ops**: department and vendor rollups you can action.";
  return null;
}
