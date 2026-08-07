'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Activity, Database, ShieldCheck, Cpu } from 'lucide-react';

// ─────────────────────────────────────────────
// Props 定義（後方互換あり）
// ─────────────────────────────────────────────
interface AILoadingStateProps {
  /** メインタイトル */
  mainTitle?: string;
  /** サブメッセージ */
  subTitle?: string;
  /** 順次表示する処理ステップ（省略時はデフォルトを使用） */
  steps?: string[];
  /** バッジテキスト（デフォルト: "AI PROCESSING"）*/
  badgeText?: string;
  /** @deprecated mainTitle を使用してください */
  message?: string;
  /** @deprecated subTitle を使用してください */
  subMessage?: string;
}

// ─────────────────────────────────────────────
// デフォルト値
// ─────────────────────────────────────────────
const DEFAULT_TITLE   = 'AI データ処理中...';
const DEFAULT_SUBTITLE = '公式情報を参照・全SNSへの配信準備をしています';
const DEFAULT_BADGE   = 'AI PROCESSING';

const DEFAULT_STEPS = [
  '公式HP・LP の最新情報を解析中...',
  'AI エンジンが投稿テキストを生成中...',
  'Instagram / Facebook 向け最適化中...',
  'X (Twitter) / Google ビジネス向け調整中...',
  '全 SNS 配信キューへ登録中...',
];

