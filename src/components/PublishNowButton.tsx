'use client';

import React, { useState } from 'react';
import { Play, Loader2, Check, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PublishNowButton() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClick = async () => {
    setStatus('loading');
    setErrorMessage(null);
    try {
      const response = await fetch('/api/cron/publish-scheduled', {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '即時配信に失敗しました。');
      }
      setStatus('success');
      // 成功状態を1.5秒間表示してからリフレッシュ
      setTimeout(() => {
        router.refresh();
        setStatus('idle');
      }, 1500);
    } catch (error) {
      setStatus('failed');
      const msg = error instanceof Error ? error.message : 'エラーが発生しました。';
      setErrorMessage(msg);
      // エラー状態を5秒間表示してから通常に戻す
      setTimeout(() => {
        setStatus('idle');
        setErrorMessage(null);
      }, 5000);
    }
  };

  const getButtonStyles = () => {
    const baseStyle: React.CSSProperties = {
      padding: '0.35rem 0.75rem',
      fontSize: '0.8rem',
      height: '32px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      marginTop: '0.25rem',
      borderRadius: 'var(--radius-sm)',
      fontWeight: 600,
      border: '1px solid transparent',
      transition: 'all var(--transition-normal)',
      cursor: status === 'loading' ? 'not-allowed' : 'pointer',
    };

    switch (status) {
      case 'loading':
        return {
          ...baseStyle,
          background: 'rgba(99, 102, 241, 0.2)',
          borderColor: 'rgba(99, 102, 241, 0.4)',
          color: '#a5b4fc',
        };
      case 'success':
        return {
          ...baseStyle,
          background: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgba(16, 185, 129, 0.4)',
          color: '#34d399',
        };
      case 'failed':
        return {
          ...baseStyle,
          background: 'rgba(239, 68, 68, 0.2)',
          borderColor: 'rgba(239, 68, 68, 0.4)',
          color: '#f87171',
        };
      case 'idle':
      default:
        return {
          ...baseStyle,
          background: 'var(--accent-gradient)',
          color: 'var(--text-primary)',
        };
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <Loader2 size={12} className="spin-animation-fast" />
            <span>SNSに送信中...</span>
          </>
        );
      case 'success':
        return (
          <>
            <Check size={12} />
            <span>配信完了！</span>
          </>
        );
      case 'failed':
        return (
          <>
            <AlertCircle size={12} />
            <span>送信失敗</span>
          </>
        );
      case 'idle':
      default:
        return (
          <>
            <Play size={12} />
            <span>今すぐ配信する</span>
          </>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%', alignItems: 'flex-start' }}>
      <button
        onClick={handleClick}
        disabled={status !== 'idle'}
        style={getButtonStyles()}
      >
        {renderContent()}
      </button>
      
      {errorMessage && (
        <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.25rem', display: 'block', maxWidth: '100%', wordBreak: 'break-word' }}>
          {errorMessage}
        </span>
      )}

      <style jsx global>{`
        @keyframes spinFast {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-animation-fast {
          animation: spinFast 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}
