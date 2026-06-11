import { NextRequest, NextResponse } from 'next/server';
import { DBService } from '@/lib/services/db';
import { publishToFacebook } from '@/lib/services/facebook';
import { publishToInstagram } from '@/lib/services/instagram';
import { publishToGoogleBusiness } from '@/lib/services/google-business';

// GET (Vercel Cron) および POST (手動実行) の両方をサポート
export async function GET(request: NextRequest) {
  return processScheduledPosts(request);
}

export async function POST(request: NextRequest) {
  return processScheduledPosts(request);
}

async function processScheduledPosts(request: NextRequest) {
  try {
    const host = request.headers.get('host') || 'zero-sync-delta.vercel.app';
    
    // 1. 全投稿データと結果を取得
    const { posts, results } = await DBService.getPosts();
    const now = new Date();
    
    // 2. 配信予定時刻が現在時刻以前であり、かつ「予約中(scheduled)」のプラットフォーム結果を持つ投稿を特定
    const postsToPublish = posts.filter(post => {
      if (!post.scheduled_at) return false;
      const scheduledTime = new Date(post.scheduled_at);
      if (scheduledTime > now) return false; // 未来の投稿
      
      const postResults = results.filter(r => r.post_id === post.id);
      return postResults.some(r => r.status === 'scheduled');
    });

    if (postsToPublish.length === 0) {
      return NextResponse.json({ success: true, message: '配信処理が必要な予約投稿はありません。', processed: 0 });
    }

    // 3. 連携済みアカウント一覧を取得
    const connectedAccounts = await DBService.getConnectedAccounts();
    const publishReports: Array<{ postId: string; platform: string; status: string; error?: string }> = [];

    // 4. 各投稿に対して配信処理を実行
    for (const post of postsToPublish) {
      const postResults = results.filter(r => r.post_id === post.id);
      const scheduledResults = postResults.filter(r => r.status === 'scheduled');

      for (const res of scheduledResults) {
        const account = connectedAccounts.find((a) => a.platform === res.platform);

        if (!account) {
          const errMsg = 'アカウント連携がされていません。';
          await DBService.updatePostResult(post.id, res.platform, {
            status: 'failed',
            error_message: errMsg,
          });
          publishReports.push({ postId: post.id, platform: res.platform, status: 'failed', error: errMsg });
          continue;
        }

        // 送信中にステータスを更新
        await DBService.updatePostResult(post.id, res.platform, { status: 'pending' });

        try {
          let publishResult;
          if (res.platform === 'instagram') {
            publishResult = await publishToInstagram(
              account.access_token,
              account.external_account_id || '',
              post.instagram_text || post.base_text,
              post.image_url || '',
              post.id,
              host
            );
          } else if (res.platform === 'facebook') {
            publishResult = await publishToFacebook(
              account.access_token,
              account.external_account_id || '',
              post.facebook_text || post.base_text,
              post.link_url,
              post.image_url,
              post.id,
              host
            );
          } else if (res.platform === 'google_business_profile') {
            publishResult = await publishToGoogleBusiness(
              account.access_token,
              account.external_account_id || '',
              post.google_business_text || post.base_text,
              post.link_url,
              post.image_url,
              post.id,
              host
            );
          }

          if (publishResult) {
            await DBService.updatePostResult(post.id, res.platform, publishResult);
            publishReports.push({ 
              postId: post.id, 
              platform: res.platform, 
              status: publishResult.status, 
              error: publishResult.error_message 
            });
          }
        } catch (err: any) {
          console.error(`Error in scheduled publishing to ${res.platform}:`, err);
          const errMsg = err.message || '予期しない配信エラーが発生しました。';
          await DBService.updatePostResult(post.id, res.platform, {
            status: 'failed',
            error_message: errMsg,
          });
          publishReports.push({ postId: post.id, platform: res.platform, status: 'failed', error: errMsg });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${postsToPublish.length}件の予約投稿の配信処理を実行しました。`, 
      processed: postsToPublish.length,
      reports: publishReports 
    });
  } catch (error: any) {
    console.error('Error in cron/publish-scheduled API:', error);
    return NextResponse.json({ error: error.message || 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
