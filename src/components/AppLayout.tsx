'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Settings, 
  LogOut, 
  Layers,
  ShieldAlert
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

type Theme = 'midnight-cosmic' | 'light-cyber' | 'sunset-cyberpunk' | 'emerald-forest';

const themes: { id: Theme; label: string; gradient: string; accentColor: string }[] = [
  {
    id: 'midnight-cosmic',
    label: 'Cosmic',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    accentColor: '#6366f1'
  },
  {
    id: 'light-cyber',
    label: 'Light',
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    accentColor: '#4f46e5'
  },
  {
    id: 'sunset-cyberpunk',
    label: 'Sunset',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
    accentColor: '#ec4899'
  },
  {
    id: 'emerald-forest',
    label: 'Forest',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    accentColor: '#10b981'
  }
];

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';

  const [theme, setTheme] = useState<Theme>('midnight-cosmic');
  const [userRole, setUserRole] = useState<'admin' | 'editor' | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.role);
          setUserEmail(data.email);
        }
      } catch (e) {
        console.error('Error fetching user info:', e);
      } finally {
        setIsAuthLoading(false);
      }
    };

    if (!isLoginPage) {
      fetchUser();
    } else {
      setIsAuthLoading(false);
    }
  }, [isLoginPage]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('zero-theme') as Theme;
    if (savedTheme && ['midnight-cosmic', 'light-cyber', 'sunset-cyberpunk', 'emerald-forest'].includes(savedTheme)) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('zero-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLogout = async () => {
    try {
      // 1. ダミークッキーの削除
      document.cookie = "sb-dummy-session=; path=/; max-age=0";
      
      // 2. サーバーサイドのSession Cookieを破棄
      await fetch('/api/auth/logout', { method: 'POST' });
      
      // 3. Firebase Auth クライアントのサインアウト
      try {
        await auth.signOut();
      } catch (e) {
        // 設定未完了時のエラーなどは無視して進める
      }

      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/login');
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  // ナビゲーション項目
  const navItems = [
    {
      name: '投稿履歴一覧',
      path: '/', // dashboard
      icon: LayoutDashboard,
    },
    {
      name: '新規投稿作成',
      path: '/posts/new',
      icon: PlusCircle,
    },
    // 管理者のみ表示
    ...(userRole === 'admin' ? [{
      name: 'アカウント連携',
      path: '/settings/accounts',
      icon: Settings,
    }] : []),
  ];

  return (
    <div className="app-container">
      {/* サイドバー */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <div style={{
            background: 'var(--accent-gradient)',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--accent-glow)'
          }}>
            <Layers size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
              ZERO Sync
            </h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Miyakonojo DS MVP
            </span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            // 完全一致またはサブパスの判定 (root `/` の場合は完全一致にする)
            const isActive = item.path === '/' 
              ? pathname === '/' || pathname.startsWith('/dashboard') || pathname.startsWith('/posts/') && pathname !== '/posts/new'
              : pathname.startsWith(item.path);

            return (
              <Link 
                key={item.path} 
                href={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                  padding: '0.875rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--nav-active-bg)' : 'transparent',
                  border: isActive ? '1px solid var(--nav-active-border)' : '1px solid transparent',
                  transition: 'all var(--transition-fast)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.95rem'
                }}
                className={isActive ? '' : 'nav-hover'}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--accent-primary)' : 'inherit' }} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* テーマ設定 */}
          <div>
            <span style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em', 
              display: 'block', 
              marginBottom: '0.75rem', 
              fontWeight: 600 
            }}>
              テーマ設定
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {themes.map((t) => {
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleThemeChange(t.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.5rem 0.25rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                      border: '1px solid ' + (isSelected ? 'var(--accent-primary)' : 'var(--border-color)'),
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                    className={isSelected ? '' : 'theme-item-hover'}
                  >
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: t.gradient,
                      boxShadow: isSelected ? '0 0 8px ' + t.accentColor : 'none'
                    }} />
                    <span style={{ fontSize: '0.7rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isSelected ? 600 : 500 }}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ユーザー情報表示 */}
          {userEmail && (
            <div style={{ 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid var(--border-color)',
              padding: '0.75rem', 
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>ログイン中:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, wordBreak: 'break-all' }}>{userEmail}</span>
              <span style={{ 
                color: userRole === 'admin' ? 'var(--accent-primary)' : '#fbbf24', 
                fontWeight: 700,
                marginTop: '0.25rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                ● {userRole === 'admin' ? '管理者権限' : '投稿担当者'}
              </span>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              gap: '0.875rem',
              padding: '0.875rem 1rem',
              border: '1px solid transparent',
              background: 'transparent',
              color: 'var(--text-muted)'
            }}
          >
            <LogOut size={18} />
            <span>ログアウト</span>
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="main-content">
        {!isAuthLoading && userRole === 'editor' && pathname.startsWith('/settings') ? (
          <div className="animate-fade-in" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center',
            padding: '2rem'
          }}>
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '50%',
              padding: '1.5rem',
              color: '#f87171',
              marginBottom: '1.5rem',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.1)'
            }}>
              <ShieldAlert size={48} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              アクセス権限がありません
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
              このページ（連携設定）は管理者専用です。お使いのアカウント（{userEmail}）は「投稿担当者」のため、アクセスが制限されています。
            </p>
            <Link href="/" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
              ダッシュボードに戻る
            </Link>
          </div>
        ) : (
          children
        )}
      </main>

      <style jsx global>{`
        .nav-hover:hover {
          background: rgba(255, 255, 255, 0.03) !important;
          color: var(--text-primary) !important;
        }
        .theme-item-hover:hover {
          background: var(--bg-tertiary) !important;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
