import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantMembership } from "@/lib/tenants/require-tenant";
import { tenantRoleCan } from "@/lib/tenants/permissions";

const createSchema = z.object({
  fileName: z.string().min(1).max(260),
  fileKind: z.enum(["spend", "payroll", "other"]).default("other"),
  fileType: z.enum(["CSV", "XLSX", "XLS", "OTHER"]).default("OTHER"),
  rowCount: z.number().int().nonnegative().optional(),
  uploadedAt: z.string().optional(),
  status: z.enum(["Uploaded", "Processing", "Ready", "Archived", "Failed"]).default("Ready"),
});

export async function POST(request: Request) {
  const ctx = await requireTenantMembership();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (!tenantRoleCan(ctx.role, "data.upload")) {
    return NextResponse.json({ error: "Uploads are not permitted for this workspace role." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const v = parsed.data;
  const uploadedAt = v.uploadedAt?.trim() ? new Date(v.uploadedAt).toISOString() : new Date().toISOString();

  const { data, error } = await supabase
    .from("tenant_uploads")
    .insert({
      tenant_id: ctx.tenant.id,
      file_name: v.fileName,
      file_kind: v.fileKind,
      file_type: v.fileType,
      row_count: typeof v.rowCount === "number" ? v.rowCount : null,
      uploaded_at: uploadedAt,
      status: v.status,
      created_by: ctx.user.id,
    })
    .select("id")
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const id = data?.[0]?.id as string | undefined;
  if (!id) return NextResponse.json({ error: "Failed to record upload" }, { status: 500 });

  return NextResponse.json({ ok: true, id, uploadedAt, tenantId: ctx.tenant.id });
}

