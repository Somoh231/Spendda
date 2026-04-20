"use client";

import * as React from "react";
import { ChevronDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function EntityMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select entities",
  className,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [q, setQ] = React.useState("");
  const norm = (s: string) => s.trim();
  const opts = React.useMemo(() => Array.from(new Set(options.map(norm))).filter(Boolean), [options]);
  const selected = React.useMemo(() => value.map(norm).filter(Boolean), [value]);

  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return opts;
    return opts.filter((o) => o.toLowerCase().includes(t));
  }, [opts, q]);

  const allSelected = selected.length > 0 && selected.length === opts.length;

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0]
        : `${selected[0]} +${selected.length - 1}`;

  return (
    <div className={cn("grid gap-2", className)}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-between rounded-xl border-border/70 bg-card/70 shadow-sm"
          >
            <span className={cn("truncate", selected.length === 0 ? "text-muted-foreground" : "")}>{label}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[320px] p-2">
          <DropdownMenuLabel>Entities</DropdownMenuLabel>
          <div className="px-1 pb-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="h-9 rounded-lg"
            />
          </div>
          <div className="flex flex-wrap gap-2 px-1 pb-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 rounded-lg"
              onClick={() => onChange(opts)}
              disabled={opts.length === 0}
            >
              Select all
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-lg"
              onClick={() => onChange([])}
              disabled={selected.length === 0}
            >
              Clear
            </Button>
            {allSelected ? (
              <Badge variant="outline" className="h-8 items-center rounded-lg px-2">
                All selected
              </Badge>
            ) : null}
          </div>
          <DropdownMenuSeparator />
          <div className="max-h-[240px] overflow-auto">
            {filtered.length === 0 ? (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">No matches.</div>
            ) : (
              filtered.map((o) => {
                const checked = selected.includes(o);
                return (
                  <DropdownMenuCheckboxItem
                    key={o}
                    checked={checked}
                    onCheckedChange={(next) => {
                      onChange(next ? Array.from(new Set([...selected, o])) : selected.filter((x) => x !== o));
                    }}
                  >
                    {o}
                  </DropdownMenuCheckboxItem>
                );
              })
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.slice(0, 6).map((s) => (
            <Badge key={s} variant="outline" className="gap-1">
              {s}
              <button
                type="button"
                className="ml-1 inline-flex rounded-sm p-0.5 hover:bg-muted"
                onClick={() => onChange(selected.filter((x) => x !== s))}
                aria-label={`Remove ${s}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selected.length > 6 ? (
            <Badge variant="outline">+{selected.length - 6} more</Badge>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

