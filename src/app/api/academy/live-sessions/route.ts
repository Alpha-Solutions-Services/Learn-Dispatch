import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAcademyStaff } from "@/lib/academy/staff-auth";
import { getStudentPaidAccess, isPaidAccessActive } from "@/lib/academy/access";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().max(1000).optional(),
  startsAt: z.string().min(5),
  durationMinutes: z.number().int().min(15).max(240).optional().default(60),
  joinUrl: z.string().url().optional(),
  provider: z.enum(["jitsi", "meet", "zoom", "other"]).optional().default("jitsi"),
});

function jitsiRoom(title: string) {
  const slug = title
    .replace(/[^a-zA-Z0-9]+/g, "")
    .slice(0, 24) || "Class";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `https://meet.jit.si/AFNLearnDispatch${slug}${suffix}`;
}

export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };
  if (!user?.id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const staff = await requireAcademyStaff(user);
  if (!staff.ok) {
    const access = await getStudentPaidAccess(user.id);
    if (!isPaidAccessActive(access)) {
      return NextResponse.json({ error: "Paid access required" }, { status: 403 });
    }
  }

  const admin = getServiceRoleClient();
  if (!admin) return NextResponse.json({ sessions: [] });

  const { data, error } = await admin
    .from("academy_live_sessions")
    .select(
      "id,title,description,starts_at,ends_at,duration_minutes,join_url,provider,is_published,created_at",
    )
    .eq("is_published", true)
    .order("starts_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[live-sessions GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };
  const auth = await requireAcademyStaff(user);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const admin = getServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Misconfigured" }, { status: 500 });

  try {
    const body = createSchema.parse(await req.json());
    const starts = new Date(body.startsAt);
    const duration = body.durationMinutes ?? 60;
    const ends = new Date(starts.getTime() + duration * 60_000);
    const joinUrl = body.joinUrl || jitsiRoom(body.title);

    const { data, error } = await admin
      .from("academy_live_sessions")
      .insert({
        title: body.title.trim(),
        description: body.description?.trim() || null,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        duration_minutes: duration,
        join_url: joinUrl,
        provider: body.provider ?? "jitsi",
        is_published: true,
        created_by: auth.user.id,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[live-sessions POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, session: data });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };
  const auth = await requireAcademyStaff(user);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const admin = getServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Misconfigured" }, { status: 500 });

  const { error } = await admin.from("academy_live_sessions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
