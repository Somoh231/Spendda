import { redirect } from "next/navigation";

/** Legacy route — consolidated into the main dashboard. */
export default function IntelligenceRedirectPage() {
  redirect("/app/ai-workspace");
}
