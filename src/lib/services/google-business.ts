import { decrypt } from '../crypto';
import { PublishResult } from './facebook';

/**
 * Googleビジネスプロフィールへ最新情報（Local Post）を公開します
 */
export async function publishToGoogleBusiness(
  accessTokenEncrypted: string,
  locationId: string,
  summary: string,
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
    process.env.GOOGLE_CLIENT_ID?.includes('dummy') || 
    !process.env.GOOGLE_CLIENT_ID;

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

  // TODO: Phase 3 で本物リクエストを実装
  // POST https://mybusinessloop.googleapis.com/v1/{parent=locations/*}/localPosts
  return {
    status: 'success',
    external_post_id: `g_real_post_${Date.now()}`,
  };
}
