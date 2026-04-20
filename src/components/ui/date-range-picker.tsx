"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type DateRange = { from?: string; to?: string }; // ISO date (YYYY-MM-DD)

export type DateRangePreset =
  | "this_month"
  | "last_month"
  | "last_30d"
  | "qtd"
  | "ytd"
  | "custom";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addDaysUTC(d: Date, days: number) {
  return new Date(d.getTime() + days * 86400000);
}

function startOfYear(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

function startOfQuarter(d: Date) {
  const q = Math.floor(d.getUTCMonth() / 3);
  return new Date(Date.UTC(d.getUTCFullYear(), q * 3, 1));
}

function rangesEqual(a: DateRange, b: DateRange) {
  return (a.from || "") === (b.from || "") && (a.to || "") === (b.to || "");
}

function presetToRange(preset: DateRangePreset): DateRange {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (preset === "last_30d") return { from: isoDate(addDaysUTC(today, -29)), to: isoDate(today) };
  if (preset === "ytd") return { from: isoDate(startOfYear(today)), to: isoDate(today) };
  if (preset === "qtd") return { from: isoDate(startOfQuarter(today)), to: isoDate(today) };
  if (preset === "this_month") return { from: isoDate(startOfMonth(today)), to: isoDate(today) };
  if (preset === "last_month") {
    const startThis = startOfMonth(today);
    const endLast = addDaysUTC(startThis, -1);
    const startLast = startOfMonth(endLast);
    return { from: isoDate(startLast), to: isoDate(endLast) };
  }
  return {};
}

/** Deterministic UTC range for SSR + client initial state (avoids hydration mismatch with `DateRangePicker`). */
export function getDateRangeForPreset(preset: DateRangePreset): DateRange {
  if (preset === "custom") return {};
  return presetToRange(preset);
}

const PRESET_OPTIONS: Array<[DateRangePreset, string]> = [
  ["last_30d", "Last 30 days"],
  ["this_month", "This month"],
  ["last_month", "Last month"],
  ["qtd", "Quarter to date"],
  ["ytd", "Year to date"],
  ["custom", "Custom"],
];

export function DateRangePicker({
  value,
  onChange,
  defaultPreset = "last_30d",
  label = "Date range",
  compact = false,
}: {
  value: DateRange;
  onChange: (next: DateRange) => void;
  defaultPreset?: DateRangePreset;
  label?: string;
  /** Single pill / select — dashboard hero (design kit) */
  compact?: boolean;
}) {
  const [preset, setPreset] = React.useState<DateRangePreset>(defaultPreset);

  React.useEffect(() => {
    if (preset === "custom") return;
    const next = presetToRange(preset);
    if (rangesEqual(value, next)) return;
    onChange(next);
  }, [preset, onChange, value.from, value.to]);

  if (compact) {
    return (
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={preset} onValueChange={(v) => v && setPreset(v as DateRangePreset)}>
          <SelectTrigger className="h-9 w-full min-w-0 border-0 bg-transparent px-1 py-0 text-sm font-medium shadow-none ring-0 focus:ring-0 [&_svg]:opacity-60">
            <SelectValue placeholder="Last 30 days" />
          </SelectTrigger>
          <SelectContent align="end">
            {PRESET_OPTIONS.map(([id, text]) => (
              <SelectItem key={id} value={id}>
                {text}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {preset === "custom" ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={value.from || ""}
              onChange={(e) => onChange({ ...value, from: e.target.value || undefined })}
              className="h-9 w-[132px] rounded-xl text-xs"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <Input
              type="date"
              value={value.to || ""}
              onChange={(e) => onChange({ ...value, to: e.target.value || undefined })}
              className="h-9 w-[132px] rounded-xl text-xs"
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {label ? <Label>{label}</Label> : null}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["this_month", "This Month"],
            ["last_month", "Last Month"],
            ["last_30d", "Last 30 Days"],
            ["qtd", "Quarter to Date"],
            ["ytd", "Year to Date"],
            ["custom", "Custom"],
          ] satisfies Array<[DateRangePreset, string]>
        ).map(([id, text]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={preset === id ? "secondary" : "outline"}
            className="rounded-xl"
            onClick={() => setPreset(id)}
          >
            {text}
          </Button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">Start</Label>
          <Input
            type="date"
            value={value.from || ""}
            onChange={(e) => {
              setPreset("custom");
              onChange({ ...value, from: e.target.value || undefined });
            }}
            className="h-10 rounded-xl"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">End</Label>
          <Input
            type="date"
            value={value.to || ""}
            onChange={(e) => {
              setPreset("custom");
              onChange({ ...value, to: e.target.value || undefined });
            }}
            className="h-10 rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}

