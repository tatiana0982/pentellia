import admin from "firebase-admin";
import { ENV } from "./env";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: ENV.FIREBASE_PROJECT_ID,
      clientEmail: ENV.FIREBASE_CLIENT_EMAIL,
      privateKey: ENV.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim(),
    }),
  });
}


export const adminAuth = admin.auth();

