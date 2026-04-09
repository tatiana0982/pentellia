// src/app/api/subscription/plans/route.ts
import { NextResponse } from "next/server";
import { getActivePlans, getActiveSubscription, getUsageSummary } from "@/lib/subscription";
import { getUid } from "@/lib/auth";

export async function GET() {
  const uid = await getUid();

  try {
    const plans = await getActivePlans();

    let currentSubscription = null;
    let usageSummary        = null;

    if (uid) {
      const sub = await getActiveSubscription(uid);
      if (sub) {
        const summary = await getUsageSummary(uid);
        usageSummary  = summary;

        const daysLeft = Math.max(
          0,
          Math.ceil(
            (new Date(sub.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          ),
        );

        currentSubscription = {
          planId:    sub.plan_id,
          planName:  sub.plan.name,
          status:    sub.status,
          expiresAt: sub.expires_at,
          daysLeft,              // ← was missing, caused "undefined days remaining"
        };
      }
    }

    return NextResponse.json({
      success:             true,
      plans,
      currentSubscription,
      usageSummary,
    });
  } catch (err: any) {
    console.error("[Plans]", err?.message);
    return NextResponse.json({ error: "Failed to load plans" }, { status: 500 });
  }
}