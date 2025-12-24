import { CreateDomainSchema } from "@/models/domain.model";
import { DomainService } from "@/services/domain.service";
import { apiHandler } from "@/utils/apiHandler";
import { validateInput } from "@/utils/validateInput";

const domainService = new DomainService();

// POST /api/domains - Create domain
export const POST = async (req: Request) =>
    apiHandler(async () => {
        const body = await req.json();
        const data = validateInput(CreateDomainSchema, body);

        const domain = await domainService.createDomain(data);
        return { message: "Domain created", data: domain };
    });