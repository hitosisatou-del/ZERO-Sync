import React from 'react';
import Link from 'next/link';
import { DBService } from '@/lib/services/db';
import { 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { InstagramIcon, FacebookIcon, GoogleBusinessIcon } from '@/components/Icons';

// Next.jsのキャッシュを無効化（動的データフェッチのため）
export const revalidate = 0;

export default async function DashboardPage() {
  const { posts, results } = await DBService.getPosts();

  // プラットフォームごとの結果をグループ化
  const getResultsForPost = (postId: string) => {
    return results.filter((r) => r.post_id === postId);
  };

  // メトリクスの計算
  const totalPosts = posts.length;
  let successCount = 0;
  let failedCount = 0;
  let pendingCount = 0;

  results.forEach((r) => {
    if (r.status === 'success') successCount++;
    else if (r.status === 'failed') failedCount++;
    else if (r.status === 'pending') pendingCount++;
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
  const getStatusBadge = (status: 'success' | 'failed' | 'pending') => {
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
    }
  };

  return (
    <div className="animate-fade-in">
      {/* ヘッダーエリア */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>ダッシュボード</h1>
          <p>同時投稿の履歴および配信ステータスを管理します。</p>
        </div>
        <Link href="/posts/new" className="btn btn-primary">
          <Plus size={18} />
          <span>新規投稿を作成</span>
        </Link>
      </div>

      {/* メトリクスグリッド */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '3px solid var(--color-pending)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>送信待ち/処理中</span>
          <span style={{ fontSize: '2.25rem', fontWeight: 700, color: '#fbbf24' }}>{pendingCount}</span>
        </div>
      </div>

      {/* 投稿履歴セクション */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.25rem' }}>最近の同時投稿履歴</h2>
        
        {posts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <p style={{ marginBottom: '1rem' }}>投稿履歴がまだありません。最初の投稿を作成しましょう！</p>
            <Link href="/posts/new" className="btn btn-secondary">
              新規投稿を作成
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {posts.map((post) => {
              const postResults = getResultsForPost(post.id);
              const formattedDate = new Date(post.created_at).toLocaleString('ja-JP', {
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formattedDate}</span>
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
