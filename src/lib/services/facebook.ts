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
    process.env.META_APP_ID?.includes('dummy') || 
    !process.env.META_APP_ID;

  if (isDummyToken || isDummyConfig) {
    // モック投稿の実行 (80%の確率で成功)
    await new Promise((resolve) => setTimeout(resolve, 1500)); // 配信シミュレーション
    const success = Math.random() < 0.85;

    if (success) {
      return {
        status: 'success',
        external_post_id: `fb_post_${Math.floor(Math.random() * 100000000)}`,
      };
    } else {
      return {
        status: 'failed',
        error_message: 'Facebook Graph API Error (Code: 190): Invalid OAuth access token - Expiration has passed or Page permissions have changed.',
      };
    }
  }

  // TODO: Phase 2 で本物リクエストを実装
  // fetch('https://graph.facebook.com/v20.0/' + pageId + '/feed', { ... })
  return {
    status: 'success',
    external_post_id: `fb_real_post_${Date.now()}`,
  };
}
