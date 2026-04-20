import { AiWorkspaceShellLazy } from "./ai-workspace-loader";

export default function AiWorkspacePage() {
  return (
    <div data-ai-workspace="true" className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
      <div className="shrink-0 pb-3">
        <h1 className="app-page-title text-brand-primary">AI Workspace</h1>
        <p className="app-page-desc mt-1 max-w-2xl">
          Scoped Q&amp;A — tight answers by default, markdown and charts when they help. Export the thread for an audit trail.
        </p>
      </div>
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AiWorkspaceShellLazy />
      </div>
    </div>
  );
}
