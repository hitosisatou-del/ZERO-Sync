import { decrypt, encrypt } from '../crypto';
import { PublishResult } from './facebook';
import { DBService } from './db';

// Googleアクセストークンの自動更新処理
async function getFreshGoogleAccessToken(account: any): Promise<string> {
  const decryptedAccessToken = decrypt(account.access_token);
  
  // トークンの期限が5分以内に切れるか確認
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  const now = Date.now();
  
  if (expiresAt > now + 5 * 60 * 1000) {
    return decryptedAccessToken;
  }
  
  // 期限切れの場合、リフレッシュトークンを使用して更新
  if (!account.refresh_token) {
    throw new Error('Googleアクセストークンが期限切れで、リフレッシュトークンがありません。アカウントを再連携してください。');
  }
  
  const decryptedRefreshToken = decrypt(account.refresh_token);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Google連携用のクライアントIDまたはクライアントシークレットが設定されていません。');
  }
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decryptedRefreshToken,
      grant_type: 'refresh_token',
    }),
  });
  
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(`Googleアクセストークンの更新に失敗しました: ${data.error_description || data.error}`);
  }
  
  const newAccessToken = data.access_token;
  const newExpiresIn = data.expires_in;
  const newExpiresAt = newExpiresIn ? new Date(Date.now() + newExpiresIn * 1000).toISOString() : null;
  
  // 新しいアクセストークンをデータベースに保存
  await DBService.saveConnectedAccount({
    platform: 'google_business_profile',
    account_name: account.account_name,
    external_account_id: account.external_account_id,
    access_token: encrypt(newAccessToken),
    refresh_token: account.refresh_token, // リフレッシュトークンはそのまま保持
    token_expires_at: newExpiresAt,
  });
  
  return newAccessToken;
}

/**
 * Googleビジネスプロフィールへ最新情報（Local Post）を公開します
 */
