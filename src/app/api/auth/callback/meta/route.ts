import { NextRequest, NextResponse } from 'next/server';
import { DBService } from '@/lib/services/db';
import { encrypt } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const redirectError = (msg: string) => {
    return NextResponse.redirect(
      new URL(`/settings/accounts?error=${encodeURIComponent(msg)}`, request.url)
    );
  };

  if (error || errorDescription) {
    return redirectError(errorDescription || error || 'Meta OAuth login was cancelled or failed.');
  }

  if (!code) {
    return redirectError('No authorization code provided from Meta OAuth.');
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
    return redirectError('Meta API credentials are not configured in environment variables.');
  }

  try {
    // 1. 認可コードから短期ユーザーアクセストークンを取得
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&client_secret=${appSecret}&code=${code}`
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Meta Token Exchange Error:', tokenData.error);
      return redirectError(tokenData.error?.message || 'Failed to exchange authorization code for access token.');
    }

    const shortLivedToken = tokenData.access_token;

    // 2. 短期ユーザーアクセストークンを長期ユーザーアクセストークン（有効期限約60日）に交換
    const longLivedTokenResponse = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
    );

    const longLivedTokenData = await longLivedTokenResponse.json();

    if (!longLivedTokenResponse.ok || longLivedTokenData.error) {
      console.error('Meta Long Lived Token Exchange Error:', longLivedTokenData.error);
      return redirectError(longLivedTokenData.error?.message || 'Failed to exchange short-lived token for long-lived token.');
    }

    const longLivedToken = longLivedTokenData.access_token;

    // 3. 管理しているFacebookページの一覧（とそれぞれの無期限ページアクセストークン）を取得
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}`
    );

    const pagesData = await pagesResponse.json();

    if (!pagesResponse.ok || pagesData.error) {
      console.error('Meta Get Pages Error:', pagesData.error);
      return redirectError(pagesData.error?.message || 'Failed to retrieve Facebook pages managed by the user.');
    }

    const pages = pagesData.data || [];
    console.log('Meta Managed Pages Response:', JSON.stringify(pagesData, null, 2));
    
    if (pages.length === 0) {
      return redirectError('No Facebook pages found for this user account. You must manage at least one Facebook page.');
    }

    // 都城ドライビングスクールのページ、または最初に見つかったページをターゲットとする
    let targetPage = pages.find((p: any) => p.name.includes('都城ドライビングスクール'));
    if (!targetPage) {
      // 見つからない場合は最初のページ
      targetPage = pages[0];
    }

    const pageId = targetPage.id;
    const pageName = targetPage.name;
    const pageAccessToken = targetPage.access_token; // 無期限のページアクセストークン

    // 4. Facebookページに関連付けられているInstagramビジネスアカウントIDを取得
    const instagramResponse = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
    );

    const instagramData = await instagramResponse.json();

    let instagramAccountId = null;
    if (instagramResponse.ok && instagramData.instagram_business_account) {
      instagramAccountId = instagramData.instagram_business_account.id;
    }

    // 5. Facebookページ連携情報の保存
    const encryptedPageToken = encrypt(pageAccessToken);
    await DBService.saveConnectedAccount({
      platform: 'facebook',
      account_name: `${pageName} (ページID: ${pageId})`,
      external_account_id: pageId,
      access_token: encryptedPageToken,
      refresh_token: null,
      token_expires_at: null, // Facebookページアクセストークンは原則無期限
    });

    // 6. Instagramビジネスアカウント連携情報の保存 (紐づいている場合のみ)
    if (instagramAccountId) {
      // Instagramの投稿にはFacebookページアクセストークンまたはユーザーアクセストークンが使われますが、
      // ページアクセストークンでInstagram APIも操作可能です。
      await DBService.saveConnectedAccount({
        platform: 'instagram',
        account_name: `${pageName}連携 Instagramビジネスアカウント`,
        external_account_id: instagramAccountId,
        access_token: encryptedPageToken, // Instagram操作用の同一暗号化トークン
        refresh_token: null,
        token_expires_at: null,
      });
    }

    // 連携成功。アカウント設定画面に戻る
    return NextResponse.redirect(
      new URL('/settings/accounts?success=true', request.url)
    );
  } catch (err: any) {
    console.error('Meta OAuth Callback Unexpected Error:', err);
    return redirectError(err.message || 'An unexpected error occurred during the Meta OAuth flow.');
  }
}
