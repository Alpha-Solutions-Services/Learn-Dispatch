import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPasswordForEmail } from "@/lib/auth/verify-password-for-email";
import { sendStudentWelcomeEmail } from "@/lib/academy/emails";
import { planAmountDisplay, type EnrollmentPlan } from "@/lib/academy/pricing";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  plan: z.enum(["monthly", "lifetime"]),
});

export async function POST(req: NextRequest) {
  const admin = getServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  try {
    const body = schema.parse(await req.json());
    const normalizedEmail = body.email.trim().toLowerCase();
    const { data: dup } = await admin.rpc("check_freight_email_registered", {
      candidate: normalizedEmail,
    });

    const studentProfile = {
      email: normalizedEmail,
      full_name: body.name.trim(),
      role: "student" as const,
      enrollment_status: "pending" as const,
      enrollment_plan: body.plan,
      enrolled_at: new Date().toISOString(),
    };

    let userId: string;

    if (dup) {
      const verified = await verifyPasswordForEmail(normalizedEmail, body.password);
      if (!verified.valid) {
        return NextResponse.json({ error: verified.error }, { status: verified.status });
      }
      userId = verified.userId;

      const { data: existingProf } = await admin
        .from("profiles")
        .select("role, enrollment_status")
        .eq("id", userId)
        .maybeSingle();

      const r = existingProf?.role;
      if (r === "carrier" || r === "driver" || r === "dispatcher") {
        return NextResponse.json(
          {
            error:
              "This email is used for another Alpha Freight role. Use a different email for academy enrollment.",
          },
          { status: 409 },
        );
      }
      if (r === "student" && existingProf?.enrollment_status === "paid") {
        return NextResponse.json(
          { error: "You already have active access. Sign in instead." },
          { status: 409 },
        );
      }

      const { error: profErr } = existingProf
        ? await admin.from("profiles").update(studentProfile).eq("id", userId)
        : await admin.from("profiles").insert({ id: userId, ...studentProfile });

      if (profErr) {
        console.error("[complete-enrollment] profile", profErr);
        return NextResponse.json({ error: "Profile setup failed" }, { status: 500 });
      }

      await admin.auth.admin
        .updateUserById(userId, {
          user_metadata: { role: "student", full_name: body.name.trim() },
        })
        .catch(() => {});
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password: body.password,
        email_confirm: true,
        user_metadata: { role: "student", full_name: body.name.trim() },
      });

      if (createErr || !created.user) {
        console.error("[complete-enrollment] createUser", createErr);
        return NextResponse.json({ error: "Unable to finish account signup" }, { status: 500 });
      }

      userId = created.user.id;

      const { error: profErr } = await admin
        .from("profiles")
        .insert({ id: userId, ...studentProfile });

      if (profErr) {
        await admin.auth.admin.deleteUser(userId);
        return NextResponse.json({ error: "Profile setup failed" }, { status: 500 });
      }
    }

    const plan = body.plan as EnrollmentPlan;
    await sendStudentWelcomeEmail(
      normalizedEmail,
      body.name.trim(),
      `${planAmountDisplay(plan)} (pending verification)`,
    );

    return NextResponse.json({ success: true, userId, pendingPayment: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    console.error("[complete-enrollment]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
