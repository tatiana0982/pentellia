// src/repositories/domain.repository.ts
// ⚠ This is the PostgreSQL version — replaces the old Firestore BaseRepository version
import { query } from "@/config/db";
import { Domain } from "@/models/domain.model";

function mapRow(row: any): Domain {
  return {
    id:                row.id,
    userUid:           row.user_uid,
    name:              row.name,
    verificationToken: row.verification_token,
    verificationHost:  row.verification_host,
    isVerified:        row.is_verified,
    verifiedAt:        row.verified_at ?? null,
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
  };
}

export class DomainRepository {
  async create(data: {
    userUid: string;
    name: string;
    verificationToken: string;
    verificationHost: string;
  }): Promise<Domain> {
    const res = await query(
      `INSERT INTO domains (user_uid, name, verification_token, verification_host)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.userUid, data.name, data.verificationToken, data.verificationHost],
    );
    return mapRow(res.rows[0]);
  }

  async findByUserId(userId: string): Promise<Domain[]> {
    const res = await query(
      `SELECT * FROM domains WHERE user_uid = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return res.rows.map(mapRow);
  }

  async findByUserAndDomainId(userId: string, domainId: string): Promise<Domain | null> {
    const res = await query(
      `SELECT * FROM domains WHERE user_uid = $1 AND id = $2 LIMIT 1`,
      [userId, domainId],
    );
    return res.rows.length ? mapRow(res.rows[0]) : null;
  }

  async findByUserAndDomainName(userId: string, domainName: string): Promise<Domain | null> {
    const res = await query(
      `SELECT * FROM domains WHERE user_uid = $1 AND name = $2 LIMIT 1`,
      [userId, domainName],
    );
    return res.rows.length ? mapRow(res.rows[0]) : null;
  }

  async markVerified(domainId: string): Promise<void> {
    await query(
      `UPDATE domains SET is_verified = TRUE, verified_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [domainId],
    );
  }

  async hasVerifiedDomain(userId: string): Promise<boolean> {
    const res = await query(
      `SELECT 1 FROM domains WHERE user_uid = $1 AND is_verified = TRUE LIMIT 1`,
      [userId],
    );
    return (res.rowCount ?? 0) > 0;
  }
}