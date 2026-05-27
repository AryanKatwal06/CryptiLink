import admin from 'firebase-admin';

let adminApp: admin.app.App | undefined;

function getFirebaseAdmin(): admin.app.App {
  if (adminApp) return adminApp;

  const encoded = process.env.FIREBASE_ADMIN_SDK_BASE64;
  if (!encoded) {
    throw new Error('[PaySys] FIREBASE_ADMIN_SDK_BASE64 is required');
  }

  const serviceAccount = JSON.parse(
    Buffer.from(encoded, 'base64').toString('utf-8'),
  );

  adminApp =
    admin.apps.length > 0
      ? admin.apps[0]
      : admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });

  return adminApp;
}

export const firebaseAdmin = getFirebaseAdmin();

export const firebaseAuth = (): admin.auth.Auth => firebaseAdmin.auth();

export const firebaseMessaging = (): admin.messaging.Messaging =>
  firebaseAdmin.messaging();
