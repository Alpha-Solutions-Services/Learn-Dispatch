import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  isOwnerUserAsync,
  isPortalStaff,
  resolveStaffRole,
} from "@/lib/admin-auth";
import { notifyUser, escapeHtml } from "@/lib/email/notify";
import { logAuditEvent } from "@/lib/portal/audit";
import { getSessionUser } from "@/lib/portal/require-session";
import { getPortalUrl } from "@/lib/supabase/env";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET() {
  const session = await getSessionUser();
  if ("error" in session) return session.error;
  if (!(await isPortalStaff(session.user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const role = await resolveStaffRole(session.user);
  const db = getServiceRoleClient();
  const { data } = db
    ? await db
        .from("portal_staff")
        .select("*")
        .order("created_at", { ascending: false })
    : { data: [] };

  return NextResponse.json({
    me: {
      email: session.user.email,
      role,
      isOwner: await isOwnerUserAsync(session.user),
    },
    staff: data ?? [],
  });
}

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "staff"]).optional(),
  displayName: z.string().max(120).optional(),
  active: z.boolean().optional(),
  sendInvite: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if ("error" in session) return session.error;
  if (!(await isOwnerUserAsync(session.user))) {
    return NextResponse.json(
      { error: "Only owners can manage staff" },
      { status: 403 }
    );
  }

  let parsed: z.infer<typeof schema>;
  try {
    parsed = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  const db = getServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const email = parsed.email.toLowerCase();
  const portal = getPortalUrl();

  if (parsed.sendInvite !== false) {
    const { error: inviteErr } = await db.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${portal}/auth/callback`,
      data: { full_name: parsed.displayName || undefined },
    });
    if (inviteErr && !/already|registered|exists/i.test(inviteErr.message)) {
      console.warn("[staff invite]", inviteErr.message);
    }
  }

  const { data, error } = await db
    .from("portal_staff")
    .upsert(
      {
        email,
        role: parsed.role || "staff",
        display_name: parsed.displayName || null,
        active: parsed.active !== false,
        invited_by: session.user.id,
      },
      { onConflict: "email" }
    )
    .select("*")
    .single();

  if (error) {
    console.error("[staff]", error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }

  logAuditEvent({
    actor: session.user,
    action: "staff.upsert",
    targetType: "portal_staff",
    targetId: data.id as string,
    metadata: { email, role: parsed.role || "staff" },
  });

  void notifyUser({
    email,
    subject: "Alpha Portal admin access",
    title: "Staff invite",
    html: `<p>You've been granted <strong>${escapeHtml(parsed.role || "staff")}</strong> access to the Alpha Portal admin.</p>
      <p><a href="${portal}/login?role=admin" style="display:inline-block;padding:10px 18px;background:#38a3ff;color:#05080f;border-radius:8px;text-decoration:none;font-weight:600;">Open admin login</a></p>`,
  });

  return NextResponse.json({ ok: true, staff: data });
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionUser();
  if ("error" in session) return session.error;
  if (!(await isOwnerUserAsync(session.user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const db = getServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  await db.from("portal_staff").delete().eq("id", id);

  logAuditEvent({
    actor: session.user,
    action: "staff.delete",
    targetType: "portal_staff",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
