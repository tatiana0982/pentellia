// src/services/domain.service.ts
import { Domain } from "@/models/domain.model";
import { DomainRepository } from "@/repositories/domain.repository";
import { ApiError } from "@/utils/ApiError";
import crypto from "crypto";
import { DnsService } from "./dns.service";

export class DomainService {
  private domainRepo = new DomainRepository();
  private dnsService  = new DnsService();

  async generateVerificationToken(): Promise<string> {
    return crypto.randomBytes(16).toString("hex");
  }

  normalizeDomain(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");
  }

  async getDomainsForUser(userId: string): Promise<Domain[]> {
    return this.domainRepo.findByUserId(userId);
  }

  async getSingleDomainForUser(userId: string, domainId: string): Promise<Domain | null> {
    const domain = await this.domainRepo.findByUserAndDomainId(userId, domainId);
    if (!domain) throw new ApiError(400, "Domain does not exist for this user");
    return domain;
  }

  async verifyDomain(userId: string, domainId: string): Promise<void> {
    const domain = await this.domainRepo.findByUserAndDomainId(userId, domainId);
    if (!domain) throw new ApiError(404, "Domain not found");

    // Before verifying, confirm no other account has verified this domain in the meantime
    const otherOwner = await this.domainRepo.findVerifiedDomainByName(domain.name, userId);
    if (otherOwner) {
      throw new ApiError(
        409,
        "This domain has already been verified by another account and cannot be claimed. Contact support if you believe this is incorrect.",
      );
    }

    const token = domain.verificationToken;
    const name  = domain.name;

    // ── Method 1: DNS TXT record ──────────────────────────────────────────
    const dnsPassed = await this.dnsService
      .verifyTxt(domain.verificationHost, token)
      .catch(() => false);

    if (dnsPassed) {
      await this.domainRepo.markVerified(domainId);
      return;
    }

    // ── Method 2: HTTP verification file ─────────────────────────────────
    let filePassed = false;
    try {
      const res = await fetch(
        `https://${name}/.well-known/pentellia-verification.txt`,
        { signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "Pentellia-Verifier/1.0" } },
      );
      if (res.ok) {
        const text = (await res.text()).trim();
        filePassed = text === token || text.includes(token);
      }
    } catch { filePassed = false; }

    if (filePassed) {
      await this.domainRepo.markVerified(domainId);
      return;
    }

    // ── Method 3: HTML meta tag ───────────────────────────────────────────
    let metaPassed = false;
    try {
      const res = await fetch(`https://${name}`, {
        signal: AbortSignal.timeout(10_000),
        headers: { "User-Agent": "Pentellia-Verifier/1.0" },
      });
      if (res.ok) {
        const html = await res.text();
        metaPassed =
          html.includes(`name="pentellia-verification"`) &&
          html.includes(`content="${token}"`);
      }
    } catch { metaPassed = false; }

    if (metaPassed) {
      await this.domainRepo.markVerified(domainId);
      return;
    }

    throw new ApiError(
      400,
      "Verification failed. DNS TXT record, verification file, and meta tag were all checked.",
    );
  }

  async createDomain(name: string, userId: string): Promise<Domain> {
    const domain = this.normalizeDomain(name);

    // Check if this user already added the domain
    const existing = await this.domainRepo.findByUserAndDomainName(userId, domain);
    if (existing) throw new ApiError(400, "You have already added this domain to your account.");

    // Check if another account has already VERIFIED this domain
    const otherOwner = await this.domainRepo.findVerifiedDomainByName(domain, userId);
    if (otherOwner) {
      throw new ApiError(
        409,
        "This domain is already verified by another account. A domain can only be active under one account at a time. If you believe this is an error, contact support.",
      );
    }

    return this.domainRepo.create({
      name:              domain,
      userUid:           userId,
      verificationToken: await this.generateVerificationToken(),
      verificationHost:  `_pentellia.${domain}`,
    });
  }
}