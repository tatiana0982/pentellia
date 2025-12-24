import admin from "firebase-admin";
import { ENV } from "./env";

if (!admin.apps.length) {
admin.initializeApp({
  credential: admin.credential.cert({
    "clientEmail": ENV.FIREBASE_CLIENT_EMAIL,
    "privateKey": ENV.FIREBASE_PRIVATE_KEY,
    "projectId": ENV.FIREBASE_PROJECT_ID?.replace(/\\n/g, "\n"),
  }),
});
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();