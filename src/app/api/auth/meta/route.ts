import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;

  if (!appId || !redirectUri) {
    return NextResponse.json(
      { error: 'Meta OAuth credentials are not configured.' },
      { status: 500 }
    );
  }

  // 必要な権限スコープの定義
  const scopes = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'instagram_basic',
    'instagram_content_publish',
    'business_management' // ビジネスポートフォリオ管理下のページを取得するために必須
  ].join(',');

  // Facebook OAuth認可URLを組み立て
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&auth_type=rerequest`;

  return NextResponse.redirect(authUrl);
}
