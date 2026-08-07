'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, BookOpen, Plus, Pencil, Trash2, Check, X,
  AlertCircle, Loader2, Send,
  Clock, RefreshCw, ExternalLink, ShieldCheck, Globe, ChevronDown, ChevronUp
} from 'lucide-react';

// スクレイプ対象の公式URL
const OFFICIAL_URLS = [
  { url: 'https://goodmenkyo.com/campaign/miyako/lp4/', label: '合宿免許LP' },
  { url: 'https://miyakonojyo-ds.jp', label: '公式サイト' },
];

// ─────────────────────────────
// 型定義
// ─────────────────────────────
type Category = 'basic' | 'course' | 'campaign' | 'graduation' | 'access' | 'camp';

interface SchoolContent {
  id: string;
  category: Category;
  title: string;
  body: string;
  source_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Variants {
  base_text: string;
  instagram_text: string;
  facebook_text: string;
  twitter_text: string;
  google_business_text: string;
}

const categoryLabels: Record<Category, string> = {
  basic: '🏫 基本情報',
  course: '🚗 コース・料金',
  campaign: '🎁 キャンペーン・特典',
  graduation: '🎓 卒業式・卒業生',
  access: '📍 アクセス・送迎',
  camp: '⛺ 合宿免許',
};

const categoryColors: Record<Category, string> = {
  basic: '#6366f1',
  course: '#3b82f6',
  campaign: '#f59e0b',
  graduation: '#10b981',
  access: '#ec4899',
  camp: '#a855f7',
};

const themeOptions = [
  { value: '卒業式（卒業生の声・祝辞）', label: '🎓 卒業式' },
  { value: '合宿免許キャンペーン・空き状況', label: '⛺ 合宿免許' },
  { value: '通学免許キャンペーン・入校受付', label: '🏫 通学免許' },
  { value: '普通車免許の案内', label: '🚙 普通車免許' },
  { value: '二輪免許（普通二輪・大型二輪）の案内', label: '🏍 二輪免許' },
  { value: 'プロ免許（牽引・大型特殊・中型自動車）の案内', label: '🚛 プロ免許' },
  { value: 'その他・自由テーマ', label: '📝 その他' },
];

const toneOptions = [
  { value: '親しみやすく元気', label: '😊 親しみやすく元気' },
  { value: '丁寧で誠実', label: '🤝 丁寧で誠実' },
  { value: '若者向けで明るい', label: '📣 若者向けで明るい' },
];

const ctaOptions = [
  { value: 'Web仮申し込みページへ誘導', label: '🔗 Web仮申し込みへ' },
  { value: '電話でのお問い合わせへ誘導', label: '📞 電話でお問い合わせ' },
  { value: '公式サイト特設ページへ誘導', label: '🌐 公式サイトへ' },
  { value: 'LINE相談へ誘導', label: '💬 LINE相談へ' },
];

// ─────────────────────────────
// SNSプラットフォームバッジコンポーネント
// ─────────────────────────────
function PlatformBadge({ platform }: { platform: string }) {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    instagram_text: { label: 'Instagram', color: '#e1306c', bg: 'rgba(225,48,108,0.12)' },
    facebook_text: { label: 'Facebook', color: '#1877f2', bg: 'rgba(24,119,242,0.12)' },
    twitter_text: { label: 'X (Twitter)', color: '#e7e9ea', bg: 'rgba(231,233,234,0.1)' },
    google_business_text: { label: 'Google ビジネス', color: '#34a853', bg: 'rgba(52,168,83,0.12)' },
    base_text: { label: '共通テキスト', color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  };
  const c = configs[platform] || { label: platform, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '20px',
      fontSize: '0.72rem',
      fontWeight: 700,
      color: c.color,
      background: c.bg,
      border: `1px solid ${c.color}40`,
      marginBottom: '0.5rem',
    }}>
      {c.label}
    </span>
  );
}

