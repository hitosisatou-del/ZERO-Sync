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
    return redirectError(error || 'Google OAuth login was cancelled or failed.');
  }

  if (!code) {
    return redirectError('No authorization code provided from Google OAuth.');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return redirectError('Google API credentials are not configured in environment variables.');
  }

  try {
    // 1. 認可コードをアクセストークンおよびリフレッシュトークンと交換
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Google Token Exchange Error:', tokenData.error);
      return redirectError(tokenData.error_description || tokenData.error || 'Failed to exchange authorization code for access token.');
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null;

    // 2. ビジネスアカウント一覧を取得
    const accountsResponse = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const accountsData = await accountsResponse.json();

    if (!accountsResponse.ok || accountsData.error) {
      console.error('Google Get Accounts Error:', accountsData.error);
      return redirectError(accountsData.error?.message || 'Failed to retrieve Google Business accounts.');
    }

    const accountsList = accountsData.accounts || [];
    if (accountsList.length === 0) {
      return redirectError('No Google Business accounts found. You must create a Google Business Profile.');
    }

    // 3. 各アカウント配下の店舗（Location）一覧を探索
    let targetLocation = null;

    for (const account of accountsList) {
      const locationsResponse = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      const locationsData = await locationsResponse.json();

      if (locationsResponse.ok && locationsData.locations) {
        // 都城ドライビングスクールを検索
        const found = locationsData.locations.find((loc: any) => 
          loc.title.includes('都城ドライビングスクール') || loc.title.includes('都城')
        );
        if (found) {
          targetLocation = found;
          break;
        }
        
        // 最初に見つかった店舗をバックアップとして保持
        if (!targetLocation && locationsData.locations.length > 0) {
          targetLocation = locationsData.locations[0];
        }
      }
    }

    if (!targetLocation) {
      return redirectError('No locations (stores) found under your Google Business accounts.');
    }

    const locationId = targetLocation.name; // 'locations/XXXX'
    const locationTitle = targetLocation.title;

    // 4. アカウント連携情報を保存
    const encryptedAccessToken = encrypt(access_token);
    const encryptedRefreshToken = refresh_token ? encrypt(refresh_token) : null;

    await DBService.saveConnectedAccount({
      platform: 'google_business_profile',
      account_name: `${locationTitle} (${locationId})`,
      external_account_id: locationId,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_expires_at: expiresAt,
    });

    // 連携成功。アカウント設定画面に戻る
    return NextResponse.redirect(
      new URL('/settings/accounts?success=true', request.url)
    );
  } catch (err: any) {
    console.error('Google OAuth Callback Unexpected Error:', err);
    return redirectError(err.message || 'An unexpected error occurred during the Google OAuth flow.');
  }
}
