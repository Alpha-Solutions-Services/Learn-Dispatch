import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const bodySchema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const admin = getServiceRoleClient();
    if (!admin) {
      return NextResponse.json({ error: "Service role not configured" }, { status: 500 });
    }

    const { data, error } = await admin.rpc("check_freight_email_registered", {
      candidate: parsed.data.email,
    });

    if (error) {
      console.error("[check-student-email]", error);
      return NextResponse.json({ error: "Unable to validate email." }, { status: 500 });
    }

    return NextResponse.json({ exists: Boolean(data) });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
