import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantMembership } from "@/lib/tenants/require-tenant";

const listSchema = z.object({
  threadId: z.string().min(1).max(80).default("default"),
  limit: z.coerce.number().int().min(1).max(200).default(120),
});

export async function GET(request: Request) {
  const ctx = await requireTenantMembership();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const url = new URL(request.url);
  const parsed = listSchema.safeParse({
    threadId: url.searchParams.get("threadId") || undefined,
    limit: url.searchParams.get("limit") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tenant_chat_messages")
    .select("id, role, content, detail_text, meta, created_at")
    .eq("tenant_id", ctx.tenant.id)
    .eq("thread_id", parsed.data.threadId)
    .order("created_at", { ascending: true })
    .limit(parsed.data.limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const msgs =
    (data || []).map((r: any) => ({
      id: r.id as string,
      role: r.role as "user" | "assistant",
      content: (r.content as string) || "",
      detailText: (r.detail_text as string | null) || undefined,
      meta: (r.meta as any) ?? null,
      createdAt: r.created_at as string,
    })) || [];

  return NextResponse.json({ ok: true, threadId: parsed.data.threadId, msgs });
}

const createSchema = z.object({
  threadId: z.string().min(1).max(80).default("default"),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(30_000),
  detailText: z.string().max(120_000).optional(),
  meta: z.any().optional(),
});

export async function POST(request: Request) {
  const ctx = await requireTenantMembership();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const v = parsed.data;
  const { data, error } = await supabase
    .from("tenant_chat_messages")
    .insert({
      tenant_id: ctx.tenant.id,
      thread_id: v.threadId,
      role: v.role,
      content: v.content,
      detail_text: v.detailText ?? null,
      meta: v.meta ?? {},
      created_by: ctx.user.id,
    })
    .select("id, created_at")
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const id = data?.[0]?.id as string | undefined;
  return NextResponse.json({ ok: true, id, createdAt: data?.[0]?.created_at });
}

