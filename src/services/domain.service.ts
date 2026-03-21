// src/services/domain.service.ts
import { Domain } from "@/models/domain.model";
import { DomainRepository } from "@/repositories/domain.repository";
import { ApiError } from "@/utils/ApiError";
import crypto from "crypto";
import { DnsService } from "./dns.service";

export class DomainService {
  private domainRepo = new DomainRepository();
  private dnsService = new DnsService();

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
    const domainDoc = await this.domainRepo.findByUserAndDomainId(userId, domainId);
    if (!domainDoc) throw new ApiError(400, "Domain does not exist for this user");
    return domainDoc;
  }

  async verifyDomain(userId: string, domainId: string): Promise<void> {
    const domain = await this.domainRepo.findByUserAndDomainId(userId, domainId);
    if (!domain) throw new ApiError(404, "Domain not found");

    const token = domain.verificationToken;
    const name  = domain.name;

    // ── Method 1: DNS TXT record ──────────────────────────────────────
    const dnsPassed = await this.dnsService
      .verifyTxt(domain.verificationHost, token)
      .catch(() => false);

    if (dnsPassed) {
      // markVerified() uses PostgreSQL directly — NOT Firestore BaseRepository.update()
      await this.domainRepo.markVerified(domainId);
      return;
    }

    // ── Method 2: HTTP file ───────────────────────────────────────────
    const fileUrl = `https://${name}/.well-known/pentellia-verification.txt`;
    let filePassed = false;
    try {
      const res = await fetch(fileUrl, {
        signal: AbortSignal.timeout(10_000),
        headers: { "User-Agent": "Pentellia-Verifier/1.0" },
      });
      if (res.ok) {
        const text = (await res.text()).trim();
        filePassed = text === token || text.includes(token);
      }
    } catch {
      filePassed = false;
    }

    if (filePassed) {
      await this.domainRepo.markVerified(domainId);
      return;
    }

    // ── Method 3: HTML meta tag ───────────────────────────────────────
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
    } catch {
      metaPassed = false;
    }

    if (metaPassed) {
      await this.domainRepo.markVerified(domainId);
      return;
    }

    throw new ApiError(
      400,
      "Verification failed. DNS TXT record, verification file, and meta tag were all checked. Please verify your setup and try again.",
    );
  }

  async createDomain(name: string, userId: string): Promise<Domain> {
    const domain = this.normalizeDomain(name);

    const existing = await this.domainRepo.findByUserAndDomainName(userId, domain);
    if (existing) throw new ApiError(400, "Domain already exists for this user");

    return this.domainRepo.create({
      name:              domain,
      userUid:           userId,
      verificationToken: await this.generateVerificationToken(),
      verificationHost:  `_pentellia.${domain}`,
    });
  }
}