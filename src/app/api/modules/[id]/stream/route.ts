import { NextRequest, NextResponse } from "next/server";
import { getStudentPaidAccess, isPaidAccessActive } from "@/lib/academy/access";
import { getPublishedModuleById } from "@/lib/academy/academy-db";
import { getR2ObjectStream, isR2Configured } from "@/lib/academy/r2";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> | { id: string } };

async function resolveId(params: Ctx["params"]) {
  return typeof (params as Promise<{ id: string }>).then === "function"
    ? await (params as Promise<{ id: string }>)
    : (params as { id: string });
}

/**
 * Same-origin video proxy — browser never talks to R2 directly (no CORS needed).
 * Supports HTTP Range for seeking.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { id: moduleId } = await resolveId(ctx.params);

  const sb = await createClient();
  if (!sb) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const access = await getStudentPaidAccess(user.id);
  if (!isPaidAccessActive(access)) {
    return NextResponse.json({ error: "Active paid enrollment required" }, { status: 403 });
  }

  if (!isR2Configured()) {
    return NextResponse.json({ error: "Video storage not configured" }, { status: 503 });
  }

  const mod = await getPublishedModuleById(moduleId, { includeVideo: true });
  if (!mod?.video_url) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  try {
    const range = req.headers.get("range");
    const obj = await getR2ObjectStream(mod.video_url, range);
    if (!obj?.body) {
      return NextResponse.json(
        {
          error: "Video file missing in R2",
          hint: "Check video_url key matches the object (module-1.mp4 or Lectures/module-1.mp4)",
        },
        { status: 404 },
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", obj.contentType);
    headers.set("Accept-Ranges", obj.acceptRanges);
    headers.set("Cache-Control", "private, no-store");
    headers.set("Content-Disposition", 'inline; filename="lesson.bin"');
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cross-Origin-Resource-Policy", "same-origin");
    // Discourage hotlinking / casual download tools
    const referer = req.headers.get("referer") || "";
    const origin = req.headers.get("origin") || "";
    const host = req.nextUrl.origin;
    const okRef =
      !referer ||
      referer.startsWith(host) ||
      referer.includes("learndispatch.alphasolutions.software");
    const okOrigin = !origin || origin === host || origin.includes("learndispatch.alphasolutions.software");
    if (!okRef || !okOrigin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (obj.contentLength != null) headers.set("Content-Length", String(obj.contentLength));
    if (obj.contentRange) headers.set("Content-Range", obj.contentRange);

    return new NextResponse(obj.body, { status: obj.status, headers });
  } catch (e) {
    console.error("[modules/stream]", e);
    return NextResponse.json({ error: "Stream failed" }, { status: 500 });
  }
}
