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
        currentSubscription = {
          planId:    sub.plan_id,
          planName:  sub.plan.name,
          status:    sub.status,
          expiresAt: sub.expires_at,
        };
        usageSummary = await getUsageSummary(uid);
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