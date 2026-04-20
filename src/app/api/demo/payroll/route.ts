import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestDemoDataset } from "@/lib/demo-data/server-dataset";

const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(200).default(50),
  q: z.string().optional(),
  risk: z.enum(["Low", "Medium", "High"]).optional(),
});

type Risk = "Low" | "Medium" | "High";

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = schema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.issues }, { status: 400 });
  }

  const { page, pageSize, q, risk } = parsed.data;
  const dataset = await getRequestDemoDataset();

  // Count duplicate bank accounts and duplicate names (synthetic).
  const nameCounts = new Map<string, number>();
  const bankCounts = new Map<string, number>();
  dataset.employees.forEach((e) => {
    nameCounts.set(normalize(e.fullName), (nameCounts.get(normalize(e.fullName)) || 0) + 1);
    bankCounts.set(e.bankAccount, (bankCounts.get(e.bankAccount) || 0) + 1);
  });

  // Employee flags from rules engine (EMP-001 mainly).
  const flagsByEmployee = new Map<string, string[]>();
  dataset.flags
    .filter((f) => f.entityType === "employee")
    .forEach((f) => {
      const arr = flagsByEmployee.get(f.entityId) || [];
      arr.push(f.title);
      flagsByEmployee.set(f.entityId, arr);
    });

  const items = dataset.employees.map((e) => {
    const signals: string[] = [];
    if ((nameCounts.get(normalize(e.fullName)) || 0) > 1) signals.push("Duplicate name");
    if ((bankCounts.get(e.bankAccount) || 0) > 1) signals.push("Duplicate bank account");
    if (e.status !== "Active") signals.push(`${e.status} employee`);
    (flagsByEmployee.get(e.id) || []).forEach((t) => signals.push(t));

    // Risk: prioritize bank dup + inactive/terminated.
    const computedRisk: Risk =
      signals.some((s) => s.toLowerCase().includes("duplicate bank")) || e.status === "Terminated"
        ? "High"
        : signals.length > 0
          ? "Medium"
          : "Low";

    const dept =
      dataset.departments.find((d) => d.id === e.departmentId)?.name || "Department";
    return {
      id: e.id,
      employeeName: e.fullName,
      bankAccount: e.bankAccount,
      department: dept,
      status: e.status,
      salaryMonthly: e.baseSalaryMonthly,
      signals: Array.from(new Set(signals)).slice(0, 4),
      risk: computedRisk,
    };
  });

  const needle = (q || "").trim().toLowerCase();
  let filtered = items;
  if (needle) {
    filtered = filtered.filter(
      (e) =>
        e.employeeName.toLowerCase().includes(needle) ||
        e.id.toLowerCase().includes(needle) ||
        e.department.toLowerCase().includes(needle),
    );
  }
  if (risk) filtered = filtered.filter((e) => e.risk === risk);

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  const riskBreakdown = (["Low", "Medium", "High"] as const).map((r) => ({
    risk: r,
    value: items.filter((i) => i.risk === r).length,
  }));

  return NextResponse.json({
    total,
    page,
    pageSize,
    riskBreakdown,
    items: paged,
  });
}

