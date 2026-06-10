import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, isFirebaseConfigured } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    const cookieStore = await cookies();

    // 1. Firebaseが未設定（モックモード）の場合
    if (!isFirebaseConfigured() || !adminAuth) {
      // 擬似的なログイン完了として、ダミーセッションクッキーをセット
      cookieStore.set('sb-dummy-session', 'true', {
        path: '/',
        httpOnly: false, // クライアントからも見えるように
        maxAge: 3600 * 24 * 5, // 5日間
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      return NextResponse.json({ success: true, isMock: true });
    }

    if (!idToken) {
      return NextResponse.json({ error: 'IDトークンがありません。' }, { status: 400 });
    }

    // 2. 本物のIDトークンをSession Cookieに変換
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5日分（ミリ秒）
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    // httpOnly クッキーとして保存
    cookieStore.set('session', sessionCookie, {
      name: 'session',
      value: sessionCookie,
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Session Cookie creation failed:', error);
    return NextResponse.json({ error: error.message || '認証セッションの構築に失敗しました。' }, { status: 500 });
  }
}
