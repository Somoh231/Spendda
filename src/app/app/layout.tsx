import { AppMainScrollLock } from "@/components/app/app-main-scroll-lock";
import { Sidebar } from "@/components/app/sidebar";
import { TopNav } from "@/components/app/top-nav";
import { DemoSeeder } from "@/components/demo-seeder";
import { GlobalAiAssistant } from "@/components/app/global-ai-assistant";
import { AnalyticsScopeProvider } from "@/components/app/analytics-scope";
import { WorkspaceDataProvider } from "@/components/app/workspace-data-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AnalyticsScopeProvider>
      <WorkspaceDataProvider>
      <div className="flex h-dvh max-h-dvh min-h-0 flex-1 flex-col overflow-hidden bg-background">
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden bg-background">
            <DemoSeeder />
            <TopNav />
            <main
              id="app-main"
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-gradient-to-b from-muted/25 via-background to-background px-4 py-5 motion-safe:transition-[background-color] motion-safe:duration-300 sm:px-6 sm:py-6 lg:px-8 lg:py-7 dark:from-muted/15 dark:via-background dark:to-background"
            >
              <AppMainScrollLock />
              <div className="mx-auto flex h-full min-h-0 min-w-0 w-full max-w-[1440px] flex-1 flex-col motion-safe:animate-fade-in-up">
                {children}
              </div>
            </main>
          </div>
        </div>
        <GlobalAiAssistant />
      </div>
      </WorkspaceDataProvider>
    </AnalyticsScopeProvider>
  );
}

