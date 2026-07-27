import { NextRequest, NextResponse } from 'next/server';
import { DBService } from '@/lib/services/db';
import { getFacebookMetrics } from '@/lib/services/facebook';
import { getInstagramMetrics } from '@/lib/services/instagram';
import { getGoogleBusinessPostMetrics } from '@/lib/services/google-business';
import { getTwitterMetrics } from '@/lib/services/twitter';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const postId = resolvedParams.id;

    // 1. 投稿データと結果を取得
    const postData = await DBService.getPostById(postId);
    if (!postData) {
      return NextResponse.json({ error: '指定された投稿が見つかりません。' }, { status: 404 });
    }

    const { results } = postData;
    
    // 2. 連携済みアカウント一覧を取得
    const connectedAccounts = await DBService.getConnectedAccounts();

    const metrics: Record<string, any> = {};

    // 3. 各プラットフォームのメトリクスを並列で取得
    const metricsPromises = results.map(async (res) => {
      if (res.status !== 'success' || !res.external_post_id) {
        return;
      }

      const account = connectedAccounts.find((a) => a.platform === res.platform);
      if (!account) return;

      try {
        if (res.platform === 'twitter') {
          const m = await getTwitterMetrics(account.access_token, res.external_post_id);
          metrics.twitter = m;
        } else if (res.platform === 'instagram') {
          const m = await getInstagramMetrics(account.access_token, res.external_post_id);
          metrics.instagram = m;
        } else if (res.platform === 'facebook') {
          const m = await getFacebookMetrics(account.access_token, res.external_post_id);
          metrics.facebook = m;
        } else if (res.platform === 'google_business_profile') {
          const m = await getGoogleBusinessPostMetrics(account.access_token, res.external_post_id);
          metrics.google_business_profile = m;
          
          // Google側で非同期に拒否（REJECTED）されていた場合は、DBのステータスを failed に同期する
          if (m && m.state === 'REJECTED') {
            await DBService.updatePostResult(postId, 'google_business_profile', {
              status: 'failed',
              error_message: 'Googleビジネスプロフィールにより投稿が拒否（REJECTED）されました。画像またはコンテンツのポリシー違反が原因の可能性があります。',
            });
          }
        }
      } catch (err) {
        console.error(`Error fetching metrics for ${res.platform}:`, err);
      }
    });

    await Promise.all(metricsPromises);

    return NextResponse.json({ success: true, metrics });
  } catch (error: any) {
    console.error('Error in API /api/posts/[id]/metrics:', error);
    return NextResponse.json({ error: error.message || 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
