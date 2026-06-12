'use client';

import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PublishNowButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cron/publish-scheduled', {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '即時配信に失敗しました。');
      }
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="btn btn-primary"
      style={{
        padding: '0.35rem 0.75rem',
        fontSize: '0.8rem',
        height: '32px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        marginTop: '0.25rem',
        cursor: loading ? 'not-allowed' : 'pointer'
      }}
    >
      <Play size={12} />
      <span>{loading ? '配信処理中...' : '今すぐ配信する'}</span>
    </button>
  );
}
