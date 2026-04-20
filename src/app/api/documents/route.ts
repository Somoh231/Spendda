import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantMembership } from "@/lib/tenants/require-tenant";
import { tenantRoleCan } from "@/lib/tenants/permissions";

const createSchema = z.object({
  fileName: z.string().min(1).max(260),
  fileType: z.enum(["PDF", "CSV", "XLSX", "DOCX", "OTHER"]),
  reportingPeriod: z.string().max(80).optional(),
  status: z.enum(["Uploaded", "Processing", "Ready", "Archived"]).default("Ready"),
  owner: z.string().max(80).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  mimeType: z.string().max(120).optional(),
  notes: z.string().max(600).optional(),
});

export async function GET() {
  const ctx = await requireTenantMembership();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const { data, error } = await supabase
    .from("tenant_documents")
    .select(
      "id,file_name,file_type,uploaded_at,reporting_period,status,owner,size_bytes,mime_type,notes,created_by",
    )
    .eq("tenant_id", ctx.tenant.id)
    .order("uploaded_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const docs =
    (data || []).map((d: any) => ({
      id: d.id as string,
      fileName: d.file_name as string,
      fileType: d.file_type as "PDF" | "CSV" | "XLSX" | "DOCX" | "OTHER",
      uploadedAt: d.uploaded_at as string,
      reportingPeriod: (d.reporting_period as string | null) || undefined,
      status: d.status as "Uploaded" | "Processing" | "Ready" | "Archived",
      owner: (d.owner as string | null) || undefined,
      sizeBytes: (d.size_bytes as number | null) || undefined,
      mimeType: (d.mime_type as string | null) || undefined,
      notes: (d.notes as string | null) || undefined,
    })) || [];

  return NextResponse.json({ docs, tenant: ctx.tenant, role: ctx.role });
}

export async function POST(request: Request) {
  const ctx = await requireTenantMembership();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (!tenantRoleCan(ctx.role, "data.upload")) {
    return NextResponse.json({ error: "Uploads are not permitted for this workspace role." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const v = parsed.data;
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("tenant_documents")
    .insert({
      tenant_id: ctx.tenant.id,
      file_name: v.fileName,
      file_type: v.fileType,
      uploaded_at: nowIso,
      reporting_period: v.reportingPeriod?.trim() ? v.reportingPeriod.trim() : null,
      status: v.status,
      owner: v.owner?.trim() ? v.owner.trim() : null,
      size_bytes: typeof v.sizeBytes === "number" ? v.sizeBytes : null,
      mime_type: v.mimeType?.trim() ? v.mimeType.trim() : null,
      notes: v.notes?.trim() ? v.notes.trim() : null,
      created_by: ctx.user.id,
    })
    .select("id")
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const id = data?.[0]?.id as string | undefined;
  if (!id) return NextResponse.json({ error: "Failed to create document" }, { status: 500 });

  return NextResponse.json({ ok: true, id, uploadedAt: nowIso });
}

const deleteSchema = z.object({ id: z.string().min(1) });

export async function DELETE(request: Request) {
  const ctx = await requireTenantMembership();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (!tenantRoleCan(ctx.role, "documents.delete")) {
    return NextResponse.json({ error: "Removing documents requires Owner or Finance Lead." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const { error } = await supabase
    .from("tenant_documents")
    .delete()
    .eq("tenant_id", ctx.tenant.id)
    .eq("id", parsed.data.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

