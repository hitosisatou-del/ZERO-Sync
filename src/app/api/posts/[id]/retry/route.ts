import { NextRequest, NextResponse } from 'next/server';
import { DBService } from '@/lib/services/db';
import { publishToFacebook, PublishResult } from '@/lib/services/facebook';
import { publishToInstagram } from '@/lib/services/instagram';
import { publishToGoogleBusiness } from '@/lib/services/google-business';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const postId = resolvedParams.id;
    const body = await request.json();
    const { platform } = body; // 'instagram' | 'facebook' | 'google_business_profile'

    if (!platform) {
      return NextResponse.json({ error: '再投稿対象のプラットフォームが指定されていません。' }, { status: 400 });
    }

    // 1. 投稿データがあるか確認
    const postData = await DBService.getPostById(postId);
    if (!postData) {
      return NextResponse.json({ error: '指定された投稿が見つかりません。' }, { status: 404 });
    }

    const { post } = postData;

    // 2. 連携アカウントの取得
    const connectedAccounts = await DBService.getConnectedAccounts();
    const account = connectedAccounts.find((a) => a.platform === platform);

    if (!account) {
      const errMsg = 'アカウント連携がされていません。「アカウント連携設定」からアカウントを紐付けてください。';
      await DBService.updatePostResult(postId, platform, {
        status: 'failed',
        error_message: errMsg,
      });
      return NextResponse.json({ status: 'failed', error_message: errMsg });
    }

    const host = request.headers.get('host') || 'zero-sync-delta.vercel.app';

    // 一時的に pending に更新
    await DBService.updatePostResult(postId, platform, { status: 'pending' });

    let result: PublishResult = { status: 'failed', error_message: '未サポートのプラットフォームです。' };

    // 3. 再送信の実行
    if (platform === 'instagram') {
      result = await publishToInstagram(
        account.access_token,
        account.external_account_id || '',
        post.instagram_text || post.base_text,
        post.image_url || '',
        postId,
        host
      );
    } else if (platform === 'facebook') {
      result = await publishToFacebook(
        account.access_token,
        account.external_account_id || '',
        post.facebook_text || post.base_text,
        post.link_url,
        post.image_url,
        postId,
        host
      );
    } else if (platform === 'google_business_profile') {
      result = await publishToGoogleBusiness(
        account.access_token,
        account.external_account_id || '',
        post.google_business_text || post.base_text,
        post.link_url,
        post.image_url,
        postId,
        host
      );
    }

    // 4. DB更新
    await DBService.updatePostResult(postId, platform, result);

    return NextResponse.json({
      status: result.status,
      external_post_id: result.external_post_id || null,
      error_message: result.error_message || null,
    });
  } catch (error: any) {
    console.error('Error in API /api/posts/[id]/retry:', error);
    return NextResponse.json({ error: error.message || 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