// ─────────────────────────────
// メインページ
// ─────────────────────────────
export default function AIPostPage() {
  const router = useRouter();

  // --- タブ状態 ---
  const [activeTab, setActiveTab] = useState<'generate' | 'contents'>('generate');

  // --- 公式情報 ---
  const [contents, setContents] = useState<SchoolContent[]>([]);
  const [contentsLoading, setContentsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ category: 'basic' as Category, title: '', body: '', source_url: '' });
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');

  // --- AI生成 ---
  const [theme, setTheme] = useState(themeOptions[0].value);
  const [tone, setTone] = useState(toneOptions[0].value);
  const [cta, setCta] = useState(ctaOptions[0].value);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(['camp', 'course', 'campaign']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [variants, setVariants] = useState<Variants | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [usedSchoolContent, setUsedSchoolContent] = useState(false);
  const [usedLiveWebContent, setUsedLiveWebContent] = useState(false);
  const [fetchedUrls, setFetchedUrls] = useState<string[]>([]);

  // --- ライブWebコンテンツ（公式サイト・LP）---
  const [liveWebContent, setLiveWebContent] = useState<string | null>(null);
  const [isFetchingWeb, setIsFetchingWeb] = useState(false);
  const [webFetchError, setWebFetchError] = useState<string | null>(null);
  const [webFetchedAt, setWebFetchedAt] = useState<string | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(false);

  // --- プレビュー・承認 ---
  const [activeVariantTab, setActiveVariantTab] = useState<keyof Variants>('base_text');
  const [isPosting, setIsPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [editedVariants, setEditedVariants] = useState<Variants | null>(null);

  // ─ 公式情報の取得
  const fetchContents = useCallback(async () => {
    setContentsLoading(true);
    try {
      const res = await fetch('/api/school-content?active=false');
      const data = await res.json();
      setContents(data.contents || []);
    } catch (e) {
      console.error(e);
    } finally {
      setContentsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  // ─ 公式サイト・LPをリアルタイム取得
  const fetchLiveWebContent = useCallback(async () => {
    setIsFetchingWeb(true);
    setWebFetchError(null);
    try {
      const res = await fetch('/api/scrape-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: OFFICIAL_URLS.map(u => u.url) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Webコンテンツの取得に失敗しました。');
      setLiveWebContent(data.combined || '');
      setWebFetchedAt(data.fetchedAt);
    } catch (err: any) {
      setWebFetchError(err.message);
    } finally {
      setIsFetchingWeb(false);
    }
  }, []);

  // ─ AI生成
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    setVariants(null);
    setEditedVariants(null);
    setPostSuccess(false);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          keywords: [],
          tone,
          cta,
          useSchoolContent: true,
          contentCategories: selectedCategories,
          generateVariants: true,
          // 取得済みのライブコンテンツを渡す（nullの場合は渡さない）
          liveWebContent: liveWebContent || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI生成に失敗しました。');
      setVariants(data.variants);
      setEditedVariants(data.variants);
      setUsedSchoolContent(data.usedSchoolContent);
      setUsedLiveWebContent(data.usedLiveWebContent);
      setFetchedUrls(data.fetchedUrls || []);
      setActiveVariantTab('base_text');
    } catch (err: any) {
      setGenerateError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // ─ 投稿実行
  const handlePost = async () => {
    if (!editedVariants) return;
    setIsPosting(true);
    try {
      const selectedPlatforms = ['instagram', 'facebook', 'google_business_profile', 'twitter'];
      const postData = {
        title: theme,
        base_text: editedVariants.base_text,
        instagram_text: editedVariants.instagram_text,
        facebook_text: editedVariants.facebook_text,
        google_business_text: editedVariants.google_business_text,
        twitter_text: editedVariants.twitter_text,
        link_url: null,
        image_url: null,
        scheduled_at: scheduledAt || null,
        platforms: selectedPlatforms,
      };

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '投稿に失敗しました。');
      }

      setPostSuccess(true);
      setTimeout(() => router.push('/'), 2500);
    } catch (err: any) {
      setGenerateError(err.message);
    } finally {
      setIsPosting(false);
    }
  };

  // ─ 公式情報 追加/更新
  const handleSaveContent = async () => {
    try {
      const isEdit = !!editingId;
      const res = await fetch('/api/school-content', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEdit
            ? { id: editingId, ...formData }
            : { ...formData, is_active: true }
        ),
      });
      if (!res.ok) throw new Error('保存に失敗しました。');
      setShowAddForm(false);
      setEditingId(null);
      setFormData({ category: 'basic', title: '', body: '', source_url: '' });
      fetchContents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (!confirm('このコンテンツを削除しますか？')) return;
    await fetch(`/api/school-content?id=${id}`, { method: 'DELETE' });
    fetchContents();
  };

  const startEdit = (item: SchoolContent) => {
    setEditingId(item.id);
    setFormData({ category: item.category, title: item.title, body: item.body, source_url: item.source_url || '' });
    setShowAddForm(true);
  };

  const filteredContents = filterCategory === 'all'
    ? contents
    : contents.filter((c) => c.category === filterCategory);

  const variantKeys: Array<{ key: keyof Variants; label: string }> = [
    { key: 'base_text', label: '共通' },
    { key: 'instagram_text', label: 'Instagram' },
    { key: 'facebook_text', label: 'Facebook' },
    { key: 'twitter_text', label: 'X' },
    { key: 'google_business_text', label: 'Google' },
  ];

  return (
    <div className="ai-post-page">
      {/* ── ページヘッダー ── */}
      <div className="ai-page-header">
        <div className="ai-page-header-left">
          <div className="ai-page-icon">
            <Sparkles size={24} color="#fff" />
          </div>
          <div>
            <h1 className="ai-page-title">AI 自動投稿生成</h1>
            <p className="ai-page-subtitle">公式HP情報のみを参照・全SNSに一括配信</p>
          </div>
        </div>
        <div className="ai-safe-badge">
          <ShieldCheck size={14} />
          公式情報のみ使用
        </div>
      </div>

      {/* ── タブ ── */}
      <div className="ai-tabs">
        <button
          className={`ai-tab ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
          id="tab-generate"
        >
          <Sparkles size={15} />
          AI 生成
        </button>
        <button
          className={`ai-tab ${activeTab === 'contents' ? 'active' : ''}`}
          onClick={() => setActiveTab('contents')}
          id="tab-contents"
        >
          <BookOpen size={15} />
          公式情報管理
          <span className="ai-tab-count">{contents.filter(c => c.is_active).length}</span>
        </button>
      </div>

      {/* ═══════════════════════════════
          TAB: AI 生成
      ═══════════════════════════════ */}
      {activeTab === 'generate' && (
        <div className="ai-generate-layout">
          {/* ─ 左: 生成設定 ─ */}
          <div className="ai-generate-sidebar">
            <div className="ai-section-card">
              <h3 className="ai-section-title">
                <Sparkles size={15} />
                生成条件
              </h3>

              {/* テーマ */}
              <div className="ai-field">
                <label className="ai-label">投稿テーマ</label>
                <div className="ai-select-grid">
                  {themeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      className={`ai-chip ${theme === opt.value ? 'selected' : ''}`}
                      onClick={() => setTheme(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* トーン */}
              <div className="ai-field">
                <label className="ai-label">文章のトーン</label>
                <div className="ai-select-row">
                  {toneOptions.map((opt) => (
                    <button
                      key={opt.value}
                      className={`ai-chip ${tone === opt.value ? 'selected' : ''}`}
                      onClick={() => setTone(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="ai-field">
                <label className="ai-label">誘導先 (CTA)</label>
                <div className="ai-select-row">
                  {ctaOptions.map((opt) => (
                    <button
                      key={opt.value}
                      className={`ai-chip ${cta === opt.value ? 'selected' : ''}`}
                      onClick={() => setCta(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 参照する公式情報カテゴリ */}
              <div className="ai-field">
                <label className="ai-label">
                  <ShieldCheck size={13} style={{ verticalAlign: 'middle', marginRight: '4px', color: '#34d399' }} />
                  参照する公式情報カテゴリ
                </label>
                <div className="ai-select-row" style={{ flexWrap: 'wrap' }}>
                  {(Object.keys(categoryLabels) as Category[]).map((cat) => (
                    <button
                      key={cat}
                      className={`ai-chip ${selectedCategories.includes(cat) ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedCategories(prev =>
                          prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                        );
                      }}
                      style={selectedCategories.includes(cat) ? {
                        borderColor: categoryColors[cat],
                        color: categoryColors[cat],
                        background: `${categoryColors[cat]}18`,
                      } : {}}
                    >
                      {categoryLabels[cat]}
                    </button>
                  ))}
                </div>
                <p className="ai-hint">選択したカテゴリの公式情報のみをAIが参照します</p>
              </div>

              {/* ── 公式サイト・LP取得 ── */}
              <div className="ai-live-section">
                <div className="ai-live-header">
                  <div className="ai-live-title">
                    <Globe size={13} style={{ color: '#3b82f6' }} />
                    公式サイト・LP情報
                    {liveWebContent && (
                      <span className="ai-live-status ok">取得済み ✓</span>
                    )}
                  </div>
                  <button
                    className="ai-fetch-web-btn"
                    onClick={fetchLiveWebContent}
                    disabled={isFetchingWeb}
                    id="btn-fetch-web"
                  >
                    {isFetchingWeb ? (
                      <><Loader2 size={12} className="spin" />取得中...</>
                    ) : liveWebContent ? (
                      <><RefreshCw size={12} />再取得</>
                    ) : (
                      <><Globe size={12} />今すぐ取得</>
                    )}
                  </button>
                </div>

                {/* URL一覧 */}
                <div className="ai-live-urls">
                  {OFFICIAL_URLS.map(({ url, label }) => (
                    <div key={url} className="ai-live-url-row">
                      <span className="ai-live-url-label">{label}</span>
                      <a href={url} target="_blank" rel="noreferrer" className="ai-live-url-link">
                        <ExternalLink size={10} />
                        {url.replace('https://', '').slice(0, 32)}...
                      </a>
                    </div>
                  ))}
                </div>

                {webFetchError && (
                  <div className="ai-error" style={{ marginTop: '0.5rem' }}>
                    <AlertCircle size={12} />{webFetchError}
                  </div>
                )}

                {liveWebContent && (
                  <>
                    <button
                      className="ai-live-preview-toggle"
                      onClick={() => setShowLivePreview(p => !p)}
                    >
                      {showLivePreview ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      取得内容を{showLivePreview ? '閉じる' : '確認する'}
                    </button>
                    {showLivePreview && (
                      <pre className="ai-live-preview-text">{liveWebContent.slice(0, 1200)}{liveWebContent.length > 1200 ? '\n...' : ''}</pre>
                    )}
                  </>
                )}

                {webFetchedAt && (
                  <p className="ai-hint" style={{ marginTop: '0.4rem' }}>
                    最終取得: {new Date(webFetchedAt).toLocaleString('ja-JP')}
                  </p>
                )}
              </div>

              <button
                className="ai-generate-btn"
                onClick={handleGenerate}
                disabled={isGenerating || selectedCategories.length === 0}
                id="btn-ai-generate"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    AI生成中...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    全SNS向け文章を一括生成
                    {liveWebContent && <span style={{ fontSize: '0.72rem', opacity: 0.8, marginLeft: '0.25rem' }}>（LP情報あり）</span>}
                  </>
                )}
              </button>

              {generateError && (
                <div className="ai-error">
                  <AlertCircle size={14} />
                  {generateError}
                </div>
              )}
            </div>
          </div>

          {/* ─ 右: プレビュー ─ */}
          <div className="ai-generate-preview">
            {!variants && !isGenerating && (
              <div className="ai-empty-state">
                <div className="ai-empty-icon">
                  <Sparkles size={32} color="#6366f1" />
                </div>
                <h3>AIが文章を生成します</h3>
                <p>左の条件を設定して「一括生成」を押してください。<br />Instagram・Facebook・X・Googleビジネス向けの<br />文章を同時に生成します。</p>
              </div>
            )}

            {isGenerating && (
              <div className="ai-generating-state">
                <div className="ai-gen-ring" />
                <p>公式情報を参照してAIが生成中...</p>
                <p className="ai-gen-sub">Instagram / Facebook / X / Googleビジネス</p>
              </div>
            )}

            {variants && editedVariants && (
              <div className="ai-preview-card">
                {/* ヘッダー */}
                <div className="ai-preview-header">
                  <div>
                    <h3 className="ai-preview-title">生成結果プレビュー</h3>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                      {usedSchoolContent && (
                        <span className="ai-official-badge">
                          <ShieldCheck size={11} />
                          登録情報参照
                        </span>
                      )}
                      {usedLiveWebContent && (
                        <span className="ai-official-badge" style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.3)', color: '#3b82f6' }}>
                          <Globe size={11} />
                          公式サイト・LP参照
                        </span>
                      )}
                      {fetchedUrls.length > 0 && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                          （{fetchedUrls.length}ページ取得）
                        </span>
                      )}
                    </div>
                  </div>
                  <button className="ai-regen-btn" onClick={handleGenerate} disabled={isGenerating}>
                    <RefreshCw size={13} />
                    再生成
                  </button>
                </div>

                {/* SNSタブ */}
                <div className="ai-variant-tabs">
                  {variantKeys.map(({ key, label }) => (
                    <button
                      key={key}
                      className={`ai-variant-tab ${activeVariantTab === key ? 'active' : ''}`}
                      onClick={() => setActiveVariantTab(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* 本文エディタ */}
                <div className="ai-variant-content">
                  <PlatformBadge platform={activeVariantTab} />
                  <textarea
                    className="ai-variant-textarea"
                    value={editedVariants[activeVariantTab]}
                    onChange={(e) => setEditedVariants(prev => prev ? { ...prev, [activeVariantTab]: e.target.value } : null)}
                    rows={12}
                    placeholder="生成された文章がここに表示されます"
                    id={`textarea-${activeVariantTab}`}
                  />
                  <div className="ai-char-count">
                    {editedVariants[activeVariantTab].length} 文字
                    {activeVariantTab === 'twitter_text' && editedVariants[activeVariantTab].length > 140 && (
                      <span style={{ color: '#f87171', marginLeft: '0.5rem' }}>⚠️ 140文字を超えています</span>
                    )}
                  </div>
                </div>

                {/* 配信設定 */}
                <div className="ai-post-options">
                  <div className="ai-schedule-field">
                    <label className="ai-label">
                      <Clock size={13} />
                      予約配信日時（空欄で即時配信）
                    </label>
                    <input
                      type="datetime-local"
                      className="ai-datetime-input"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      id="input-scheduled-at"
                    />
                  </div>

                  <div className="ai-post-platforms">
                    <label className="ai-label">配信先プラットフォーム</label>
                    <div className="ai-platforms-badges">
                      {['Instagram', 'Facebook', 'X (Twitter)', 'Google ビジネス'].map(p => (
                        <span key={p} className="ai-platform-badge">{p}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {postSuccess ? (
                  <div className="ai-success-banner">
                    <Check size={18} />
                    投稿が作成されました！ダッシュボードに移動します...
                  </div>
                ) : (
                  <button
                    className="ai-post-btn"
                    onClick={handlePost}
                    disabled={isPosting}
                    id="btn-post-all"
                  >
                    {isPosting ? (
                      <><Loader2 size={16} className="spin" />配信処理中...</>
                    ) : (
                      <><Send size={16} />{scheduledAt ? '予約配信する' : '全SNSに今すぐ投稿'}</>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════
          TAB: 公式情報管理
      ═══════════════════════════════ */}
      {activeTab === 'contents' && (
        <div className="ai-contents-layout">
          {/* ヘッダー操作 */}
          <div className="ai-contents-toolbar">
            <div className="ai-filter-tabs">
              <button
                className={`ai-filter-tab ${filterCategory === 'all' ? 'active' : ''}`}
                onClick={() => setFilterCategory('all')}
              >
                すべて ({contents.length})
              </button>
              {(Object.keys(categoryLabels) as Category[]).map((cat) => {
                const count = contents.filter(c => c.category === cat).length;
                return count > 0 ? (
                  <button
                    key={cat}
                    className={`ai-filter-tab ${filterCategory === cat ? 'active' : ''}`}
                    onClick={() => setFilterCategory(cat)}
                    style={filterCategory === cat ? { borderColor: categoryColors[cat], color: categoryColors[cat] } : {}}
                  >
                    {categoryLabels[cat]} ({count})
                  </button>
                ) : null;
              })}
            </div>
            <button
              className="ai-add-btn"
              onClick={() => { setShowAddForm(true); setEditingId(null); setFormData({ category: 'basic', title: '', body: '', source_url: '' }); }}
              id="btn-add-content"
            >
              <Plus size={14} />
              公式情報を追加
            </button>
          </div>

          {/* 追加・編集フォーム */}
          {showAddForm && (
            <div className="ai-form-card">
              <h3 className="ai-form-title">{editingId ? '公式情報を編集' : '公式情報を追加'}</h3>
              <div className="ai-form-grid">
                <div className="ai-field">
                  <label className="ai-label">カテゴリ</label>
                  <select
                    className="ai-select"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as Category }))}
                  >
                    {(Object.entries(categoryLabels) as [Category, string][]).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="ai-field">
                  <label className="ai-label">タイトル</label>
                  <input
                    className="ai-input"
                    placeholder="例: 合宿免許 夏の早割プラン"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
              </div>
              <div className="ai-field">
                <label className="ai-label">内容（AIが参照するテキスト）</label>
                <textarea
                  className="ai-textarea"
                  rows={6}
                  placeholder="例:&#10;キャンペーン名: 夏の早割キャンペーン&#10;割引率: 10%OFF&#10;期間: 2026年7月1日〜8月31日&#10;対象: 普通車AT・MT通学コース&#10;申込方法: Webまたはお電話にて"
                  value={formData.body}
                  onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                />
              </div>
              <div className="ai-field">
                <label className="ai-label">参照元URL（任意）</label>
                <input
                  className="ai-input"
                  placeholder="https://miyakonojyo-ds.jp/..."
                  value={formData.source_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, source_url: e.target.value }))}
                />
              </div>
              <div className="ai-form-actions">
                <button className="ai-cancel-btn" onClick={() => { setShowAddForm(false); setEditingId(null); }}>
                  <X size={14} />キャンセル
                </button>
                <button
                  className="ai-save-btn"
                  onClick={handleSaveContent}
                  disabled={!formData.title || !formData.body}
                  id="btn-save-content"
                >
                  <Check size={14} />{editingId ? '更新する' : '保存する'}
                </button>
              </div>
            </div>
          )}

          {/* コンテンツ一覧 */}
          {contentsLoading ? (
            <div className="ai-loading-row">
              <Loader2 size={20} className="spin" />
              <span>読み込み中...</span>
            </div>
          ) : filteredContents.length === 0 ? (
            <div className="ai-empty-contents">
              <BookOpen size={28} color="#475569" />
              <p>公式情報が登録されていません</p>
              <p className="ai-hint">「公式情報を追加」ボタンから情報を登録してください</p>
            </div>
          ) : (
            <div className="ai-content-list">
              {filteredContents.map((item) => (
                <div key={item.id} className={`ai-content-item ${!item.is_active ? 'inactive' : ''}`}>
                  <div className="ai-content-item-header">
                    <span
                      className="ai-cat-badge"
                      style={{ background: `${categoryColors[item.category]}18`, color: categoryColors[item.category], border: `1px solid ${categoryColors[item.category]}40` }}
                    >
                      {categoryLabels[item.category]}
                    </span>
                    <div className="ai-content-actions">
                      {item.source_url && (
                        <a href={item.source_url} target="_blank" rel="noreferrer" className="ai-icon-btn" title="参照元URLを開く">
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button className="ai-icon-btn" onClick={() => startEdit(item)} title="編集">
                        <Pencil size={14} />
                      </button>
                      <button className="ai-icon-btn danger" onClick={() => handleDeleteContent(item.id)} title="削除">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <h4 className="ai-content-title">{item.title}</h4>
                  <pre className="ai-content-body">{item.body}</pre>
                  <p className="ai-content-meta">
                    最終更新: {new Date(item.updated_at).toLocaleDateString('ja-JP')}
                    {!item.is_active && <span className="ai-inactive-tag">無効</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────── スタイル ─────── */}
      <style jsx>{`
        /* ── ページ全体 ── */
        .ai-post-page {
          padding: 2rem 2.5rem;
          max-width: 1300px;
          margin: 0 auto;
          color: var(--text-primary);
          font-family: var(--font-sans);
        }

        /* ── ヘッダー ── */
        .ai-page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.75rem;
          gap: 1rem;
        }
        .ai-page-header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .ai-page-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: var(--accent-gradient);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--accent-glow);
          flex-shrink: 0;
        }
        .ai-page-title {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.02em;
        }
        .ai-page-subtitle {
          font-size: 0.82rem;
          color: var(--text-muted);
          margin: 0.15rem 0 0;
        }
        .ai-safe-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.85rem;
          border-radius: 20px;
          background: rgba(52, 211, 153, 0.1);
          border: 1px solid rgba(52, 211, 153, 0.3);
          color: #34d399;
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
        }

        /* ── タブ ── */
        .ai-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 0;
        }
        .ai-tab {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.65rem 1.2rem;
          border: none;
          background: none;
          color: var(--text-muted);
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: all 0.2s;
        }
        .ai-tab:hover { color: var(--text-primary); }
        .ai-tab.active {
          color: var(--accent-primary);
          border-bottom-color: var(--accent-primary);
        }
        .ai-tab-count {
          padding: 1px 7px;
          border-radius: 20px;
          background: var(--bg-tertiary);
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        /* ── 生成タブ レイアウト ── */
        .ai-generate-layout {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 1.5rem;
          align-items: start;
        }
        @media (max-width: 900px) {
          .ai-generate-layout { grid-template-columns: 1fr; }
        }

        /* ── カード共通 ── */
        .ai-section-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
        }
        .ai-section-title {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 1.25rem;
        }

        /* ── フィールド ── */
        .ai-field { margin-bottom: 1.1rem; }
        .ai-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }
        .ai-hint {
          font-size: 0.72rem;
          color: var(--text-muted);
          margin: 0.35rem 0 0;
        }
        .ai-select-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.4rem;
        }
        .ai-select-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .ai-chip {
          padding: 0.4rem 0.75rem;
          border-radius: 20px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          font-size: 0.78rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }
        .ai-chip:hover { border-color: var(--accent-primary); color: var(--accent-primary); }
        .ai-chip.selected {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
          background: rgba(99, 102, 241, 0.12);
          font-weight: 700;
        }

        /* ── 生成ボタン ── */
        .ai-generate-btn {
          width: 100%;
          padding: 0.85rem;
          margin-top: 0.5rem;
          border-radius: var(--radius-md);
          border: none;
          background: var(--accent-gradient);
          color: #fff;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: opacity 0.2s, transform 0.1s;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.35);
        }
        .ai-generate-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .ai-generate-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .ai-error {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          font-size: 0.8rem;
          margin-top: 0.75rem;
        }

        /* ── 右側プレビュー ── */
        .ai-generate-preview {
          min-height: 400px;
        }
        .ai-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          min-height: 400px;
          border: 2px dashed var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 2rem;
          gap: 0.75rem;
        }
        .ai-empty-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.5rem;
        }
        .ai-empty-state h3 { margin: 0; font-size: 1.1rem; color: var(--text-primary); }
        .ai-empty-state p { margin: 0; font-size: 0.85rem; color: var(--text-muted); line-height: 1.7; }

        .ai-generating-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 1rem;
        }
        .ai-gen-ring {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 3px solid transparent;
          border-top-color: #6366f1;
          border-bottom-color: #a855f7;
          animation: spinClockwise 1s linear infinite;
        }
        .ai-generating-state p { margin: 0; color: var(--text-secondary); font-weight: 600; }
        .ai-gen-sub { color: var(--text-muted) !important; font-size: 0.8rem !important; font-weight: 400 !important; }

        /* ── プレビューカード ── */
        .ai-preview-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
        }
        .ai-preview-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1rem;
          gap: 1rem;
        }
        .ai-preview-title { margin: 0 0 0.35rem; font-size: 1rem; font-weight: 700; }
        .ai-official-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 2px 9px;
          border-radius: 20px;
          background: rgba(52, 211, 153, 0.1);
          border: 1px solid rgba(52, 211, 153, 0.3);
          color: #34d399;
          font-size: 0.7rem;
          font-weight: 700;
        }
        .ai-regen-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.85rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .ai-regen-btn:hover { border-color: var(--accent-primary); color: var(--accent-primary); }
        .ai-regen-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* SNSバリアントタブ */
        .ai-variant-tabs {
          display: flex;
          gap: 0.25rem;
          margin-bottom: 1rem;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 0;
        }
        .ai-variant-tab {
          padding: 0.5rem 0.9rem;
          border: none;
          background: none;
          color: var(--text-muted);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: all 0.15s;
        }
        .ai-variant-tab:hover { color: var(--text-primary); }
        .ai-variant-tab.active { color: var(--accent-primary); border-bottom-color: var(--accent-primary); }

        .ai-variant-content { margin-bottom: 1.25rem; }
        .ai-variant-textarea {
          width: 100%;
          min-height: 200px;
          padding: 0.85rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.85rem;
          line-height: 1.7;
          resize: vertical;
          font-family: inherit;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .ai-variant-textarea:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .ai-char-count {
          font-size: 0.72rem;
          color: var(--text-muted);
          text-align: right;
          margin-top: 0.35rem;
        }

        /* 投稿オプション */
        .ai-post-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }
        @media (max-width: 700px) {
          .ai-post-options { grid-template-columns: 1fr; }
        }
        .ai-schedule-field {}
        .ai-datetime-input {
          width: 100%;
          padding: 0.55rem 0.75rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.85rem;
          font-family: inherit;
          box-sizing: border-box;
        }
        .ai-datetime-input:focus {
          outline: none;
          border-color: var(--accent-primary);
        }
        .ai-platforms-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          margin-top: 0.25rem;
        }
        .ai-platform-badge {
          padding: 3px 10px;
          border-radius: 20px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          font-size: 0.72rem;
          font-weight: 600;
        }

        .ai-post-btn {
          width: 100%;
          padding: 0.9rem;
          border-radius: var(--radius-md);
          border: none;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          color: #fff;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.35);
        }
        .ai-post-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .ai-post-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .ai-success-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          border-radius: var(--radius-md);
          background: rgba(52, 211, 153, 0.12);
          border: 1px solid rgba(52, 211, 153, 0.3);
          color: #34d399;
          font-weight: 700;
          font-size: 0.9rem;
        }

        /* ═══ 公式情報管理タブ ═══ */
        .ai-contents-layout {}
        .ai-contents-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .ai-filter-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }
        .ai-filter-tab {
          padding: 0.35rem 0.85rem;
          border-radius: 20px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
          color: var(--text-muted);
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ai-filter-tab:hover { color: var(--text-primary); }
        .ai-filter-tab.active {
          background: rgba(99, 102, 241, 0.12);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }
        .ai-add-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          border: none;
          background: var(--accent-gradient);
          color: #fff;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: opacity 0.2s;
        }
        .ai-add-btn:hover { opacity: 0.88; }

        /* フォームカード */
        .ai-form-card {
          background: var(--bg-secondary);
          border: 1px solid var(--accent-primary);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          margin-bottom: 1.25rem;
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.1);
        }
        .ai-form-title {
          font-size: 0.9rem;
          font-weight: 700;
          margin: 0 0 1.25rem;
          color: var(--accent-primary);
        }
        .ai-form-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 1rem;
        }
        @media (max-width: 600px) { .ai-form-grid { grid-template-columns: 1fr; } }
        .ai-select, .ai-input, .ai-textarea {
          width: 100%;
          padding: 0.6rem 0.85rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.85rem;
          font-family: inherit;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .ai-select:focus, .ai-input:focus, .ai-textarea:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .ai-textarea { resize: vertical; line-height: 1.7; }
        .ai-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .ai-cancel-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.55rem 1.1rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          background: transparent;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ai-cancel-btn:hover { border-color: var(--text-muted); color: var(--text-primary); }
        .ai-save-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.55rem 1.1rem;
          border-radius: var(--radius-sm);
          border: none;
          background: var(--accent-gradient);
          color: #fff;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .ai-save-btn:hover:not(:disabled) { opacity: 0.88; }
        .ai-save-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* コンテンツリスト */
        .ai-loading-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 3rem;
          color: var(--text-muted);
        }
        .ai-empty-contents {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 4rem 2rem;
          text-align: center;
          color: var(--text-muted);
        }
        .ai-content-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1rem;
        }
        .ai-content-item {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 1.1rem 1.25rem;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ai-content-item:hover {
          border-color: rgba(99, 102, 241, 0.3);
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .ai-content-item.inactive { opacity: 0.5; }
        .ai-content-item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.6rem;
        }
        .ai-cat-badge {
          padding: 2px 9px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 700;
        }
        .ai-content-actions {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .ai-icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.15s;
          text-decoration: none;
        }
        .ai-icon-btn:hover { color: var(--accent-primary); border-color: var(--accent-primary); background: rgba(99,102,241,0.08); }
        .ai-icon-btn.danger:hover { color: #f87171; border-color: rgba(248,113,113,0.4); background: rgba(248,113,113,0.08); }
        .ai-content-title {
          font-size: 0.9rem;
          font-weight: 700;
          margin: 0 0 0.5rem;
          color: var(--text-primary);
        }
        .ai-content-body {
          font-size: 0.78rem;
          color: var(--text-secondary);
          line-height: 1.6;
          white-space: pre-wrap;
          font-family: inherit;
          margin: 0 0 0.6rem;
          background: var(--bg-tertiary);
          border-radius: var(--radius-sm);
          padding: 0.5rem 0.75rem;
          max-height: 100px;
          overflow: hidden;
          position: relative;
        }
        .ai-content-meta {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .ai-inactive-tag {
          padding: 1px 7px;
          border-radius: 20px;
          background: rgba(248, 113, 113, 0.1);
          color: #f87171;
          font-size: 0.68rem;
          border: 1px solid rgba(248, 113, 113, 0.2);
        }

        /* ── 公式サイト・LP取得セクション ── */
        .ai-live-section {
          margin-top: 1.1rem;
          padding: 0.9rem 1rem;
          border-radius: var(--radius-md);
          border: 1px solid rgba(59, 130, 246, 0.2);
          background: rgba(59, 130, 246, 0.04);
        }
        .ai-live-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 0.6rem;
        }
        .ai-live-title {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-secondary);
        }
        .ai-live-status {
          padding: 1px 8px;
          border-radius: 20px;
          font-size: 0.68rem;
          font-weight: 700;
        }
        .ai-live-status.ok {
          background: rgba(52, 211, 153, 0.12);
          border: 1px solid rgba(52, 211, 153, 0.3);
          color: #34d399;
        }
        .ai-fetch-web-btn {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.3rem 0.7rem;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(59, 130, 246, 0.4);
          background: rgba(59, 130, 246, 0.08);
          color: #3b82f6;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .ai-fetch-web-btn:hover:not(:disabled) {
          background: rgba(59, 130, 246, 0.15);
          border-color: #3b82f6;
        }
        .ai-fetch-web-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ai-live-urls {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          margin-bottom: 0.5rem;
        }
        .ai-live-url-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.72rem;
        }
        .ai-live-url-label {
          color: var(--text-muted);
          min-width: 60px;
          font-weight: 600;
        }
        .ai-live-url-link {
          display: flex;
          align-items: center;
          gap: 0.2rem;
          color: #3b82f6;
          text-decoration: none;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 0.68rem;
        }
        .ai-live-url-link:hover { text-decoration: underline; }
        .ai-live-preview-toggle {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          margin-top: 0.5rem;
          padding: 0.25rem 0.5rem;
          border: none;
          background: none;
          color: var(--text-muted);
          font-size: 0.72rem;
          cursor: pointer;
          transition: color 0.15s;
        }
        .ai-live-preview-toggle:hover { color: var(--text-primary); }
        .ai-live-preview-text {
          margin-top: 0.5rem;
          padding: 0.65rem 0.85rem;
          border-radius: var(--radius-sm);
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          font-size: 0.68rem;
          color: var(--text-muted);
          line-height: 1.5;
          white-space: pre-wrap;
          font-family: inherit;
          max-height: 200px;
          overflow-y: auto;
        }

        /* スピンアニメーション */
        :global(.spin) {
          animation: spinClockwise 0.8s linear infinite;
        }
        @keyframes spinClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* レスポンシブ */
        @media (max-width: 768px) {
          .ai-post-page { padding: 1.25rem; }
          .ai-page-header { flex-direction: column; align-items: flex-start; }
          .ai-content-list { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
