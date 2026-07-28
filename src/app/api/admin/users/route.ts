import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isOwnerUserAsync, isPortalStaff } from "@/lib/admin-auth";
import { notifyUser, escapeHtml } from "@/lib/email/notify";
import { logAuditEvent } from "@/lib/portal/audit";
import { getSessionUser } from "@/lib/portal/require-session";
import { getPortalUrl } from "@/lib/supabase/env";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

async function requireOwner() {
  const session = await getSessionUser();
  if ("error" in session) return { error: session.error };
  if (!(await isPortalStaff(session.user))) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  if (!(await isOwnerUserAsync(session.user))) {
    return {
      error: NextResponse.json(
        { error: "Only owners can manage users" },
        { status: 403 }
      ),
    };
  }
  return { session };
}

async function listAllAuthUsers(db: NonNullable<ReturnType<typeof getServiceRoleClient>>) {
  const users: Array<{
    id: string;
    email: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
    banned_until: string | null;
    full_name: string | null;
    providers: string[];
  }> = [];

  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const batch = data?.users ?? [];
    for (const u of batch) {
      users.push({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        banned_until: (u as { banned_until?: string | null }).banned_until ?? null,
        full_name:
          (u.user_metadata?.full_name as string | undefined) ||
          (u.user_metadata?.name as string | undefined) ||
          null,
        providers: (u.app_metadata?.providers as string[]) || [],
      });
    }
    if (batch.length < perPage) break;
    page += 1;
    if (page > 20) break;
  }
  return users;
}

