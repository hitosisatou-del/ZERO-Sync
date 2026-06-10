import { NextRequest, NextResponse } from 'next/server';
import { DBService } from '@/lib/services/db';
import { encrypt } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shortLivedToken = searchParams.get('token');

  const redirectError = (msg: string) => {
    return NextResponse.redirect(
      new URL(`/settings/accounts?error=${encodeURIComponent(msg)}`, request.url)
    );
  };

  if (!shortLivedToken) {
    return redirectError('No access token provided. Use: ?token=YOUR_TOKEN');
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return redirectError('Meta API credentials are not configured in environment variables.');
  }

  try {
    console.log('Starting manual token exchange process...');

    // 1. 短期ユーザーアクセストークンを長期ユーザーアクセストークン（有効期限約60日）に交換
    const longLivedTokenResponse = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
    );

    const longLivedTokenData = await longLivedTokenResponse.json();

    if (!longLivedTokenResponse.ok || longLivedTokenData.error) {
      console.error('Manual Meta Long Lived Token Exchange Error:', longLivedTokenData.error);
      return redirectError(longLivedTokenData.error?.message || 'Failed to exchange token.');
    }

    const longLivedToken = longLivedTokenData.access_token;

    // 2. 管理しているFacebookページの一覧を取得
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}`
    );

    const pagesData = await pagesResponse.json();

    if (!pagesResponse.ok || pagesData.error) {
      console.error('Manual Meta Get Pages Error:', pagesData.error);
      return redirectError(pagesData.error?.message || 'Failed to retrieve Facebook pages.');
    }

    const pages = pagesData.data || [];
    if (pages.length === 0) {
      return redirectError('No Facebook pages found for this user account in manual mode.');
    }

    // 都城ドライビングスクールのページ、または最初に見つかったページをターゲットとする
    let targetPage = pages.find((p: any) => p.name.includes('都城ドライビングスクール'));
    if (!targetPage) {
      targetPage = pages[0];
    }

    const pageId = targetPage.id;
    const pageName = targetPage.name;
    const pageAccessToken = targetPage.access_token; // 無期限のページアクセストークン

    // 3. Facebookページに関連付けられているInstagramビジネスアカウントIDを取得
    const instagramResponse = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
    );

    const instagramData = await instagramResponse.json();

    let instagramAccountId = null;
    if (instagramResponse.ok && instagramData.instagram_business_account) {
      instagramAccountId = instagramData.instagram_business_account.id;
    }

    // 4. Facebookページ連携情報の保存
    const encryptedPageToken = encrypt(pageAccessToken);
    await DBService.saveConnectedAccount({
      platform: 'facebook',
      account_name: `${pageName} (ページID: ${pageId})`,
      external_account_id: pageId,
      access_token: encryptedPageToken,
      refresh_token: null,
      token_expires_at: null,
    });

    // 5. Instagramビジネスアカウント連携情報の保存 (紐づいている場合のみ)
    if (instagramAccountId) {
      await DBService.saveConnectedAccount({
        platform: 'instagram',
        account_name: `${pageName}連携 Instagramビジネスアカウント`,
        external_account_id: instagramAccountId,
        access_token: encryptedPageToken,
        refresh_token: null,
        token_expires_at: null,
      });
    }

    console.log('Manual connection completed successfully for:', pageName);

    // 連携成功。アカウント設定画面に戻る
    return NextResponse.redirect(
      new URL('/settings/accounts?success=true', request.url)
    );
  } catch (err: any) {
    console.error('Manual Meta Connection Unexpected Error:', err);
    return redirectError(err.message || 'An unexpected error occurred during manual connection.');
  }
}