export async function publishToGoogleBusiness(
  accessTokenEncrypted: string,
  locationId: string,
  summary: string,
  linkUrl: string | null,
  imageUrl: string | null,
  postId?: string,
  host?: string
): Promise<PublishResult> {
  // 1. 実APIとモックの分岐（ダミー環境チェック）
  const isDummyConfig = 
    process.env.GOOGLE_CLIENT_ID?.includes('dummy') || 
    !process.env.GOOGLE_CLIENT_ID;
  const isDummyToken = accessTokenEncrypted === 'encrypted_dummy_token' || accessTokenEncrypted.includes('dummy');

  if (isDummyToken || isDummyConfig) {
    // モック投稿の実行 (80%の確率で成功)
    await new Promise((resolve) => setTimeout(resolve, 1200)); // 配信シミュレーション
    const success = Math.random() < 0.85;

    if (success) {
      return {
        status: 'success',
        external_post_id: `g_post_${Math.floor(Math.random() * 100000000)}`,
      };
    } else {
      return {
        status: 'failed',
        error_message: 'Google My Business API Error: 403 Forbidden. The authenticated user does not have permission to manage the specified location or account is not verified.',
      };
    }
  }

  // 2. 本物リクエストの実行
  try {
    const accounts = await DBService.getConnectedAccounts();
    const account = accounts.find((a) => a.platform === 'google_business_profile');
    if (!account) {
      return {
        status: 'failed',
        error_message: 'Googleビジネスプロフィールの連携アカウント情報が見つかりません。',
      };
    }
    const accessToken = await getFreshGoogleAccessToken(account);

    let publicImageUrl = imageUrl;
    if (imageUrl && imageUrl.startsWith('data:') && postId && host) {
      const protocol = host.includes('localhost') ? 'http' : 'https';
      publicImageUrl = `${protocol}://${host}/api/posts/${postId}/image`;
    }

    // 1. 店舗(Location)の親アカウントIDを特定する
    const accountsResponse = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const accountsData = await accountsResponse.json();
    if (!accountsResponse.ok || accountsData.error) {
      console.error('Google Get Accounts Error:', accountsData.error);
      return {
        status: 'failed',
        error_message: accountsData.error?.message || 'Failed to retrieve Google Business accounts.',
      };
    }

    const userAccounts = accountsData.accounts || [];
    let parentAccountName = null;

    for (const acc of userAccounts) {
      const locationsResponse = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const locationsData = await locationsResponse.json();
      if (locationsResponse.ok && locationsData.locations) {
        if (locationsData.locations.some((loc: any) => loc.name === locationId)) {
          parentAccountName = acc.name; // 'accounts/XXXX'
          break;
        }
      }
    }

    if (!parentAccountName) {
      if (userAccounts.length > 0) {
        parentAccountName = userAccounts[0].name;
      } else {
        return {
          status: 'failed',
          error_message: '連携しているGoogleビジネスアカウントが見つかりません。',
        };
      }
    }

    // 2. ローカル投稿の作成
    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const postUrl = apiKey
      ? `https://mybusiness.googleapis.com/v4/${parentAccountName}/${locationId}/localPosts?key=${apiKey}`
      : `https://mybusiness.googleapis.com/v4/${parentAccountName}/${locationId}/localPosts`;
    
    const postBody: Record<string, any> = {
      languageCode: 'ja-JP',
      summary: summary,
      topicType: 'STANDARD',
    };

    if (linkUrl) {
      postBody.callToAction = {
        actionType: 'LEARN_MORE',
        url: linkUrl,
      };
    }

    if (publicImageUrl) {
      postBody.media = [
        {
          sourceUrl: publicImageUrl,
          mediaFormat: 'PHOTO',
        }
      ];
    }

    const postResponse = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(postBody),
    });

    const postData = await postResponse.json();
    if (!postResponse.ok || postData.error) {
      console.error('Google Local Post Creation Error:', postData.error);
      return {
        status: 'failed',
        error_message: postData.error?.message || 'Failed to create Google local post.',
      };
    }

    return {
      status: 'success',
      external_post_id: postData.name, // e.g. 'accounts/123/locations/456/localPosts/789'
    };
  } catch (error: any) {
    console.error('Google publish error:', error);
    return {
      status: 'failed',
      error_message: error.message || 'Google API connection failed.',
    };
  }
}

/**
 * Googleビジネスプロフィールから投稿を削除します
 */
export async function deleteFromGoogleBusiness(
  accessTokenEncrypted: string,
  externalPostId: string
): Promise<{ status: 'success' | 'failed'; error_message?: string }> {
  const isDummyConfig = 
    process.env.GOOGLE_CLIENT_ID?.includes('dummy') || 
    !process.env.GOOGLE_CLIENT_ID;
  const isDummyToken = accessTokenEncrypted === 'encrypted_dummy_token' || accessTokenEncrypted.includes('dummy');

  if (isDummyToken || isDummyConfig) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { status: 'success' };
  }

  try {
    const accounts = await DBService.getConnectedAccounts();
    const account = accounts.find((a) => a.platform === 'google_business_profile');
    if (!account) {
      return {
        status: 'failed',
        error_message: 'Googleビジネスプロフィールの連携アカウント情報が見つかりません。',
      };
    }
    const accessToken = await getFreshGoogleAccessToken(account);

    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const url = apiKey
      ? `https://mybusiness.googleapis.com/v4/${externalPostId}?key=${apiKey}`
      : `https://mybusiness.googleapis.com/v4/${externalPostId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      console.error('Google Local Post Delete Error:', data.error);
      return {
        status: 'failed',
        error_message: data.error?.message || 'Failed to delete Google local post.',
      };
    }

    return { status: 'success' };
  } catch (error: any) {
    console.error('Google delete error:', error);
    return {
      status: 'failed',
      error_message: error.message || 'Google API connection failed.',
    };
  }
}

