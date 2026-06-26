import { cookies } from 'next/headers';
import { adminAuth, isFirebaseConfigured } from '@/lib/firebase/admin';

export interface AuthUser {
  uid: string;
  email: string | null;
  role: 'admin' | 'editor';
}

/**
   * 現在ログインしているユーザーの情報をセッションクッキーから取得します
   */
export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  const dummySession = cookieStore.get('sb-dummy-session')?.value;

  if (!session && !dummySession) {
    return null;
  }

  // 1. モック環境（Firebase未設定）またはダミーセッションの場合
  if (!isFirebaseConfigured() || !adminAuth || dummySession) {
    const dummyEmail = cookieStore.get('dummy-email')?.value || 'hitosi.satou@gmail.com';
    const { DBService } = await import('./services/db');
    const role = await DBService.getUserRole(dummyEmail);
    
    return {
      uid: 'dummy-uid',
      email: dummyEmail,
      role,
    };
  }

  // 2. 本番環境（Firebase）の場合
  try {
    const decodedIdToken = await adminAuth.verifySessionCookie(session!);
    const email = decodedIdToken.email || null;
    
    const { DBService } = await import('./services/db');
    const role = await DBService.getUserRole(email || '');

    return {
      uid: decodedIdToken.uid,
      email,
      role,
    };
  } catch (error) {
    console.error('Failed to verify session cookie:', error);
    return null;
  }
}
