import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // セッションクッキーの取得 (Firebase session または モック用の dummy-session)
  const session = request.cookies.get('session')?.value;
  const dummySession = request.cookies.get('sb-dummy-session')?.value;

  const isUserLoggedIn = !!session || !!dummySession;

  // 認証が必要なページリスト
  const isAuthRequired = 
    path === '/' || 
    path.startsWith('/dashboard') || 
    path.startsWith('/posts') || 
    path.startsWith('/settings');

  const isLoginPage = path === '/login';

  // 1. 未ログインで保護されたページへアクセスした場合 -> /login へ
  if (!isUserLoggedIn && isAuthRequired) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 2. ログイン済みでログインページへアクセスした場合 -> / (ダッシュボード) へ
  if (isUserLoggedIn && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 以下のパスを除くすべてのリクエストパスにマッチします：
     * - api/auth/ (Firebase認証のAPI)
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化ファイル)
     * - favicon.ico (ファビコン)
     * - 静的ファイル (.*\\.(?:svg|png|jpg|jpeg|gif|webp)$)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
