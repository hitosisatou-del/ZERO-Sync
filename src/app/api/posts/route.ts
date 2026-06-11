import { NextRequest, NextResponse } from 'next/server';
import { DBService } from '@/lib/services/db';
import { publishToFacebook } from '@/lib/services/facebook';
import { publishToInstagram } from '@/lib/services/instagram';
import { publishToGoogleBusiness } from '@/lib/services/google-business';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      base_text,
      instagram_text,
      facebook_text,
      google_business_text,
      link_url,
      image_url,
      platforms, // Array<'instagram' | 'facebook' | 'google_business_profile'>
      scheduled_at,
    } = body;

    if (!base_text) {
      return NextResponse.json({ error: '投稿本文は必須です。' }, { status: 400 });
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json({ error: '投稿先プラットフォームを1つ以上選択してください。' }, { status: 400 });
    }

    // 1. DBに投稿データを下書き作成
    const post = await DBService.createPost(
      {
        title,
        base_text,
        instagram_text,
        facebook_text,
        google_business_text,
        link_url,
        image_url,
        scheduled_at,
      },
      platforms
    );

    const isScheduled = scheduled_at && new Date(scheduled_at) > new Date();
    if (isScheduled) {
      return NextResponse.json({ success: true, postId: post.id, scheduled: true });
    }

    const host = request.headers.get('host') || 'zero-sync-delta.vercel.app';

    // 2. 連携済みのアカウント情報を取得
    const connectedAccounts = await DBService.getConnectedAccounts();

    // 3. 各プラットフォームへの配信処理を実行 (MVPでは待ち時間をユーザーに提示するため await して結果を更新する)
    const publishPromises = platforms.map(async (platform) => {
      const account = connectedAccounts.find((a) => a.platform === platform);

      // アカウント連携がない場合はエラー終了
      if (!account) {
        await DBService.updatePostResult(post.id, platform, {
          status: 'failed',
          error_message: 'アカウント連携がされていません。「アカウント連携設定」からアカウントを紐付けてください。',
        });
        return;
      }

      try {
        if (platform === 'instagram') {
          // Instagram投稿
          const result = await publishToInstagram(
            account.access_token,
            account.external_account_id || '',
            instagram_text || base_text,
            image_url || '',
            post.id,
            host
          );
          await DBService.updatePostResult(post.id, 'instagram', result);
        } else if (platform === 'facebook') {
          // Facebook投稿
          const result = await publishToFacebook(
            account.access_token,
            account.external_account_id || '',
            facebook_text || base_text,
            link_url,
            image_url,
            post.id,
            host
          );
          await DBService.updatePostResult(post.id, 'facebook', result);
        } else if (platform === 'google_business_profile') {
          // GBP投稿
          const result = await publishToGoogleBusiness(
            account.access_token,
            account.external_account_id || '',
            google_business_text || base_text,
            link_url,
            image_url,
            post.id,
            host
          );
          await DBService.updatePostResult(post.id, 'google_business_profile', result);
        }
      } catch (err: any) {
        console.error(`Error publishing to ${platform}:`, err);
        await DBService.updatePostResult(post.id, platform, {
          status: 'failed',
          error_message: err.message || '予期しない送信エラーが発生しました。',
        });
      }
    });

    // すべての配信処理の完了を待つ
    await Promise.all(publishPromises);

    return NextResponse.json({ success: true, postId: post.id });
  } catch (error: any) {
    console.error('Error in API /api/posts:', error);
    return NextResponse.json({ error: error.message || 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