export async function GET() {
  const auth = await requireOwner();
  if ("error" in auth) return auth.error;

  const db = getServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  try {
    const [users, staffRes] = await Promise.all([
      listAllAuthUsers(db),
      db.from("portal_staff").select("*").order("created_at", { ascending: false }),
    ]);

    const staffByEmail = new Map(
      (staffRes.data ?? []).map((s) => [
        String(s.email).toLowerCase(),
        s as {
          id: string;
          email: string;
          role: string;
          active: boolean;
          display_name: string | null;
        },
      ])
    );

    const enriched = users.map((u) => {
      const staff = u.email
        ? staffByEmail.get(u.email.toLowerCase())
        : undefined;
      return {
        ...u,
        staff_role: staff?.role ?? null,
        staff_active: staff?.active ?? null,
        staff_row_id: staff?.id ?? null,
      };
    });

    return NextResponse.json({
      users: enriched,
      staff: staffRes.data ?? [],
      me: { email: auth.session.user.email, isOwner: true },
    });
  } catch (e) {
    console.error("[admin/users GET]", e);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}

const createSchema = z.object({
  email: z.string().email(),
  fullName: z.string().max(120).optional(),
  password: z.string().min(8).max(72).optional(),
  /** invite = magic link email; create = set password immediately */
  mode: z.enum(["invite", "create"]).optional(),
  makeStaff: z.boolean().optional(),
  staffRole: z.enum(["owner", "staff"]).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireOwner();
  if ("error" in auth) return auth.error;

  let parsed: z.infer<typeof createSchema>;
  try {
    parsed = createSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const db = getServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const portal = getPortalUrl();
  const mode = parsed.mode || (parsed.password ? "create" : "invite");
  const email = parsed.email.toLowerCase();

  try {
    if (mode === "invite") {
      const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${portal}/auth/callback`,
        data: { full_name: parsed.fullName || undefined },
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (parsed.makeStaff) {
        await db.from("portal_staff").upsert(
          {
            email,
            role: parsed.staffRole || "staff",
            display_name: parsed.fullName || null,
            active: true,
            invited_by: auth.session.user.id,
          },
          { onConflict: "email" }
        );
      }

      logAuditEvent({
        actor: auth.session.user,
        action: "user.invite",
        targetType: "auth_user",
        targetId: data.user?.id ?? email,
        metadata: { email, makeStaff: parsed.makeStaff, staffRole: parsed.staffRole },
      });

      void notifyUser({
        email,
        subject: "You're invited to Alpha Portal",
        title: "Portal invite",
        html: `<p>You've been invited to the Alpha Solutions portal.</p>
          <p>Check your email for the invite link from Supabase Auth, or sign in at
          <a href="${portal}/login" style="color:#38a3ff;">${escapeHtml(portal)}/login</a>.</p>`,
      });

      return NextResponse.json({ ok: true, user: data.user, mode: "invite" });
    }

    if (!parsed.password) {
      return NextResponse.json(
        { error: "Password required when creating a user" },
        { status: 400 }
      );
    }

    const { data, error } = await db.auth.admin.createUser({
      email,
      password: parsed.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.fullName || undefined },
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (parsed.makeStaff) {
      await db.from("portal_staff").upsert(
        {
          email,
          role: parsed.staffRole || "staff",
          display_name: parsed.fullName || null,
          active: true,
          invited_by: auth.session.user.id,
        },
        { onConflict: "email" }
      );
    }

    logAuditEvent({
      actor: auth.session.user,
      action: "user.create",
      targetType: "auth_user",
      targetId: data.user?.id ?? email,
      metadata: { email, makeStaff: parsed.makeStaff },
    });

    void notifyUser({
      email,
      subject: "Your Alpha Portal account",
      title: "Account created",
      html: `<p>An account was created for you on Alpha Portal.</p>
        <p><a href="${portal}/login" style="display:inline-block;padding:10px 18px;background:#38a3ff;color:#05080f;border-radius:8px;text-decoration:none;font-weight:600;">Sign in</a></p>
        <p style="color:#6a8caf;font-size:13px;">Use the password provided by your administrator.</p>`,
    });

    return NextResponse.json({ ok: true, user: data.user, mode: "create" });
  } catch (e) {
    console.error("[admin/users POST]", e);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}

const patchSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email().optional(),
  fullName: z.string().max(120).optional().nullable(),
  password: z.string().min(8).max(72).optional(),
  ban: z.boolean().optional(),
  makeStaff: z.boolean().optional(),
  staffRole: z.enum(["owner", "staff"]).optional(),
  staffActive: z.boolean().optional(),
  removeStaff: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireOwner();
  if ("error" in auth) return auth.error;

  let parsed: z.infer<typeof patchSchema>;
  try {
    parsed = patchSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const db = getServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  if (parsed.userId === auth.session.user.id && parsed.ban) {
    return NextResponse.json(
      { error: "You cannot ban your own account" },
      { status: 400 }
    );
  }

  const updates: {
    email?: string;
    password?: string;
    ban_duration?: string;
    user_metadata?: Record<string, unknown>;
  } = {};

  if (parsed.email) updates.email = parsed.email.toLowerCase();
  if (parsed.password) updates.password = parsed.password;
  if (parsed.ban === true) updates.ban_duration = "876000h"; // ~100 years
  if (parsed.ban === false) updates.ban_duration = "none";
  if (parsed.fullName !== undefined) {
    updates.user_metadata = { full_name: parsed.fullName || null };
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await db.auth.admin.updateUserById(parsed.userId, updates);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  const { data: userData } = await db.auth.admin.getUserById(parsed.userId);
  const email = (parsed.email || userData.user?.email || "").toLowerCase();

  if (parsed.removeStaff && email) {
    await db.from("portal_staff").delete().ilike("email", email);
  } else if ((parsed.makeStaff || parsed.staffRole || parsed.staffActive !== undefined) && email) {
    await db.from("portal_staff").upsert(
      {
        email,
        role: parsed.staffRole || "staff",
        display_name: parsed.fullName ?? userData.user?.user_metadata?.full_name ?? null,
        active: parsed.staffActive !== false,
        invited_by: auth.session.user.id,
      },
      { onConflict: "email" }
    );
  }

  logAuditEvent({
    actor: auth.session.user,
    action: "user.update",
    targetType: "auth_user",
    targetId: parsed.userId,
    metadata: {
      email,
      ban: parsed.ban,
      makeStaff: parsed.makeStaff,
      staffRole: parsed.staffRole,
      removeStaff: parsed.removeStaff,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireOwner();
  if ("error" in auth) return auth.error;

  const userId = req.nextUrl.searchParams.get("id");
  if (!userId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  if (userId === auth.session.user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  const db = getServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const { data: existing, error: lookupError } =
    await db.auth.admin.getUserById(userId);
  if (lookupError || !existing.user) {
    return NextResponse.json(
      { error: lookupError?.message || "User not found" },
      { status: 404 }
    );
  }
  const email = existing.user.email?.toLowerCase();

  // Clear rows that historically blocked auth.users deletes (NO ACTION FKs).
  // profiles.id → auth.users is the common blocker on this shared project.
  await db.from("dispatch_load_approvals").update({ reviewed_by: null }).eq("reviewed_by", userId);
  await db.from("dispatch_load_approvals").update({ requested_by: null }).eq("requested_by", userId);
  const { error: profileError } = await db.from("profiles").delete().eq("id", userId);
  if (profileError) {
    console.error("[admin/users DELETE] profiles", profileError);
    return NextResponse.json(
      {
        error: `Cannot remove profile data before delete: ${profileError.message}`,
      },
      { status: 400 }
    );
  }

  if (email) {
    await db.from("portal_staff").delete().ilike("email", email);
  }
  await db.from("ai_rate_limits").delete().eq("user_id", userId);

  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[admin/users DELETE]", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Delete failed — related records may still reference this user",
      },
      { status: 400 }
    );
  }

  logAuditEvent({
    actor: auth.session.user,
    action: "user.delete",
    targetType: "auth_user",
    targetId: userId,
    metadata: { email },
  });

  return NextResponse.json({ ok: true });
}
