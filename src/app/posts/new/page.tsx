'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Send, 
  X, 
  Eye, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { InstagramIcon, FacebookIcon, GoogleBusinessIcon } from '@/components/Icons';

export default function NewPostPage() {
  const router = useRouter();
  
  // 共通入力
  const [title, setTitle] = useState('');
  const [baseText, setBaseText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [publishMethod, setPublishMethod] = useState<'now' | 'schedule'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  
  // プラットフォーム選択
  const [platforms, setPlatforms] = useState({
    instagram: true,
    facebook: true,
    google_business_profile: false,
  });

  // 個別本文
  const [instagramText, setInstagramText] = useState('');
  const [facebookText, setFacebookText] = useState('');
  const [googleText, setGoogleText] = useState('');

  // 個別編集されたかどうかのフラグ (未編集なら共通本文と同期する)
  const [isIgEdited, setIsIgEdited] = useState(false);
  const [isFbEdited, setIsFbEdited] = useState(false);
  const [isGbpEdited, setIsGbpEdited] = useState(false);

  // プレビュー表示用のアクティブタブ ('preview' | 'edit')
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [previewPlatform, setPreviewPlatform] = useState<'instagram' | 'facebook' | 'google_business_profile'>('instagram');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 共通本文が変更されたときに個別本文を同期 (編集されていない場合のみ)
  useEffect(() => {
    if (!isIgEdited) setInstagramText(baseText);
    if (!isFbEdited) setFacebookText(baseText);
    if (!isGbpEdited) setGoogleText(baseText);
  }, [baseText, isIgEdited, isFbEdited, isGbpEdited]);

  // プラットフォーム選択が切り替わったときにプレビュー対象プラットフォームも同期
  const handlePlatformToggle = (key: keyof typeof platforms) => {
    const updated = { ...platforms, [key]: !platforms[key] };
    setPlatforms(updated);
    
    // もし切り替えたものが有効化され、かつ現在のプレビュー対象が別のものである場合、そちらに切り替え
    if (updated[key]) {
      setPreviewPlatform(key);
    }
  };

  // 画像の処理 (Base64への変換 ＆ クライアント側での圧縮)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const img = new Image();
      img.onload = () => {
        // 最大解像度を1200pxに制限（SNS投稿用に十分なサイズ）
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        
        // Instagramの許容アスペクト比 (0.8 〜 1.91)
        const MIN_RATIO = 0.8;   // 4:5
        const MAX_RATIO = 1.91;  // 1.91:1
        const currentRatio = width / height;

        let canvasWidth = width;
        let canvasHeight = height;
        let offsetX = 0;
        let offsetY = 0;

        if (currentRatio > MAX_RATIO) {
          // 極端に横長の場合：縦に余白（白）を追加してアスペクト比を1.91にする
          canvasHeight = Math.round(width / MAX_RATIO);
          offsetY = Math.round((canvasHeight - height) / 2);
        } else if (currentRatio < MIN_RATIO) {
          // 極端に縦長の場合：横に余白（白）を追加してアスペクト比を0.8にする
          canvasWidth = Math.round(height * MIN_RATIO);
          offsetX = Math.round((canvasWidth - width) / 2);
        }

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // 背景を白で塗りつぶす
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          
          // 元の画像を中央に描画
          ctx.drawImage(img, offsetX, offsetY, width, height);
          
          // 画質80%のJPEG形式に圧縮してBase64化（Firestoreの1MB制限を回避するため）
          const base64String = canvas.toDataURL('image/jpeg', 0.8);
          setImagePreview(base64String);
          setImageUrl(base64String);
        }
      };

      const reader = new FileReader();
      reader.onloadend = () => {
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageUrl('');
  };

  // 送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    const selectedPlatforms = Object.keys(platforms).filter(
      (key) => platforms[key as keyof typeof platforms]
    ) as Array<'instagram' | 'facebook' | 'google_business_profile'>;

    if (selectedPlatforms.length === 0) {
      setError('投稿先プラットフォームを少なくとも1つ選択してください。');
      return;
    }

    if (!baseText.trim()) {
      setError('投稿本文を入力してください。');
      return;
    }

    // Instagram は画像が必須
    if (platforms.instagram && !imageUrl) {
      setError('Instagramへの投稿には画像が必須です。');
      return;
    }

    if (publishMethod === 'schedule') {
      if (!scheduledAt) {
        setError('配信予定日時を指定してください。');
        return;
      }
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate <= new Date()) {
        setError('配信予定日時は現在よりも未来の時間を指定してください。');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || '同時投稿 (' + new Date().toLocaleDateString() + ')',
          base_text: baseText,
          instagram_text: platforms.instagram ? instagramText : null,
          facebook_text: platforms.facebook ? facebookText : null,
          google_business_text: platforms.google_business_profile ? googleText : null,
          link_url: linkUrl || null,
          image_url: imageUrl || null,
          platforms: selectedPlatforms,
          scheduled_at: publishMethod === 'schedule' ? new Date(scheduledAt).toISOString() : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '投稿の作成に失敗しました。');
      }

      // 投稿完了後、ダッシュボードへ戻る
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || '投稿処理中に予期しないエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '2rem' }}>
        <h1>新規投稿作成</h1>
        <p>1つの投稿から、各SNS向けに最適化して同時に配信します。</p>
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
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2rem',
        alignItems: 'start'
      }}>
        {/* 左カラム: 入力フォーム */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              1. 共通投稿内容
            </h2>
            
            <div className="form-group">
              <label className="form-label" htmlFor="title">管理用タイトル</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 夏の免許取得キャンペーン"
                className="form-input"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="baseText">共通本文</label>
              <textarea
                id="baseText"
                value={baseText}
                onChange={(e) => setBaseText(e.target.value)}
                placeholder="ここに投稿のベースとなる文章を入力します。下部でSNSごとにカスタマイズ可能です。"
                className="form-textarea"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="linkUrl">リンク先URL (オプション)</label>
              <div style={{ position: 'relative' }}>
                <LinkIcon size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="linkUrl"
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com/campaign"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">画像アップロード (1枚)</label>
              {!imagePreview ? (
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  border: '2px dashed var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255,255,255,0.01)',
                  transition: 'all var(--transition-fast)'
                }} className="image-dropzone">
                  <ImageIcon size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>クリックして画像をアップロード</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>PNG, JPG (Instagram投稿時は必須)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                    disabled={isLoading}
                  />
                </label>
              ) : (
                <div style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                  maxHeight: '250px'
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Upload preview"
                    style={{ width: '100%', height: 'auto', maxHeight: '250px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    style={{
                      position: 'absolute',
                      top: '0.75rem',
                      right: '0.75rem',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#fff'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginBottom: 0 }}>
              <label className="form-label">配信設定</label>
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                  <input
                    type="radio"
                    name="publishMethod"
                    checked={publishMethod === 'now'}
                    onChange={() => setPublishMethod('now')}
                    style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                    disabled={isLoading}
                  />
                  <span>即時配信</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                  <input
                    type="radio"
                    name="publishMethod"
                    checked={publishMethod === 'schedule'}
                    onChange={() => setPublishMethod('schedule')}
                    style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                    disabled={isLoading}
                  />
                  <span>予約配信</span>
                </label>
              </div>

              {publishMethod === 'schedule' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', animation: 'fade-in 0.2s ease-out' }}>
                  <label htmlFor="scheduledAt" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>配信予定日時</label>
                  <input
                    id="scheduledAt"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="form-input"
                    required={publishMethod === 'schedule'}
                    min={new Date(Date.now() + 60000).toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' }).slice(0, 16).replace(' ', 'T')} // Limit to future time in local time
                    disabled={isLoading}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    指定した日時に各SNSへ自動的に投稿が送信されます。
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              2. 投稿先プラットフォーム
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Instagram */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid ' + (platforms.instagram ? 'rgba(225, 48, 108, 0.2)' : 'var(--border-color)'),
                cursor: 'pointer'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    color: platforms.instagram ? 'var(--color-instagram)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <InstagramIcon size={20} />
                  </span>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>Instagram</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>画像フィード投稿 (画像必須)</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={platforms.instagram}
                  onChange={() => handlePlatformToggle('instagram')}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-instagram)' }}
                  disabled={isLoading}
                />
              </label>

              {/* Facebook */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid ' + (platforms.facebook ? 'rgba(24, 119, 242, 0.2)' : 'var(--border-color)'),
                cursor: 'pointer'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    color: platforms.facebook ? 'var(--color-facebook)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <FacebookIcon size={20} />
                  </span>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>Facebookページ</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>フィードへのリンク・画像投稿</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={platforms.facebook}
                  onChange={() => handlePlatformToggle('facebook')}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-facebook)' }}
                  disabled={isLoading}
                />
              </label>

              {/* Google Business Profile */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid ' + (platforms.google_business_profile ? 'rgba(66, 133, 244, 0.2)' : 'var(--border-color)'),
                cursor: 'pointer'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    color: platforms.google_business_profile ? 'var(--color-google)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <GoogleBusinessIcon size={20} />
                  </span>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>Googleビジネスプロフィール</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>最新情報・CTAリンク投稿</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={platforms.google_business_profile}
                  onChange={() => handlePlatformToggle('google_business_profile')}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-google)' }}
                  disabled={isLoading}
                />
              </label>
            </div>
          </div>
        </div>

        {/* 右カラム: 個別調整 ＆ プレビュー */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '2.5rem' }}>
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{
              display: 'flex',
              background: 'var(--bg-tertiary)',
              padding: '0.25rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem'
            }}>
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: activeTab === 'edit' ? 'var(--bg-secondary)' : 'transparent',
                  color: activeTab === 'edit' ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <FileText size={16} />
                <span>媒体別本文調整</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: activeTab === 'preview' ? 'var(--bg-secondary)' : 'transparent',
                  color: activeTab === 'preview' ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <Eye size={16} />
                <span>SNSプレビュー</span>
              </button>
            </div>

            {/* TAB CONTENT: 媒体別本文調整 */}
            {activeTab === 'edit' && (
              <div style={{ padding: '0.75rem' }}>
                <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>媒体別カスタマイズ</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  共通本文をベースにしつつ、各プラットフォームに最適化した文章に編集できます。
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Instagram 本文 */}
                  {platforms.instagram && (
                    <div style={{ borderLeft: '3px solid var(--color-instagram)', paddingLeft: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-instagram)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <InstagramIcon size={14} /> Instagram用
                        </span>
                        {isIgEdited && (
                          <button
                            type="button"
                            onClick={() => { setIsIgEdited(false); setInstagramText(baseText); }}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            共通本文と同期
                          </button>
                        )}
                      </div>
                      <textarea
                        value={instagramText}
                        onChange={(e) => { setInstagramText(e.target.value); setIsIgEdited(true); }}
                        placeholder="Instagram向け本文"
                        className="form-textarea"
                        style={{ minHeight: '100px', fontSize: '0.85rem' }}
                        disabled={isLoading}
                      />
                    </div>
                  )}

                  {/* Facebook 本文 */}
                  {platforms.facebook && (
                    <div style={{ borderLeft: '3px solid var(--color-facebook)', paddingLeft: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-facebook)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <FacebookIcon size={14} /> Facebook用
                        </span>
                        {isFbEdited && (
                          <button
                            type="button"
                            onClick={() => { setIsFbEdited(false); setFacebookText(baseText); }}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            共通本文と同期
                          </button>
                        )}
                      </div>
                      <textarea
                        value={facebookText}
                        onChange={(e) => { setFacebookText(e.target.value); setIsFbEdited(true); }}
                        placeholder="Facebook向け本文"
                        className="form-textarea"
                        style={{ minHeight: '100px', fontSize: '0.85rem' }}
                        disabled={isLoading}
                      />
                    </div>
                  )}

                  {/* Google Business Profile 本文 */}
                  {platforms.google_business_profile && (
                    <div style={{ borderLeft: '3px solid var(--color-google)', paddingLeft: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-google)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <GoogleBusinessIcon size={14} /> Googleビジネス用
                        </span>
                        {isGbpEdited && (
                          <button
                            type="button"
                            onClick={() => { setIsGbpEdited(false); setGoogleText(baseText); }}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            共通本文と同期
                          </button>
                        )}
                      </div>
                      <textarea
                        value={googleText}
                        onChange={(e) => { setGoogleText(e.target.value); setIsGbpEdited(true); }}
                        placeholder="Googleビジネスプロフィール向け本文"
                        className="form-textarea"
                        style={{ minHeight: '100px', fontSize: '0.85rem' }}
                        disabled={isLoading}
                      />
                    </div>
                  )}

                  {!platforms.instagram && !platforms.facebook && !platforms.google_business_profile && (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                      プラットフォームを選択すると、個別の本文調整エリアが表示されます。
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: SNSプレビュー */}
            {activeTab === 'preview' && (
              <div style={{ padding: '0.75rem' }}>
                {/* プレビュー切り替え */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {platforms.instagram && (
                    <button
                      type="button"
                      onClick={() => setPreviewPlatform('instagram')}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid ' + (previewPlatform === 'instagram' ? 'var(--color-instagram)' : 'var(--border-color)'),
                        background: previewPlatform === 'instagram' ? 'rgba(225, 48, 108, 0.1)' : 'transparent',
                        color: previewPlatform === 'instagram' ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      Instagram
                    </button>
                  )}
                  {platforms.facebook && (
                    <button
                      type="button"
                      onClick={() => setPreviewPlatform('facebook')}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid ' + (previewPlatform === 'facebook' ? 'var(--color-facebook)' : 'var(--border-color)'),
                        background: previewPlatform === 'facebook' ? 'rgba(24, 119, 242, 0.1)' : 'transparent',
                        color: previewPlatform === 'facebook' ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      Facebook
                    </button>
                  )}
                  {platforms.google_business_profile && (
                    <button
                      type="button"
                      onClick={() => setPreviewPlatform('google_business_profile')}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid ' + (previewPlatform === 'google_business_profile' ? 'var(--color-google)' : 'var(--border-color)'),
                        background: previewPlatform === 'google_business_profile' ? 'rgba(66, 133, 244, 0.1)' : 'transparent',
                        color: previewPlatform === 'google_business_profile' ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      Google
                    </button>
                  )}
                </div>

                {/* プレビュー本体 */}
                <div style={{
                  background: '#090a0f',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  color: '#fff',
                  fontFamily: 'sans-serif'
                }}>
                  {/* INSTAGRAM PREVIEW */}
                  {previewPlatform === 'instagram' && platforms.instagram && (
                    <div>
                      {/* ヘッダー */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-gradient)' }}></div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>miyakonojo_ds</div>
                          <div style={{ fontSize: '0.7rem', color: '#8e8e8e' }}>都城市</div>
                        </div>
                      </div>
                      {/* 画像 */}
                      <div style={{ width: '100%', aspectRatio: '1/1', background: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {imagePreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <ImageIcon size={48} style={{ color: '#555' }} />
                        )}
                      </div>
                      {/* キャプション */}
                      <div style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1.2rem' }}>❤️</span>
                          <span style={{ fontSize: '1.2rem' }}>💬</span>
                          <span style={{ fontSize: '1.2rem' }}>✈️</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#fff', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                          <strong style={{ marginRight: '0.5rem' }}>miyakonojo_ds</strong>
                          {instagramText || '本文を入力してください。'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* FACEBOOK PREVIEW */}
                  {previewPlatform === 'facebook' && platforms.facebook && (
                    <div style={{ padding: '0.875rem' }}>
                      {/* ヘッダー */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-facebook)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>F</div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>都城ドライビングスクール</div>
                          <div style={{ fontSize: '0.75rem', color: '#a0a0a0' }}>たった今 · 🌐</div>
                        </div>
                      </div>
                      {/* テキスト */}
                      <p style={{ fontSize: '0.9rem', color: '#e4e6eb', whiteSpace: 'pre-wrap', marginBottom: '0.75rem', lineHeight: '1.4' }}>
                        {facebookText || '本文を入力してください。'}
                      </p>
                      {/* メディア */}
                      {imagePreview && (
                        <div style={{ width: '100%', maxHeight: '300px', overflow: 'hidden', border: '1px solid #2f3031', borderRadius: '4px' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imagePreview} alt="Facebook Preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
                        </div>
                      )}
                      {linkUrl && !imagePreview && (
                        <div style={{ background: '#242526', border: '1px solid #3e4042', padding: '0.75rem', borderRadius: '4px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#b0b3b8', textTransform: 'uppercase' }}>LINK</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e4e6eb', marginTop: '0.15rem' }}>{linkUrl}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* GOOGLE PREVIEW */}
                  {previewPlatform === 'google_business_profile' && platforms.google_business_profile && (
                    <div style={{ padding: '0.875rem' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-google)', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Google検索・マップ上の表示
                      </div>
                      <div style={{ background: '#1e1f20', border: '1px solid #3c4043', borderRadius: '8px', overflow: 'hidden' }}>
                        {imagePreview && (
                          <div style={{ width: '100%', height: '160px', overflow: 'hidden' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imagePreview} alt="Google Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        <div style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--color-google)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>G</div>
                            <span style={{ fontSize: '0.75rem', color: '#bdc1c6', fontWeight: 500 }}>都城ドライビングスクール</span>
                          </div>
                          
                          <p style={{ fontSize: '0.85rem', color: '#e8eaed', whiteSpace: 'pre-wrap', lineHeight: '1.4', marginBottom: '1rem' }}>
                            {googleText || '本文を入力してください。'}
                          </p>

                          {/* CTA ボタン */}
                          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <a
                              href={linkUrl || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-block',
                                padding: '0.5rem 1rem',
                                background: '#8ab4f8',
                                color: '#202124',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                textDecoration: 'none'
                              }}
                              onClick={(e) => !linkUrl && e.preventDefault()}
                            >
                              詳細 (LEARN_MORE)
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {(!platforms[previewPlatform]) && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      選択したプラットフォームのプレビューがここに表示されます。
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 送信ボタン */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => router.push('/')}
              disabled={isLoading}
              style={{ flex: 1 }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{ flex: 2 }}
            >
              <Send size={16} />
              <span>{isLoading ? '同時投稿処理中...' : '同時投稿を実行'}</span>
            </button>
          </div>
        </div>
      </form>

      <style jsx>{`
        .image-dropzone:hover {
          border-color: var(--accent-primary) !important;
          background-color: rgba(99, 102, 241, 0.03) !important;
        }
      `}</style>
    </div>
  );
}
