// src/app/api/subscription/plans/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { adminAuth } from "@/config/firebaseAdmin";
import { cookies } from "next/headers";

async function getUid() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) return null;
  try {
    const d = await adminAuth.verifySessionCookie(session, true);
    return d.uid;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const uid = await getUid();

  try {
    // Fetch active plans
    const plansRes = await query(
      `SELECT * FROM plans WHERE is_active = TRUE ORDER BY sort_order ASC`,
    );

    // Optionally include user wallet balance if logged in
    let balance = null;
    let totalSpent = null;
    if (uid) {
      const walletRes = await query(
        `SELECT balance, total_bought, total_spent FROM user_credits WHERE user_uid = $1`,
        [uid],
      );
      if (walletRes.rows.length > 0) {
        balance = parseFloat(walletRes.rows[0].balance);
        totalSpent = parseFloat(walletRes.rows[0].total_spent);
      }
    }

    return NextResponse.json({
      success: true,
      plans: plansRes.rows,
      wallet: uid ? { balance, totalSpent } : null,
    });
  } catch (err) {
    console.error("[Plans] Error:", err);
    return NextResponse.json({ error: "Failed to load plans" }, { status: 500 });
  }
}