"use client";

import * as React from "react";
import { parseCsv } from "@/lib/csv";
import { upsertUploadedInsights } from "@/lib/upload/storage";
import { useClientSession } from "@/hooks/use-client-session";

const SEED_FLAG = "spendda_seed_demo_v1";

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function toNumber(s: string) {
  const n = Number(String(s).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function DemoSeeder() {
  const { client } = useClientSession();
  const clientId = client?.clientId ?? null;

  React.useEffect(() => {
    const flag = window.localStorage.getItem(SEED_FLAG);
    if (flag !== "1") return;

    (async () => {
      try {
        // Seed an example AI Workspace thread (demo-only, localStorage).
        try {
          const threadKey = clientId ? `spendda_ai_workspace_v3:${clientId}` : "spendda_ai_workspace_v3";
          const existing = window.localStorage.getItem(threadKey);
          if (!existing) {
            window.localStorage.setItem(
              threadKey,
              JSON.stringify({
                msgs: [
                  {
                    id: "demo-1",
                    role: "assistant",
                    content:
                      "Welcome to the Spendda demo. I can summarize spend, flag anomalies, and draft board-ready takeaways based on the seeded sample uploads.",
                    meta: { mode: "local" },
                  },
                  {
                    id: "demo-2",
                    role: "user",
                    content: "What looks suspicious?",
                  },
                  {
                    id: "demo-3",
                    role: "assistant",
                    content:
                      "Top signals in the sample data:\n\n- Duplicate/repeat vendor+amount patterns (review invoices)\n- A small cluster of large outliers near the top percentile\n\nNext actions:\n- Open Alerts to triage by impact\n- Ask for “Top vendors” and “Which department overspent” to scope the investigation",
                    meta: { mode: "local" },
                  },
                ],
                savedAt: new Date().toISOString(),
              }),
            );
          }
        } catch {
          /* ignore */
        }

        const profileRaw = window.localStorage.getItem(clientId ? `spendda_profile_v1:${clientId}` : "spendda_profile_v1");
        let entity = "HQ";
        if (profileRaw) {
          try {
            const profile = JSON.parse(profileRaw) as { activeEntity?: string };
            entity = profile?.activeEntity || "HQ";
          } catch {
            /* ignore corrupt profile */
          }
        }

        // Spend sample
        const spendRes = await fetch("/samples/spend-sample.csv", { cache: "no-store" });
        const spendText = await spendRes.text();
        const spendRows = parseCsv(spendText);
        const tx = spendRows.map((r) => ({
          vendor: r.vendor || r.vendor_name || r.merchant || r.payee || "",
          category: r.category || r.expense_category || "",
          department: r.department || r.dept || r.cost_center || "",
          amount: toNumber(r.amount || r.total || r.spend || ""),
        }));
        const totalSpend = tx.reduce((s, t) => s + (t.amount || 0), 0);
        const byVendor = new Map<string, number>();
        const byDept = new Map<string, number>();
        const amounts = tx.map((t) => t.amount).filter((a) => a > 0).sort((a, b) => a - b);
        const p95 = amounts.length ? amounts[Math.floor(0.95 * (amounts.length - 1))] : 0;
        const repeatedCounts = new Map<string, number>();
        tx.forEach((t) => {
          const key = `${normalize(t.vendor)}|${t.amount}`;
          if (t.vendor && t.amount > 0) repeatedCounts.set(key, (repeatedCounts.get(key) || 0) + 1);
        });
        let repeatedCount = 0;
        let unusualCount = 0;
        tx.forEach((t) => {
          if (t.vendor) byVendor.set(t.vendor, (byVendor.get(t.vendor) || 0) + t.amount);
          if (t.department) byDept.set(t.department, (byDept.get(t.department) || 0) + t.amount);
          const key = `${normalize(t.vendor)}|${t.amount}`;
          if ((repeatedCounts.get(key) || 0) >= 3) repeatedCount++;
          if (p95 > 0 && t.amount >= p95) unusualCount++;
        });
        const topVendor = [...byVendor.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        const topDepartment = [...byDept.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

        upsertUploadedInsights(
          {
          kind: "spend",
          entity,
          filename: "spend-sample.csv",
          uploadedAt: new Date().toISOString(),
          totalTransactions: tx.length,
          totalSpend,
          flaggedCount: repeatedCount + unusualCount,
          repeatedCount,
          unusualCount,
          topVendor,
          topDepartment,
          },
          clientId,
        );

        // Payroll sample
        const payRes = await fetch("/samples/payroll-sample.csv", { cache: "no-store" });
        const payText = await payRes.text();
        const payRows = parseCsv(payText);
        const items = payRows.map((r) => ({
          name: r.name || r.employee_name || "",
          dept: r.department || r.dept || "",
          bank: r.bank_account || r.account || "",
          status: normalize(r.status || r.employment_status || "active"),
          salary: toNumber(r.salary || r.gross_salary || ""),
          salaryPrev: toNumber(r.salary_previous || r.prev_salary || ""),
        }));
        const bankCounts = new Map<string, number>();
        items.forEach((i) => {
          if (i.bank) bankCounts.set(normalize(i.bank), (bankCounts.get(normalize(i.bank)) || 0) + 1);
        });
        let highRisk = 0;
        let mediumRisk = 0;
        let duplicateBankSignals = 0;
        let inactivePaidSignals = 0;
        let salarySpikeSignals = 0;
        const byDeptCount = new Map<string, number>();
        items.forEach((i) => {
          if (i.dept) byDeptCount.set(i.dept, (byDeptCount.get(i.dept) || 0) + 1);
          const signals: string[] = [];
          if (i.bank && (bankCounts.get(normalize(i.bank)) || 0) > 1) {
            signals.push("Duplicate bank account");
            duplicateBankSignals++;
          }
          if ((i.status === "inactive" || i.status === "terminated") && i.salary > 0) {
            signals.push("Inactive employee still paid");
            inactivePaidSignals++;
          }
          const incPct = i.salaryPrev > 0 ? ((i.salary - i.salaryPrev) / i.salaryPrev) * 100 : 0;
          if (i.salaryPrev > 0 && incPct >= 20) {
            signals.push("Salary spike");
            salarySpikeSignals++;
          }
          const risk =
            signals.includes("Duplicate bank account") || signals.includes("Inactive employee still paid")
              ? "High"
              : signals.length
                ? "Medium"
                : "Low";
          if (risk === "High") highRisk++;
          else if (risk === "Medium") mediumRisk++;
        });
        const topDeptPayroll = [...byDeptCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

        upsertUploadedInsights(
          {
          kind: "payroll",
          entity,
          filename: "payroll-sample.csv",
          uploadedAt: new Date().toISOString(),
          totalEmployees: items.length,
          highRisk,
          mediumRisk,
          duplicateBankSignals,
          inactivePaidSignals,
          salarySpikeSignals,
          topDepartment: topDeptPayroll,
          },
          clientId,
        );
      } finally {
        window.localStorage.removeItem(SEED_FLAG);
      }
    })();
  }, [clientId]);

  return null;
}

