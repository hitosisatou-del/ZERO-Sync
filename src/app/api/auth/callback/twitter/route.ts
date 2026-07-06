import { NextRequest, NextResponse } from 'next/server';
import { DBService } from '@/lib/services/db';
import { encrypt } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const redirectError = (msg: string) => {
    return NextResponse.redirect(
      new URL(`/settings/accounts?error=${encodeURIComponent(msg)}`, request.url)
    );
  };

  if (error) {
    return redirectError(error || 'X OAuth login was cancelled or failed.');
  }

  if (!code) {
    return redirectError('No authorization code provided from X OAuth.');
  }

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  
  const host = request.headers.get('host') || 'zero-sync-delta.vercel.app';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/auth/callback/twitter`;

  if (!clientId || !clientSecret) {
    return redirectError('X API credentials are not configured in environment variables.');
  }

  try {
    // 1. 認可コードをアクセストークンおよびリフレッシュトークンと交換
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: 'twitter_oauth_verifier_key_string_for_zero_sync_exactly_64_chars_long',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('X Token Exchange Error:', tokenData);
      return redirectError(tokenData.error_description || tokenData.error || 'Failed to exchange authorization code for X access token.');
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null;

    // 2. アクセストークンを使ってXユーザー情報を取得
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const userData = await userResponse.json();
    if (!userResponse.ok || !userData.data) {
      console.error('X Get User Error:', userData);
      return redirectError('Failed to retrieve X user profile information.');
    }

    const xName = userData.data.name || 'X アカウント';
    const xUsername = userData.data.username || 'x_user';
    const externalAccountId = userData.data.id;

    // 3. アカウント連携情報を暗号化して保存
    const encryptedAccessToken = encrypt(access_token);
    const encryptedRefreshToken = refresh_token ? encrypt(refresh_token) : null;

    await DBService.saveConnectedAccount({
      platform: 'twitter',
      account_name: `${xName} (@${xUsername})`,
      external_account_id: externalAccountId,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_expires_at: expiresAt,
    });

    // 連携成功。アカウント設定画面に戻る
    return NextResponse.redirect(
      new URL('/settings/accounts?success=true', request.url)
    );
  } catch (err: any) {
    console.error('X OAuth Callback Unexpected Error:', err);
    return redirectError(err.message || 'An unexpected error occurred during the X OAuth flow.');
  }
}
