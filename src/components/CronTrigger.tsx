'use client';

import React, { useState } from 'react';
import { RotateCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CronTrigger() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const handleTrigger = async () => {
    setStatus('running');
    setMessage(null);
    try {
      const response = await fetch('/api/cron/publish-scheduled', {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '処理に失敗しました。');
      }
      setStatus('success');
      setMessage(data.message || '予約投稿の処理が完了しました。');
      router.refresh();
      setTimeout(() => {
        setStatus('idle');
        setMessage(null);
      }, 4000);
    } catch (err: any) {
      setStatus('failed');
      setMessage(err.message || 'エラーが発生しました。');
      setTimeout(() => {
        setStatus('idle');
        setMessage(null);
      }, 5000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
      <button
        onClick={handleTrigger}
        disabled={status === 'running'}
        className="btn btn-secondary"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          padding: '0.5rem 1rem',
          background: 'rgba(255, 255, 255, 0.02)',
          borderColor: 'var(--border-color)',
          cursor: status === 'running' ? 'not-allowed' : 'pointer'
        }}
      >
        <RotateCw size={14} className={status === 'running' ? 'spin-animation' : ''} />
        <span>{status === 'running' ? '予約処理を実行中...' : '予約投稿を即時処理'}</span>
      </button>
      {message && (
        <div style={{
          fontSize: '0.8rem',
          color: status === 'success' ? '#34d399' : '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          background: status === 'success' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
          padding: '0.35rem 0.75rem',
          borderRadius: '4px',
          border: '1px solid ' + (status === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'),
        }}>
          {status === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
          <span>{message}</span>
        </div>
      )}
      <style jsx global>{`
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
