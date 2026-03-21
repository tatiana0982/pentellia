// src/app/api/subscription/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/config/db";
import { getUid } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp     = new URL(req.url).searchParams;
  const page   = Math.max(1, parseInt(sp.get("page")  || "1"));
  const limit  = Math.min(50, Math.max(1, parseInt(sp.get("limit") || "10")));
  const offset = (page - 1) * limit;

  try {
    const [walletRes, txRes, countRes] = await Promise.all([
      query(
        `SELECT
           COALESCE(balance,      0) AS balance,
           COALESCE(total_spent,  0) AS total_spent,
           COALESCE(total_bought, 0) AS total_bought
         FROM user_credits WHERE user_uid = $1`,
        [uid],
      ),
      query(
        `SELECT id, type, amount, balance_after, description, ref_type, ref_id, created_at
         FROM credit_transactions
         WHERE user_uid = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [uid, limit, offset],
      ),
      query(
        `SELECT COUNT(*) FROM credit_transactions WHERE user_uid = $1`,
        [uid],
      ),
    ]);

    const wallet = walletRes.rows[0] ?? {};
    const total  = parseInt(countRes.rows[0].count);

    return NextResponse.json({
      success:      true,
      balance:      parseFloat(wallet.balance      || "0"),
      totalSpent:   parseFloat(wallet.total_spent   || "0"),
      totalBought:  parseFloat(wallet.total_bought  || "0"),
      transactions: txRes.rows,
      pagination:   { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}