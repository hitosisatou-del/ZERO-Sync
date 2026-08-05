'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Activity, Database, ShieldCheck, Cpu } from 'lucide-react';

interface AILoadingStateProps {
  message?: string;
  subMessage?: string;
}

const analysisSteps = [
  'Googleマップ (MEO) の閲覧・行動ログを解析中...',
  'Instagram リーチ & インタラクションデータを同期中...',
  'Facebook & X (Twitter) インプレッション統計を処理中...',
  '全チャット統合 AI エンゲージメント指標を導出中...',
  '集客成果可視化ダッシュボードをレンダリング中...'
];

export default function AILoadingState({
  message = 'AI 集客アナリティクスエンジン起動中...',
  subMessage = 'データ収集・全チャット推移をリアルタイム解析しています'
}: AILoadingStateProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    // ステップ切り替えアニメーション
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % analysisSteps.length);
    }, 1800);

    // プログレスバー風アニメーション
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 94) return 94; // ロード完了直前で待機
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 400);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="ai-loading-container">
      {/* 背景のアンビエントネオングロー */}
      <div className="ai-glow-bg" />

      <div className="ai-loading-card">
        {/* メインのAIコアアニメーション */}
        <div className="ai-core-wrapper">
          {/* 外側のアウターパルスリング */}
          <div className="ai-ring ring-outer" />
          
          {/* 中間のサイバーグラデーションリング */}
          <div className="ai-ring ring-middle" />
          
          {/* 内側の反時計回り高速リング */}
          <div className="ai-ring ring-inner" />

          {/* 中央のAIアイコンコア */}
          <div className="ai-core-icon">
            <Sparkles className="sparkle-pulse" size={32} />
          </div>
        </div>

        {/* テキストメッセージ */}
        <div className="ai-text-group">
          <div className="ai-badge">
            <span className="live-dot" />
            <Cpu size={13} style={{ marginRight: '4px' }} />
            AI REALTIME ANALYZING
          </div>
          <h3 className="ai-title">{message}</h3>
          <p className="ai-subtext">{subMessage}</p>
        </div>

        {/* 進行状況を示すプログレスバー */}
        <div className="ai-progress-box">
          <div className="ai-progress-bar-bg">
            <div 
              className="ai-progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="ai-progress-info">
            <span className="ai-step-text">
              <Activity size={14} className="spin-slow" />
              {analysisSteps[currentStepIndex]}
            </span>
            <span className="ai-percent">{progress}%</span>
          </div>
        </div>

        {/* 下部のステータス chip */}
        <div className="ai-footer-chips">
          <span className="chip"><Database size={12} /> SSL 暗号化通信</span>
          <span className="chip"><ShieldCheck size={12} /> 自動キャッシュ同期</span>
        </div>
      </div>

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

        .ai-glow-bg {
          position: absolute;
          width: 320px;
          height: 320px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.15) 50%, transparent 70%);
          filter: blur(40px);
          animation: ambientPulse 4s infinite alternate ease-in-out;
          pointer-events: none;
        }

        .ai-loading-card {
          position: relative;
          z-index: 2;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), 0 0 30px rgba(99, 102, 241, 0.15);
          border-radius: 24px;
          padding: 3rem 2.5rem;
          max-width: 520px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1.75rem;
        }

        /* AI コアアニメーション構造 */
        .ai-core-wrapper {
          position: relative;
          width: 110px;
          height: 110px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.5rem;
        }

        .ai-ring {
          position: absolute;
          border-radius: 50%;
          border: 2px solid transparent;
        }

        .ring-outer {
          width: 100%;
          height: 100%;
          border-top-color: #6366f1;
          border-bottom-color: #a855f7;
          animation: spinClockwise 3s linear infinite;
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
        }

        .ring-middle {
          width: 82%;
          height: 82%;
          border-left-color: #ec4899;
          border-right-color: #3b82f6;
          animation: spinCounterClockwise 2s linear infinite;
        }

        .ring-inner {
          width: 64%;
          height: 64%;
          border: 1px dashed rgba(255, 255, 255, 0.4);
          animation: spinClockwise 6s linear infinite;
        }

        .ai-core-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.6);
          animation: floatPulse 2.5s ease-in-out infinite alternate;
        }

        /* テキストメッセージ */
        .ai-text-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .ai-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.35rem 0.85rem;
          border-radius: 20px;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);
          color: #818cf8;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #34d399;
          margin-right: 6px;
          box-shadow: 0 0 8px #34d399;
          animation: blink 1.2s infinite;
        }

        .ai-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .ai-subtext {
          font-size: 0.88rem;
          color: #94a3b8;
          margin: 0;
          line-height: 1.5;
        }

        /* プログレスバー */
        .ai-progress-box {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .ai-progress-bar-bg {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          overflow: hidden;
          position: relative;
        }

        .ai-progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
          border-radius: 10px;
          transition: width 0.3s ease-out;
          box-shadow: 0 0 12px rgba(168, 85, 247, 0.8);
        }

        .ai-progress-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
        }

        .ai-step-text {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: #cbd5e1;
          font-weight: 500;
        }

        .ai-percent {
          font-weight: 700;
          color: #a855f7;
          font-family: monospace;
        }

        /* フッター */
        .ai-footer-chips {
          display: flex;
          gap: 1rem;
          margin-top: 0.25rem;
        }

        .chip {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          color: #64748b;
        }

        /* キーフレームアニメーション */
        @keyframes spinClockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes spinCounterClockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }

        @keyframes floatPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 15px rgba(99, 102, 241, 0.4); }
          100% { transform: scale(1.06); box-shadow: 0 0 30px rgba(236, 72, 153, 0.7); }
        }

        @keyframes ambientPulse {
          0% { transform: scale(0.8); opacity: 0.4; }
          100% { transform: scale(1.2); opacity: 0.8; }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
