"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

export function WorkspaceMarkdown({ content, className }: { content: string; className?: string }) {
  return (
    <div
      className={cn(
        "workspace-md min-w-0 max-w-full break-words text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_blockquote]:rounded-lg [&_blockquote]:border [&_blockquote]:border-border/50 [&_blockquote]:bg-muted/20 [&_blockquote]:px-3 [&_blockquote]:py-2 [&_blockquote]:text-muted-foreground [&_code]:rounded-md [&_code]:bg-muted/80 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_h1]:mb-1.5 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:leading-snug [&_h2]:mb-1.5 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:leading-snug [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-medium [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_p]:first:mt-0 [&_p]:last:mb-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border/50 [&_pre]:bg-muted/30 [&_pre]:p-3 [&_table]:w-full [&_table]:min-w-[280px] [&_table]:border-collapse [&_table]:text-[13px] [&_td]:border [&_td]:border-border/45 [&_td]:px-2.5 [&_td]:py-1.5 [&_th]:border [&_th]:border-border/45 [&_th]:bg-muted/35 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_ul]:list-disc [&_ul]:pl-5",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children, ...props }) => (
            <div className="my-2 overflow-x-auto rounded-lg border border-border/50">
              <table {...props}>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
