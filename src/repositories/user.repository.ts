import { User } from "@/models/user.model";
import { BaseRepository } from "./base.repository";

export class UserRepository extends BaseRepository<User> {
    constructor() {
        super("users");
    }

 

    async findByUid(uid: string): Promise<User | null> {
        const snapshot = await this.collectionRef.where("uid", "==", uid).limit(1).get();
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { ...doc.data() } as User;
    }

    
} 