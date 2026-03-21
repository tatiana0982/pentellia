// src/repositories/domain.repository.ts
import { query } from "@/config/db";
import { Domain } from "@/models/domain.model";

// Map a raw Postgres row (snake_case) → Domain (camelCase)
function mapRow(row: any): Domain {
  return {
    id: row.id,
    userUid: row.user_uid,
    name: row.name,
    verificationToken: row.verification_token,
    verificationHost: row.verification_host,
    isVerified: row.is_verified,
    verifiedAt: row.verified_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class DomainRepository {
  // ── Create ───────────────────────────────────────────────────
  async create(data: {
    userUid: string;
    name: string;
    verificationToken: string;
    verificationHost: string;
  }): Promise<Domain> {
    const res = await query(
      `INSERT INTO domains (user_uid, name, verification_token, verification_host)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.userUid, data.name, data.verificationToken, data.verificationHost],
    );
    return mapRow(res.rows[0]);
  }

  // ── Find all domains for a user ──────────────────────────────
  async findByUserId(userId: string): Promise<Domain[]> {
    const res = await query(
      `SELECT * FROM domains WHERE user_uid = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return res.rows.map(mapRow);
  }

  // ── Find by user + domain id ─────────────────────────────────
  async findByUserAndDomainId(
    userId: string,
    domainId: string,
  ): Promise<Domain | null> {
    const res = await query(
      `SELECT * FROM domains WHERE user_uid = $1 AND id = $2 LIMIT 1`,
      [userId, domainId],
    );
    if (res.rows.length === 0) return null;
    return mapRow(res.rows[0]);
  }

  // ── Find by user + domain name ───────────────────────────────
  async findByUserAndDomainName(
    userId: string,
    domainName: string,
  ): Promise<Domain | null> {
    const res = await query(
      `SELECT * FROM domains WHERE user_uid = $1 AND name = $2 LIMIT 1`,
      [userId, domainName],
    );
    if (res.rows.length === 0) return null;
    return mapRow(res.rows[0]);
  }

  // ── Mark domain as verified ──────────────────────────────────
  async markVerified(domainId: string): Promise<void> {
    await query(
      `UPDATE domains
       SET is_verified = TRUE, verified_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [domainId],
    );
  }

  // ── Check if user has at least one verified domain ───────────
  async hasVerifiedDomain(userId: string): Promise<boolean> {
    const res = await query(
      `SELECT 1 FROM domains WHERE user_uid = $1 AND is_verified = TRUE LIMIT 1`,
      [userId],
    );
    return (res.rowCount ?? 0) > 0;
  }
}