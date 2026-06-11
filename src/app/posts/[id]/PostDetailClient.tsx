'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RotateCw,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { InstagramIcon, FacebookIcon, GoogleBusinessIcon } from '@/components/Icons';
import { Post, PostResult } from '@/lib/services/db';

interface PostDetailClientProps {
  post: Post;
  initialResults: PostResult[];
}

export default function PostDetailClient({ post, initialResults }: PostDetailClientProps) {
  const router = useRouter();
  const [results, setResults] = useState<PostResult[]>(initialResults);
  const [retryingPlatform, setRetryingPlatform] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('本当にこの投稿を削除しますか？\n（管理画面の履歴およびFacebook・Googleビジネスプロフィールの投稿が削除されます。Instagramは削除されません）')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '投稿の削除に失敗しました。');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(`投稿の削除中にエラーが発生しました: ${err.message}`);
      setIsDeleting(false);
    }
  };

  // 各SNSのアイコン取得
  const getPlatformIcon = (platform: string, size = 20) => {
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

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return 'Instagram';
      case 'facebook':
        return 'Facebook';
      case 'google_business_profile':
        return 'Googleビジネスプロフィール';
      default:
        return platform;
    }
  };

  // 再投稿 (リトライ) 処理
  const handleRetry = async (platform: 'instagram' | 'facebook' | 'google_business_profile') => {
    setRetryingPlatform(platform);
    setError(null);

    // 送信中ステータスに一時的に変更
    setResults(prev => prev.map(r => r.platform === platform ? { ...r, status: 'pending', error_message: null } : r));

    try {
      const response = await fetch(`/api/posts/${post.id}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ platform }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '再投稿に失敗しました。');
      }

      // 結果を更新
      setResults(prev => prev.map(r => r.platform === platform ? { 
        ...r, 
        status: data.status, 
        external_post_id: data.external_post_id,
        error_message: data.error_message 
      } : r));

      router.refresh();
    } catch (err: any) {
      setError(`${getPlatformName(platform)}の再投稿中にエラーが発生しました: ${err.message}`);
      setResults(prev => prev.map(r => r.platform === platform ? { 
        ...r, 
        status: 'failed', 
        error_message: err.message 
      } : r));
    } finally {
      setRetryingPlatform(null);
    }
  };

  const formattedDate = new Date(post.created_at).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* 戻るボタン */}
      <Link href="/" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        color: 'var(--text-muted)',
        fontSize: '0.95rem',
        marginBottom: '1.5rem',
        transition: 'color var(--transition-fast)'
      }} className="back-link">
        <ArrowLeft size={16} />
        <span>ダッシュボードに戻る</span>
      </Link>

      {/* ヘッダー */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{post.title || '投稿詳細'}</h1>
        <p style={{ color: 'var(--text-muted)' }}>作成日時: {formattedDate}</p>
      </div>

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '0.875rem',
          color: '#f87171',
          fontSize: '0.9rem',
          marginBottom: '1.5rem'
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '2rem',
        alignItems: 'start'
      }}>
        {/* 左カラム: 投稿内容確認 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              投稿内容
            </h2>
            
            {post.image_url && (
              <div style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-tertiary)',
                marginBottom: '1.5rem',
                maxHeight: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={post.image_url} 
                  alt={post.title || 'Post image'} 
                  style={{ width: '100%', height: 'auto', maxHeight: '300px', objectFit: 'contain' }}
                />
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ベース本文</span>
              <p style={{ 
                marginTop: '0.25rem', 
                whiteSpace: 'pre-wrap', 
                fontSize: '0.95rem', 
                color: 'var(--text-primary)',
                background: 'rgba(255,255,255,0.01)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)'
              }}>
                {post.base_text}
              </p>
            </div>

            {post.link_url && (
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>添付URL</span>
                <div style={{ marginTop: '0.25rem' }}>
                  <a 
                    href={post.link_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      fontSize: '0.85rem',
                      padding: '0.5rem 1rem'
                    }}
                  >
                    <ExternalLink size={14} />
                    <span>リンク先を開く</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* 各媒体別本文の確認 */}
          <div className="card">
            <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              各配信先向けカスタマイズ本文
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {post.instagram_text && (
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-instagram)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                    <InstagramIcon size={14} /> Instagram本文
                  </span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', whiteSpace: 'pre-wrap' }}>
                    {post.instagram_text}
                  </p>
                </div>
              )}

              {post.facebook_text && (
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-facebook)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                    <FacebookIcon size={14} /> Facebook本文
                  </span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', whiteSpace: 'pre-wrap' }}>
                    {post.facebook_text}
                  </p>
                </div>
              )}

              {post.google_business_text && (
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-google)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                    <GoogleBusinessIcon size={14} /> Googleビジネスプロフィール本文
                  </span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', whiteSpace: 'pre-wrap' }}>
                    {post.google_business_text}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右カラム: 配信結果ステータス & 再投稿アクション */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '2.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              配信結果ステータス
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {results.map((result) => {
                const isFailed = result.status === 'failed';
                const isPending = result.status === 'pending';
                const isSuccess = result.status === 'success';

                return (
                  <div 
                    key={result.id} 
                    style={{ 
                      padding: '1.25rem', 
                      borderRadius: 'var(--radius-md)', 
                      backgroundColor: 'rgba(255,255,255,0.01)',
                      border: '1px solid ' + (
                        isSuccess ? 'rgba(16, 185, 129, 0.15)' : 
                        isFailed ? 'rgba(239, 68, 68, 0.15)' : 
                        'var(--border-color)'
                      ),
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    {/* 上部: SNS種別 と ステータスバッジ */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`platform-${result.platform}`} style={{ display: 'flex', alignItems: 'center' }}>
                          {getPlatformIcon(result.platform, 20)}
                        </span>
                        <span style={{ fontWeight: 600 }}>{getPlatformName(result.platform)}</span>
                      </div>
                      
                      {/* ステータス */}
                      <div>
                        {isSuccess && (
                          <span className="badge badge-success">
                            <CheckCircle2 size={12} />
                            <span>成功</span>
                          </span>
                        )}
                        {isFailed && (
                          <span className="badge badge-failed">
                            <XCircle size={12} />
                            <span>失敗</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="badge badge-pending">
                            <Clock size={12} />
                            <span>送信中</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 中部: ID または エラーメッセージ */}
                    {isSuccess && result.external_post_id && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span>投稿ID: </span>
                        <code style={{ background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>
                          {result.external_post_id}
                        </code>
                      </div>
                    )}

                    {isFailed && result.error_message && (
                      <div style={{ 
                        fontSize: '0.8rem', 
                        color: '#f87171', 
                        backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                        padding: '0.75rem', 
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(239, 68, 68, 0.1)',
                        lineHeight: '1.4'
                      }}>
                        <strong>エラー原因:</strong>
                        <div style={{ marginTop: '0.25rem', wordBreak: 'break-all' }}>
                          {result.error_message}
                        </div>
                      </div>
                    )}

                    {/* 下部: 再投稿ボタン (失敗している場合のみ表示) */}
                    {isFailed && (
                      <button
                        onClick={() => handleRetry(result.platform)}
                        disabled={retryingPlatform !== null}
                        className="btn btn-danger"
                        style={{ 
                          width: '100%', 
                          padding: '0.5rem 1rem', 
                          fontSize: '0.85rem',
                          gap: '0.35rem'
                        }}
                      >
                        <RotateCw size={14} className={retryingPlatform === result.platform ? 'spin-animation' : ''} />
                        <span>{retryingPlatform === result.platform ? '再送信中...' : 'この媒体へ再投稿する'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 危険ゾーン */}
          <div className="card" style={{ 
            borderColor: 'rgba(239, 68, 68, 0.15)',
            background: 'rgba(239, 68, 68, 0.01)'
          }}>
            <h3 style={{ fontSize: '1.05rem', color: '#f87171', marginBottom: '0.75rem', fontWeight: 600 }}>
              危険ゾーン (Danger Zone)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
              管理画面の投稿履歴からこのデータを削除します。<br />
              また、FacebookとGoogleの投稿も自動的に連動削除されます。（※Instagramは仕様上、連動削除できません）
            </p>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="btn btn-danger"
              style={{ width: '100%', padding: '0.65rem 1rem', fontSize: '0.9rem' }}
            >
              {isDeleting ? '削除処理中...' : 'この投稿を削除する'}
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .back-link:hover {
          color: var(--text-primary) !important;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
