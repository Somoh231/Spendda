import { redirect } from "next/navigation";

/** Legacy URL — primary AI experience is AI Workspace. */
export default function LegacyAiAnalystRedirect() {
  redirect("/app/ai-workspace");
}
