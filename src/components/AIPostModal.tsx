'use client';

import React, { useState } from 'react';
import { X, Sparkles, Loader2, AlertCircle, Check, Copy } from 'lucide-react';

interface AIPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (text: string) => void;
}

const themeOptions = [
  { value: '卒業式（卒業生の声・祝辞）', label: '🎓 卒業式（卒業生の声・祝辞）' },
  { value: '合宿免許キャンペーン・空き状況', label: '🚗 合宿免許（キャンペーン・空き状況）' },
  { value: '通学免許キャンペーン・入校受付', label: '🏫 通学免許（キャンペーン・入校受付）' },
  { value: '普通車免許の案内', label: '🚙 普通車免許の案内' },
  { value: '二輪免許（普通二輪・大型二輪）の案内', label: '🏍 二輪免許（普通・大型）の案内' },
  { value: 'プロ免許（牽引・大型特殊・中型自動車）の案内', label: '🚛 プロ免許（牽引・大特・中型）の案内' },
  { value: 'その他・自由テーマ', label: '📝 その他・自由テーマ' },
];

const presetKeywords = [
  '都城', '自動車学校', '合宿免許', '通学免許', '普通車', 
  '自動二輪', '大型二輪', '牽引', '大型特殊', '中型自動車', 
  'キャンペーン', '短期取得', '割引特典'
];

const toneOptions = [
  { value: '親しみやすく元気', label: '😊 親しみやすく元気' },
  { value: '丁寧で誠実', label: '🤝 丁寧で誠実' },
  { value: '若者向けで明るい', label: '📣 若者向けで明るい' },
];

const ctaOptions = [
  { value: 'Web仮申し込みページへ誘導', label: '🔗 Web仮申し込みページへ誘導' },
  { value: '電話でのお問い合わせへ誘導', label: '📞 電話でのお問い合わせへ誘導' },
  { value: '公式サイト特設ページへ誘導', label: '🌐 公式サイト特設ページへ誘導' },
];

export default function AIPostModal({ isOpen, onClose, onApply }: AIPostModalProps) {
  const [theme, setTheme] = useState(themeOptions[0].value);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(['都城', '自動車学校']);
  const [customKeyword, setCustomKeyword] = useState('');
  const [tone, setTone] = useState(toneOptions[0].value);
  const [cta, setCta] = useState(ctaOptions[0].value);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleKeywordToggle = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      setSelectedKeywords(selectedKeywords.filter(k => k !== keyword));
    } else {
      setSelectedKeywords([...selectedKeywords, keyword]);
    }
  };

  const handleAddCustomKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (customKeyword.trim() && !selectedKeywords.includes(customKeyword.trim())) {
      setSelectedKeywords([...selectedKeywords, customKeyword.trim()]);
      setCustomKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setSelectedKeywords(selectedKeywords.filter(k => k !== keyword));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme,
          keywords: selectedKeywords,
          tone,
          cta,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'テキストの生成中にエラーが発生しました。');
      }

      setGeneratedText(data.text);
    } catch (err: any) {
      setError(err.message || '接続エラーが発生しました。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyClick = () => {
    onApply(generatedText);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(9, 10, 15, 0.75)',
      backdropFilter: 'blur(10px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '650px',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        border: '1px solid var(--border-focus)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        padding: '1.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        {/* モーダルヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            <Sparkles size={20} style={{ color: 'var(--accent-primary)' }} />
            <span>AI投稿文自動生成アシスタント (都城DS特化)</span>
          </h2>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.50rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', color: '#f87171', fontSize: '0.85rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* 生成テキスト表示 (生成された場合のみ最上部付近に表示) */}
        {generatedText && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-focus)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600 }}>✨ 生成結果プレビュー</span>
              <button 
                onClick={handleCopy}
                style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              >
                {copied ? <Check size={12} style={{ color: 'var(--color-success)' }} /> : <Copy size={12} />}
                <span>{copied ? 'コピー完了' : 'コピー'}</span>
              </button>
            </div>
            <textarea
              readOnly
              value={generatedText}
              style={{
                width: '100%',
                minHeight: '180px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                padding: '0.75rem',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleApplyClick}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                この文章を共通本文に適用する
              </button>
            </div>
          </div>
        )}

        {/* 生成用設定フォーム */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* テーマ選択 */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">1. 投稿のテーマ</label>
            <select 
              value={theme} 
              onChange={(e) => setTheme(e.target.value)}
              className="form-select"
              disabled={isGenerating}
            >
              {themeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* キーワード選択 */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">2. 狙いたいキーワード（複数選択可）</label>
            
            {/* 選択中のキーワード一覧 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
              {selectedKeywords.map((kw) => (
                <span 
                  key={kw} 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: 'var(--nav-active-bg)',
                    border: '1px solid var(--nav-active-border)',
                    borderRadius: 'var(--radius-full)',
                    padding: '0.2rem 0.6rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-primary)',
                    fontWeight: 600
                  }}
                >
                  <span>{kw}</span>
                  <button 
                    onClick={() => handleRemoveKeyword(kw)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              {selectedKeywords.length === 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>キーワード未選択</span>
              )}
            </div>

            {/* プリセットキーワード選択エリア */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
              {presetKeywords.map((kw) => {
                const isSelected = selectedKeywords.includes(kw);
                return (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => handleKeywordToggle(kw)}
                    disabled={isGenerating}
                    style={{
                      background: isSelected ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                      border: '1px solid ' + (isSelected ? 'transparent' : 'var(--border-color)'),
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.3rem 0.6rem',
                      fontSize: '0.75rem',
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    {kw}
                  </button>
                );
              })}
            </div>

            {/* 自由キーワード追加フォーム */}
            <form onSubmit={handleAddCustomKeyword} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                type="text"
                value={customKeyword}
                onChange={(e) => setCustomKeyword(e.target.value)}
                placeholder="独自のキーワードを追加 (例: バイク女子, 紹介特典)"
                className="form-input"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                disabled={isGenerating}
              />
              <button
                type="submit"
                className="btn btn-secondary"
                style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                disabled={isGenerating}
              >
                追加
              </button>
            </form>
          </div>

          {/* トーン ＆ CTA 選択 (スマホ時は縦並び、PC時は横並び) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">3. 文章のトーン</label>
              <select 
                value={tone} 
                onChange={(e) => setTone(e.target.value)}
                className="form-select"
                disabled={isGenerating}
              >
                {toneOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">4. クリック誘導先（CTA）</label>
              <select 
                value={cta} 
                onChange={(e) => setCta(e.target.value)}
                className="form-select"
                disabled={isGenerating}
              >
                {ctaOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 下部ボタン */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <button 
            type="button" 
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            disabled={isGenerating}
          >
            閉じる
          </button>
          <button 
            type="button" 
            onClick={handleGenerate}
            className="btn btn-primary"
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 size={14} className="spin-animation-fast" /> : <Sparkles size={14} />}
            <span>{isGenerating ? 'AIテキスト生成中...' : (generatedText ? '再生成する' : 'AIテキストを生成する')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
