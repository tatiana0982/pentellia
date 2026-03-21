// src/services/dns.service.ts
import dns from "dns/promises";

export class DnsService {
  async verifyTxt(verificationHost: string, token: string): Promise<boolean> {
    try {
      const records = await dns.resolveTxt(verificationHost);
      return records.flat().includes(token);
    } catch {
      return false;
    }
  }
}