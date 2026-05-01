import { NextRequest, NextResponse } from "next/server";
import { requireTenantMembership } from "@/lib/tenants/require-tenant";
import type { ChatContext } from "@/lib/workspace/upload-ai-context";

const MODEL = "claude-haiku-4-5-20251001";

function buildSystemPrompt(ctx: ChatContext, role?: string): string {
  const hasData = ctx.dataSource === "upload" && ctx.rowCount > 0;

  const orgSection = `
ORGANIZATION:
- Name: ${ctx.organizationName ?? "the business"}
- Type: ${ctx.orgType ?? "SME"}
- Entity: ${ctx.entity ?? "HQ"}
- User role: ${role ?? "Owner"}`.trim();

  const dataSection = hasData
    ? `
UPLOADED DATA:
- File: ${ctx.filename}
- Rows: ${ctx.rowCount.toLocaleString()}
- Date range: ${ctx.dateRange.from ?? "?"} → ${ctx.dateRange.to ?? "?"}
- Total spend: $${Math.round(ctx.totalSpend).toLocaleString()}
- Total payroll: $${Math.round(ctx.totalPayroll).toLocaleString()}
- Payroll as % of spend: ${ctx.payrollRatioPct}%
- Top vendors: ${ctx.topVendors.length > 0 ? ctx.topVendors.join(", ") : "not detected"}
- Flagged transactions: ${ctx.flagCount}
- Anomaly types: ${ctx.anomalies.length > 0 ? ctx.anomalies.join(", ") : "none"}
${ctx.warnings.length > 0 ? `- Data warnings: ${ctx.warnings.join("; ")}` : ""}`.trim()
    : `NO DATA UPLOADED — tell the user to upload a CSV or Excel file. Do not invent numbers.`;

  const industryRules: Record<string, string> = {
    "Home Care Agency":
      "Focus on caregiver pay ratios (target under 60% of revenue), client billing gaps, overtime patterns, and cash runway.",
    "Childcare Center":
      "Focus on staff cost per enrolled child, subsidy payment delays, payroll by center, and licensing compliance costs.",
    "Restaurant Group":
      "Focus on location performance comparison, labor cost % (benchmark 30%), food cost %, and duplicate vendor invoices.",
    SME: "Focus on vendor spend concentration, payroll health, duplicate payments, and monthly cash position.",
  };

  const roleRules: Record<string, string> = {
    Admin: "Give full financial analysis. No restrictions.",
    "Finance Lead": "Give full financial analysis. No restrictions.",
    Executive: "Lead with the bottom line. Keep to 3-4 sentences unless asked for detail.",
    Auditor: "Focus on anomalies, flags, duplicate payments. Do not discuss strategy.",
    Analyst: "Give detailed analysis with methodology notes.",
    Staff:
      "Only answer operational questions. Do not share financial totals, payroll amounts, or vendor spend details — direct those questions to the account owner.",
  };

  return `You are a financial analysis assistant 
for ${ctx.organizationName ?? "a business"}, 
built into Spendda.

${orgSection}

${dataSection}

INDUSTRY FOCUS: ${industryRules[ctx.orgType ?? ""] ?? "Focus on vendor spend, payroll health, anomalies, and monthly trends."}

ROLE RULES: ${roleRules[role ?? "Admin"] ?? roleRules["Admin"]}

YOUR RULES:
1. Only answer from the data above. Never invent numbers.
2. If no data is uploaded, say so and ask them to upload a file.
3. Use specific dollar amounts with $ and commas.
4. Keep responses concise — 3-5 sentences for simple questions, bullet points for lists.
5. Flag concerning patterns clearly.
6. Never output raw JSON. Always respond in plain English.
7. End with 1-2 specific follow-up questions the user should ask.
8. Format currency as USD.`;
}

const EMPTY_CHAT_CONTEXT: ChatContext = {
  dataSource: "none",
  rowCount: 0,
  totalSpend: 0,
  totalPayroll: 0,
  payrollRatioPct: 0,
  topVendors: [],
  dateRange: { from: null, to: null },
  flagCount: 0,
  anomalies: [],
  warnings: [],
};

export async function POST(req: NextRequest) {
  const ctx = await requireTenantMembership();
  if (!ctx.ok)
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  let body: {
    messages: Array<{ role: string; content: string }>;
    context?: ChatContext;
    role?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages, context, role } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  const systemPrompt = buildSystemPrompt(context ?? EMPTY_CHAT_CONTEXT, role);

  const cleanMessages = messages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .slice(-12)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content.trim(),
    }));

  if (cleanMessages.length === 0) {
    return NextResponse.json({ error: "No valid messages" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: cleanMessages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic API error:", err);
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; text: string }>;
    };

    const text = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    if (!text) {
      return NextResponse.json({ error: "Empty response from AI" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, text });
  } catch (e) {
    console.error("Claude route error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
