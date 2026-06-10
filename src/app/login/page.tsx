'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { AlertCircle, Layers } from 'lucide-react';

// Google マルチカラーロゴ SVG
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.205c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.909c1.702-1.567 2.683-3.874 2.683-6.616z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.91-2.258c-.805.54-1.836.859-3.046.859-2.344 0-4.328-1.584-5.036-3.717H1.037v2.332C2.522 15.983 5.514 18 9 18z" fill="#34A853" />
    <path d="M3.964 10.705c-.18-.54-.282-1.117-.282-1.705s.102-1.165.282-1.705V4.963H1.037c-.613 1.226-.962 2.613-.962 4.037 0 1.424.349 2.811.962 4.037l2.927-2.332z" fill="#FBBC05" />
    <path d="M9 3.58c1.32 0 2.507.454 3.44 1.347l2.581-2.58C13.46 1.05 11.426.43 9 .43 5.514.43 2.522 2.447 1.037 5.463l2.927 2.332C4.672 5.664 6.656 4.08 9 3.58z" fill="#EA4335" />
  </svg>
);

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // マウント時にクッキーからセッションの存在を確認してリダイレクト
  useEffect(() => {
    const hasSession = 
      document.cookie.includes('session=') || 
      document.cookie.includes('sb-dummy-session=');
    
    if (hasSession) {
      router.push('/');
    }
  }, [router]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    // Firebaseが未設定（モック環境）であるか判定
    const isMockMode = 
      !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes('dummy');

    if (isMockMode) {
      // モックログイン (Googleログイン完了を擬似シミュレート)
      setTimeout(async () => {
        try {
          const res = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: null }),
          });
          
          if (res.ok) {
            router.push('/');
            router.refresh();
          } else {
            setError('セッションの作成に失敗しました。');
            setIsLoading(false);
          }
        } catch (err) {
          setError('接続エラーが発生しました。');
          setIsLoading(false);
        }
      }, 1000);
      return;
    }

    try {
      // 1. Google 認証プロバイダの生成
      const provider = new GoogleAuthProvider();
      
      // 2. ポップアップによる Google サインインの実行
      const userCredential = await signInWithPopup(auth, provider);
      
      // 3. IDトークンの取得
      const idToken = await userCredential.user.getIdToken();

      // 4. セッション構築APIを呼び出して Cookie を保存
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'セッションの確立に失敗しました。');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      console.error('Google Login error:', err);
      let friendlyMessage = err.message || 'ログイン中にエラーが発生しました。';
      
      // よくあるエラーコードの日本語訳
      if (err.code === 'auth/popup-closed-by-user') {
        friendlyMessage = 'ログイン用のウィンドウが閉じられました。もう一度お試しください。';
      } else if (err.code === 'auth/cancelled-popup-request') {
        friendlyMessage = 'ログイン処理がキャンセルされました。';
      } else if (err.code === 'auth/operation-not-allowed') {
        friendlyMessage = 'Firebase管理画面で Googleログイン が有効になっていません。有効化してください。';
      }
      
      setError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      width: '100%',
      padding: '1.5rem',
      background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 70%), #0b0d16',
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 100
    }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem', textAlign: 'center' }}>
          <div style={{
            background: 'var(--accent-gradient)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--accent-glow)',
            marginBottom: '1rem'
          }}>
            <Layers size={32} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>ZERO Sync</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            都城ドライビングスクール 統合投稿管理システム
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '0.875rem',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '1.5rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <span>{error}</span>
          </div>
        )}

        {/* ログインボタンエリア */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="btn btn-secondary google-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.875rem',
              backgroundColor: '#ffffff',
              color: '#1f2937',
              borderColor: '#e5e7eb',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              fontWeight: 600,
              fontSize: '0.95rem',
              borderRadius: 'var(--radius-md)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <GoogleIcon />
            <span>{isLoading ? 'サインイン中...' : 'Googleアカウントでログイン'}</span>
          </button>
        </div>

        <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <p>※ 管理者登録済みのGoogleアカウントでのみログインが可能です。</p>
        </div>
      </div>

      <style jsx global>{`
        .google-btn:hover {
          background-color: #f9fafb !important;
          border-color: #d1d5db !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1) !important;
        }
        .google-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
