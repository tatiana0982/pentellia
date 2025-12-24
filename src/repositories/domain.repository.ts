import { Domain } from "@/models/domain.model";
import { BaseRepository } from "./base.repository";

export class DomainRepository extends BaseRepository<Domain> {
    constructor() {
        super("domains");
    }

    async findByUserId(userId: string): Promise<Domain[]> {
        const snap = await this.collectionRef
            .where("userId", "==", userId)
            .get();

        return snap.docs.map(d => ({
            ...(d.data() as Domain),
            id: d.id,
        }));
    }

    async findUserAndDomainExists(userId: string, domainName: string): Promise<boolean> {
        const snap = await this.collectionRef
            .where("userId", "==", userId)
            .where("name", "==", domainName)
            .limit(1)
            .get();

        if (snap.empty) return false;

        return true
    }
}   