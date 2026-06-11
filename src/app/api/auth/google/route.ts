import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  
  const host = request.headers.get('host') || 'zero-sync-delta.vercel.app';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/auth/callback/google`;

  if (!clientId) {
    return NextResponse.json(
      { error: 'Google OAuth credentials are not configured.' },
      { status: 500 }
    );
  }

  // Googleビジネスプロフィールの管理に必要な権限スコープ
  const scope = 'https://www.googleapis.com/auth/business.manage';

  // Google OAuth認可URLの構築
  // access_type=offline および prompt=consent で確実にリフレッシュトークンを取得する
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
    `client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&access_type=offline` +
    `&prompt=consent`;

  return NextResponse.redirect(authUrl);
}
