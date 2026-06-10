import { decrypt } from '../crypto';
import { PublishResult } from './facebook';

/**
 * Instagram Businessアカウントへフィード投稿を公開します (画像1枚＋キャプション)
 */
export async function publishToInstagram(
  accessTokenEncrypted: string,
  instagramAccountId: string,
  caption: string,
  imageUrl: string,
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

  if (!imageUrl) {
    return {
      status: 'failed',
      error_message: 'Instagramへの投稿には画像が必須です。',
    };
  }

  if (isDummyToken || isDummyConfig) {
    // モック投稿の実行 (80%の確率で成功)
    await new Promise((resolve) => setTimeout(resolve, 2000)); // 配信シミュレーション (Instagramはコンテナ作成もあるので少し長め)
    const success = Math.random() < 0.85;

    if (success) {
      return {
        status: 'success',
        external_post_id: `ig_media_${Math.floor(Math.random() * 100000000)}`,
      };
    } else {
      return {
        status: 'failed',
        error_message: 'Instagram API Error (Code: 368): The action has been blocked because the image URL was unreachable or format is not supported (JPEG/PNG only).',
      };
    }
  }

  // 3. 本物リクエストの実行
  try {
    let publicImageUrl = imageUrl;
    if (imageUrl && imageUrl.startsWith('data:') && postId && host) {
      const protocol = host.includes('localhost') ? 'http' : 'https';
      publicImageUrl = `${protocol}://${host}/api/posts/${postId}/image`;
    }

    // 1. Create Media Container
    const containerUrl = `https://graph.facebook.com/v20.0/${instagramAccountId}/media`;
    const containerRes = await fetch(containerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        image_url: publicImageUrl,
        caption: caption,
        access_token: decryptedToken,
      }).toString(),
    });

    const containerData = await containerRes.json();
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

