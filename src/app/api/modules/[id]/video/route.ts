import { NextRequest, NextResponse } from "next/server";
import { getStudentPaidAccess, isPaidAccessActive } from "@/lib/academy/access";
import { getPublishedModuleById } from "@/lib/academy/academy-db";
import { createR2SignedVideoUrl, isR2Configured } from "@/lib/academy/r2";
import { extractYoutubeVideoId } from "@/lib/academy/youtube";
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
 * Returns a short-lived playback payload ONLY for paid students with active paid_until.
 * Never returns the permanent R2 object URL.
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
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

  const mod = await getPublishedModuleById(moduleId, { includeVideo: true });
  if (!mod) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }

  const provider = (mod.video_provider ?? "r2").toLowerCase();
  const rawUrl = mod.video_url?.trim() ?? "";

  if (!rawUrl) {
    return NextResponse.json({
      provider: "none",
      message: "Video for this module is not available yet. Check back soon.",
    });
  }

  if (provider.includes("youtube")) {
    const videoId = extractYoutubeVideoId(rawUrl);
    if (!videoId) {
      return NextResponse.json({
        provider: "none",
        message: "Video link is invalid. Please contact your instructor.",
      });
    }
    return NextResponse.json({
      provider: "youtube",
      videoId,
      expiresIn: null,
    });
  }

  // Default: Cloudflare R2 signed URL
  if (!isR2Configured()) {
    return NextResponse.json({
      provider: "none",
      message:
        "Video storage is not configured yet. Your instructor will enable playback shortly.",
    });
  }

  const signedUrl = await createR2SignedVideoUrl(rawUrl, 600);
  if (!signedUrl) {
    return NextResponse.json({
      provider: "none",
      message: "Could not prepare video playback. Try again in a moment.",
    });
  }

  return NextResponse.json({
    provider: "r2",
    signedUrl,
    expiresIn: 600,
  });
}
