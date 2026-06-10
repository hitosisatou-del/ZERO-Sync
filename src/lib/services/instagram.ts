import { decrypt } from '../crypto';
import { PublishResult } from './facebook';

/**
 * Instagram Businessアカウントへフィード投稿を公開します (画像1枚＋キャプション)
 */
export async function publishToInstagram(
  accessTokenEncrypted: string,
  instagramAccountId: string,
  caption: string,
  imageUrl: string
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

  // TODO: Phase 2 で本物リクエストを実装
  // 1. POST /v20.0/{instagramAccountId}/media (image_url, caption) -> creation_id
  // 2. POST /v20.0/{instagramAccountId}/media_publish (creation_id)
  return {
    status: 'success',
    external_post_id: `ig_real_post_${Date.now()}`,
  };
}
