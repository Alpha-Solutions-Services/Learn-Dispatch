import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createFeeChallan } from "@/lib/academy/challan";
import { sendStudentWelcomeEmail } from "@/lib/academy/emails";
import { planAmountDisplay, type EnrollmentPlan } from "@/lib/academy/pricing";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  plan: z.enum(["monthly", "lifetime"]),
  whatsapp: z.string().min(10).max(20),
});

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const admin = getServiceRoleClient();
  if (!url || !anon || !admin) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  try {
    const body = schema.parse(await req.json());
    const normalizedEmail = body.email.trim().toLowerCase();

    if ((user.email ?? "").toLowerCase() !== normalizedEmail) {
      return NextResponse.json(
        { error: "Signed-in email must match enrollment email." },
        { status: 422 },
      );
    }

    const { data: existing } = await admin
      .from("profiles")
      .select("enrollment_status")
      .eq("id", user.id)
      .maybeSingle();

    if (existing?.enrollment_status === "paid") {
      return NextResponse.json({ error: "Enrollment already active" }, { status: 409 });
    }

    const { error: upErr } = await admin.from("profiles").upsert(
      {
        id: user.id,
        email: normalizedEmail,
        full_name: body.name.trim(),
        role: "student",
        enrollment_status: "pending",
        enrollment_plan: body.plan,
        enrolled_at: new Date().toISOString(),
        payment_method: "naya_pay",
        whatsapp_phone: body.whatsapp.trim(),
      },
      { onConflict: "id" },
    );

    if (upErr) {
      return NextResponse.json({ error: "Profile setup failed" }, { status: 500 });
    }

    await admin.auth.admin
      .updateUserById(user.id, {
        user_metadata: { role: "student", full_name: body.name.trim() },
      })
      .catch(() => {});

    const plan = body.plan as EnrollmentPlan;
    const challan = await createFeeChallan({
      studentId: user.id,
      plan,
      studentName: body.name.trim(),
      studentEmail: normalizedEmail,
      whatsappPhone: body.whatsapp.trim(),
    });

    await sendStudentWelcomeEmail(
      normalizedEmail,
      body.name.trim(),
      `${planAmountDisplay(plan)} (pending verification)`,
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      userId: user.id,
      pendingPayment: true,
      challanNo: challan?.challan_no ?? null,
      challanId: challan?.id ?? null,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    console.error("[complete-enrollment-existing]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
