import { CreateUserInput, User } from "@/models/user.model";
import { UserRepository } from "../repositories/user.repository";
import { ApiError } from "@/utils/ApiError";


export class UserService {

    private userRepo = new UserRepository();

    async createUser(data: CreateUserInput): Promise<User> {

        const user = await this.userRepo.findByUid(data.uid);
        if (user) {
            return user;
        }

        return await this.userRepo.create({
            ...data,
        });
    }

    async getUsers(): Promise<User[]> {
        return await this.userRepo.findAll();
    }

    async getUserByUid(uid: string): Promise<User | null> {
        const user = await this.userRepo.findByUid(uid);

        if (!user) {
            throw new ApiError(404, "User not found")
        }
        return user;
    }

}
