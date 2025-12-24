import { CreateDomainInput, Domain } from "@/models/domain.model";
import { DomainRepository } from "@/repositories/domain.repository";
import { ApiError } from "@/utils/ApiError";
import crypto from "crypto";

//TODO add userId from verified uidToken not from user input


//TODO add domain verification process
export class DomainService {
    private domainRepo: DomainRepository = new DomainRepository();

    async generateVerificationToken(): Promise<string> {
        return crypto.randomBytes(16).toString("hex");
    }

    async getDomainsForUser(userId: string): Promise<Domain[]> {
        return this.domainRepo.findByUserId(userId);
    }

    normalizeDomain(input: string): string {
        return input
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, "")
            .replace(/^www\./, "")
            .replace(/\/.*$/, "");
    }

    async createDomain(data: CreateDomainInput): Promise<Domain> {

        const domain = this.normalizeDomain(data.name);
        const exists = await this.domainRepo.findUserAndDomainExists(data.userId, domain);

        if (exists) {
            throw new ApiError(400,"Domain already exists for this user");
        }

        return this.domainRepo.create({
            ...data,
            name: domain,
            verificationToken: await this.generateVerificationToken(),
            verified: false,
        });

    }
}
