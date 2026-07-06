import { decrypt } from '../crypto';

export interface PublishResult {
  status: 'success' | 'failed';
  external_post_id?: string;
  error_message?: string;
}

/**
 * X (旧Twitter) へ投稿を公開します
 */
export async function publishToTwitter(
  accessTokenEncrypted: string,
  message: string,
  imageUrl: string | null
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
    process.env.TWITTER_CLIENT_ID?.includes('dummy') || 
    !process.env.TWITTER_CLIENT_ID;

  if (isDummyToken || isDummyConfig) {
    // モック投稿の実行 (85%の確率で成功)
    await new Promise((resolve) => setTimeout(resolve, 1200)); // 配信シミュレーション
    const success = Math.random() < 0.85;

    if (success) {
      return {
        status: 'success',
        external_post_id: `x_tweet_${Math.floor(Math.random() * 1000000000000)}`,
      };
    } else {
      return {
        status: 'failed',
        error_message: 'X API Error (Code: 453): You cannot send messages to this user. Or daily tweet limit has been exceeded.',
      };
    }
  }

  // 3. 本物のX API (v2) リクエストの実行
  try {
    const url = 'https://api.twitter.com/2/tweets';
    
    // 注意: X API v2の画像付き投稿には、v1.1のメディアアップロードAPIで事前にmedia_idを取得する必要があります。
    // ここでは、本番環境で画像アップロードが試みられた場合の処理フローを構築します。
    let mediaIds: string[] = [];
    
    if (imageUrl) {
      try {
        // 画像がBase64の場合はバイナリに変換してアップロード
        let imageBuffer: Buffer | null = null;
        let mimeType = 'image/jpeg';
        
        if (imageUrl.startsWith('data:')) {
          const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            mimeType = matches[1];
            imageBuffer = Buffer.from(matches[2], 'base64');
          }
        } else {
          // URLの場合はフェッチして取得
          const imgRes = await fetch(imageUrl);
          if (imgRes.ok) {
            imageBuffer = Buffer.from(await imgRes.arrayBuffer());
            mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
          }
        }

        if (imageBuffer) {
          // X v1.1 Media Upload API (OAuth 2.0 User Context でも一部対応、またはOAuth 1.0a経由)
          // 簡易実装としてXのメディアアップロードエンドポイントへPOST
          const formData = new FormData();
          const blob = new Blob([new Uint8Array(imageBuffer)], { type: mimeType });
          formData.append('media', blob);

          const mediaResponse = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${decryptedToken}`,
            },
            body: formData,
          });

          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json();
            if (mediaData.media_id_string) {
              mediaIds.push(mediaData.media_id_string);
            }
          } else {
            console.warn('X Media upload failed, posting text-only instead. Status:', mediaResponse.status);
          }
        }
      } catch (mediaErr) {
        console.error('X Media processing error:', mediaErr);
        // 画像アップロードに失敗しても、テキストのみで投稿を継続するポリシーとします
      }
    }

    const payload: Record<string, any> = {
      text: message,
    };

    if (mediaIds.length > 0) {
      payload.media = {
        media_ids: mediaIds,
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${decryptedToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || data.errors) {
      console.error('X API Error:', data);
      return {
        status: 'failed',
        error_message: data.detail || data.errors?.[0]?.message || 'X API v2 Error',
      };
    }

    return {
      status: 'success',
      external_post_id: data.data?.id,
    };
  } catch (error: any) {
    console.error('X publish error:', error);
    return {
      status: 'failed',
      error_message: error.message || 'X API connection failed.',
    };
  }
}

/**
 * X (旧Twitter) から投稿（ツイート）を削除します
 */
export async function deleteFromTwitter(
  accessTokenEncrypted: string,
  externalTweetId: string
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
    process.env.TWITTER_CLIENT_ID?.includes('dummy') || 
    !process.env.TWITTER_CLIENT_ID;

  if (isDummyToken || isDummyConfig) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { status: 'success' };
  }

  try {
    const url = `https://api.twitter.com/2/tweets/${externalTweetId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${decryptedToken}`,
      },
    });

    const data = await response.json();
    if (!response.ok || data.errors) {
      console.error('X Delete Error:', data);
      return {
        status: 'failed',
        error_message: data.detail || data.errors?.[0]?.message || 'X API v2 Delete Error',
      };
    }

    return { status: 'success' };
  } catch (error: any) {
    console.error('X delete error:', error);
    return {
      status: 'failed',
      error_message: error.message || 'X API connection failed.',
    };
  }
}
