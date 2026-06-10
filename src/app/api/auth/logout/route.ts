import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();

    // セッションクッキーの破棄
    cookieStore.delete('session');
    cookieStore.delete('sb-dummy-session');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Logout error in API:', error);
    return NextResponse.json({ error: 'ログアウト処理中にエラーが発生しました。' }, { status: 500 });
  }
}

// GETでもログアウト可能にしておく (利便性のため)
export async function GET() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  cookieStore.delete('sb-dummy-session');

  // ログイン画面へリダイレクト
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
}
