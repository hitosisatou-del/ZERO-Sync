import { decrypt } from '../crypto';

export interface PublishResult {
  status: 'success' | 'failed';
  external_post_id?: string;
  error_message?: string;
}

/**
 * Facebookページへ投稿を公開します
 */
export async function publishToFacebook(
  accessTokenEncrypted: string,
  pageId: string,
  message: string,
  linkUrl: string | null,
  imageUrl: string | null,
  postId?: string,
  host?: string
): Promise<PublishResult> {
  // 1. トークンの復号化
  let decryptedToken = '';
  try {
    decryptedToken = decrypt(accessTokenEncrypted);
  } catch (e) {
    return {
      status: 'failed',
      error_message: 'アクセス権限の復号化に失敗しました。トークンが無効である可能性があります。',
    };
  }

  // 2. 実APIとモックの分岐
  const isDummyToken = decryptedToken === 'encrypted_dummy_token' || decryptedToken.includes('dummy');
  const isDummyConfig = 
    process.env.META_APP_ID?.includes('dummy') || 
    !process.env.META_APP_ID;

  if (isDummyToken || isDummyConfig) {
    // モック投稿の実行 (100%成功)
    await new Promise((resolve) => setTimeout(resolve, 1500)); // 配信シミュレーション
    return {
      status: 'success',
      external_post_id: `fb_post_${Math.floor(Math.random() * 100000000)}`,
    };
  }

  // 3. 本物リクエストの実行
  try {
    let publicImageUrl = imageUrl;
    if (imageUrl && imageUrl.startsWith('data:') && postId && host) {
      const protocol = host.includes('localhost') ? 'http' : 'https';
      publicImageUrl = `${protocol}://${host}/api/posts/${postId}/image`;
    }

    const url = publicImageUrl
      ? `https://graph.facebook.com/v20.0/${pageId}/photos`
      : `https://graph.facebook.com/v20.0/${pageId}/feed`;

    const body: Record<string, string> = {
      access_token: decryptedToken,
    };

    if (publicImageUrl) {
      body.url = publicImageUrl;
      body.caption = message;
    } else {
      body.message = message;
      if (linkUrl) {
        body.link = linkUrl;
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body).toString(),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      console.error('Facebook Graph API Error:', data.error);
      return {
        status: 'failed',
        error_message: data.error?.message || 'Facebook Graph API Error',
      };
    }

    return {
      status: 'success',
      external_post_id: data.id || data.post_id,
    };
  } catch (error: any) {
    console.error('Facebook publish error:', error);
    return {
      status: 'failed',
      error_message: error.message || 'Facebook API connection failed.',
    };
  }
}

/**
 * Facebookページから投稿を削除します
 */
export async function deleteFromFacebook(
  accessTokenEncrypted: string,
  externalPostId: string
): Promise<{ status: 'success' | 'failed'; error_message?: string }> {
  let decryptedToken = '';
  try {
    decryptedToken = decrypt(accessTokenEncrypted);
  } catch (e) {
    return {
      status: 'failed',
      error_message: 'アクセス権限の復号化に失敗しました。',
    };
  }

  const isDummyToken = decryptedToken === 'encrypted_dummy_token' || decryptedToken.includes('dummy');
  const isDummyConfig = 
    process.env.META_APP_ID?.includes('dummy') || 
    !process.env.META_APP_ID;

  if (isDummyToken || isDummyConfig) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { status: 'success' };
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${externalPostId}`;
    const response = await fetch(`${url}?access_token=${decryptedToken}`, {
      method: 'DELETE',
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      console.error('Facebook Delete Error:', data.error);
      return {
        status: 'failed',
        error_message: data.error?.message || 'Facebook Graph API Delete Error',
      };
    }

    return { status: 'success' };
  } catch (error: any) {
    console.error('Facebook delete error:', error);
    return {
      status: 'failed',
      error_message: error.message || 'Facebook API connection failed.',
    };
  }
}

/**
 * Facebook の投稿メトリクス（いいね数・コメント数・シェア数）を取得します
 */
export async function getFacebookMetrics(
  accessTokenEncrypted: string,
  externalPostId: string
): Promise<{ likes: number; comments: number; shares: number }> {
  let decryptedToken = '';
  try {
    decryptedToken = decrypt(accessTokenEncrypted);
  } catch (e) {
    return { likes: 0, comments: 0, shares: 0 };
  }

  const isDummyToken = decryptedToken === 'encrypted_dummy_token' || decryptedToken.includes('dummy');
  const isDummyConfig = 
    process.env.META_APP_ID?.includes('dummy') || 
    !process.env.META_APP_ID;

  if (isDummyToken || isDummyConfig) {
    return {
      likes: Math.floor(Math.random() * 60) + 5,
      comments: Math.floor(Math.random() * 10),
      shares: Math.floor(Math.random() * 5),
    };
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${externalPostId}?fields=reactions.summary(true).limit(0),comments.summary(true).limit(0),shares&access_token=${decryptedToken}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || data.error) {
      console.error('Facebook Metrics Error:', data.error);
      return { likes: 0, comments: 0, shares: 0 };
    }

    return {
      likes: data.reactions?.summary?.total_count || 0,
      comments: data.comments?.summary?.total_count || 0,
      shares: data.shares?.count || 0,
    };
  } catch (err) {
    console.error('Error fetching Facebook metrics:', err);
    return { likes: 0, comments: 0, shares: 0 };
  }
}

