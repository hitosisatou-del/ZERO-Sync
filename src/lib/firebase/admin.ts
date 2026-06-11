import * as admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

// 本物の接続情報があるか判定
export const isFirebaseConfigured = () => {
  return (
    !!projectId &&
    !!clientEmail &&
    !!privateKey &&
    !projectId.includes('dummy') &&
    !projectId.includes('YOUR_NEW')
  );
};

const getAdminApp = () => {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  if (!isFirebaseConfigured()) {
    // 未設定の場合は初期化しない (API側でモックモードへフォールバックされるため、ここでは警告のみ)
    console.warn('Firebase Admin SDK: Credentials not fully configured. Running in mock fallback mode.');
    return null;
  }

  try {
    const formattedPrivateKey = privateKey!.replace(/\\n/g, '\n');
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
    });
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
    return null;
  }
};

const app = getAdminApp();

export const adminAuth = app ? admin.auth(app) : null;
export const adminDb = app ? admin.firestore(app) : null;
if (adminDb) {
  try {
    adminDb.settings({ ignoreUndefinedProperties: true });
  } catch (e) {
    // Settings already initialized
  }
}
export default app;
