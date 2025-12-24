import { adminDb } from "@/config/firebaseAdmin";
import { ApiError } from "@/utils/ApiError";
import { Timestamp } from "firebase-admin/firestore";

import { v4 as uuidv4 } from 'uuid';

export class BaseRepository<T> {
  protected collectionRef;

  constructor(collectionName: string) {
    this.collectionRef = adminDb.collection(collectionName);
  }

  async create(data: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T> {
    const createdAt = Timestamp.now();
    const updatedAt = Timestamp.now();

    const docId = uuidv4();

    await this.collectionRef.doc(docId).set({ ...data, createdAt, updatedAt, id: docId });
    return {
      id: docId,
      ...data,
      createdAt,
      updatedAt,
    } as T;
  }

  async update(id: string, data: Partial<Omit<T, "id" | "createdAt" | "updatedAt">>): Promise<T> {
    const updatedAt = Timestamp.now();
    const prevDoc = await this.collectionRef.doc(id).get();

    if (!prevDoc.exists) {
      throw new ApiError(404, "Failed to update: Document not found");
    }

    await this.collectionRef.doc(id).update({ ...data, updatedAt });
    const updatedDoc = { id, ...prevDoc.data(), ...data, updatedAt } as T;
    return updatedDoc;
  }

  async findAll(): Promise<T[]> {
    const snapshot = await this.collectionRef.get();
    return snapshot.docs.map((doc) => ({
      ...(doc.data() as T),
    }));
  }

  async findById(id: string): Promise<T | null> {
    const doc = await this.collectionRef.doc(id).get();
    if (!doc.exists) return null;
    return { ...(doc.data() as T) };
  }

  async delete(id: string): Promise<boolean> {
    await this.collectionRef.doc(id).delete();
    return true;
  }
}
