import { AiWorkspaceShellLazy } from "./ai-workspace-loader";

export default function AiWorkspacePage() {
  return (
    <div data-ai-workspace="true" className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
      <div className="shrink-0 pb-3">
        <h1 className="app-page-title text-brand-primary">AI Workspace</h1>
        <p className="app-page-desc mt-1 max-w-2xl">
          Ask anything about your uploaded data. Get specific answers, not generic advice.
        </p>
      </div>
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AiWorkspaceShellLazy />
      </div>
    </div>
  );
}
