import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export const revalidate = 0;

/**
 * 現在ログインしているユーザーのセッション情報（メールアドレス、権限）を取得します
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    return NextResponse.json({
      authenticated: true,
      email: user.email,
      role: user.role,
    });
  } catch (error: any) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json(
      { error: error.message || '認証情報の取得に失敗しました。' },
      { status: 500 }
    );
  }
}
