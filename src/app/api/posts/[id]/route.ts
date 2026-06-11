import { NextRequest, NextResponse } from 'next/server';
import { DBService } from '@/lib/services/db';
import { deleteFromFacebook } from '@/lib/services/facebook';
import { deleteFromGoogleBusiness } from '@/lib/services/google-business';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const postId = resolvedParams.id;

    // 1. 投稿結果の情報を得るために、DBから投稿情報を取得
    const postData = await DBService.getPostById(postId);
    if (!postData) {
      return NextResponse.json({ error: '指定された投稿が見つかりません。' }, { status: 404 });
    }

    const { results } = postData;

    // 2. DBから投稿データを削除 (FirestoreまたはMockDB)
    const dbDeleteResult = await DBService.deletePost(postId);
    if (!dbDeleteResult.success) {
      return NextResponse.json({ error: 'データベースからの削除に失敗しました。' }, { status: 500 });
    }

    // 3. 各SNSプラットフォームでの投稿削除処理を実行 (成功している場合のみ)
    const connectedAccounts = await DBService.getConnectedAccounts();
    const externalDeletions = results.map(async (res) => {
      if (res.status !== 'success' || !res.external_post_id) {
        return { platform: res.platform, status: 'skipped' };
      }

      const account = connectedAccounts.find((a) => a.platform === res.platform);
      if (!account) {
        return { platform: res.platform, status: 'failed', error: '連携アカウントが見つかりません。' };
      }

      try {
        if (res.platform === 'facebook') {
          const delRes = await deleteFromFacebook(account.access_token, res.external_post_id);
          return { platform: 'facebook', status: delRes.status, error: delRes.error_message };
        } else if (res.platform === 'google_business_profile') {
          const delRes = await deleteFromGoogleBusiness(account.access_token, res.external_post_id);
          return { platform: 'google_business_profile', status: delRes.status, error: delRes.error_message };
        } else if (res.platform === 'instagram') {
          // Instagram Graph API は仕様として投稿削除APIを公開していません
          return { platform: 'instagram', status: 'skipped', message: 'Instagram API は仕様として投稿削除をサポートしていません。' };
        }
      } catch (err: any) {
        console.error(`Error deleting post from ${res.platform}:`, err);
        return { platform: res.platform, status: 'failed', error: err.message };
      }

      return { platform: res.platform, status: 'skipped' };
    });

    const deletionReport = await Promise.all(externalDeletions);

    return NextResponse.json({
      success: true,
      message: '投稿データを削除しました。',
      externalDeletions: deletionReport,
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/posts/[id]:', error);
    return NextResponse.json({ error: error.message || 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
