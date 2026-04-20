"use client";

import * as React from "react";

import { DateRangePicker, getDateRangeForPreset, type DateRange } from "@/components/ui/date-range-picker";
import { EntityMultiSelect } from "@/components/app/entity-multi-select";
import { useClientSession } from "@/hooks/use-client-session";
import { useProfile } from "@/lib/profile/client";

export type AnalyticsScope = {
  range: DateRange;
  entities: string[];
};

const KEY = "spendda_analytics_scope_v1";

function keyForClient(clientId?: string | null) {
  const id = clientId?.trim();
  return id ? `${KEY}:${id}` : KEY;
}

function safeParse(raw: string | null): AnalyticsScope | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Partial<AnalyticsScope>;
    if (!j || typeof j !== "object") return null;
    return {
      range: (j.range as DateRange) || {},
      entities: Array.isArray(j.entities) ? j.entities.filter((x) => typeof x === "string") : [],
    };
  } catch {
    return null;
  }
}

type AnalyticsScopeContextValue = {
  scope: AnalyticsScope;
  options: string[];
  hydrated: boolean;
  setRange: (range: DateRange) => void;
  setEntities: (entities: string[]) => void;
};

const AnalyticsScopeContext = React.createContext<AnalyticsScopeContextValue | null>(null);

export function AnalyticsScopeProvider({ children }: { children: React.ReactNode }) {
  const { client } = useClientSession();
  const { profile } = useProfile();
  const clientId = client?.clientId ?? null;
  const storageKey = keyForClient(clientId);

  const [hydrated, setHydrated] = React.useState(false);
  const [scope, setScope] = React.useState<AnalyticsScope>({
    range: getDateRangeForPreset("last_30d"),
    entities: [],
  });

  // Single hydration pass: restore from storage, then default entity only when nothing persisted.
  React.useEffect(() => {
    setHydrated(true);
    try {
      const parsed = safeParse(window.localStorage.getItem(storageKey));
      const rawRange = parsed?.range;
      const hasRange = Boolean(rawRange?.from || rawRange?.to);
      const range = hasRange ? (rawRange as DateRange) : getDateRangeForPreset("last_30d");
      if (parsed?.entities?.length) {
        setScope({ range, entities: parsed.entities });
        return;
      }
      if (profile?.activeEntity) {
        setScope({ range, entities: [profile.activeEntity] });
        return;
      }
      if (parsed) setScope({ range, entities: parsed.entities ?? [] });
    } catch {
      /* ignore */
    }
  }, [storageKey, profile?.activeEntity]);

  React.useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(scope));
    } catch {
      /* ignore */
    }
  }, [scope, storageKey, hydrated]);

  const options = profile?.entities?.length ? profile.entities : ["HQ"];

  const setRange = React.useCallback((range: DateRange) => {
    setScope((s) => ({ ...s, range }));
  }, []);

  const setEntities = React.useCallback((entities: string[]) => {
    setScope((s) => ({ ...s, entities }));
  }, []);

  const value = React.useMemo(
    () => ({ scope, options, hydrated, setRange, setEntities }),
    [scope, options, hydrated, setRange, setEntities],
  );

  return <AnalyticsScopeContext.Provider value={value}>{children}</AnalyticsScopeContext.Provider>;
}

export function useAnalyticsScope(): AnalyticsScopeContextValue {
  const ctx = React.useContext(AnalyticsScopeContext);
  if (!ctx) {
    throw new Error("useAnalyticsScope must be used within AnalyticsScopeProvider");
  }
  return ctx;
}

export function AnalyticsScopeControls({ label = "Analytics scope" }: { label?: string }) {
  const { scope, options, setEntities, setRange } = useAnalyticsScope();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <DateRangePicker value={scope.range} onChange={setRange} label={label} />
      <div className="grid gap-2">
        <div className="text-sm font-semibold">Entity scope</div>
        <EntityMultiSelect
          options={options}
          value={scope.entities}
          onChange={setEntities}
          placeholder="All entities"
        />
        <div className="text-xs text-muted-foreground">
          This scope is saved per tenant and reused across pages.
        </div>
      </div>
    </div>
  );
}