// ─────────────────────────────────────────────
// コンポーネント
// ─────────────────────────────────────────────
export default function AILoadingState({
  mainTitle,
  subTitle,
  steps,
  badgeText,
  // 後方互換
  message,
  subMessage,
}: AILoadingStateProps) {
  const title    = mainTitle ?? message ?? DEFAULT_TITLE;
  const subtitle = subTitle  ?? subMessage ?? DEFAULT_SUBTITLE;
  const badge    = badgeText ?? DEFAULT_BADGE;
  const stepList = steps ?? DEFAULT_STEPS;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % stepList.length);
    }, 1700);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 93) return 93;
        return Math.min(93, prev + Math.floor(Math.random() * 12) + 4);
      });
    }, 380);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [stepList.length]);

  return (
    <div className="ai-loading-container">
      {/* アンビエントネオングロー (複数) */}
      <div className="ai-glow-bg ai-glow-1" />
      <div className="ai-glow-bg ai-glow-2" />

      <div className="ai-loading-card">
        {/* ── AI コアアニメーション ── */}
        <div className="ai-core-wrapper">
          <div className="ai-ring ring-outer" />
          <div className="ai-ring ring-middle" />
          <div className="ai-ring ring-inner" />
          <div className="ai-core-icon">
            <Sparkles className="sparkle-pulse" size={30} />
          </div>
        </div>

        {/* ── テキスト ── */}
        <div className="ai-text-group">
          <div className="ai-badge">
            <span className="live-dot" />
            <Cpu size={12} style={{ marginRight: '4px' }} />
            {badge}
          </div>
          <h3 className="ai-title">{title}</h3>
          <p className="ai-subtext">{subtitle}</p>
        </div>

        {/* ── プログレスバー ── */}
        <div className="ai-progress-box">
          <div className="ai-progress-bar-bg">
            <div
              className="ai-progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="ai-progress-info">
            <span className="ai-step-text">
              <Activity size={13} className="spin-slow" />
              {stepList[currentStepIndex]}
            </span>
            <span className="ai-percent">{progress}%</span>
          </div>
        </div>

        {/* ── フッターチップ ── */}
        <div className="ai-footer-chips">
          <span className="chip"><Database size={11} />SSL 暗号化通信</span>
          <span className="chip"><ShieldCheck size={11} />自動キャッシュ同期</span>
        </div>
      </div>

      {/* ────────── スタイル ────────── */}
      <style jsx>{`
        .ai-loading-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 65vh;
          width: 100%;
          padding: 2rem;
          overflow: hidden;
        }

        /* ネオングロー背景 */
        .ai-glow-bg {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          pointer-events: none;
          animation: ambientPulse 4s infinite alternate ease-in-out;
        }
        .ai-glow-1 {
          width: 380px; height: 380px;
          background: radial-gradient(circle, rgba(99,102,241,0.22) 0%, rgba(168,85,247,0.12) 50%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-60%, -60%);
        }
        .ai-glow-2 {
          width: 260px; height: 260px;
          background: radial-gradient(circle, rgba(236,72,153,0.18) 0%, rgba(59,130,246,0.10) 55%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(10%, 0%);
          animation-delay: 2s;
        }

        /* グラスモルフィズムカード */
        .ai-loading-card {
          position: relative;
          z-index: 2;
          background: rgba(15, 23, 42, 0.68);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.10);
          box-shadow:
            0 24px 64px rgba(0, 0, 0, 0.45),
            0 0 0 1px rgba(99, 102, 241, 0.08),
            0 0 40px rgba(99, 102, 241, 0.12);
          border-radius: 28px;
          padding: 3rem 2.75rem;
          max-width: 540px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1.85rem;
        }

        /* ── AI コアリング ── */
        .ai-core-wrapper {
          position: relative;
          width: 116px;
          height: 116px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ai-ring {
          position: absolute;
          border-radius: 50%;
          border: 2px solid transparent;
        }

        .ring-outer {
          width: 100%; height: 100%;
          border-top-color: #6366f1;
          border-bottom-color: #a855f7;
          animation: spinCW 2.8s linear infinite;
          box-shadow: 0 0 18px rgba(99, 102, 241, 0.45);
        }

        .ring-middle {
          width: 78%; height: 78%;
          border-left-color: #ec4899;
          border-right-color: #22d3ee;
          animation: spinCCW 1.9s linear infinite;
          box-shadow: 0 0 10px rgba(236, 72, 153, 0.3);
        }

        .ring-inner {
          width: 56%; height: 56%;
          border: 1.5px dashed rgba(255, 255, 255, 0.35);
          animation: spinCW 5.5s linear infinite;
        }

        .ai-core-icon {
          width: 50px; height: 50px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 0 24px rgba(168, 85, 247, 0.65);
          animation: floatPulse 2.4s ease-in-out infinite alternate;
        }

        /* ── テキスト ── */
        .ai-text-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.55rem;
        }

        .ai-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.32rem 0.85rem;
          border-radius: 20px;
          background: rgba(99, 102, 241, 0.14);
          border: 1px solid rgba(99, 102, 241, 0.28);
          color: #a5b4fc;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .live-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #34d399;
          margin-right: 6px;
          box-shadow: 0 0 8px #34d399;
          animation: blink 1.2s infinite;
        }

        .ai-title {
          font-size: 1.3rem;
          font-weight: 800;
          color: #f8fafc;
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1.3;
        }

        .ai-subtext {
          font-size: 0.86rem;
          color: #94a3b8;
          margin: 0;
          line-height: 1.6;
          max-width: 380px;
        }

        /* ── プログレスバー ── */
        .ai-progress-box {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .ai-progress-bar-bg {
          width: 100%;
          height: 5px;
          background: rgba(255, 255, 255, 0.07);
          border-radius: 10px;
          overflow: hidden;
        }

        .ai-progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
          border-radius: 10px;
          transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 14px rgba(168, 85, 247, 0.8);
        }

        .ai-progress-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.78rem;
        }

        .ai-step-text {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: #cbd5e1;
          font-weight: 500;
          text-align: left;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ai-percent {
          font-weight: 800;
          color: #c084fc;
          font-family: monospace;
          font-size: 0.85rem;
          flex-shrink: 0;
          margin-left: 0.75rem;
        }

        /* ── フッター ── */
        .ai-footer-chips {
          display: flex;
          gap: 1.25rem;
        }

        .chip {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.7rem;
          color: #475569;
        }

        /* ── キーフレーム ── */
        @keyframes spinCW {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes spinCCW {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes floatPulse {
          0%   { transform: scale(0.93); box-shadow: 0 0 14px rgba(99,102,241,0.4); }
          100% { transform: scale(1.07); box-shadow: 0 0 32px rgba(236,72,153,0.75); }
        }
        @keyframes ambientPulse {
          0%   { opacity: 0.35; transform: translate(-60%, -60%) scale(0.85); }
          100% { opacity: 0.75; transform: translate(-60%, -60%) scale(1.15); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.25; }
        }

        /* spin-slow (Activity アイコン) */
        :global(.spin-slow) {
          animation: spinCW 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
