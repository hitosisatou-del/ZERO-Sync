import { decrypt } from '../crypto';
import { PublishResult } from './facebook';

/**
 * Instagram Businessアカウントへフィード投稿を公開します (画像1枚＋キャプション)
 */
export async function publishToInstagram(
  accessTokenEncrypted: string,
  instagramAccountId: string,
  caption: string,
  mediaUrl: string,
  postId?: string,
  host?: string,
  mediaType?: 'image' | 'video' | null
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

  if (!mediaUrl) {
    return {
      status: 'failed',
      error_message: 'Instagramへの投稿には画像が必須です。',
    };
  }

  if (isDummyToken || isDummyConfig) {
    // モック投稿の実行 (100%成功)
    await new Promise((resolve) => setTimeout(resolve, 2000)); // 配信シミュレーション
    return {
      status: 'success',
      external_post_id: `ig_media_${Math.floor(Math.random() * 100000000)}`,
    };
  }

  // 3. 本物リクエストの実行
  try {
    let publicMediaUrl = mediaUrl;
    // Instagram Graph APIはimage_urlを外部からフェッチするため、
    // 確実にアクセス可能なプロキシURLを使用する
    if (postId && host) {
      const protocol = host.includes('localhost') ? 'http' : 'https';
      publicMediaUrl = `${protocol}://${host}/api/posts/${postId}/image`;
    }

    // 1. Create Media Container
    const containerUrl = `https://graph.facebook.com/v20.0/${instagramAccountId}/media`;
    const containerParams: Record<string, string> = {
      ...(mediaType === 'video' ? { video_url: publicMediaUrl, media_type: 'VIDEO' } : { image_url: publicMediaUrl }),
      caption: caption,
      access_token: decryptedToken,
    };

    console.log('[Instagram Debug] Container URL:', containerUrl);
    console.log('[Instagram Debug] image_url / video_url:', publicMediaUrl);
    console.log('[Instagram Debug] mediaType:', mediaType);
    console.log('[Instagram Debug] instagramAccountId:', instagramAccountId);
    console.log('[Instagram Debug] params keys:', Object.keys(containerParams));

    const containerRes = await fetch(containerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(containerParams).toString(),
    });

    const containerData = await containerRes.json();
    console.log('[Instagram Debug] Container Response Status:', containerRes.status);
    console.log('[Instagram Debug] Container Response Data:', JSON.stringify(containerData));

    if (!containerRes.ok || containerData.error) {
      console.error('Instagram Container Creation Error:', containerData.error);
      return {
        status: 'failed',
        error_message: containerData.error?.message || 'Failed to create Instagram media container.',
      };
    }

    const creationId = containerData.id;

    // 2. Wait 3 seconds for Instagram to process the image container
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 3. Publish Media Container
    const publishUrl = `https://graph.facebook.com/v20.0/${instagramAccountId}/media_publish`;
    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        creation_id: creationId,
        access_token: decryptedToken,
      }).toString(),
    });

    const publishData = await publishRes.json();
    if (!publishRes.ok || publishData.error) {
      console.error('Instagram Publish Error:', publishData.error);
      return {
        status: 'failed',
        error_message: publishData.error?.message || 'Failed to publish Instagram media container.',
      };
    }

    return {
      status: 'success',
      external_post_id: publishData.id,
    };
  } catch (error: any) {
    console.error('Instagram publish error:', error);
    return {
      status: 'failed',
      error_message: error.message || 'Instagram API connection failed.',
    };
  }
}

/**
 * Instagram の投稿メトリクス（いいね数・コメント数）を取得します
 */
export async function getInstagramMetrics(
  accessTokenEncrypted: string,
  externalMediaId: string
): Promise<{ likes: number; comments: number }> {
  let decryptedToken = '';
  try {
    decryptedToken = decrypt(accessTokenEncrypted);
  } catch (e) {
    return { likes: 0, comments: 0 };
  }

  const isDummyToken = decryptedToken === 'encrypted_dummy_token' || decryptedToken.includes('dummy');
  const isDummyConfig = 
    process.env.META_APP_ID?.includes('dummy') || 
    !process.env.META_APP_ID;

  if (isDummyToken || isDummyConfig) {
    return {
      likes: Math.floor(Math.random() * 80) + 10,
      comments: Math.floor(Math.random() * 15),
    };
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${externalMediaId}?fields=like_count,comments_count&access_token=${decryptedToken}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || data.error) {
      console.error('Instagram Metrics Error:', data.error);
      return { likes: 0, comments: 0 };
    }

    return {
      likes: data.like_count || 0,
      comments: data.comments_count || 0,
    };
  } catch (err) {
    console.error('Error fetching Instagram metrics:', err);
    return { likes: 0, comments: 0 };
  }
}

