import React from 'react';
import Link from 'next/link';
import { DBService } from '@/lib/services/db';
import { 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { InstagramIcon, FacebookIcon, GoogleBusinessIcon } from '@/components/Icons';
import CronTrigger from '@/components/CronTrigger';
import PublishNowButton from '@/components/PublishNowButton';

// Next.jsのキャッシュを無効化（動的データフェッチのため）
export const revalidate = 0;

export default async function DashboardPage() {
  const { posts, results } = await DBService.getPosts();

  // プラットフォームごとの結果をグループ化
  const getResultsForPost = (postId: string) => {
    return results.filter((r) => r.post_id === postId);
  };

  // 予約配信予定の投稿（少なくとも1つのプラットフォーム結果が 'scheduled' 状態の投稿）
  const scheduledPosts = posts
    .filter((post) => {
      if (!post.scheduled_at) return false;
      const postResults = getResultsForPost(post.id);
      return postResults.some((r) => r.status === 'scheduled');
    })
    .sort((a, b) => {
      if (!a.scheduled_at) return 1;
      if (!b.scheduled_at) return -1;
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    });

  // 履歴に表示する投稿（予約中以外の投稿）
  const historyPosts = posts.filter((post) => {
    return !scheduledPosts.some((sp) => sp.id === post.id);
  });

  // 残り時間の目安を計算する関数
  const getRemainingTimeInfo = (scheduledAt: string) => {
    const now = new Date();
    const scheduledTime = new Date(scheduledAt);
    const diffMs = scheduledTime.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return {
        text: '配信予定時刻を経過（保留中）',
        isPast: true,
        bg: 'rgba(239, 68, 68, 0.1)',
        color: '#f87171',
        border: '1px solid rgba(239, 68, 68, 0.2)'
      };
    }
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    let text = '配信まであと ';
    if (days > 0) {
      text += `${days}日 ${hours}時間`;
    } else if (hours > 0) {
      text += `${hours}時間 ${minutes}分`;
    } else {
      text += `${minutes}分`;
    }
    
    return {
      text,
      isPast: false,
      bg: 'rgba(99, 102, 241, 0.1)',
      color: '#818cf8',
      border: '1px solid rgba(99, 102, 241, 0.2)'
    };
  };

  // メトリクスの計算
  const totalPosts = posts.length;
  let successCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  let scheduledCount = 0;

  results.forEach((r) => {
    if (r.status === 'success') successCount++;
    else if (r.status === 'failed') failedCount++;
    else if (r.status === 'pending') pendingCount++;
    else if (r.status === 'scheduled') scheduledCount++;
  });

  // プラットフォームアイコンの取得
  const getPlatformIcon = (platform: string, size = 16) => {
    switch (platform) {
      case 'instagram':
        return <InstagramIcon size={size} />;
      case 'facebook':
        return <FacebookIcon size={size} />;
      case 'google_business_profile':
        return <GoogleBusinessIcon size={size} />;
      default:
        return null;
    }
  };

  // プラットフォーム表示名の取得
  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return 'Instagram';
      case 'facebook':
        return 'Facebook';
      case 'google_business_profile':
        return 'Googleビジネス';
      default:
        return platform;
    }
  };

  // ステータスバッジのスタイル取得
  const getStatusBadge = (status: 'success' | 'failed' | 'pending' | 'scheduled') => {
    switch (status) {
      case 'success':
        return (
          <span className="badge badge-success">
            <CheckCircle2 size={12} />
            <span>成功</span>
          </span>
        );
      case 'failed':
        return (
          <span className="badge badge-failed">
            <XCircle size={12} />
            <span>失敗</span>
          </span>
        );
      case 'pending':
        return (
          <span className="badge badge-pending">
            <Clock size={12} />
            <span>送信中</span>
          </span>
        );
      case 'scheduled':
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600 }}>
            <Clock size={12} />
            <span>予約中</span>
          </span>
        );
    }
  };

  return (
    <div className="animate-fade-in">
      {/* ヘッダーエリア */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1>ダッシュボード</h1>
          <p>同時投稿の履歴および配信ステータスを管理します。</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <CronTrigger />
          <Link href="/posts/new" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', height: '42px' }}>
            <Plus size={18} />
            <span>新規投稿を作成</span>
          </Link>
        </div>
      </div>

      {/* メトリクスグリッド */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2.5rem'
      }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>総投稿数</span>
          <span style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalPosts}</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '3px solid var(--color-success)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>成功プラットフォーム数</span>
          <span style={{ fontSize: '2.25rem', fontWeight: 700, color: '#34d399' }}>{successCount}</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '3px solid var(--color-failed)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>失敗プラットフォーム数</span>
          <span style={{ fontSize: '2.25rem', fontWeight: 700, color: '#f87171' }}>{failedCount}</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '3px solid #818cf8' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>予約中</span>
          <span style={{ fontSize: '2.25rem', fontWeight: 700, color: '#818cf8' }}>{scheduledCount}</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '3px solid var(--color-pending)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>送信待ち/処理中</span>
          <span style={{ fontSize: '2.25rem', fontWeight: 700, color: '#fbbf24' }}>{pendingCount}</span>
        </div>
      </div>

      {/* 予約配信スケジュールセクション */}
      {scheduledPosts.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Calendar size={20} style={{ color: 'var(--accent-primary)' }} />
              <span>予約配信予定の投稿 ({scheduledPosts.length}件)</span>
            </h2>
            <div style={{ 
              fontSize: '0.8rem', 
              color: 'var(--text-muted)', 
              background: 'var(--bg-secondary)', 
              padding: '0.35rem 0.75rem', 
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <Clock size={12} style={{ color: 'var(--color-pending)' }} />
              <span>自動実行スケジュール: 毎日 午前 9:00 (JST)</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {scheduledPosts.map((post) => {
              const postResults = getResultsForPost(post.id);
              const formattedCreatedAt = new Date(post.created_at).toLocaleString('ja-JP', {
                timeZone: 'Asia/Tokyo',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });
              const formattedScheduledAt = post.scheduled_at 
                ? new Date(post.scheduled_at).toLocaleString('ja-JP', {
                    timeZone: 'Asia/Tokyo',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';
              const timeInfo = post.scheduled_at ? getRemainingTimeInfo(post.scheduled_at) : null;

              return (
                <div key={post.id} className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-primary)', position: 'relative' }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '1.5rem',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start'
                  }}>
                    {/* 画像プレビュー */}
                    {post.image_url && (
                      <div style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        position: 'relative',
                        backgroundColor: 'var(--bg-tertiary)',
                        flexShrink: 0,
                        border: '1px solid var(--border-color)'
                      }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={post.image_url} 
                          alt={post.title || 'Post image'} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}

                    {/* 投稿内容スニペット */}
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>作成: {formattedCreatedAt}</span>
                          <span style={{ 
                            fontSize: '0.8rem', 
                            color: 'var(--text-primary)', 
                            fontWeight: 600, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.25rem', 
                            background: 'rgba(255, 255, 255, 0.05)', 
                            padding: '0.15rem 0.5rem', 
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)'
                          }}>
                            <Calendar size={12} style={{ color: 'var(--accent-primary)' }} />
                            <span>配信予定: {formattedScheduledAt} (JST)</span>
                          </span>
                        </div>
                        {post.link_url && (
                          <a 
                            href={post.link_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.25rem', 
                              fontSize: '0.8rem', 
                              color: 'var(--accent-primary)' 
                            }}
                          >
                            <ExternalLink size={12} />
                            <span>リンク先を開く</span>
                          </a>
                        )}
                      </div>

                      {timeInfo && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: timeInfo.bg,
                          color: timeInfo.color,
                          border: timeInfo.border,
                          padding: '0.25rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          marginBottom: '0.75rem'
                        }}>
                          <Clock size={12} />
                          <span>{timeInfo.text}</span>
                        </div>
                      )}

                      {timeInfo?.isPast && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: '1.4', background: 'rgba(239, 68, 68, 0.03)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.1)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <span>※配信予定時刻を過ぎていますが、自動実行（毎日9:00 JST）が未実行のため保留されています。今すぐ配信する場合は、下記のボタンをクリックしてください。</span>
                          <PublishNowButton />
                        </div>
                      )}
                      
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        {post.title || 'タイトルなし'}
                      </h3>
                      
                      <p style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'pre-wrap',
                        marginBottom: '1rem'
                      }}>
                        {post.base_text}
                      </p>

                      {/* 各SNSへの配信予定 */}
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        alignItems: 'center',
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: '1rem'
                      }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>配信予定プラットフォーム:</span>
                        {postResults.map((result) => (
                          <div 
                            key={result.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              background: 'var(--bg-tertiary)',
                              padding: '0.35rem 0.75rem',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border-color)'
                            }}
                          >
                            <span className={`platform-${result.platform}`} style={{ display: 'flex', alignItems: 'center' }}>
                              {getPlatformIcon(result.platform)}
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 500, marginRight: '0.25rem' }}>
                              {getPlatformName(result.platform)}
                            </span>
                            {getStatusBadge(result.status)}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 詳細への遷移アクション */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'flex-end',
                      height: '100%',
                      alignSelf: 'stretch',
                      marginLeft: 'auto'
                    }}>
                      <Link 
                        href={`/posts/${post.id}`} 
                        className="btn btn-secondary"
                        style={{
                          padding: '0.5rem 0.85rem',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderColor: 'var(--border-color)'
                        }}
                      >
                        <span>結果・再投稿</span>
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 投稿履歴セクション */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.25rem' }}>最近の同時投稿履歴</h2>
        
        {historyPosts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <p style={{ marginBottom: '1rem' }}>同時投稿済みの履歴がまだありません。最初の投稿を作成しましょう！</p>
            <Link href="/posts/new" className="btn btn-secondary">
              新規投稿を作成
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {historyPosts.map((post) => {
              const postResults = getResultsForPost(post.id);
              const formattedDate = new Date(post.created_at).toLocaleString('ja-JP', {
                timeZone: 'Asia/Tokyo',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={post.id} className="card" style={{ padding: '1.5rem' }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '1.5rem',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start'
                  }}>
                    {/* 画像プレビュー */}
                    {post.image_url && (
                      <div style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        position: 'relative',
                        backgroundColor: 'var(--bg-tertiary)',
                        flexShrink: 0,
                        border: '1px solid var(--border-color)'
                      }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={post.image_url} 
                          alt={post.title || 'Post image'} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}

                    {/* 投稿内容スニペット */}
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>作成: {formattedDate}</span>
                          {post.scheduled_at && (
                            <span style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(99, 102, 241, 0.05)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                              <Clock size={12} />
                              <span>予約配信日時: {new Date(post.scheduled_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                            </span>
                          )}
                        </div>
                        {post.link_url && (
                          <a 
                            href={post.link_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.25rem', 
                              fontSize: '0.8rem', 
                              color: 'var(--accent-primary)' 
                            }}
                          >
                            <ExternalLink size={12} />
                            <span>リンク先を開く</span>
                          </a>
                        )}
                      </div>
                      
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        {post.title || 'タイトルなし'}
                      </h3>
                      
                      <p style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'pre-wrap',
                        marginBottom: '1rem'
                      }}>
                        {post.base_text}
                      </p>

                      {/* 各SNSへの配信結果 */}
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        alignItems: 'center',
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: '1rem'
                      }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>投稿先とステータス:</span>
                        {postResults.map((result) => (
                          <div 
                            key={result.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              background: 'var(--bg-tertiary)',
                              padding: '0.35rem 0.75rem',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border-color)'
                            }}
                          >
                            <span className={`platform-${result.platform}`} style={{ display: 'flex', alignItems: 'center' }}>
                              {getPlatformIcon(result.platform)}
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 500, marginRight: '0.25rem' }}>
                              {getPlatformName(result.platform)}
                            </span>
                            {getStatusBadge(result.status)}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 詳細への遷移アクション */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'flex-end',
                      height: '100%',
                      alignSelf: 'stretch',
                      marginLeft: 'auto'
                    }}>
                      <Link 
                        href={`/posts/${post.id}`} 
                        className="btn btn-secondary"
                        style={{
                          padding: '0.5rem 0.85rem',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderColor: 'var(--border-color)'
                        }}
                      >
                        <span>結果・再投稿</span>
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
