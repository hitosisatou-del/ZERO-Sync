import React from 'react';
import AILoadingState from '@/components/AILoadingState';

export default function Loading() {
  return (
    <div style={{
      position: 'fixed', 
      top: 0, 
      left: 0,
      width: '100vw', 
      height: '100vh',
      background: 'rgba(5, 8, 18, 0.88)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
    }}>
      <AILoadingState
        mainTitle="ダッシュボードを読み込み中..."
        subTitle="最新の配信データと投稿ステータスを取得しています。"
        badgeText="SYSTEM LOADING"
        steps={[
          'システム初期化中...',
          'データベース接続中...',
          '配信ステータスを確認中...',
          '最新データをレンダリング中...',
        ]}
      />
    </div>
  );
}
